// secrets.js - Neon connection string, out of reach of the site
// Exposes: DuoGG.secrets.{ get, set, env }
//
// The string lives in the IndexedDB of the origin of the extension
// (chrome-extension://<id>). The service worker and the popup share this
// origin. A content script runs in the origin of the site: the IndexedDB API
// opens the database of the site there, never this one. chrome.storage.local
// is readable by a content script and holds no secret (docs/database/neon.md).
//
// Only background.js loads this file. Listed in the content scripts of the
// manifest, it would write the string into the IndexedDB of the site
// (scripts/check.mjs refuses it).
(function (D) {
  const DB = 'duogg-secrets';
  const STORE = 'kv';
  const KEY = 'neonUrl';
  // Key of chrome.storage.local that held the string up to 2.0.2.
  const LEGACY = 'secrets';

  const env = {
    // Replaced in the tests: Node has no IndexedDB.
    indexedDB: () => globalThis.indexedDB
  };

  function open() {
    return new Promise((resolve, reject) => {
      const req = env.indexedDB().open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function run(mode, fn) {
    const db = await open();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }

  const read = () => run('readonly', (st) => st.get(KEY)).then((v) => v || '');
  const write = (url) => run('readwrite', (st) => (url ? st.put(url, KEY) : st.delete(KEY)));

  // storage: chrome.storage.local. -> Promise<string>, '' without a string.
  // The first read moves a string saved up to 2.0.2, then removes it from
  // chrome.storage.local. A string already in IndexedDB wins.
  async function get(storage) {
    const url = await read();
    const old = await storage.get([LEGACY]);
    if (!old[LEGACY]) return url;
    const legacy = old[LEGACY].neonUrl || '';
    if (!url && legacy) await write(legacy);
    await storage.remove(LEGACY);
    return url || legacy;
  }

  // An empty string clears the secret.
  async function set(url, storage) {
    await write(url);
    await storage.remove(LEGACY);
  }

  D.secrets = { get: get, set: set, env: env };
})(globalThis.DuoGG);
