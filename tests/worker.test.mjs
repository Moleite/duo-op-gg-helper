// worker.test.mjs - Service worker: messages, secret, end-to-end sync
//
// The fake Neon runs the queries in PGlite, with db/schema.sql and
// db/grants.sql: the sync goes through the real SQL and the real RLS.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { IDBFactory } from 'fake-indexeddb';
import { load, WORKER, ROOT } from './helpers/ext.mjs';
import { storage, neonOnPglite } from './helpers/fake-chrome.mjs';

const D = load(WORKER);
const W = D.worker;
W.env.pushDelayMs = 0;
const URL_ALICE = 'postgresql://duogg_alice:x@ep-test-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const URL_BOB = 'postgresql://duogg_bob:x@ep-test-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const POPUP = {};
const TAB = { tab: { id: 1 } };

async function database() {
  const pg = new PGlite();
  await pg.exec(fs.readFileSync(path.join(ROOT, 'db', 'schema.sql'), 'utf8'));
  await pg.exec(fs.readFileSync(path.join(ROOT, 'db', 'grants.sql'), 'utf8'));
  for (const r of ['duogg_alice', 'duogg_bob']) await pg.exec(`create role ${r} login; grant "duogg-user" to ${r};`);
  return pg;
}

// One browser = one storage and one IndexedDB of the extension. The worker
// is a singleton: its env changes.
function browser(pg) {
  const store = storage();
  const idb = new IDBFactory();
  const call = async (msg, sender) => {
    W.env.storage = store;
    W.env.fetch = neonOnPglite(pg);
    D.secrets.env.indexedDB = () => idb;
    return W.handle(msg, sender || POPUP);
  };
  call.store = store;
  return call;
}

test('the secret is refused from a tab and never leaves the worker', async () => {
  const pg = await database();
  const b = browser(pg);
  await assert.rejects(b({ type: 'secret.set', neonUrl: URL_ALICE }, TAB), /from a tab/);
  await assert.rejects(b({ type: 'secret.set', neonUrl: 'http://not-postgres' }), /Unreadable/);
  const st = await b({ type: 'secret.set', neonUrl: URL_ALICE });
  assert.equal(st.neon.configured, true);
  assert.equal(st.neon.user, 'duogg_alice');
  assert.ok(!JSON.stringify(st).includes('x@ep-test'), 'the response does not contain the connection string');
  assert.ok(!JSON.stringify(b.store.data).includes('x@ep-test'), 'chrome.storage.local, readable by a tab, holds no secret');
  assert.equal((await b({ type: 'secret.set', neonUrl: '' })).neon.configured, false, 'an empty string clears it');
});

test('a string saved by 2.0.2 in chrome.storage.local moves to IndexedDB', async () => {
  const b = browser(await database());
  await b.store.set({ secrets: { neonUrl: URL_ALICE } });
  const st = await b({ type: 'state' }, TAB);
  assert.equal(st.neon.user, 'duogg_alice');
  assert.equal('secrets' in b.store.data, false, 'removed from chrome.storage.local');
  assert.equal((await b({ type: 'state' })).neon.user, 'duogg_alice', 'read back from IndexedDB');

  // A string already in IndexedDB wins over a stale copy.
  await b.store.set({ secrets: { neonUrl: URL_BOB } });
  assert.equal((await b({ type: 'state' })).neon.user, 'duogg_alice');
  assert.equal('secrets' in b.store.data, false);
});

test('sync: two browsers of Alice share, Bob sees nothing', async () => {
  const pg = await database();
  const aliceA = browser(pg), aliceB = browser(pg), bob = browser(pg);
  await aliceA({ type: 'secret.set', neonUrl: URL_ALICE });
  await aliceB({ type: 'secret.set', neonUrl: URL_ALICE });
  await bob({ type: 'secret.set', neonUrl: URL_BOB });

  await aliceA({ type: 'op', op: { kind: 'profile.upsert', profile: { id: D.model.uuid(), label: 'Main', opggAccount: 'MyAccount' } } }, TAB);
  await aliceA({ type: 'op', op: { kind: 'blacklist.upsert', entry: { gameName: 'Troll', tagLine: '1234' } } }, TAB);
  const r = await aliceA({ type: 'sync' });
  assert.deepEqual({ pushed: r.pushed, role: r.role }, { pushed: 2, role: 'duogg_alice' });
  const afterA = await aliceA({ type: 'state' });
  assert.equal(Object.keys(afterA.db.dirty.blacklist).length, 0);

  await aliceB({ type: 'sync' });
  const b = (await aliceB({ type: 'state' })).db;
  assert.ok(b.blacklist['troll#1234'], 'the second browser receives the blacklist');
  assert.equal(b.activeProfileId, null, 'no active profile yet');

  // The site opens on the op.gg account of the profile: automatic selection.
  const opened = await aliceB({ type: 'page.open', account: 'myaccount' }, TAB);
  assert.equal(D.model.activeProfile(opened.db).label, 'Main');

  await bob({ type: 'sync' });
  const bb = (await bob({ type: 'state' })).db;
  assert.equal(Object.keys(bb.blacklist).length + Object.keys(bb.profiles).length, 0);
});

test('Neon error: the row stays to push and the error is shown', async () => {
  const pg = await database();
  const b = browser(pg);
  await b({ type: 'secret.set', neonUrl: 'postgresql://duogg_unknown:x@ep-test.neon.tech/neondb' });
  await b({ type: 'op', op: { kind: 'blacklist.upsert', entry: { gameName: 'A' } } }, TAB);
  await assert.rejects(b({ type: 'sync' }), /Neon 400/);
  const st = await b({ type: 'state' });
  assert.ok(st.db.dirty.blacklist.a);
  assert.match(st.db.sync.error, /duogg_unknown/);
});

test('version: the version loaded and the version on the disk', async () => {
  const b = browser(await database());
  W.env.diskVersion = async () => '9.9.9';
  assert.deepEqual(await b({ type: 'version' }, TAB), { loaded: D.version, disk: '9.9.9' });
});

test('unknown message: explicit error', async () => {
  const b = browser(await database());
  await assert.rejects(b({ type: 'anything' }), /Unknown message/);
});
