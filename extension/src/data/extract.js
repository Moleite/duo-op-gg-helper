// extract.js - Reads a row of the site table into a post
// Exposes: DuoGG.extract.{ rows, partner, partnerIdOf, rowOf, ageMinutes, pageState, accountName }
//
// A post (`Partner`, docs/vocabulary.md) has the same shape whether it comes
// from the DOM (this file) or from the API (api.js): the rule engine does not
// know its source. An unreadable field is null, never 0: a rule does not hide
// a row on missing data (docs/filters/rules.md).
//
// The selectors live in selectors.js. tests/extract.test.mjs replays each
// capture of DOM/.
(function (D) {
  const S = D.SELECTORS;
  const lol = D.lol;

  function text(el) { return el ? String(el.textContent || '').trim() : ''; }
  function num(s) {
    const n = parseFloat(String(s).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  function rows(root) {
    return Array.from((root || document).querySelectorAll(S.row.css))
      .filter((li) => !!partnerIdOf(li));
  }

  function partnerIdOf(li) {
    const a = li.querySelector(S.rowAnchor.css);
    const m = a && a.id.match(/^partner-(\d+)$/);
    return m ? m[1] : null;
  }

  // <li> row of a post, by its id. null when the site does not show it.
  function rowOf(id, root) {
    const a = (root || document).getElementById('partner-' + id);
    return a ? a.closest(S.row.css) : null;
  }

  // `20 mins ago`, `3 hrs ago`, `a day ago`, `2 days ago` -> minutes.
  function ageMinutes(s) {
    const t = String(s || '').trim().toLowerCase();
    if (!t) return null;
    if (/^(just now|now|a few seconds ago)$/.test(t)) return 0;
    const m = t.match(/^(a|an|\d+)\s+(sec|second|min|minute|hr|hour|day|week|month|year)s?\s+ago$/);
    if (!m) return null;
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : 1;
    const unit = { sec: 1 / 60, second: 1 / 60, min: 1, minute: 1, hr: 60, hour: 60,
      day: 1440, week: 10080, month: 43200, year: 525600 }[m[2]];
    return Math.round(n * unit);
  }

  function lookingFor(li) {
    const icons = Array.from(li.querySelectorAll(S.lookingFor.css));
    const list = icons.map((svg) => lol.parsePosition(svg.getAttribute('aria-label'))).filter(Boolean);
    const cell = icons.length ? icons[0].parentElement : null;
    const more = cell ? Array.from(cell.querySelectorAll(S.lookingForMore.css)).some((s) => text(s) === '+') : false;
    return { list: Array.from(new Set(list)), partial: more };
  }

  function rank(li) {
    const codes = Array.from(li.querySelectorAll(S.rankCode.css)).map(text)
      .filter((t) => /^(GM|[IBSGPEDMC])[1-4]$|^UR$/.test(t));
    return codes.length ? lol.parseRank(codes[0]) : null;
  }

  function winStats(li) {
    const spans = Array.from(li.querySelectorAll('span'));
    const w = spans.find((s) => /^\d+\s*W$/i.test(text(s)));
    const l = spans.find((s) => /^\d+\s*L$/i.test(text(s)));
    const wins = w ? parseInt(text(w), 10) : null;
    const losses = l ? parseInt(text(l), 10) : null;
    let winRate = null;
    const block = w && (w.closest(S.winRateBlock.css) || w.closest('div[class*="w-38"]'));
    if (block) {
      const pct = Array.from(block.querySelectorAll('span')).find((s) => /^\d{1,3}%$/.test(text(s)));
      if (pct) winRate = num(text(pct));
    }
    if (winRate == null && wins != null && losses != null && wins + losses > 0) {
      winRate = Math.round((wins * 100) / (wins + losses));
    }
    // 0W 0L: the site shows 0 %, which means no data.
    if (wins === 0 && losses === 0) winRate = null;
    return { wins: wins, losses: losses, winRate: winRate };
  }

  function champions(li) {
    return Array.from(li.querySelectorAll(S.champion.css)).map((img) => {
      const cell = img.closest('.group') || img.parentElement;
      const pct = cell ? Array.from(cell.querySelectorAll('span')).map(text).find((t) => /^\d{1,3}%$/.test(t)) : null;
      const tip = cell ? text(cell).match(/Win rate\s*\d{1,3}%\s*\((\d+)\s*Games?\)/i) : null;
      return { name: img.getAttribute('alt'), winRate: pct ? num(pct) : null, games: tip ? Number(tip[1]) : null };
    });
  }

  function cellNumber(li, css) {
    const cell = li.querySelector(css);
    const v = cell && cell.querySelector('div.leading-4');
    return v ? num(text(v)) : null;
  }

  function partner(li) {
    const id = partnerIdOf(li);
    if (!id) return null;
    const link = li.querySelector(S.summonerLink.css);
    const href = link ? link.getAttribute('href') || '' : '';
    const hm = href.match(/\/summoners\/([a-z0-9]+)\/([^/?#]+)/i);
    const tagEl = li.querySelector(S.tagLine.css);
    const tagText = tagEl ? (tagEl.firstChild ? String(tagEl.firstChild.textContent) : text(tagEl)) : '';
    let tag = (tagText.match(/#\s*([^\s/]+)/) || [])[1] || null;
    if (!tag && hm) tag = decodeURIComponent(hm[2]).split('-').pop();
    const gameName = text(link) || null;
    const look = lookingFor(li);
    const wr = winStats(li);
    const noteEl = li.querySelector(S.note.css);
    const posted = Array.from(li.querySelectorAll(S.posted.css)).map(text).find((t) => /ago$|now$/i.test(t));
    return {
      id: id,
      source: 'dom',
      gameName: gameName,
      tagLine: tag,
      key: lol.riotKey(gameName, tag),
      region: hm ? hm[1].toLowerCase() : null,
      verified: !!li.querySelector(S.verified.css),
      position: lol.parsePosition((li.querySelector(S.position.css) || { getAttribute: () => null }).getAttribute('aria-label')),
      lookingFor: look.list,
      lookingForPartial: look.partial,
      rank: rank(li),
      wins: wr.wins,
      losses: wr.losses,
      winRate: wr.winRate,
      kda: cellNumber(li, S.kda.css),
      opScore: cellNumber(li, S.opScore.css),
      champions: champions(li),
      note: noteEl ? noteEl.getAttribute('aria-label') || text(noteEl) : '',
      ageMin: ageMinutes(posted),
      insertedAt: null,
      queueType: null
    };
  }

  // Native filters of the site: the variables the API receives for the same list.
  function pageState(root, loc) {
    const doc = root || document;
    const pos = doc.querySelector(S.filterPosition.css);
    const queue = doc.querySelector(S.filterQueue.css);
    const tier = doc.querySelector(S.filterTier.css);
    const regionInput = doc.querySelector(S.filterRegion.css);
    let region = regionInput ? regionInput.getAttribute('value') || regionInput.value : null;
    if (!region && loc) region = new URLSearchParams(loc.search || '').get('region');
    return {
      region: (region || 'euw').toLowerCase(),
      position: pos ? pos.getAttribute('value') || 'ALL' : 'ALL',
      queueType: queue ? queue.value || 'RANKED_SOLO' : 'RANKED_SOLO',
      tier: tier ? tier.value || 'ALL' : 'ALL'
    };
  }

  function accountName(root) {
    return text((root || document).querySelector(S.accountName.css)) || null;
  }

  D.extract = {
    rows: rows,
    partner: partner,
    partnerIdOf: partnerIdOf,
    rowOf: rowOf,
    ageMinutes: ageMinutes,
    pageState: pageState,
    accountName: accountName
  };
})(globalThis.DuoGG);
