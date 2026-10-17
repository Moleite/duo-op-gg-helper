// api.js - Reads posts through the GraphQL API of the site (Show more)
// Exposes: DuoGG.api.{ ENDPOINT, PARTNERS_QUERY, variables, parseDate, cursorOf, fromApi, fetchPage }
//
// Contract read on 2026-10-17 in the bundle of the site and with read-only
// calls (docs/architecture/site-api.md):
//   POST https://duo.op.gg/graphql, operation `partners`, 50 posts per page.
//   `from` is a cursor: the Unix timestamp, in seconds, of the oldest post
//   received. The first page is requested without `from`: `from: 0` returns
//   an empty list as soon as a filter (position, tier) is active. An offset
//   (50, 100) also returns an empty list.
//   tier and position are `ALL` to take everything: null returns an empty
//   list.
//
// The extension calls the API on a click only (Show more). No mutation:
// posting is not wired (docs/project/todo.md).
(function (D) {
  const lol = D.lol;
  const ENDPOINT = 'https://duo.op.gg/graphql';

  const PARTNERS_QUERY = [
    'query partners($tier: String, $region: String, $position: String, $queueType: String,',
    ' $isAuth: Boolean, $from: Int) {',
    ' partners(tier: $tier, region: $region, position: $position, isAuth: $isAuth,',
    ' queueType: $queueType, from: $from) {',
    '  id position position2 champion champion2 requiredPosition note insertedAt queueType',
    '  options isNewbie',
    '  summoner { gameName tagLine tier kdaAverage wins losses opScore region',
    '   champions { name games wr } }',
    ' } }'
  ].join('');

  // API variables from the native filters (extract.pageState).
  // from: null for the first page, then the cursor (cursorOf).
  function variables(state, from) {
    const v = {
      region: state.region || 'euw',
      tier: state.tier || 'ALL',
      position: state.position || 'ALL',
      queueType: state.queueType || 'RANKED_SOLO'
    };
    if (from) v.from = from;
    return v;
  }

  // The API returns insertedAt in two forms: ISO
  // (`2026-10-17T13:44:47.315Z`) or Date text
  // (`Fri Oct 16 2026 08:09:36 GMT+0900 (Korean Standard Time)`).
  function parseDate(s) {
    if (s == null || s === '') return null;
    const t = typeof s === 'number' ? s : Date.parse(String(s));
    return Number.isFinite(t) ? t : null;
  }

  // Cursor of the next page: the oldest post received.
  function cursorOf(partners) {
    let min = null;
    partners.forEach((p) => { if (p.insertedAt != null && (min == null || p.insertedAt < min)) min = p.insertedAt; });
    return min == null ? null : Math.floor(min / 1000);
  }

  function pct(s) {
    const n = parseFloat(String(s == null ? '' : s));
    return Number.isFinite(n) ? n : null;
  }

  function fromApi(raw, now) {
    const s = raw.summoner || {};
    const wins = Number.isFinite(s.wins) ? s.wins : null;
    const losses = Number.isFinite(s.losses) ? s.losses : null;
    const at = parseDate(raw.insertedAt);
    const req = Array.isArray(raw.requiredPosition) ? raw.requiredPosition.map(lol.parsePosition).filter(Boolean) : [];
    return {
      id: String(raw.id),
      source: 'api',
      gameName: s.gameName || null,
      tagLine: s.tagLine || null,
      key: lol.riotKey(s.gameName, s.tagLine),
      region: s.region || null,
      verified: null,
      position: lol.parsePosition(raw.position),
      lookingFor: Array.from(new Set(req)),
      lookingForPartial: false,
      rank: lol.parseRank(s.tier),
      wins: wins,
      losses: losses,
      winRate: wins != null && losses != null && wins + losses > 0 ? Math.round((wins * 100) / (wins + losses)) : null,
      kda: Number.isFinite(s.kdaAverage) ? s.kdaAverage : null,
      opScore: Number.isFinite(s.opScore) ? s.opScore : null,
      champions: (s.champions || []).map((c) => ({ name: c.name, winRate: pct(c.wr), games: c.games == null ? null : c.games })),
      note: raw.note || '',
      ageMin: at == null ? null : Math.max(0, Math.round(((now || Date.now()) - at) / 60000)),
      insertedAt: at,
      queueType: raw.queueType || null
    };
  }

  // One page of 50 posts. fetchImpl: window.fetch in the content script, a
  // fake in the tests. The content script calls the site from its own
  // origin: the cookies of the site are sent, no secret of the extension.
  async function fetchPage(state, from, fetchImpl) {
    const f = fetchImpl || globalThis.fetch;
    const res = await f(ENDPOINT, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ operationName: 'partners', query: PARTNERS_QUERY, variables: variables(state, from) })
    });
    if (!res.ok) throw new Error('duo.op.gg API: HTTP ' + res.status);
    const json = await res.json();
    if (json.errors && json.errors.length) throw new Error('duo.op.gg API: ' + json.errors[0].message);
    const list = (json.data && json.data.partners) || [];
    const now = Date.now();
    return list.map((p) => fromApi(p, now));
  }

  D.api = {
    ENDPOINT: ENDPOINT,
    PARTNERS_QUERY: PARTNERS_QUERY,
    variables: variables,
    parseDate: parseDate,
    cursorOf: cursorOf,
    fromApi: fromApi,
    fetchPage: fetchPage
  };
})(globalThis.DuoGG);
