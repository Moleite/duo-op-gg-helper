// rules.test.mjs - Each rule of `D.RULES`, the engine and the sorts
import test from 'node:test';
import assert from 'node:assert/strict';
import { load, CONTENT } from './helpers/ext.mjs';

const D = load(CONTENT.filter((f) => /^src\/(core|filters)\//.test(f)));

let n = 0;
function partner(over) {
  n++;
  return Object.assign({
    id: String(n), gameName: 'P' + n, tagLine: 'EUW', key: 'p' + n + '#euw', position: 'MID',
    lookingFor: ['BOTTOM'], lookingForPartial: false, rank: D.lol.parseRank('E2'),
    wins: 60, losses: 40, winRate: 60, kda: 2.5, opScore: 6, ageMin: 30, champions: [], note: ''
  }, over);
}

function run(list, filters, ctx) {
  const f = Object.assign({ myPosition: 'SUPPORT', myRank: 'Emerald 2' }, filters);
  return D.engine.evaluate(list, f, ctx);
}

test('each rule of the registry has a unique id and a label', () => {
  const ids = D.RULES.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
  D.RULES.forEach((r) => assert.ok(r.label && r.what, r.id));
});

test('blacklist: name#tag, or a bare name for every tag', () => {
  const a = partner({ gameName: 'Troll', tagLine: '1234', key: 'troll#1234' });
  const b = partner({ gameName: 'Wiqi', tagLine: 'EUW', key: 'wiqi#euw' });
  const c = partner();
  const bl = new Map([['troll#1234', {}], ['wiqi', {}]]);
  const r = run([a, b, c], { myPosition: 'ALL', myRank: '' }, { blacklist: bl });
  assert.deepEqual([a, b, c].map((p) => r.byId.get(p.id).hidden), [true, true, false]);
  assert.equal(r.counts.blacklist, 2);
});

test('duplicate: the first post stays, the next ones are hidden', () => {
  const a = partner({ key: 'same#1' }), b = partner({ key: 'same#1' });
  const r = run([a, b], { myPosition: 'ALL' });
  assert.equal(r.byId.get(a.id).hidden, false);
  assert.deepEqual(r.byId.get(b.id).reasons, ['duplicate']);
});

test('same position and wanted position, with a truncated list', () => {
  const same = partner({ position: 'SUPPORT', lookingFor: ['BOTTOM'] });
  const wantsMe = partner({ lookingFor: ['SUPPORT'] });
  const wantsAll = partner({ lookingFor: ['ALL'] });
  const notMe = partner({ lookingFor: ['TOP', 'JUNGLE'] });
  const truncated = partner({ lookingFor: ['TOP', 'JUNGLE'], lookingForPartial: true });
  const r = run([same, wantsMe, wantsAll, notMe, truncated], { myRank: '' });
  assert.deepEqual(r.byId.get(same.id).reasons, ['sameRole', 'lookingFor']);
  assert.equal(r.byId.get(wantsMe.id).hidden, false);
  assert.equal(r.byId.get(wantsAll.id).hidden, false);
  assert.deepEqual(r.byId.get(notMe.id).reasons, ['lookingFor']);
  assert.equal(r.byId.get(truncated.id).hidden, false, 'truncated list: nothing is hidden');
  const fill = run([same, notMe], { myPosition: 'ALL', myRank: '' });
  assert.equal(fill.visible, 2, 'my position is Any: position rules ignored');
});

test('rank: incompatible hides, unreadable keeps', () => {
  const far = partner({ rank: D.lol.parseRank('S1') });
  const unknown = partner({ rank: null });
  const r = run([far, unknown], { myPosition: 'ALL' });
  assert.deepEqual(r.byId.get(far.id).reasons, ['rank']);
  assert.equal(r.byId.get(unknown.id).hidden, false);
});

test('thresholds: win rate, games, age; a missing value hides nothing', () => {
  const low = partner({ winRate: 45 }), few = partner({ wins: 5, losses: 3 }), old = partner({ ageMin: 600 });
  const blank = partner({ winRate: null, wins: null, losses: null, ageMin: null });
  const rules = { winRate: true, games: true, age: true };
  const r = run([low, few, old, blank], { myPosition: 'ALL', myRank: '', rules: rules, minWinRate: 50, minGames: 30, maxAgeHours: 6 });
  assert.deepEqual(r.byId.get(low.id).reasons, ['winRate']);
  assert.deepEqual(r.byId.get(few.id).reasons, ['games']);
  assert.deepEqual(r.byId.get(old.id).reasons, ['age']);
  assert.equal(r.byId.get(blank.id).hidden, false);
});

test('disabled rule: nothing hidden, counter at zero', () => {
  const a = partner({ key: 'k#1' }), b = partner({ key: 'k#1' });
  const r = run([a, b], { myPosition: 'ALL', rules: { duplicate: false } });
  assert.equal(r.visible, 2);
  assert.equal(r.counts.duplicate, 0);
});

test('mergeFilters adds new rules to old saved filters', () => {
  const f = D.engine.mergeFilters({ rules: { rank: false, unknown: true }, myPosition: 'MID' });
  assert.equal(f.rules.rank, false);
  assert.equal(f.rules.blacklist, true);
  assert.ok(!('unknown' in f.rules));
  assert.equal(f.minWinRate, 50);
});

test('stable sort, missing values last', () => {
  const a = partner({ winRate: 50 }), b = partner({ winRate: null }), c = partner({ winRate: 70 }), d = partner({ winRate: 50 });
  assert.deepEqual(D.engine.order([a, b, c, d], 'winRate'), [c.id, a.id, d.id, b.id]);
  assert.deepEqual(D.engine.order([a, b, c, d], 'site'), [a.id, b.id, c.id, d.id]);
  const recent = D.engine.order([partner({ ageMin: 90 }), partner({ ageMin: 5 })], 'recent');
  assert.equal(recent[0], String(n));
});
