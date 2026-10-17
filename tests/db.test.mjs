// db.test.mjs - Schema, grants, RLS and the queries of the extension on a real Postgres
//
// PGlite is Postgres compiled to WASM: it runs db/schema.sql and
// db/grants.sql as they are. Each query of extension/src/store/sql.js runs
// under a login role, as on Neon, where the connection string carries the
// role.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { load, WORKER, ROOT } from './helpers/ext.mjs';

const D = load(WORKER);
const sqlFile = (f) => fs.readFileSync(path.join(ROOT, 'db', f), 'utf8');

async function setup() {
  const pg = new PGlite();
  await pg.exec(sqlFile('schema.sql'));
  await pg.exec(sqlFile('grants.sql'));
  for (const r of ['duogg_alice', 'duogg_bob']) {
    await pg.exec(`create role ${r} login password 'x'; grant "duogg-user" to ${r} with inherit true;`);
  }
  await pg.exec(`create role duogg_agent login password 'x'; grant "duogg-read" to duogg_agent with inherit true;`);
  return pg;
}

// Replays a batch like neon.batch: one transaction, under a role.
async function batchAs(pg, role, queries) {
  return pg.transaction(async (tx) => {
    await tx.exec(`set local role ${role}`);
    const out = [];
    for (const q of queries) out.push(await tx.query(q.query, q.params));
    return out;
  });
}

function dbWith(ops) {
  let db = D.model.emptyDb();
  let t = Date.parse('2026-10-17T10:00:00Z');
  ops.forEach((op) => { db = D.model.applyOp(db, op, t += 1000); });
  return db;
}

test('push then pull: each player sees only their rows', async () => {
  const pg = await setup();
  const alice = dbWith([
    { kind: 'profile.upsert', profile: { id: D.model.uuid(), label: 'Main', gameName: 'Alice', tagLine: 'EUW', position: 'BOTTOM', wantedPositions: ['SUPPORT'] } },
    { kind: 'blacklist.upsert', entry: { gameName: 'Troll', tagLine: '1234', reason: 'Toxic' } }
  ]);
  await batchAs(pg, 'duogg_alice', D.sql.pushQueries(D.model.dirtyRows(alice)));

  const asAlice = D.sql.readPull(await batchAs(pg, 'duogg_alice', D.sql.pullQueries()));
  assert.equal(asAlice.role, 'duogg_alice');
  assert.equal(asAlice.profiles.length, 1);
  assert.deepEqual(asAlice.profiles[0].wantedPositions, ['SUPPORT']);
  assert.equal(asAlice.blacklist[0].key, 'troll#1234');

  const asBob = D.sql.readPull(await batchAs(pg, 'duogg_bob', D.sql.pullQueries()));
  assert.equal(asBob.profiles.length, 0);
  assert.equal(asBob.blacklist.length, 0);

  const asAgent = D.sql.readPull(await batchAs(pg, 'duogg_agent', D.sql.pullQueries()));
  assert.equal(asAgent.blacklist.length, 1, 'the read role sees every row');
});

test('the same key for two players gives two separate rows', async () => {
  const pg = await setup();
  const entry = { kind: 'blacklist.upsert', entry: { gameName: 'Troll', tagLine: '1234' } };
  await batchAs(pg, 'duogg_alice', D.sql.pushQueries(D.model.dirtyRows(dbWith([entry]))));
  await batchAs(pg, 'duogg_bob', D.sql.pushQueries(D.model.dirtyRows(dbWith([entry]))));
  const n = await pg.query('select count(*)::int as n from blacklist_entry');
  assert.equal(n.rows[0].n, 2);
});

test('a removal is carried over, an older write does not win', async () => {
  const pg = await setup();
  let db = dbWith([{ kind: 'blacklist.upsert', entry: { gameName: 'Troll', tagLine: '1234' } }]);
  const old = D.model.dirtyRows(db);
  await batchAs(pg, 'duogg_alice', D.sql.pushQueries(old));
  db = D.model.applyOp(db, { kind: 'blacklist.remove', key: 'troll#1234' }, Date.parse('2026-10-17T11:00:00Z'));
  await batchAs(pg, 'duogg_alice', D.sql.pushQueries(D.model.dirtyRows(db)));
  // Replay of the old state (a browser that stayed offline): no effect.
  await batchAs(pg, 'duogg_alice', D.sql.pushQueries(old));
  const pulled = D.sql.readPull(await batchAs(pg, 'duogg_alice', D.sql.pullQueries()));
  assert.ok(pulled.blacklist[0].removedAt, 'the removal stays in the database');
});

test('the grants refuse delete, owner changes and the rows of another player', async () => {
  const pg = await setup();
  await batchAs(pg, 'duogg_alice', D.sql.pushQueries(D.model.dirtyRows(
    dbWith([{ kind: 'blacklist.upsert', entry: { gameName: 'Troll', tagLine: '1234' } }]))));
  await assert.rejects(batchAs(pg, 'duogg_alice', [{ query: 'delete from blacklist_entry', params: [] }]), /permission denied/);
  await assert.rejects(batchAs(pg, 'duogg_alice', [{ query: "update blacklist_entry set owner = 'duogg_bob'", params: [] }]), /permission denied/);
  await assert.rejects(batchAs(pg, 'duogg_bob', [{
    query: "insert into blacklist_entry (owner, player_key, game_name) values ('duogg_alice', 'x', 'x')", params: []
  }]), /row-level security/);
  const r = await batchAs(pg, 'duogg_bob', [{ query: "update blacklist_entry set note = 'hacked'", params: [] }]);
  assert.equal(r[0].affectedRows, 0, 'bob does not see the row of alice');
  await assert.rejects(batchAs(pg, 'duogg_agent', [{ query: "update blacklist_entry set note = 'x'", params: [] }]), /permission denied/);
});

test('mergePull keeps a newer local row not pushed yet', () => {
  let db = dbWith([{ kind: 'blacklist.upsert', entry: { gameName: 'Troll', tagLine: '1234', note: 'local' } }]);
  const server = { profiles: [], blacklist: [Object.assign({}, db.blacklist['troll#1234'], { note: 'server', updatedAt: 1 })] };
  db = D.model.mergePull(db, server, Date.now());
  assert.equal(db.blacklist['troll#1234'].note, 'local');
  assert.ok(db.dirty.blacklist['troll#1234']);
});
