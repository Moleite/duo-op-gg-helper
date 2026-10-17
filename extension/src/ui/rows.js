// rows.js - Hides, dims and sorts the rows of the site, row actions on hover
// Exposes: DuoGG.rows.{ apply, reset, reasonLabel, mountTools }
//
// React manages the <li> rows of the table. The extension removes, moves and
// creates none of them: it sets attributes (data-duogg, data-duogg-why) and
// the CSS `order` property. Removing a node that React tracks breaks its next
// render (removeChild on a missing node).
//
// The row action bar lives in its own shadow root, outside the React tree.
(function (D) {
  const S = D.SELECTORS;

  function reasonLabel(reasons) {
    return reasons.map((id) => (D.RULES.find((r) => r.id === id) || { label: id }).label).join(' · ');
  }

  // result: engine.evaluate; order: ids in display order.
  function apply(doc, result, order, showHidden) {
    const pos = new Map(order.map((id, i) => [id, i]));
    const lists = new Set();
    D.extract.rows(doc).forEach((li) => {
      const id = D.extract.partnerIdOf(li);
      const d = result.byId.get(id);
      const hidden = !!(d && d.hidden);
      const state = hidden ? (showHidden ? 'dim' : 'hidden') : 'shown';
      // Write only what changes: an attribute rewritten with the same value
      // is still a mutation for some observers.
      if (li.getAttribute('data-duogg') !== state) li.setAttribute('data-duogg', state);
      const why = hidden ? reasonLabel(d.reasons) : null;
      if (why && li.getAttribute('data-duogg-why') !== why) li.setAttribute('data-duogg-why', why);
      else if (!why && li.hasAttribute('data-duogg-why')) li.removeAttribute('data-duogg-why');
      const o = pos.has(id) ? String(pos.get(id)) : '';
      if (li.style.order !== o) li.style.order = o;
      if (li.parentElement) lists.add(li.parentElement);
    });
    lists.forEach((ul) => { if (!ul.hasAttribute('data-duogg-list')) ul.setAttribute('data-duogg-list', ''); });
  }

  function reset(doc) {
    D.extract.rows(doc).forEach((li) => {
      li.removeAttribute('data-duogg');
      li.removeAttribute('data-duogg-why');
      li.style.order = '';
    });
  }

  // Bar shown over the hovered row: blacklist, hide. onAction(kind, id).
  function mountTools(onAction) {
    const host = document.createElement('div');
    host.id = 'duogg-tools';
    document.documentElement.appendChild(host);
    const root = host.attachShadow({ mode: 'closed' });
    root.appendChild(D.h('style', { text: D.style.PANEL_CSS }));
    let current = null;
    const box = D.h('div', { class: 'tools' },
      D.h('button', { title: 'Add to the blacklist', onclick: () => current && onAction('blacklist', current) }, '⛔'),
      D.h('button', { title: 'Hide this post until the page reloads', onclick: () => current && onAction('hide', current) }, '🙈'));
    root.appendChild(box);

    function hide() { box.style.display = 'none'; current = null; }

    document.addEventListener('mouseover', (e) => {
      if (e.target === host) return;
      const li = e.target && e.target.closest ? e.target.closest(S.row.css) : null;
      const id = li ? D.extract.partnerIdOf(li) : null;
      if (!id) { hide(); return; }
      current = id;
      const r = li.getBoundingClientRect();
      box.style.display = 'flex';
      box.style.top = Math.round(r.top + r.height / 2 - 12) + 'px';
      box.style.left = Math.round(r.right - 112) + 'px';
    }, true);
    window.addEventListener('scroll', hide, { passive: true });
    return { hide: hide };
  }

  D.rows = { apply: apply, reset: reset, reasonLabel: reasonLabel, mountTools: mountTools };
})(globalThis.DuoGG);
