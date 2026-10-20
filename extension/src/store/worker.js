// worker.js - Service worker: operations on the local database and Neon sync
// Exposes: DuoGG.worker.{ handle, sync, env }; listens to chrome.runtime.onMessage
//
// Only context that writes chrome.storage.local. The tabs and the popup send
// messages (store/client.js): two contexts that rewrite the same key would
// overwrite each other, chrome.storage has no transaction.
//
// Only context that reads the connection string, kept by store/secrets.js
// outside chrome.storage. A message from a tab can neither read nor change
// it: the DOM of the site is shared with its scripts and its trackers
// (docs/database/neon.md).
//
// Sync: one round trip pushes the changed rows, then reads everything back
// (docs/database/sync.md).
(function (D) {
  const M = D.model;

  const env = {
    storage: globalThis.chrome && globalThis.chrome.storage ? globalThis.chrome.storage.local : null,
    fetch: (...a) => globalThis.fetch(...a),
    now: () => Date.now(),
    // Delay between an operation and its push: a burst of clicks becomes one
    // wake-up of the database. 0 disables the automatic push (tests).
    pushDelayMs: 1500
  };

  let queue = Promise.resolve();
  function serial(fn) {
    const p = queue.then(fn, fn);
    queue = p.catch(() => {});
    return p;
  }

  async function readDb() {
    const r = await env.storage.get(['db']);
    return r.db && r.db.v === 1 ? r.db : M.emptyDb();
  }
  function writeDb(db) { return env.storage.set({ db: db }); }

  async function connection() {
    return D.neon.parse(await D.secrets.get(env.storage));
  }

  async function publicState(db) {
    const conn = await connection();
    return {
      db: db,
      neon: conn ? { configured: true, user: conn.user, host: conn.host, dbName: conn.db } : { configured: false },
      version: D.version
    };
  }

  // ---- Sync ---------------------------------------------------------------
  let pushTimer = null;
  function schedule() {
    if (pushTimer) clearTimeout(pushTimer);
    if (!env.pushDelayMs) return;
    pushTimer = setTimeout(() => { pushTimer = null; sync().catch(() => {}); }, env.pushDelayMs);
  }

  async function sync() {
    const conn = await connection();
    if (!conn) throw new Error('No Neon connection string saved.');
    // Read outside the queue: an operation made during the call stays dirty
    // and leaves with the next push (clearDirty compares updatedAt).
    const rows = M.dirtyRows(await readDb());
    const queries = D.sql.pushQueries(rows).concat(D.sql.pullQueries().slice(1));
    let results;
    try {
      results = await D.neon.batch(conn, queries, { fetch: env.fetch });
    } catch (e) {
      await serial(async () => {
        const db = await readDb();
        db.sync = Object.assign({}, db.sync, { error: e.message, errorAt: env.now() });
        await writeDb(db);
      });
      throw e;
    }
    const n = results.length;
    const server = D.sql.readPull([results[0], results[n - 2], results[n - 1]]);
    return serial(async () => {
      const now = env.now();
      let db = M.clearDirty(await readDb(), rows, now);
      db = M.mergePull(db, server, now);
      await writeDb(db);
      return { pushed: rows.profiles.length + rows.blacklist.length, role: server.role, db: server.db };
    });
  }

  // ---- Messages ----------------------------------------------------------
  function fromTab(sender) { return !!(sender && sender.tab); }

  async function handle(msg, sender) {
    switch (msg && msg.type) {
      case 'state':
        return publicState(await readDb());
      case 'op': {
        const db = await serial(async () => {
          const next = M.applyOp(await readDb(), msg.op, env.now());
          await writeDb(next);
          return next;
        });
        if ((await connection()) && Object.keys(db.dirty.profiles).length + Object.keys(db.dirty.blacklist).length) schedule();
        return publicState(db);
      }
      case 'page.open':
        return pageOpen(msg.account || null);
      case 'sync':
        return sync();
      case 'secret.set': {
        if (fromTab(sender)) throw new Error('Secret refused from a tab.');
        const url = String(msg.neonUrl || '').trim();
        if (url && !D.neon.parse(url)) throw new Error('Unreadable connection string: postgresql://role:password@host/database expected.');
        await D.secrets.set(url, env.storage);
        return publicState(await readDb());
      }
      default:
        throw new Error('Unknown message: ' + (msg && msg.type));
    }
  }

  // A page of the site opens: profile of the signed-in op.gg account, then a
  // pull when the local cache is older than config.neon.pullTtlMs.
  async function pageOpen(account) {
    const db = await serial(async () => {
      let cur = await readDb();
      const acc = account ? account.toLowerCase() : null;
      if (acc && acc !== cur.ui.lastAccount) {
        const match = Object.values(cur.profiles).find((p) => !p.removedAt && p.opggAccount && p.opggAccount.toLowerCase() === acc);
        cur = M.applyOp(cur, { kind: 'ui.set', ui: { lastAccount: acc } }, env.now());
        if (match) cur = M.applyOp(cur, { kind: 'profile.select', id: match.id }, env.now());
        await writeDb(cur);
      }
      return cur;
    });
    const stale = !db.sync.lastPullAt || env.now() - db.sync.lastPullAt > D.config.neon.pullTtlMs;
    if (stale && (await connection())) sync().catch(() => {});
    return publicState(db);
  }

  if (globalThis.chrome && globalThis.chrome.runtime && globalThis.chrome.runtime.onMessage) {
    globalThis.chrome.runtime.onMessage.addListener((msg, sender, reply) => {
      handle(msg, sender).then(
        (r) => reply({ ok: true, result: r }),
        (e) => reply({ ok: false, error: e && e.message ? e.message : String(e) })
      );
      return true;
    });
  }

  D.worker = { handle: handle, sync: sync, env: env };
})(globalThis.DuoGG);
