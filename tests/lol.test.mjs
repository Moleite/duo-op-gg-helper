// lol.test.mjs - Positions, ranks and the duo compatibility table
import test from 'node:test';
import assert from 'node:assert/strict';
import { load, CONTENT } from './helpers/ext.mjs';

const D = load(CONTENT.filter((f) => f.startsWith('src/core/')));
const { parseRank, parsePosition, duoCompatible, rankIndex, rankLabel, riotKey, TIERS } = D.lol;

test('parseRank reads the DOM, the API and a bare tier', () => {
  assert.deepEqual(parseRank('E2'), { tier: 'EMERALD', div: 2 });
  assert.deepEqual(parseRank('GM1'), { tier: 'GRANDMASTER', div: null });
  assert.deepEqual(parseRank('M1'), { tier: 'MASTER', div: null });
  assert.deepEqual(parseRank('UR'), { tier: 'UNRANKED', div: null });
  assert.deepEqual(parseRank('Emerald 2'), { tier: 'EMERALD', div: 2 });
  assert.deepEqual(parseRank('Unranked'), { tier: 'UNRANKED', div: null });
  assert.deepEqual(parseRank('Master 1'), { tier: 'MASTER', div: null });
  assert.deepEqual(parseRank('diamond iv'), { tier: 'DIAMOND', div: 4 });
  assert.equal(parseRank('Wood 3'), null);
  assert.equal(parseRank(''), null);
  assert.equal(rankLabel(parseRank('d1')), 'Diamond 1');
});

test('parsePosition maps the DOM labels to the API values', () => {
  assert.equal(parsePosition('ADC'), 'BOTTOM');
  assert.equal(parsePosition('Support'), 'SUPPORT');
  assert.equal(parsePosition('All Positions'), 'ALL');
  assert.equal(parsePosition('BOTTOM'), 'BOTTOM');
  assert.equal(parsePosition('Coach'), null);
});

test('rankIndex: one continuous ladder from Iron 4 to Challenger', () => {
  assert.equal(rankIndex(parseRank('I4')), 0);
  assert.equal(rankIndex(parseRank('D1')), 27);
  assert.equal(rankIndex(parseRank('M1')), 28);
  assert.equal(rankIndex(parseRank('Challenger')), 30);
  assert.equal(rankIndex(parseRank('UR')), null);
});

// Every possible rank, unranked included.
const ALL = [];
TIERS.forEach((t) => {
  if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(t)) ALL.push({ tier: t, div: null });
  else [1, 2, 3, 4].forEach((d) => ALL.push({ tier: t, div: d }));
});
ALL.push({ tier: 'UNRANKED', div: null });

test('compatibility is symmetric on every pair', () => {
  for (const a of ALL) for (const b of ALL) {
    assert.equal(duoCompatible(a, b), duoCompatible(b, a), `${rankLabel(a)} / ${rankLabel(b)}`);
  }
});

test('v1 table: boundary cases', () => {
  const ok = (a, b) => duoCompatible(parseRank(a), parseRank(b));
  assert.equal(ok('S2', 'G1'), true);
  assert.equal(ok('B1', 'G4'), false);
  assert.equal(ok('P4', 'E1'), true);
  assert.equal(ok('E1', 'D3'), true, 'Emerald 1 and Diamond 3: two divisions');
  assert.equal(ok('E2', 'D3'), false);
  assert.equal(ok('D4', 'E2'), true);
  assert.equal(ok('D1', 'D3'), true);
  assert.equal(ok('D1', 'D4'), false);
  assert.equal(ok('D1', 'M1'), true);
  assert.equal(ok('D2', 'M1'), false);
  assert.equal(ok('Challenger', 'Master'), true);
  assert.equal(ok('G1', 'UR'), false);
  assert.equal(duoCompatible(parseRank('G1'), null), null, 'unknown rank: no verdict');
});

test('riotKey: lower case name#tag, optional tag', () => {
  assert.equal(riotKey('PikselCZ', '#3623'), 'pikselcz#3623');
  assert.equal(riotKey(' Wiqi ', null), 'wiqi');
  assert.equal(riotKey('', 'EUW'), '');
});
