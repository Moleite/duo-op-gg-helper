// popup.test.mjs - Popup of the extension loaded from popup.html
//
// The scripts load in the order of the <script> tags of popup.html: a file
// missing from the page is also missing here.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseHTML } from 'linkedom';
import { load, WORKER, ROOT } from './helpers/ext.mjs';
import { IDBFactory } from 'fake-indexeddb';
import { storage, chromeFor } from './helpers/fake-chrome.mjs';

const html = fs.readFileSync(path.join(ROOT, 'extension', 'popup.html'), 'utf8');
const { window, document } = parseHTML(html);
const store = storage();
const idb = new IDBFactory();
Object.assign(globalThis, { window: window, document: document, localStorage: undefined,
  chrome: chromeFor(() => globalThis.DuoGG.worker, store, {}) });
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
const D = load(WORKER.concat(scripts.filter((s) => s !== 'popup.js')));
D.worker.env.storage = store;
D.secrets.env.indexedDB = () => idb;
D.worker.env.pushDelayMs = 0;
load(['popup.js']);
const wait = (ms) => new Promise((r) => setTimeout(r, ms || 30));
const buttons = (label) => [...document.querySelectorAll('button')].filter((b) => b.textContent === label);

test('the three tabs are shown', async () => {
  await wait();
  assert.deepEqual([...document.querySelectorAll('nav button')].map((b) => b.textContent), ['Profiles', 'Blacklist', 'Neon']);
  assert.match(document.body.textContent, /No connection string saved/);
});

test('blacklist import in the v1 format', async () => {
  const area = [...document.querySelectorAll('textarea')].find((t) => /Name#TAG/.test(t.getAttribute('placeholder')));
  area.value = '# comment\nOne\t# note\nTwo#EUW';
  buttons('Import')[0].dispatchEvent(new window.Event('click'));
  await wait();
  const db = store.data.db;
  assert.deepEqual(Object.keys(db.blacklist).sort(), ['one', 'two#euw']);
  assert.match(document.body.textContent, /2 player\(s\) in the blacklist/);
});

test('a saved profile becomes active', async () => {
  const riot = document.querySelector('input[placeholder="Name#TAG"]');
  riot.value = 'Me#EUW';
  buttons('Save')[0].dispatchEvent(new window.Event('click'));
  await wait();
  const p = D.model.activeProfile(store.data.db);
  assert.equal(p.gameName, 'Me');
  assert.equal(p.tagLine, 'EUW');
});
