// neon.js - Postgres client for Neon, over HTTP, without dependency
// Exposes: DuoGG.neon.{ parse, batch }
//
// HTTP contract of Neon, read in the source of the @neondatabase/serverless
// driver and already in use in BotEd_MDF:
//   POST https://<host>/sql
//   Headers: Neon-Connection-String, Neon-Raw-Text-Output, Neon-Array-Mode
//   Body   : {queries: [{query, params}]} -> {results: [...]}, one transaction
//
// Loaded by the service worker only: the connection string never goes
// through a content script (docs/database/neon.md).
(function (D) {
  // postgresql://user:pass@host[:port]/db?params -> { host, user, db, connectionString }
  function parse(connStr) {
    if (!connStr) return null;
    const s = String(connStr).trim();
    const m = s.match(/^postgres(?:ql)?:\/\/([^:@/]*)(?::[^@]*)?@([^/:?]+)(?::\d+)?(?:\/([^?]*))?/i);
    if (!m) return null;
    return {
      host: m[2],
      user: decodeURIComponent(m[1] || '') || null,
      db: decodeURIComponent(m[3] || '') || null,
      connectionString: s
    };
  }

  // Several queries, all or nothing, in one round trip.
  async function batch(conn, queries, opts) {
    const o = opts || {};
    const f = o.fetch || globalThis.fetch;
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), o.timeoutMs || D.config.neon.requestTimeoutMs) : null;
    try {
      const res = await f('https://' + conn.host + '/sql', {
        method: 'POST',
        signal: ctrl ? ctrl.signal : undefined,
        headers: {
          'Content-Type': 'application/json',
          'Neon-Connection-String': conn.connectionString,
          // 'false': the server types the JSON (numbers, booleans) and returns
          // {column: value} objects.
          'Neon-Raw-Text-Output': 'false',
          'Neon-Array-Mode': 'false'
        },
        body: JSON.stringify({ queries: queries })
      });
      const txt = await res.text();
      let data = null;
      try { data = JSON.parse(txt); } catch (e) { /* not a JSON response */ }
      if (!res.ok) {
        const msg = (data && (data.message || data.error)) || txt.slice(0, 200) || 'HTTP ' + res.status;
        throw new Error('Neon ' + res.status + ': ' + msg);
      }
      return (data && data.results) || [];
    } catch (e) {
      if (e && e.name === 'AbortError') throw new Error('Neon: no response within ' + Math.round((o.timeoutMs || D.config.neon.requestTimeoutMs) / 1000) + ' s');
      throw e;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  D.neon = { parse: parse, batch: batch };
})(globalThis.DuoGG);
