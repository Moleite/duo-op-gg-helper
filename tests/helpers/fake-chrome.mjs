// fake-chrome.mjs - Fake chrome.storage and fake Neon for the tests
// Exposes: storage(), chromeFor(getWorker, store, sender), neonOnPglite(pg)
//
// storage() mimics chrome.storage.local: get, set, remove, and onChanged
// after each write. neonOnPglite() answers like the HTTP API of Neon, by running the batch
// in PGlite under the role named by the connection string.

export function storage() {
  const data = {};
  const listeners = [];
  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  return {
    data: data,
    listeners: listeners,
    async get(keys) {
      const out = {};
      (Array.isArray(keys) ? keys : [keys]).forEach((k) => { if (k in data) out[k] = clone(data[k]); });
      return out;
    },
    async set(obj) {
      const changes = {};
      Object.keys(obj).forEach((k) => {
        changes[k] = { oldValue: clone(data[k]), newValue: clone(obj[k]) };
        data[k] = clone(obj[k]);
      });
      listeners.forEach((l) => l(changes, 'local'));
    },
    async remove(keys) {
      const changes = {};
      (Array.isArray(keys) ? keys : [keys]).filter((k) => k in data).forEach((k) => {
        changes[k] = { oldValue: clone(data[k]) };
        delete data[k];
      });
      if (Object.keys(changes).length) listeners.forEach((l) => l(changes, 'local'));
    }
  };
}

// chrome.runtime and chrome.storage wired to the worker of the extension.
// tabs.query answers with `tab`; tabs.sendMessage with tab.ping, or no
// receiver.
export function chromeFor(getWorker, store, sender, tab) {
  return {
    tabs: {
      query: async () => (tab ? [tab] : []),
      sendMessage: async () => {
        if (!tab || !tab.ping) throw new Error('Could not establish connection. Receiving end does not exist.');
        return tab.ping;
      }
    },
    runtime: {
      // Chrome removes runtime.id under a content script once the extension
      // reloads: a test deletes it to play that case.
      id: 'test-extension',
      getURL: (p) => 'chrome-extension://test-extension/' + p,
      getManifest: () => ({ version: 'test' }),
      // Listeners of the content script, called by a test.
      onMessage: { listeners: [], addListener(l) { this.listeners.push(l); } },
      async sendMessage(msg) {
        try {
          return { ok: true, result: await getWorker().handle(msg, sender || { tab: { id: 1 } }) };
        } catch (e) {
          return { ok: false, error: e.message };
        }
      }
    },
    storage: {
      local: store,
      onChanged: { addListener: (l) => store.listeners.push(l) }
    }
  };
}

export function neonOnPglite(pg) {
  return async (url, init) => {
    const role = decodeURIComponent(init.headers['Neon-Connection-String'].match(/^postgresql:\/\/([^:]+):/)[1]);
    const body = JSON.parse(init.body);
    try {
      const results = await pg.transaction(async (tx) => {
        await tx.exec(`set local role ${role}`);
        const out = [];
        for (const q of body.queries) {
          const r = await tx.query(q.query, q.params);
          out.push({ rows: r.rows, rowCount: r.affectedRows });
        }
        return out;
      });
      return { ok: true, status: 200, text: async () => JSON.stringify({ results: results }) };
    } catch (e) {
      return { ok: false, status: 400, text: async () => JSON.stringify({ message: e.message }) };
    }
  };
}
