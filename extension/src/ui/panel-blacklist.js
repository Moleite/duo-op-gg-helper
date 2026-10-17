// panel-blacklist.js - Blacklist tab of the panel: add from a row, list, remove
// Exposes: DuoGG.panelBlacklist.{ create, REASONS, parseRiotId }
//
// The ⛔ button of a row prefills the form (prefill). A removal sets
// removed_at: the row stays in the database and the removal reaches the other
// browsers of the player (docs/database/sync.md).
(function (D) {
  const h = D.h;
  const lol = D.lol;
  const REASONS = ['Toxic', 'Troll or inting', 'AFK or leaver', 'Level too low', 'Other'];

  // `Name#TAG` -> { gameName, tagLine }. The tag is optional.
  function parseRiotId(s) {
    const t = String(s || '').trim();
    const i = t.lastIndexOf('#');
    if (i <= 0) return { gameName: t, tagLine: null };
    return { gameName: t.slice(0, i).trim(), tagLine: t.slice(i + 1).trim() || null };
  }

  function fmtDate(t) {
    return t ? new Date(t).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';
  }

  function create(actions) {
    let context = null;
    const riot = h('input', { placeholder: 'Name#TAG', style: { flex: '1' } });
    const reason = h('select', {}, REASONS.map((r) => h('option', { value: r }, r)));
    const note = h('textarea', { placeholder: 'Note (private, only you see it)' });
    const hint = h('div', { class: 'hint' });
    const search = h('input', { placeholder: 'Search the blacklist', oninput: () => renderList() });
    const list = h('div', { class: 'list' });
    const count = h('h4', {}, 'Blacklist');
    let entries = [];

    const addBtn = h('button', { class: 'btn', onclick: async () => {
      const id = parseRiotId(riot.value);
      if (!id.gameName) { hint.className = 'hint warn'; hint.textContent = 'Type a name.'; return; }
      const entry = Object.assign({}, context || {}, id, { reason: reason.value, note: note.value.trim() || null });
      try {
        await actions.blacklistAdd(entry);
        hint.className = 'hint ok';
        hint.textContent = 'Added: ' + id.gameName + (id.tagLine ? '#' + id.tagLine : ' (every tag)');
        riot.value = ''; note.value = ''; context = null;
      } catch (e) { hint.className = 'hint err'; hint.textContent = e.message; }
    } }, 'Add');

    function prefill(p) {
      context = {
        region: p.region || null, position: p.position || null,
        rank: p.rank ? lol.rankLabel(p.rank) : null,
        champion: p.champions && p.champions[0] ? p.champions[0].name : null, partnerId: p.id
      };
      riot.value = p.gameName ? p.gameName + (p.tagLine ? '#' + p.tagLine : '') : '';
      hint.className = 'hint';
      hint.textContent = [lol.POSITION_LABELS[p.position], context.rank, context.champion].filter(Boolean).join(' · ');
      note.focus();
    }

    function renderList() {
      const q = search.value.trim().toLowerCase();
      const shown = entries.filter((e) => !q || (e.key + ' ' + (e.note || '') + ' ' + (e.reason || '')).toLowerCase().indexOf(q) >= 0);
      D.clear(list);
      if (!shown.length) list.appendChild(h('div', { class: 'hint' }, entries.length ? 'No match.' : 'Empty blacklist.'));
      shown.forEach((e) => list.appendChild(h('div', { class: 'item' },
        h('div', { class: 'txt' },
          h('div', {}, h('b', {}, e.gameName + (e.tagLine ? '#' + e.tagLine : '')), ' · ', e.reason || '?'),
          e.note ? h('div', { class: 'hint', title: e.note }, e.note) : null,
          h('div', { class: 'hint' }, [lol.POSITION_LABELS[e.position], e.rank, e.champion, fmtDate(e.updatedAt)].filter(Boolean).join(' · '))),
        h('button', { class: 'btn ghost small', title: 'Remove from the blacklist', onclick: () => actions.blacklistRemove(e.key) }, 'Remove'))));
    }

    const el = h('div', { class: 'sec' },
      h('div', { class: 'sec' }, h('h4', {}, 'Add'),
        h('div', { class: 'row' }, riot), h('div', { class: 'row' }, h('label', {}, 'Reason'), reason), note, addBtn, hint),
      h('div', { class: 'sec' }, count, search, list));

    function update(view) {
      entries = Object.values(view.db.blacklist).filter((e) => !e.removedAt)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      count.textContent = 'Blacklist (' + entries.length + ')';
      renderList();
    }

    return { el: el, update: update, prefill: prefill };
  }

  D.panelBlacklist = { create: create, REASONS: REASONS, parseRiotId: parseRiotId };
})(globalThis.DuoGG);
