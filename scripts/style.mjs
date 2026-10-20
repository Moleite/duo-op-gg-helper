// style.mjs - Writing rules that a script can check (docs/STYLE.md)
// Exposes: ACRONYMS, FILLERS, proseOf(markdown), commentsOf(code, lang), styleProblems(text)
//
// check.mjs applies these rules to the documentation and to code comments.
// A word in capitals that is not in `ACRONYMS` is emphasis, except in inline
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

// ---- Code comments ---------------------------------------------------------

// Comments of a JS file: [{ line, own, text }]. own: the comment starts its
// line. Strings, templates and regular expressions are skipped: a `//` or a
// quote inside them opens no comment.
function jsComments(src) {
  const out = [];
  let block = false;
  let tpl = false;
  src.split('\n').forEach((l, i) => {
    let j = 0;
    if (block) {
      const end = l.indexOf('*/');
      out.push({ line: i + 1, own: true, text: (end === -1 ? l : l.slice(0, end)).replace(/^\s*\*?/, '') });
      if (end === -1) return;
      block = false;
      j = end + 2;
    }
    let q = tpl ? '`' : null;
    let prev = '';
    let word = '';
    for (; j < l.length; j++) {
      const c = l[j];
      if (q) {
        if (c === '\\') { j++; continue; }
        if (c === q) { q = null; if (c === '`') tpl = false; }
        continue;
      }
      if (c === "'" || c === '"') { q = c; continue; }
      if (c === '`') { q = c; tpl = true; continue; }
      if (c === '/' && l[j + 1] === '/') {
        out.push({ line: i + 1, own: !l.slice(0, j).trim(), text: l.slice(j + 2) });
        return;
      }
      if (c === '/' && l[j + 1] === '*') {
        const end = l.indexOf('*/', j + 2);
        out.push({ line: i + 1, own: !l.slice(0, j).trim(), text: l.slice(j + 2, end === -1 ? l.length : end) });
        if (end === -1) { block = true; return; }
        j = end + 1;
        continue;
      }
      // A regular expression literal can hold quotes and slashes.
      if (c === '/' && (!prev || '(,=:[!&|?{};'.includes(prev) || word === 'return')) {
        let k = j + 1;
        let cls = false;
        for (; k < l.length; k++) {
          if (l[k] === '\\') { k++; continue; }
          if (l[k] === '[') cls = true;
          else if (l[k] === ']') cls = false;
          else if (l[k] === '/' && !cls) break;
        }
        j = k;
        continue;
      }
      if (/[\w$]/.test(c)) word = (/[\w$]/.test(l[j - 1] || '') ? word : '') + c;
      else if (c !== ' ' && c !== '\t') word = '';
      if (c !== ' ' && c !== '\t') prev = c;
    }
  });
  return out;
}

// Comments of a SQL file: `--` outside a string.
function sqlComments(src) {
  const out = [];
  src.split('\n').forEach((l, i) => {
    let q = false;
    for (let j = 0; j < l.length; j++) {
      if (l[j] === "'") q = !q;
      else if (!q && l.startsWith('--', j)) {
        out.push({ line: i + 1, own: !l.slice(0, j).trim(), text: l.slice(j + 2) });
        return;
      }
    }
  });
  return out;
}

function htmlComments(src) {
  const out = [];
  for (const m of src.matchAll(/<!--([\s\S]*?)-->/g)) {
    const first = src.slice(0, m.index).split('\n').length;
    m[1].split('\n').forEach((t, k) => out.push({ line: first + k, own: true, text: t }));
  }
  return out;
}

const EXTRACT = { js: jsComments, sql: sqlComments, html: htmlComments };

// Prose of the comments of a file: [{ line, text }], one item per paragraph.
// A paragraph is a run of comments that each start their line. Skipped: a
// decorative line, a line indented by two spaces or more after the marker
// (code example, table), the `Exposes:` line (identifiers), a tool
// directive (`eslint-disable`, `@ts-`), whose syntax is not prose.
export function commentsOf(src, lang) {
  const out = [];
  let para = null;
  let last = -1;
  const flush = () => {
    if (para) out.push({ line: para.line, text: para.parts.join('\n') });
    para = null;
  };
  EXTRACT[lang](src.replace(/\r\n/g, '\n')).forEach((c) => {
    const t = c.text.replace(/\s+$/, '');
    if (c.line !== last + 1 || !c.own) flush();
    last = c.line;
    if (/^[\s=~#*-]*$/.test(t) || /^\s{2,}\S/.test(t) || /^\s*Exposes:/.test(t) || /^\s*\|/.test(t) ||
        /^\s*(eslint-|@ts-|prettier-ignore)/.test(t)) { flush(); return; }
    if (!para) para = { line: c.line, parts: [] };
    para.parts.push(t.replace(/`[^`\n]*`/g, ' X ').replace(/https?:\/\/\S+/g, ' '));
    if (!c.own) flush();
  });
  flush();
  return out;
}
