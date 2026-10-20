// client.js - Store access from a tab or the popup
// Exposes: DuoGG.client.{ send, op, read, onChange }
//
// Reads chrome.storage.local directly, writes by message to the service
// worker (store/worker.js), the only writer. chrome.storage.local holds no
// secret: the connection string lives in store/secrets.js.
(function (D) {
  function explain(e) {
    const m = String((e && e.message) || e);
    if (/Extension context invalidated/i.test(m)) return 'Extension reloaded: reload the page (F5).';
    return m;
  }

  async function send(msg) {
    // The first message can arrive while Chrome restarts the service worker:
    // a second attempt is enough.
    for (let i = 0; i < 2; i++) {
      try {
        const r = await chrome.runtime.sendMessage(msg);
        if (!r) throw new Error('No response from the service worker.');
        if (!r.ok) throw new Error(r.error);
        return r.result;
      } catch (e) {
        if (i === 0 && /Receiving end does not exist|Could not establish connection/i.test(String(e && e.message))) continue;
        throw new Error(explain(e));
      }
    }
    return null;
  }

  function op(o) { return send({ type: 'op', op: o }); }

  async function read() {
    const r = await chrome.storage.local.get(['db']);
    return r.db && r.db.v === 1 ? r.db : D.model.emptyDb();
  }

  function onChange(cb) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.db) cb(changes.db.newValue || D.model.emptyDb());
    });
  }

  D.client = { send: send, op: op, read: read, onChange: onChange };
})(globalThis.DuoGG);
