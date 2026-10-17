// lol.js - Positions, ranks and duo rank compatibility
// Exposes: DuoGG.lol.{ POSITIONS, POSITION_LABELS, TIERS, parsePosition,
//          parseRank, rankLabel, rankIndex, duoCompatible, riotKey }
//
// Canonical values are the values of the site API: TOP, JUNGLE, MID,
// BOTTOM, SUPPORT, ALL for a position; IRON..CHALLENGER for a tier. The DOM
// shows other labels (ADC, Support, E2): parsePosition and parseRank map
// them to the canonical values.
//
// The compatibility table comes from the v1 (tag v1.0). Riot changed the
// rules at the top of the ladder in 2026: docs/filters/ranks.md.
(function (D) {
  const POSITIONS = ['TOP', 'JUNGLE', 'MID', 'BOTTOM', 'SUPPORT'];

  const POSITION_LABELS = {
    TOP: 'Top', JUNGLE: 'Jungle', MID: 'Mid', BOTTOM: 'ADC', SUPPORT: 'Support', ALL: 'Any'
  };

  // Labels read in the DOM (aria-label of the icons) and values of the API.
  const POSITION_ALIASES = {
    top: 'TOP', jungle: 'JUNGLE', mid: 'MID', middle: 'MID', adc: 'BOTTOM', bottom: 'BOTTOM',
    bot: 'BOTTOM', support: 'SUPPORT', supp: 'SUPPORT', 'all positions': 'ALL', all: 'ALL'
  };

  const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND',
    'MASTER', 'GRANDMASTER', 'CHALLENGER'];
  const APEX = { MASTER: true, GRANDMASTER: true, CHALLENGER: true };

  // Prefix of a DOM rank code (E2, M1, UR) to the canonical tier.
  const CODE_TIER = {
    I: 'IRON', B: 'BRONZE', S: 'SILVER', G: 'GOLD', P: 'PLATINUM', E: 'EMERALD',
    D: 'DIAMOND', M: 'MASTER', GM: 'GRANDMASTER', C: 'CHALLENGER'
  };

  function parsePosition(s) {
    if (!s) return null;
    return POSITION_ALIASES[String(s).trim().toLowerCase()] || null;
  }

  // Accepts a DOM code (`E2`, `M1`, `UR`), an API value (`Emerald 2`,
  // `Unranked`) or a bare tier (`EMERALD`).
  // -> { tier, div }; div is null for Master and above, and for a bare tier.
  //    `UNRANKED` is a known rank. null: unreadable text.
  function parseRank(s) {
    const t = String(s == null ? '' : s).trim();
    if (!t) return null;
    if (/^(ur|unranked)$/i.test(t)) return { tier: 'UNRANKED', div: null };
    let m = t.toUpperCase().match(/^(GM|[IBSGPEDMC])([1-4])$/);
    if (m) return norm(CODE_TIER[m[1]], Number(m[2]));
    m = t.match(/^([a-z]+)\s*([1-4]|i{1,3}|iv)?$/i);
    if (m) {
      const tier = m[1].toUpperCase();
      if (TIERS.indexOf(tier) < 0) return null;
      const roman = { I: 1, II: 2, III: 3, IV: 4 };
      const div = m[2] ? (Number(m[2]) || roman[m[2].toUpperCase()]) : null;
      return norm(tier, div);
    }
    return null;
  }

  function norm(tier, div) {
    return { tier: tier, div: APEX[tier] ? null : (div || null) };
  }

  function rankLabel(r) {
    if (!r) return '?';
    if (r.tier === 'UNRANKED') return 'Unranked';
    const name = r.tier.charAt(0) + r.tier.slice(1).toLowerCase();
    return r.div ? name + ' ' + r.div : name;
  }

  // Index on the ladder: Iron 4 = 0 ... Diamond 1 = 27, Master 28, GM 29,
  // Challenger 30. A tier without a division takes its division 4.
  function rankIndex(r) {
    if (!r || r.tier === 'UNRANKED') return null;
    const i = TIERS.indexOf(r.tier);
    if (i < 0) return null;
    if (APEX[r.tier]) return 28 + (i - 7);
    return i * 4 + (4 - (r.div || 4));
  }

  // Accepted tiers per tier, except Emerald and Diamond (rules per division).
  const SAME_GROUP = {
    IRON: ['IRON', 'BRONZE', 'SILVER'],
    BRONZE: ['IRON', 'BRONZE', 'SILVER'],
    SILVER: ['IRON', 'BRONZE', 'SILVER', 'GOLD'],
    GOLD: ['SILVER', 'GOLD', 'PLATINUM'],
    PLATINUM: ['GOLD', 'PLATINUM', 'EMERALD']
  };

  function within2(a, b) {
    return Math.abs(rankIndex(a) - rankIndex(b)) <= 2;
  }

  // Duo compatibility in Solo/Duo, table of the v1. The relation is
  // symmetric (tests/lol.test.mjs checks every pair).
  // -> true, false, or null when one of the two ranks is unknown.
  function duoCompatible(me, other) {
    if (!me || !other) return null;
    if (me.tier === 'UNRANKED' || other.tier === 'UNRANKED') return false;
    const mt = me.tier, ot = other.tier;
    if (SAME_GROUP[mt]) return SAME_GROUP[mt].indexOf(ot) >= 0;
    if (mt === 'EMERALD') {
      if (ot === 'PLATINUM' || ot === 'EMERALD') return true;
      return ot === 'DIAMOND' && within2(me, other);
    }
    if (mt === 'DIAMOND') {
      if (me.div === 1) {
        if (ot === 'DIAMOND') return other.div <= 3;
        return !!APEX[ot];
      }
      if (ot === 'DIAMOND') return within2(me, other);
      return ot === 'EMERALD' && within2(me, other);
    }
    if (APEX[mt]) {
      if (APEX[ot]) return true;
      return ot === 'DIAMOND' && other.div === 1;
    }
    return null;
  }

  // Key of a player for the blacklist and the duplicates: lower case
  // `name#tag`. Without a tag (free input), the key is the name alone.
  function riotKey(gameName, tagLine) {
    const n = String(gameName || '').trim().toLowerCase();
    if (!n) return '';
    const t = String(tagLine || '').trim().replace(/^#/, '').toLowerCase();
    return t ? n + '#' + t : n;
  }

  D.lol = {
    POSITIONS: POSITIONS,
    POSITION_LABELS: POSITION_LABELS,
    TIERS: TIERS,
    parsePosition: parsePosition,
    parseRank: parseRank,
    rankLabel: rankLabel,
    rankIndex: rankIndex,
    duoCompatible: duoCompatible,
    riotKey: riotKey
  };
})(globalThis.DuoGG);
