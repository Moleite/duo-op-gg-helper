// rules.js - Registry of the filter rules, single source
// Exposes: DuoGG.RULES, DuoGG.SORTS, DuoGG.defaultFilters()
//
// A rule hides a post, it never deletes it: the site keeps the row, the
// extension sets an attribute (docs/architecture/panel.md). Missing data
// hides nothing: the rule returns false (fail-open).
//
// docs/generated/rules.md is generated from this registry (npm run gen).
// Adding a rule: one entry here, its test in tests/rules.test.mjs.
(function (D) {
  const lol = D.lol;

  function myPosition(f) { return f.myPosition && f.myPosition !== 'ALL' ? f.myPosition : null; }

  D.RULES = [
    {
      id: 'blacklist',
      label: 'Blacklist',
      what: 'Player in the blacklist (key name#tag, case-insensitive). An entry without a tag matches every tag of the name.',
      on: true,
      test: (p, f, ctx) => !!(p.key && ctx.blacklist.has(p.key)) ||
        !!(p.gameName && ctx.blacklistNames.has(p.gameName.trim().toLowerCase()))
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      what: 'Older post of a player already shown higher in the list.',
      on: true,
      // Stateful rule: the engine passes the set of keys already seen.
      test: (p, f, ctx) => {
        if (!p.key) return false;
        if (ctx.seen.has(p.key)) return true;
        ctx.seen.add(p.key);
        return false;
      }
    },
    {
      id: 'sameRole',
      label: 'Same position as me',
      what: 'The player plays my position. Ignored when my position is Any.',
      on: true,
      test: (p, f) => !!myPosition(f) && p.position === myPosition(f)
    },
    {
      id: 'lookingFor',
      label: 'Not looking for my position',
      what: 'My position is not in the wanted positions. A truncated (+) or empty list hides nothing.',
      on: true,
      test: (p, f) => {
        const me = myPosition(f);
        if (!me || p.lookingForPartial || !p.lookingFor || !p.lookingFor.length) return false;
        return p.lookingFor.indexOf(me) < 0 && p.lookingFor.indexOf('ALL') < 0;
      }
    },
    {
      id: 'rank',
      label: 'Incompatible rank',
      what: 'Duo not allowed between my rank and theirs (v1 table). An unreadable rank hides nothing.',
      on: true,
      test: (p, f) => {
        const me = lol.parseRank(f.myRank);
        return !!me && lol.duoCompatible(me, p.rank) === false;
      }
    },
    {
      id: 'winRate',
      label: 'Minimum win rate',
      what: 'Overall win rate strictly below the threshold.',
      on: false,
      param: { key: 'minWinRate', label: 'Min win rate (%)', value: 50, min: 0, max: 100 },
      test: (p, f) => p.winRate != null && p.winRate < Number(f.minWinRate)
    },
    {
      id: 'games',
      label: 'Minimum games',
      what: 'Wins plus losses below the threshold: a win rate over few games means little.',
      on: false,
      param: { key: 'minGames', label: 'Min games', value: 30, min: 0, max: 2000 },
      test: (p, f) => p.wins != null && p.losses != null && p.wins + p.losses < Number(f.minGames)
    },
    {
      id: 'age',
      label: 'Post too old',
      what: 'Post published more than N hours ago.',
      on: false,
      param: { key: 'maxAgeHours', label: 'Max age (h)', value: 6, min: 1, max: 168 },
      test: (p, f) => p.ageMin != null && p.ageMin > Number(f.maxAgeHours) * 60
    },
    {
      id: 'manual',
      label: 'Hidden by hand',
      what: 'Post hidden with the 🙈 button of its row, until the page reloads.',
      on: true,
      test: (p, f, ctx) => !!(ctx.manual && ctx.manual.has(p.id))
    }
  ];

  // Sorting: `site` keeps the order of the site (newest first).
  D.SORTS = [
    { id: 'site', label: 'Site order', key: null },
    { id: 'winRate', label: 'Win rate', key: (p) => p.winRate, desc: true },
    { id: 'opScore', label: 'OpScore', key: (p) => p.opScore, desc: true },
    { id: 'kda', label: 'KDA', key: (p) => p.kda, desc: true },
    { id: 'games', label: 'Games', key: (p) => (p.wins == null || p.losses == null ? null : p.wins + p.losses), desc: true },
    { id: 'recent', label: 'Newest', key: (p) => p.ageMin, desc: false }
  ];

  D.defaultFilters = function () {
    const f = { myPosition: 'ALL', myRank: '', showHidden: false, sort: 'site', rules: {} };
    D.RULES.forEach((r) => {
      f.rules[r.id] = r.on;
      if (r.param) f[r.param.key] = r.param.value;
    });
    return f;
  };
})(globalThis.DuoGG);
