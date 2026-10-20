// style.test.mjs - Writing rules of scripts/style.mjs, comment extraction
//
// npm run check applies these rules to every comment: a comment missed by
// the extraction escapes the check, a string read as a comment fails it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { commentsOf, styleProblems } from '../scripts/style.mjs';

const texts = (src, lang) => commentsOf(src, lang || 'js').map((c) => c.text.trim());

test('a run of line comments is one paragraph, a code line ends it', () => {
  const src = '// First line\n// second line.\nconst a = 1;\n// Other paragraph.\n';
  assert.deepEqual(commentsOf(src, 'js'), [
    { line: 1, text: ' First line\n second line.' },
    { line: 4, text: ' Other paragraph.' }
  ]);
});

test('strings, templates and regular expressions open no comment', () => {
  const src = [
    "const u = 'https://duo.op.gg/x'; // after a string",
    'const t = `a // b',
    'c`; // after a template',
    "const r = /'[^/]*'/g; // after a regex"
  ].join('\n');
  assert.deepEqual(texts(src), ['after a string', 'after a template', 'after a regex']);
});

test('block comments, SQL and HTML comments are read', () => {
  assert.deepEqual(texts('/* one\n * two */ const x = 1;'), ['one\n two']);
  assert.deepEqual(texts("select '--' as a; -- real comment", 'sql'), ['real comment']);
  assert.deepEqual(texts('<p>x</p><!-- note -->', 'html'), ['note']);
});

test('inline code, the Exposes line, an indented example and a directive are not prose', () => {
  const src = [
    '// Exposes: DuoGG.lol.{ TOP, SUPPORT }',
    '// Canonical value `SUPPORT`.',
    '//   SHOUTED CODE EXAMPLE',
    '// eslint-disable-next-line no-alert -- reason'
  ].join('\n');
  const all = commentsOf(src, 'js').map((c) => c.text).join('\n');
  assert.deepEqual(styleProblems(all), []);
});

test('a forbidden pattern in a comment is reported', () => {
  const p = styleProblems(commentsOf('// A VERY bad — comment, really.', 'js')[0].text);
  assert.deepEqual(p.sort(), ['capitals: VERY', 'em dash', 'filler: really', 'filler: very'].sort());
});
