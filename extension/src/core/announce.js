// announce.js - Post note built from the active profile
// Exposes: DuoGG.announce.{ DEFAULT_TEMPLATE, PLACEHOLDERS, QUEUES, build, summary }
//
// Pure function. The note is for the post of the site (Post & find Duo).
// One-click posting is not wired yet: docs/project/todo.md.
(function (D) {
  const lol = D.lol;
  const DEFAULT_TEMPLATE = '{rank} {role} looking for {roles} | mains {champions}';

  const PLACEHOLDERS = {
    '{role}': 'main position (ADC, Support...)',
    '{role2}': 'second position',
    '{roles}': 'wanted positions, separated by /',
    '{rank}': 'rank of the profile (Emerald 2)',
    '{champions}': 'champions 1 and 2',
    '{riotId}': 'name#tag',
    '{queue}': 'queue (Ranked Solo...)'
  };

  const QUEUES = {
    RANKED_SOLO: 'Ranked Solo', RANKED_FLEX: 'Ranked Flex', NORMAL: 'Swiftplay',
    BAN_NORMAL: 'Draft Pick', ARAM: 'ARAM', ARENA_MODE: 'Arena'
  };

  function label(pos) { return pos ? lol.POSITION_LABELS[pos] || pos : ''; }

  function build(profile, template) {
    const p = profile || {};
    const wanted = (p.wantedPositions || []).map(label).filter(Boolean);
    const champs = [p.champion, p.champion2].filter((c) => c && String(c).trim());
    const values = {
      '{role}': label(p.position),
      '{role2}': label(p.position2),
      '{roles}': wanted.length ? wanted.join('/') : 'any role',
      '{rank}': p.rank ? lol.rankLabel(lol.parseRank(p.rank)) : '',
      '{champions}': champs.join(', '),
      '{riotId}': p.gameName ? p.gameName + (p.tagLine ? '#' + p.tagLine : '') : '',
      '{queue}': QUEUES[p.queueType] || p.queueType || ''
    };
    const tpl = template || p.noteTemplate || DEFAULT_TEMPLATE;
    return tpl.replace(/\{[a-zA-Z0-9]+\}/g, (k) => (k in values ? values[k] : k))
      .replace(/\s+\|\s+mains\s*$/i, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  // Fields of the post that the form of the site asks for, for the preview.
  function summary(profile) {
    const p = profile || {};
    return [
      ['Riot ID', p.gameName ? p.gameName + '#' + (p.tagLine || '?') : '?'],
      ['Region', (p.region || 'euw').toUpperCase()],
      ['Queue', QUEUES[p.queueType] || p.queueType || '?'],
      ['Positions', [label(p.position), label(p.position2)].filter(Boolean).join(' / ') || '?'],
      ['Looking for', (p.wantedPositions || []).map(label).join(' / ') || 'Any'],
      ['Champions', [p.champion, p.champion2].filter(Boolean).join(', ') || '?']
    ];
  }

  D.announce = { DEFAULT_TEMPLATE: DEFAULT_TEMPLATE, PLACEHOLDERS: PLACEHOLDERS, QUEUES: QUEUES, build: build, summary: summary };
})(globalThis.DuoGG);
