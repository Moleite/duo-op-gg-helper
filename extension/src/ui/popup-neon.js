// popup-neon.js - Neon tab of the popup: connection string, sync, status
// Exposes: DuoGG.popupNeon.{ create, maskUrl }
//
// Secret field: the value is never shown again. An empty field keeps the
// current value. The status under the field says whether a value exists, the
// Sync button says whether it works (role read back with current_user).
(function (D) {
  const h = D.h;

  // postgresql://role:password@host/database -> role@host/database
  function maskUrl(user, host, db) {
    return (user || '?') + '@' + (host || '?') + (db ? '/' + db : '');
  }

  function when(t) {
    return t ? new Date(t).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : 'never';
  }

  function create(ctx) {
    const input = h('input', { type: 'password', autocomplete: 'off' });
    const status = h('div', { class: 'hint' });
    const result = h('div', { class: 'hint' });
    const info = h('div', { class: 'hint' });

    async function save(value) {
      try {
        const r = await ctx.send({ type: 'secret.set', neonUrl: value });
        input.value = '';
        ctx.refresh(r);
        result.className = 'hint ok';
        result.textContent = value ? 'Connection string saved. Click Sync to test it.' : 'Connection string cleared.';
      } catch (e) { result.className = 'hint err'; result.textContent = e.message; }
    }

    const saveBtn = h('button', { class: 'btn', onclick: () => { if (input.value.trim()) save(input.value.trim()); } }, 'Save');
    const clearBtn = h('button', { class: 'btn danger', onclick: () => save('') }, 'Clear');
    const syncBtn = h('button', { class: 'btn ghost', onclick: async () => {
      syncBtn.disabled = true;
      result.className = 'hint';
      result.textContent = 'Syncing…';
      try {
        const r = await ctx.send({ type: 'sync' });
        result.className = 'hint ok';
        result.textContent = 'Connected as ' + r.role + ' on ' + r.db + '. ' + r.pushed + ' row(s) sent.';
      } catch (e) { result.className = 'hint err'; result.textContent = e.message; }
      syncBtn.disabled = false;
    } }, 'Sync');
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveBtn.click(); });

    const el = h('div', { class: 'card' }, h('h3', {}, 'Neon database'),
      h('div', { class: 'hint' }, 'Connection string of the Neon role of this player (never the one of neondb_owner). Without it, everything stays in this browser.'),
      input, h('div', { class: 'btns' }, saveBtn, syncBtn, clearBtn), status, result, info);

    function update(state) {
      const n = state.neon || {};
      input.placeholder = n.configured ? 'Saved (leave empty to keep it)' : 'postgresql://duogg_player:...@ep-...neon.tech/neondb';
      status.className = 'hint' + (n.configured ? ' ok' : '');
      status.textContent = n.configured ? 'Connection string saved (' + maskUrl(n.user, n.host, n.dbName) + ')' : 'No connection string saved';
      syncBtn.disabled = !n.configured;
      clearBtn.disabled = !n.configured;
      const s = state.db.sync || {};
      const dirty = Object.keys(state.db.dirty.profiles).length + Object.keys(state.db.dirty.blacklist).length;
      info.className = 'hint' + (s.error ? ' err' : '');
      info.textContent = 'Last sync: ' + when(s.lastPullAt) + (s.role ? ' (' + s.role + ')' : '') +
        ' · waiting to be sent: ' + dirty + (s.error ? ' · error: ' + s.error : '');
    }

    return { el: el, update: update };
  }

  D.popupNeon = { create: create, maskUrl: maskUrl };
})(globalThis.DuoGG);
