// ext.mjs - Loads the modules of the extension in Node, like Chrome
// Exposes: load(files), CONTENT, WORKER, ROOT, capture(name), until(cond)
//
// Chrome loads the files of extension/src as classic scripts, in the order of
// the manifest. vm.runInThisContext does the same: a module missing from the
// manifest is also missing in the tests.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EXT = path.join(ROOT, 'extension');
const manifest = JSON.parse(fs.readFileSync(path.join(EXT, 'manifest.json'), 'utf8'));

// Files of the content script, in the order of the manifest.
export const CONTENT = manifest.content_scripts[0].js;

// Files of the service worker, in the order of importScripts() in background.js.
export const WORKER = [...fs.readFileSync(path.join(EXT, 'background.js'), 'utf8')
  .matchAll(/['"]([^'"]+\.js)['"]/g)].map((m) => m[1]).filter((f) => f.startsWith('src/'));

const loaded = new Set();

export function load(files) {
  for (const f of files) {
    if (loaded.has(f)) continue;
    const code = fs.readFileSync(path.join(EXT, f), 'utf8');
    vm.runInThisContext(code, { filename: f });
    loaded.add(f);
  }
  return globalThis.DuoGG;
}

export function capture(name) {
  return fs.readFileSync(path.join(ROOT, 'DOM', name), 'utf8');
}

// Waits until cond() is true, 2 s at most, then lets the assertions speak.
// A fixed delay passes on a fast machine and fails on the CI runner: a
// message to the worker goes through IndexedDB and chrome.storage.
export async function until(cond, ms = 2000) {
  const end = Date.now() + ms;
  while (!cond() && Date.now() < end) await new Promise((r) => setTimeout(r, 10));
}
