// page.test.mjs - Full content script on a capture of the site
//
// Loads the service worker and every file of the content script, in the
// order of the manifest, on DOM/1.0_FIND-DUO.html. The messages go through a
// fake chrome.runtime to the real worker. The test sees neither the CSS nor
// the layout: a visual check in Chrome stays necessary.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { load, WORKER, CONTENT, capture, until } from './helpers/ext.mjs';
import { IDBFactory } from 'fake-indexeddb';
import { storage, chromeFor } from './helpers/fake-chrome.mjs';

const { window, document } = parseHTML(capture('1.0_FIND-DUO.html'));
const store = storage();
const idb = new IDBFactory();
window.innerWidth = 1600;
window.innerHeight = 900;
Object.assign(globalThis, {
  window: window, document: document, top: globalThis,
  location: { search: '?region=euw', href: 'https://duo.op.gg/en/lol/?region=euw' },
  MutationObserver: window.MutationObserver,
  chrome: chromeFor(() => globalThis.DuoGG.worker, store)
});
// Node 21+ defines navigator as read-only: it is redefined here.
Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText: async () => {} } }, configurable: true });

// API of the site: two older posts on page 2, nothing after.
const OLD = (id, name, at) => ({
  id: id, position: 'SUPPORT', requiredPosition: ['BOTTOM'], note: 'n', insertedAt: at, queueType: 'RANKED_SOLO',
  summoner: { gameName: name, tagLine: 'OLD', tier: 'Emerald 1', wins: 30, losses: 20, kdaAverage: 3, opScore: 6, region: 'euw', champions: [] }
});
const calls = [];
globalThis.fetch = async (url, init) => {
  const v = JSON.parse(init.body).variables;
  calls.push(v);
  const partners = v.from === undefined ? [OLD('10876326', 'Player01', '2026-10-17T10:00:00Z')]
    : calls.length === 2 ? [OLD('900', 'Older', '2026-10-15T10:00:00Z'), OLD('901', 'Older2', '2026-10-15T09:00:00Z')] : [];
  return { ok: true, json: async () => ({ data: { partners: partners } }) };
};

const D = load(WORKER.concat(CONTENT));
D.worker.env.storage = store;
D.secrets.env.indexedDB = () => idb;
D.worker.env.pushDelayMs = 0;
const wait = (ms) => new Promise((r) => setTimeout(r, ms || 30));
const rows = () => D.extract.rows(document);
const state = (st) => rows().filter((li) => li.getAttribute('data-duogg') === st).length;

test('on load: panel mounted, duplicates hidden, no row removed', async () => {
  await until(() => document.getElementById('duogg-root') && state('hidden') > 0);
  assert.ok(document.getElementById('duogg-root'), 'panel');
  assert.ok(document.getElementById('duogg-style'), 'style sheet');
  assert.equal(rows().length, 50);
  assert.equal(state('hidden'), 3, 'the three duplicates of the capture');
  rows().filter((li) => li.getAttribute('data-duogg') === 'hidden')
    .forEach((li) => assert.equal(li.getAttribute('data-duogg-why'), 'Duplicate'));
});

test('my position and my rank hide posts, dimming replaces hiding', async () => {
  await D.app.actions.setFilters({ myPosition: 'SUPPORT', myRank: 'Emerald 2' });
  await wait();
  const ps = rows().map(D.extract.partner);
  const expected = D.engine.evaluate(ps, D.model.filtersOf(D.app.state.db), { blacklist: new Map() });
  assert.equal(state('hidden'), expected.total - expected.visible);
  assert.ok(state('hidden') > 3);
  await D.app.actions.setFilters({ showHidden: true });
  await wait();
  assert.equal(state('hidden'), 0);
  assert.equal(state('dim'), expected.total - expected.visible);
  await D.app.actions.setFilters({ showHidden: false, myPosition: 'ALL', myRank: '' });
  await wait();
});

test('blacklist from the page: the row is hidden, then comes back on removal', async () => {
  const li = D.extract.rowOf('10876326', document);
  await D.app.actions.blacklistAdd({ gameName: 'Player01', tagLine: '0001', reason: 'Toxic' });
  await wait();
  assert.equal(li.getAttribute('data-duogg'), 'hidden');
  assert.equal(li.getAttribute('data-duogg-why'), 'Blacklist');
  await D.app.actions.blacklistRemove('player01#0001');
  await wait();
  assert.equal(li.getAttribute('data-duogg'), 'shown');
});

test('sorting: CSS order property, without moving nodes', async () => {
  const before = rows().map(D.extract.partnerIdOf).join();
  await D.app.actions.setFilters({ sort: 'winRate' });
  await wait();
  assert.equal(rows().map(D.extract.partnerIdOf).join(), before, 'DOM order unchanged');
  const best = rows().filter((li) => li.style.order === '0')[0];
  const max = Math.max(...rows().map(D.extract.partner).map((p) => p.winRate || 0));
  assert.equal(D.extract.partner(best).winRate, max);
  await D.app.actions.setFilters({ sort: 'site' });
});

test('show more: cursor, page 2 rendered under the table', async () => {
  await D.app.actions.more();
  await wait();
  assert.equal(calls[0].from, undefined, 'first page without from');
  assert.equal(calls[1].from, Math.floor(Date.parse('2026-10-17T10:00:00Z') / 1000));
  const box = document.getElementById('duogg-more');
  assert.ok(box, 'block of older posts');
  assert.equal(box.querySelectorAll('li.duogg-x').length, 2);
  assert.match(D.app.state.more.message, /End of the site list/);
  assert.equal(rows().length, 50, 'the table of the site is intact');
});

// A write of the extension that the observer would take for a mutation of
// the site would restart scan() forever (case met on #duogg-more).
test('no loop: without a mutation of the site, no new scan', async () => {
  await wait(300);
  let n = 0;
  const orig = D.extract.rows;
  D.extract.rows = function () { n++; return orig.apply(this, arguments); };
  await wait(500);
  D.extract.rows = orig;
  assert.equal(n, 0);
});
