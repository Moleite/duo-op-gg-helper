// model.test.mjs - Operations of the local database, v1 blacklist import, post note
import test from 'node:test';
import assert from 'node:assert/strict';
import { load, CONTENT } from './helpers/ext.mjs';

const D = load(CONTENT.filter((f) => /^src\/(core|filters|store)\//.test(f)).concat(['src/ui/dom.js', 'src/ui/popup-blacklist.js']));
const M = D.model;
const T = Date.parse('2026-10-17T10:00:00Z');

test('an operation replayed gives the same content', () => {
  const op = { kind: 'blacklist.upsert', entry: { gameName: 'Troll', tagLine: '#1234', reason: 'Toxic' } };
  const a = M.applyOp(M.emptyDb(), op, T);
  const b = M.applyOp(a, op, T);
  assert.deepEqual(Object.keys(b.blacklist), ['troll#1234']);
  assert.equal(b.blacklist['troll#1234'].tagLine, '1234');
  assert.equal(b.blacklist['troll#1234'].createdAt, a.blacklist['troll#1234'].createdAt);
  assert.ok(b.blacklist['troll#1234'].updatedAt > a.blacklist['troll#1234'].updatedAt, 'updatedAt always grows');
});

test('applyOp does not change the state it receives', () => {
  const db = M.emptyDb();
  M.applyOp(db, { kind: 'ui.set', ui: { panel: { x: 1 } } }, T);
  assert.equal(db.ui.panel.x, null);
});

test('removing then adding a player again', () => {
  let db = M.applyOp(M.emptyDb(), { kind: 'blacklist.upsert', entry: { gameName: 'A' } }, T);
  db = M.applyOp(db, { kind: 'blacklist.remove', key: 'a' }, T + 1);
  assert.equal(M.blacklistMap(db).size, 0);
  db = M.applyOp(db, { kind: 'blacklist.upsert', entry: { gameName: 'A' } }, T + 2);
  assert.equal(M.blacklistMap(db).size, 1);
});

test('filters go into the active profile, otherwise stay local', () => {
  let db = M.applyOp(M.emptyDb(), { kind: 'filters.set', filters: { myPosition: 'MID' } }, T);
  assert.equal(M.filtersOf(db).myPosition, 'MID');
  assert.equal(Object.keys(db.dirty.profiles).length, 0, 'filters without a profile: nothing to push');
  db = M.applyOp(db, { kind: 'profile.upsert', profile: { id: 'p1', label: 'Main' } }, T);
  assert.equal(db.activeProfileId, 'p1', 'the first profile becomes active');
  db = M.applyOp(db, { kind: 'filters.set', filters: { myPosition: 'TOP' } }, T);
  assert.equal(db.profiles.p1.filters.myPosition, 'TOP');
  assert.ok(db.dirty.profiles.p1);
  db = M.applyOp(db, { kind: 'profile.remove', id: 'p1' }, T);
  assert.equal(db.activeProfileId, null);
  assert.equal(M.filtersOf(db).myPosition, 'MID');
});

test('clearDirty keeps a row changed during the push', () => {
  let db = M.applyOp(M.emptyDb(), { kind: 'blacklist.upsert', entry: { gameName: 'A' } }, T);
  const pushed = M.dirtyRows(db);
  db = M.applyOp(db, { kind: 'blacklist.upsert', entry: { gameName: 'A', note: 'added' } }, T + 5);
  db = M.clearDirty(db, pushed, T + 6);
  assert.ok(db.dirty.blacklist.a);
});

test('unknown operation: explicit error', () => {
  assert.throws(() => M.applyOp(M.emptyDb(), { kind: 'x' }, T), /Unknown operation/);
});

test('import of the v1 text format', () => {
  const list = D.popupBlacklist.parseList([
    '# One summoner name per line',
    '',
    'Name One\t\t\t# SUP - D3 - toxic',
    'Name#EUW1 # note',
    'NoNote'
  ].join('\r\n'));
  assert.deepEqual(list.map((e) => [e.gameName, e.tagLine, e.note]), [
    ['Name One', null, 'SUP - D3 - toxic'], ['Name', 'EUW1', 'note'], ['NoNote', null, null]
  ]);
  const back = D.popupBlacklist.parseList(D.popupBlacklist.formatList(list));
  assert.deepEqual(back.map((e) => e.gameName), ['Name One', 'Name', 'NoNote']);
});

test('post note: variables filled from the profile', () => {
  const p = { position: 'BOTTOM', wantedPositions: ['SUPPORT', 'JUNGLE'], rank: 'Emerald 2', champion: 'Sivir', champion2: 'Xayah' };
  assert.equal(D.announce.build(p), 'Emerald 2 ADC looking for Support/Jungle | mains Sivir, Xayah');
  assert.equal(D.announce.build({ position: 'MID' }), 'Mid looking for any role');
  assert.equal(D.announce.build(p, '{riotId} {unknown}'), '{unknown}');
});
