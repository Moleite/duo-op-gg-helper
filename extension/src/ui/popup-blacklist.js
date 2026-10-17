// popup-blacklist.js - Blacklist tab of the popup: import of the v1 format, copy of the list
// Exposes: DuoGG.popupBlacklist.{ create, parseList, formatList }
//
// Text format of the v1 (blacklist.txt): one name per line, `#` at the start
// of a line for a comment, `# text` after the name for a note. A name can
// carry its tag: `Name#EUW1 # note`. The note separator is therefore ` #`
// preceded by a space or a tab.
(function (D) {
  const h = D.h;

  function parseList(text) {
    const out = [];
    String(text || '').split(/\r?\n/).forEach((raw) => {
      const line = raw.trim();
      if (!line || line[0] === '#') return;
      const m = line.match(/^(.*?)(?:\s+#\s*(.*))?$/);
      const who = (m[1] || '').trim();
      if (!who) return;
      const i = who.lastIndexOf('#');
      out.push({
        gameName: i > 0 ? who.slice(0, i).trim() : who,
        tagLine: i > 0 ? who.slice(i + 1).trim() || null : null,
        note: m[2] ? m[2].trim() : null,
        reason: 'Import'
      });
    });
    return out;
  }

  function formatList(entries) {
    return entries.map((e) => (e.gameName + (e.tagLine ? '#' + e.tagLine : '')) +
      (e.note || e.reason ? '\t# ' + [e.reason, e.note].filter(Boolean).join(' - ') : '')).join('\n');
  }

  function create(ctx) {
    let entries = [];
    const count = h('div', { class: 'hint' });
    const area = h('textarea', { placeholder: 'Name\t# note\nName#TAG\t# note' });
    const hint = h('div', { class: 'hint' });
    const importBtn = h('button', { class: 'btn', onclick: async () => {
      const list = parseList(area.value);
      if (!list.length) { hint.className = 'hint warn'; hint.textContent = 'No name found.'; return; }
      try {
        await ctx.op({ kind: 'blacklist.import', entries: list });
        hint.className = 'hint ok';
        hint.textContent = list.length + ' name(s) imported. A name without a tag matches every tag.';
        area.value = '';
      } catch (e) { hint.className = 'hint err'; hint.textContent = e.message; }
    } }, 'Import');
    const copyBtn = h('button', { class: 'btn ghost', onclick: async () => {
      try {
        await navigator.clipboard.writeText(formatList(entries));
        hint.className = 'hint ok'; hint.textContent = 'List copied as text.';
      } catch (e) { hint.className = 'hint err'; hint.textContent = 'Copy refused: ' + e.message; }
    } }, 'Copy the list');

    const el = h('div', { class: 'card' }, h('h3', {}, 'Blacklist'), count,
      h('div', { class: 'hint' }, 'To add a player: ⛔ button on their row, in the table of the site. To import a list in the v1 format:'),
      area, h('div', { class: 'btns' }, importBtn, copyBtn), hint);

    function update(state) {
      entries = Object.values(state.db.blacklist).filter((e) => !e.removedAt);
      count.textContent = entries.length + ' player(s) in the blacklist.';
    }

    return { el: el, update: update };
  }

  D.popupBlacklist = { create: create, parseList: parseList, formatList: formatList };
})(globalThis.DuoGG);
