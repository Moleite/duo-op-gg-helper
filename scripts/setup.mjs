// setup.mjs - Prepares a machine: .env from .env.example, then test dependencies
// Exposes: npm run setup
//
// Safe to run again: an existing .env is never overwritten.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { ROOT } from './env.mjs';

const env = path.join(ROOT, '.env');
if (fs.existsSync(env)) {
  console.log('.env already exists: left as it is.');
} else {
  fs.copyFileSync(path.join(ROOT, '.env.example'), env);
  console.log('.env created from .env.example: fill it (docs/run/getting-started.md).');
}

execSync('npm ci', { cwd: ROOT, stdio: 'inherit' });
console.log('\nNext: load extension/ in chrome://extensions (Developer mode, Load unpacked).');
