// make-icons.mjs - Generates the PNG icons of the extension, without dependency
// Exposes: node scripts/make-icons.mjs  ->  extension/icons/icon-{16,32,48,128}.png
//
// Drawing: dark rounded square, two overlapping circles (the duo), in the
// colors of the panel. Rendered with 4x4 supersampling to smooth the edges.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'extension', 'icons');
const BG = [28, 28, 31];
const A = [0, 187, 163];
const B = [232, 64, 87];

// Color of a point (u, v in [0, 1]); null outside the rounded square.
function shade(u, v) {
  const r = 0.22;
  const dx = Math.max(r - u, 0, u - (1 - r));
  const dy = Math.max(r - v, 0, v - (1 - r));
  if (dx * dx + dy * dy > r * r) return null;
  const inA = (u - 0.4) ** 2 + (v - 0.5) ** 2 < 0.24 ** 2;
  const inB = (u - 0.6) ** 2 + (v - 0.5) ** 2 < 0.24 ** 2;
  if (inA && inB) return [255, 255, 255];
  if (inA) return A;
  if (inB) return B;
  return BG;
}

function render(size) {
  const ss = 4;
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let rr = 0, gg = 0, bb = 0, n = 0;
      for (let j = 0; j < ss; j++) for (let i = 0; i < ss; i++) {
        const c = shade((x + (i + 0.5) / ss) / size, (y + (j + 0.5) / ss) / size);
        if (c) { rr += c[0]; gg += c[1]; bb += c[2]; n++; }
      }
      const o = (y * size + x) * 4;
      if (n) { px[o] = rr / n; px[o + 1] = gg / n; px[o + 2] = bb / n; }
      px[o + 3] = Math.round((255 * n) / (ss * ss));
    }
  }
  return png(size, px);
}

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, px) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))
  ]);
}

fs.mkdirSync(OUT, { recursive: true });
for (const s of [16, 32, 48, 128]) {
  fs.writeFileSync(path.join(OUT, `icon-${s}.png`), render(s));
  console.log(`extension/icons/icon-${s}.png`);
}
