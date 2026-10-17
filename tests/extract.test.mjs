// extract.test.mjs - Reading the rows of the site, replayed on each capture of DOM/
//
// A capture is a pseudonymized copy of a screen of the site
// (docs/architecture/dom-captures.md). When the site changes, a new capture
// makes this test fail before the extension gets it wrong in game.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseHTML } from 'linkedom';
import { load, CONTENT, ROOT, capture } from './helpers/ext.mjs';

const D = load(CONTENT.filter((f) => /^src\/(core|data)\//.test(f)));
const CAPTURES = fs.readdirSync(path.join(ROOT, 'DOM')).filter((f) => f.endsWith('.html') && !f.startsWith('raw-'));
const LIST_CAPTURES = CAPTURES.filter((f) => /FIND-DUO/.test(f));

test('at least one capture of the table exists', () => {
  assert.ok(LIST_CAPTURES.length >= 1);
});

for (const file of LIST_CAPTURES) {
  const { document } = parseHTML(capture(file));
  const rows = D.extract.rows(document);
  const partners = rows.map(D.extract.partner);

  test(`${file}: each row gives a complete post`, () => {
    assert.ok(rows.length > 0);
    partners.forEach((p) => {
      assert.match(p.id, /^\d+$/);
      assert.ok(p.gameName && p.tagLine && p.key.includes('#'), `name ${p.id}`);
      assert.ok(p.region, `region ${p.id}`);
      assert.ok(p.position, `position ${p.id}`);
      assert.ok(p.rank, `rank ${p.id}`);
      // An empty Looking for cell exists: the API then returns
      // requiredPosition null.
      assert.ok(Array.isArray(p.lookingFor), `looking for ${p.id}`);
      assert.ok(p.ageMin != null, `age ${p.id}`);
      assert.ok(p.wins != null && p.losses != null, `wins ${p.id}`);
      assert.equal(p.winRate == null, p.wins + p.losses === 0, `win rate ${p.id}`);
      assert.ok(D.extract.rowOf(p.id, document) === rows[partners.indexOf(p)], `rowOf ${p.id}`);
    });
  });

  test(`${file}: the overall win rate is not the one of a champion`, () => {
    partners.filter((p) => p.wins + p.losses > 0).forEach((p) => {
      const computed = Math.round((p.wins * 100) / (p.wins + p.losses));
      assert.ok(Math.abs(computed - p.winRate) <= 1, `${p.id}: ${p.winRate} against ${computed}`);
    });
  });
}

test('1.0_FIND-DUO: exact values of the first row', () => {
  const { document } = parseHTML(capture('1.0_FIND-DUO.html'));
  const p = D.extract.partner(D.extract.rows(document)[0]);
  assert.deepEqual({
    id: p.id, gameName: p.gameName, tagLine: p.tagLine, region: p.region, verified: p.verified,
    position: p.position, lookingFor: p.lookingFor, rank: p.rank, wins: p.wins, losses: p.losses,
    winRate: p.winRate, kda: p.kda, opScore: p.opScore, note: p.note, ageMin: p.ageMin
  }, {
    id: '10876326', gameName: 'Player01', tagLine: '0001', region: 'euw', verified: true,
    position: 'BOTTOM', lookingFor: ['SUPPORT'], rank: { tier: 'EMERALD', div: 2 }, wins: 140, losses: 136,
    winRate: 51, kda: 2.02, opScore: 5.47, note: 'Anonymized note 01', ageMin: 20
  });
  assert.deepEqual(p.champions[0], { name: 'Sivir', winRate: 53, games: 43 });
});

test('1.0_FIND-DUO: duplicates, truncated lists and unranked present', () => {
  const { document } = parseHTML(capture('1.0_FIND-DUO.html'));
  const ps = D.extract.rows(document).map(D.extract.partner);
  assert.equal(ps.length, 50);
  assert.ok(new Set(ps.map((p) => p.key)).size < ps.length, 'at least one duplicate');
  assert.ok(ps.some((p) => p.lookingForPartial), 'at least one truncated list (+)');
  assert.ok(ps.some((p) => p.rank.tier === 'UNRANKED'), 'at least one unranked player');
  assert.ok(ps.some((p) => p.position === 'ALL'), 'at least one any-position player');
  assert.ok(ps.some((p) => !p.lookingFor.length), 'at least one empty Looking for cell');
  assert.ok(ps.some((p) => p.winRate == null), 'at least one player with zero games');
});

test('pageState and accountName read the native filters and the account', () => {
  const { document } = parseHTML(capture('1.0_FIND-DUO.html'));
  const s = D.extract.pageState(document, { search: '?region=euw' });
  assert.equal(s.region, 'euw');
  assert.equal(s.position, 'ALL');
  assert.equal(D.extract.accountName(document), 'MyAccount');
});

test('ageMinutes: formats shown by the site', () => {
  const a = D.extract.ageMinutes;
  assert.equal(a('20 mins ago'), 20);
  assert.equal(a('3 hrs ago'), 180);
  assert.equal(a('a day ago'), 1440);
  assert.equal(a('an hour ago'), 60);
  assert.equal(a('2 days ago'), 2880);
  assert.equal(a('just now'), 0);
  assert.equal(a('yesterday'), null);
});
