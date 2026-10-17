// more.js - Posts loaded by Show more, under the table of the site
// Exposes: DuoGG.more.{ render, profileUrl }
//
// The site renders 50 posts. The next pages come from the API (api.js) and
// show in #duogg-more, a block that the extension creates after the list of
// the site. The same rules apply there, with the same attributes as rows.js.
(function (D) {
  const h = D.h;
  const lol = D.lol;

  function profileUrl(p) {
    if (!p.gameName) return null;
    const slug = encodeURIComponent(p.gameName) + (p.tagLine ? '-' + encodeURIComponent(p.tagLine) : '');
    return 'https://www.op.gg/summoners/' + (p.region || 'euw') + '/' + slug;
  }

  function age(min) {
    if (min == null) return '?';
    if (min < 60) return min + ' min';
    if (min < 1440) return Math.round(min / 60) + ' h';
    return Math.round(min / 1440) + ' d';
  }

  function pos(p) { return p ? lol.POSITION_LABELS[p] || p : '?'; }

  function line(p, d, showHidden, onAction) {
    const hidden = !!(d && d.hidden);
    const url = profileUrl(p);
    const wr = p.winRate == null ? '?' : p.winRate + '%';
    const games = p.wins == null || p.losses == null ? '' : ' (' + (p.wins + p.losses) + ')';
    return h('li', {
      class: 'duogg-x',
      'data-duogg': hidden ? (showHidden ? 'dim' : 'hidden') : 'shown',
      'data-partner': p.id
    },
    url ? h('a', { href: url, target: '_blank', rel: 'noreferrer' }, p.gameName + (p.tagLine ? '#' + p.tagLine : ''))
      : h('span', { class: 'muted' }, '?'),
    h('span', { class: 'c' }, pos(p.position)),
    h('span', { class: 'c' }, lol.rankLabel(p.rank)),
    h('span', { class: 'c muted', title: 'Looking for' }, '→ ' + (p.lookingFor.length ? p.lookingFor.map(pos).join('/') : '?')),
    h('span', { class: 'c ' + (p.winRate == null ? '' : p.winRate >= 50 ? 'good' : 'bad') }, wr + games),
    h('span', { class: 'c muted', title: 'KDA · OpScore' }, (p.kda == null ? '?' : p.kda) + ' · ' + (p.opScore == null ? '?' : p.opScore)),
    h('span', { class: 'note', title: p.note || '' }, p.note || ''),
    hidden ? h('span', { class: 'why' }, D.rows.reasonLabel(d.reasons)) : null,
    h('span', { class: 'c muted' }, age(p.ageMin)),
    h('button', { title: 'Add to the blacklist', onclick: () => onAction('blacklist', p.id) }, '⛔'),
    h('button', { title: 'Hide', onclick: () => onAction('hide', p.id) }, '🙈'));
  }

  // anchorList: <ul> of the site; the block goes right after it.
  function render(anchorList, extra, result, order, showHidden, onAction) {
    let box = document.getElementById('duogg-more');
    if (!extra.length) { if (box) box.remove(); return; }
    if (!box) box = h('div', { id: 'duogg-more' });
    if (anchorList && box.previousElementSibling !== anchorList) anchorList.after(box);
    // The block is rewritten only when its content changes: each rewrite is
    // a mutation that the observer of app.js receives.
    const sig = JSON.stringify([showHidden, order.filter((id) => extra.some((p) => p.id === id))
      .map((id) => [id, (result.byId.get(id) || {}).reasons])]);
    if (box.dataset.sig === sig) return;
    box.dataset.sig = sig;
    const byId = new Map(extra.map((p) => [p.id, p]));
    const visible = extra.filter((p) => !(result.byId.get(p.id) || {}).hidden).length;
    const ul = h('ul');
    order.filter((id) => byId.has(id)).forEach((id) => {
      ul.appendChild(line(byId.get(id), result.byId.get(id), showHidden, onAction));
    });
    D.clear(box).appendChild(h('div', { class: 'duogg-more-head' },
      h('span', {}, 'DuoGG · older posts'),
      h('span', {}, visible + ' visible out of ' + extra.length)));
    box.appendChild(ul);
  }

  D.more = { render: render, profileUrl: profileUrl };
})(globalThis.DuoGG);
