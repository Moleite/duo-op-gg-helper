// style.mjs - Writing rules that a script can check (docs/STYLE.md)
// Exposes: ACRONYMS, FILLERS, proseOf(markdown), styleProblems(text)
//
// check.mjs applies these rules to the documentation and to code comments.
// A word in capitals that is not in ACRONYMS is emphasis, except in inline
// code.

export const ACRONYMS = new Set([
  'API', 'DOM', 'SQL', 'RLS', 'MV3', 'HTTP', 'HTTPS', 'JSON', 'CSS', 'UI', 'PR', 'CI', 'URL', 'ID',
  'KDA', 'LP', 'ADC', 'OP', 'GG', 'EUW', 'MVP', 'UUID', 'TTL', 'JS', 'HTML', 'AM', 'PM', 'GM', 'UR',
  'ARAM', 'IP', 'LF', 'CRLF', 'WASM', 'MUI', 'CLI', 'IIFE', 'ISO', 'MDF', 'TODO', 'PNG', 'SVG',
  'ESM', 'LOL', 'OK', 'CDN', 'AWS', 'SSL', 'XSS', 'SPA', 'II', 'III', 'IV', 'BA', 'MR', 'FT', 'BU',
  'AGENTS', 'CLAUDE', 'README', 'INDEX', 'SYMPTOMS', 'CONVENTIONS', 'STYLE', 'FIND', 'DUO',
  'FIND-DUO', 'POST', 'FORM', 'VERIFIED', 'NPM', 'GNB', 'KB', 'AFK'
]);

export const FILLERS = [
  'very', 'really', 'just', 'simply', 'basically', 'actually', 'clearly', 'obviously',
  'of course', 'quite', 'extremely', 'literally', 'totally', 'definitely', 'essentially',
  'it is worth noting', 'needless to say', 'in fact'
];

const MAX_WORDS = 40;

// Prose of a Markdown page: without code blocks, inline code, table rows,
// headings or URLs.
export function proseOf(md) {
  return md
    .replace(/```[\s\S]*?```/g, '')
    .split('\n')
    .filter((l) => !/^\s*\|/.test(l) && !/^\s*#/.test(l))
    .join('\n')
    .replace(/`[^`\n]*`/g, ' X ')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/https?:\/\/\S+/g, ' ');
}

export function styleProblems(text) {
  const out = [];
  if (/—/.test(text)) out.push('em dash');
  if (/[a-z] -- [a-z]/i.test(text)) out.push('double dash between two words');
  const low = text.toLowerCase();
  FILLERS.forEach((f) => {
    if (new RegExp('(^|[^a-z])' + f + '([^a-z]|$)').test(low)) out.push('filler: ' + f);
  });
  const caps = text.match(/\b[A-Z][A-Z0-9-]{1,}\b/g) || [];
  caps.filter((w) => !ACRONYMS.has(w) && !/\d/.test(w)).forEach((w) => out.push('capitals: ' + w));
  text.split(/(?<=[.!?:;])\s+|\n\s*\n|\n\s*[-*\d]+[.)]?\s/).forEach((s) => {
    const n = s.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length;
    if (n > MAX_WORDS) out.push(`sentence of ${n} words: "${s.trim().slice(0, 60)}..."`);
  });
  return [...new Set(out)];
}
