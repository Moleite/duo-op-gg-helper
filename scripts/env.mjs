// env.mjs - Reads the .env file at the root of the repository, without dependency
// Exposes: readEnv(file?) -> { KEY: value }, keysOf(file)
//
// Format: KEY=value per line, `#` for a comment line, optional quotes around
// the value. A variable already set in the process environment wins over
// the file (CI, one-off override).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function parseEnv(text) {
  const out = {};
  String(text).split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) return;
    out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  });
  return out;
}

export function readEnv(file) {
  const p = file || path.join(ROOT, '.env');
  const vars = fs.existsSync(p) ? parseEnv(fs.readFileSync(p, 'utf8')) : {};
  Object.keys(vars).forEach((k) => { if (process.env[k]) vars[k] = process.env[k]; });
  return vars;
}

// Keys declared in a file, in order (used by check.mjs on .env.example).
export function keysOf(file) {
  return Object.keys(parseEnv(fs.readFileSync(file, 'utf8')));
}
