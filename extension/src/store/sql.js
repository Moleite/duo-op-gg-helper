// sql.js - Neon queries of the extension and row conversion
// Exposes: DuoGG.sql.{ pullQueries, readPull, pushQueries, profileRow,
//          profileFromRow, blacklistFromRow }
//
// Only file that writes SQL in the extension. tests/db.test.mjs runs each
// query in a local Postgres (PGlite) with the RLS policies of db/grants.sql:
// a misnamed column or a missing grant fails there.
//
// Dates travel as milliseconds in the extension and as timestamptz in the
// database. The push sends ISO strings, the pull converts to milliseconds.
(function (D) {
  const IDENTITY = { query: 'select current_user as role, current_database() as db', params: [] };

  function ms(v) {
    if (v == null) return null;
    const t = v instanceof Date ? v.getTime() : Date.parse(String(v));
    return Number.isFinite(t) ? t : null;
  }
  function iso(t) { return t == null ? null : new Date(t).toISOString(); }
  function json(v) { return typeof v === 'string' ? JSON.parse(v) : v; }

  // One round trip, so one wake-up of the database. RLS filters the rows:
  // no `where owner` clause here.
  function pullQueries() {
    return [
      IDENTITY,
      { query: 'select * from player_profile order by created_at', params: [] },
      { query: 'select * from blacklist_entry order by created_at', params: [] }
    ];
  }

  function profileFromRow(r) {
    return {
      id: r.id, label: r.label, gameName: r.game_name || '', tagLine: r.tag_line || '',
      region: r.region || 'euw', opggAccount: r.opgg_account || '',
      position: r.position || 'ALL', position2: r.position2 || null,
      champion: r.champion || '', champion2: r.champion2 || '',
      wantedPositions: json(r.wanted_positions) || [], queueType: r.queue_type || 'RANKED_SOLO',
      rank: r.rank || '', noteTemplate: r.note_template || '', filters: json(r.filters) || null,
      updatedAt: ms(r.updated_at), removedAt: ms(r.removed_at)
    };
  }

  function blacklistFromRow(r) {
    return {
      key: r.player_key, gameName: r.game_name, tagLine: r.tag_line || null, region: r.region || null,
      reason: r.reason || null, note: r.note || null, position: r.position || null,
      rank: r.rank || null, champion: r.champion || null, partnerId: r.partner_id || null,
      createdAt: ms(r.created_at), updatedAt: ms(r.updated_at), removedAt: ms(r.removed_at)
    };
  }

  // results: response of neon.batch(pullQueries()).
  function readPull(results) {
    const rows = (i) => (results[i] && results[i].rows) || [];
    const id = rows(0)[0] || {};
    return {
      role: id.role || null,
      db: id.db || null,
      profiles: rows(1).map(profileFromRow),
      blacklist: rows(2).map(blacklistFromRow)
    };
  }

  function profileRow(p) {
    return [p.id, p.label || 'Profile', p.gameName || null, p.tagLine || null, p.region || 'euw',
      p.opggAccount || null, p.position || null, p.position2 || null, p.champion || null,
      p.champion2 || null, JSON.stringify(p.wantedPositions || []), p.queueType || 'RANKED_SOLO',
      p.rank || null, p.noteTemplate || null, p.filters ? JSON.stringify(p.filters) : null,
      iso(p.updatedAt), iso(p.removedAt)];
  }

  const PROFILE_UPSERT =
    'insert into player_profile (id, label, game_name, tag_line, region, opgg_account, position,' +
    ' position2, champion, champion2, wanted_positions, queue_type, rank, note_template, filters,' +
    ' updated_at, removed_at)' +
    ' values ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14, $15::jsonb,' +
    ' $16::timestamptz, $17::timestamptz)' +
    ' on conflict (id) do update set label = excluded.label, game_name = excluded.game_name,' +
    ' tag_line = excluded.tag_line, region = excluded.region, opgg_account = excluded.opgg_account,' +
    ' position = excluded.position, position2 = excluded.position2, champion = excluded.champion,' +
    ' champion2 = excluded.champion2, wanted_positions = excluded.wanted_positions,' +
    ' queue_type = excluded.queue_type, rank = excluded.rank, note_template = excluded.note_template,' +
    ' filters = excluded.filters, updated_at = excluded.updated_at, removed_at = excluded.removed_at' +
    // An older write (a browser that stayed offline) does not replace a
    // newer row.
    ' where player_profile.updated_at <= excluded.updated_at';

  const BLACKLIST_UPSERT =
    'insert into blacklist_entry (player_key, game_name, tag_line, region, reason, note, position,' +
    ' rank, champion, partner_id, created_at, updated_at, removed_at)' +
    ' values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::timestamptz, $12::timestamptz,' +
    ' $13::timestamptz)' +
    ' on conflict (owner, player_key) do update set game_name = excluded.game_name,' +
    ' tag_line = excluded.tag_line, region = excluded.region, reason = excluded.reason,' +
    ' note = excluded.note, position = excluded.position, rank = excluded.rank,' +
    ' champion = excluded.champion, partner_id = excluded.partner_id,' +
    ' updated_at = excluded.updated_at, removed_at = excluded.removed_at' +
    ' where blacklist_entry.updated_at <= excluded.updated_at';

  // rows: model.dirtyRows(db). One transaction, opened by the identity.
  function pushQueries(rows) {
    const qs = [IDENTITY];
    rows.profiles.forEach((p) => qs.push({ query: PROFILE_UPSERT, params: profileRow(p) }));
    rows.blacklist.forEach((e) => qs.push({
      query: BLACKLIST_UPSERT,
      params: [e.key, e.gameName, e.tagLine || null, e.region || null, e.reason || null,
        e.note || null, e.position || null, e.rank || null, e.champion || null,
        e.partnerId || null, iso(e.createdAt), iso(e.updatedAt), iso(e.removedAt)]
    }));
    return qs;
  }

  D.sql = {
    pullQueries: pullQueries,
    readPull: readPull,
    pushQueries: pushQueries,
    profileRow: profileRow,
    profileFromRow: profileFromRow,
    blacklistFromRow: blacklistFromRow
  };
})(globalThis.DuoGG);
