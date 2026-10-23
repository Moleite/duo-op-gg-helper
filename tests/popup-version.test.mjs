// popup-version.test.mjs - Popup opened while Chrome still runs the previous version
//
// Case met on twitch-stalker with the previous version loaded and the new
// one on the disk: the popup comes from the disk, the service worker and the
// content script do not. A service worker without the `version` message
// hid the new version, and the popup asked for F5 instead of a reload of
// the extension. One file per case: node --test runs each file in its own
// process, with fresh globals.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseHTML } from 'linkedom';
import { IDBFactory } from 'fake-indexeddb';
import { load, WORKER, ROOT, until } from './helpers/ext.mjs';
import { storage, chromeFor } from './helpers/fake-chrome.mjs';

const html = fs.readFileSync(path.join(ROOT, 'extension', 'popup.html'), 'utf8');
const { window, document } = parseHTML(html);
const store = storage();
const fake = chromeFor(() => oldWorker, store, {}, { id: 4, url: 'https://duo.op.gg/en/lol/' });
Object.assign(globalThis, { window: window, document: document, localStorage: undefined, chrome: fake });
// manifest.json on the disk: a newer version than the one loaded ('test').
globalThis.fetch = async (url) => ({ json: async () => (url === 'chrome-extension://test-extension/manifest.json' ? { version: '9.9.9' } : {}) });
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
const D = load(WORKER.concat(scripts.filter((s) => s !== 'popup.js')));
D.worker.env.storage = store;
D.worker.env.pushDelayMs = 0;
D.secrets.env.indexedDB = () => new IDBFactory();
// Service worker of the previous version: no `version` message.
const oldWorker = {
  handle: (msg, sender) => (msg.type === 'version' ? Promise.reject(new Error('Unknown message: version')) : D.worker.handle(msg, sender))
};
load(['popup.js']);

test('the popup reads the disk itself and asks for a reload of the extension', async () => {
  await until(() => !document.getElementById('notice').hidden);
  assert.equal(document.getElementById('notice').textContent,
    'Version 9.9.9 available: reload the extension (chrome://extensions, ↻), then F5 on the page of the site.');
});
