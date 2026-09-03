"use strict";
/*
 * Générateur d'icônes AMKA — Node.js pur (aucune dépendance).
 * Dessine : dégradé indigo→teal, cœur blanc, tracé ECG blanc-cyan.
 * Sortie : icônes Android (mipmap + splashes), icône web, icône Electron et .ico Windows.
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..");
const RES = path.join(ROOT, "android", "app", "src", "main", "res");

// ---------- Couleurs de la marque ----------
const INDIGO = [70, 72, 212];      // #4648D4
const TEAL = [0, 104, 122];        // #00687A
const WHITE = [255, 255, 255];
const PULSE = [159, 240, 231];     // #9FF0E7

// ---------- Encodage PNG ----------
let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

// ---------- Géométrie ----------
function lerp(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function roundedRectCovers(x, y, w, h, r) {
  const cx = w / 2, cy = h / 2;
  const hw = w / 2 - r, hh = h / 2 - r;
  const dx = Math.max(Math.abs(x - cx) - hw, 0);
  const dy = Math.max(Math.abs(y - cy) - hh, 0);
  return dx * dx + dy * dy <= r * r;
}

function heartCovers(x, y, w, h, s) {
  const u = (x / w - 0.5) / s;
  const v = -((y / h - 0.5) / s);
  const a = u * u + v * v - 1;
  return a * a * a - u * u * v * v * v <= 0;
}

function segDist(px, py, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - a[0]) * dx + (py - a[1]) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const ex = a[0] + t * dx - px, ey = a[1] + t * dy - py;
  return Math.sqrt(ex * ex + ey * ey);
}

function pulseCovers(x, y, w, h, halfStroke) {
  const pts = [
    [0.12, 0.50], [0.30, 0.50], [0.38, 0.44], [0.44, 0.50],
    [0.49, 0.50], [0.535, 0.665], [0.575, 0.34], [0.615, 0.50],
    [0.70, 0.50], [0.88, 0.50],
  ].map((p) => [p[0] * w, p[1] * h]);
  for (let i = 0; i < pts.length - 1; i++) {
    if (segDist(x, y, pts[i], pts[i + 1]) <= halfStroke) return true;
  }
  return false;
}

// ---------- Rendu ----------
function renderIcon({ size, rounded = true, heartScale = 0.196, strokeW = 0.045, transparentBg = false, bgColor }) {
  const rgba = Buffer.alloc(size * size * 4);
  const samples = size <= 64 ? 4 : 3;
  const halfStroke = size * strokeW * 0.5;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let rAcc = 0, gAcc = 0, bAcc = 0, aAcc = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const px = x + (sx + 0.5) / samples;
          const py = y + (sy + 0.5) / samples;
          let col = null, alpha = 0;
          if (transparentBg) {
            if (heartCovers(px, py, size, size, heartScale)) {
              col = WHITE; alpha = 1;
            }
            if (pulseCovers(px, py, size, size, halfStroke)) {
              col = PULSE; alpha = 1;
            }
          } else if (!rounded || roundedRectCovers(px, py, size, size, size * 0.22)) {
            const t = (px + py) / (size * 2);
            col = lerp(INDIGO, TEAL, t);
            alpha = 1;
            if (heartCovers(px, py, size, size, heartScale)) {
              col = WHITE; alpha = 1;
            }
            if (pulseCovers(px, py, size, size, halfStroke)) {
              col = PULSE; alpha = 1;
            }
          }
          if (alpha > 0) {
            rAcc += col[0]; gAcc += col[1]; bAcc += col[2]; aAcc += 255;
          }
        }
      }
      const n = samples * samples;
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(rAcc / n);
      rgba[i + 1] = Math.round(gAcc / n);
      rgba[i + 2] = Math.round(bAcc / n);
      rgba[i + 3] = Math.round(aAcc / n);
    }
  }
  return encodePng(size, size, rgba);
}

function renderSplash(w, h) {
  const rgba = Buffer.alloc(w * h * 4);
  const m = Math.min(w, h);
  const heartScale = 0.30 / 2.65;
  const halfStroke = m * 0.018;
  const samples = 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let rAcc = 0, gAcc = 0, bAcc = 0, aAcc = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const px = x + (sx + 0.5) / samples;
          const py = y + (sy + 0.5) / samples;
          const t = (px / w + py / h) / 2;
          let col = lerp(INDIGO, TEAL, t);
          if (heartCovers(px, py, m, m, heartScale)) col = WHITE;
          if (pulseCovers(px, py, m, m, halfStroke)) col = PULSE;
          rAcc += col[0]; gAcc += col[1]; bAcc += col[2]; aAcc += 255;
        }
      }
      const n = samples * samples;
      const i = (y * w + x) * 4;
      rgba[i] = Math.round(rAcc / n);
      rgba[i + 1] = Math.round(gAcc / n);
      rgba[i + 2] = Math.round(bAcc / n);
      rgba[i + 3] = Math.round(aAcc / n);
    }
  }
  return encodePng(w, h, rgba);
}

// ---------- ICO ----------
function buildIco(sizes, renderFn) {
  const images = sizes.map((s) => ({ size: s, data: renderFn(s) }));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const dir = [];
  let offset = 6 + images.length * 16;
  for (const img of images) {
    const e = Buffer.alloc(16);
    e[0] = img.size >= 256 ? 0 : img.size;
    e[1] = img.size >= 256 ? 0 : img.size;
    e[2] = 0;
    e[3] = 0;
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(img.data.length, 8);
    e.writeUInt32LE(offset, 12);
    dir.push(e);
    offset += img.data.length;
  }
  return Buffer.concat([header, ...dir, ...images.map((i) => i.data)]);
}

// ---------- Écriture ----------
function ensure(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function legacyIcon(size) {
  return renderIcon({ size, rounded: true, heartScale: 0.196, strokeW: 0.045 });
}
function foregroundIcon(size) {
  return renderIcon({ size, rounded: false, heartScale: 0.205, strokeW: 0.04, transparentBg: true });
}

const densities = {
  mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192,
};
const fgSizes = {
  mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432,
};
const splashSizes = {
  mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920],
};

console.log("Génération des icônes…");

for (const [d, size] of Object.entries(densities)) {
  const dir = path.join(RES, "mipmap-" + d);
  fs.writeFileSync(path.join(dir, "ic_launcher.png"), legacyIcon(size));
  fs.writeFileSync(path.join(dir, "ic_launcher_round.png"), legacyIcon(size));
  fs.writeFileSync(path.join(dir, "ic_launcher_foreground.png"), foregroundIcon(fgSizes[d]));
  console.log("  mipmap-" + d + " OK");
}

for (const [d, [w, h]] of Object.entries(splashSizes)) {
  fs.writeFileSync(path.join(RES, "drawable-port-" + d, "splash.png"), renderSplash(w, h));
  fs.writeFileSync(path.join(RES, "drawable-land-" + d, "splash.png"), renderSplash(h, w));
  console.log("  splash " + d + " (portrait+landscape) OK");
}
fs.writeFileSync(path.join(RES, "drawable", "splash.png"), renderSplash(480, 320));

const webIcon = legacyIcon(512);
ensure(path.join(ROOT, "public"));
fs.writeFileSync(path.join(ROOT, "public", "amka_logo_icon.png"), webIcon);
fs.writeFileSync(path.join(ROOT, "public", "favicon.ico"), buildIco([16, 24, 32, 48, 64], legacyIcon));

ensure(path.join(ROOT, "electron"));
fs.writeFileSync(path.join(ROOT, "electron", "icon.png"), webIcon);

ensure(path.join(ROOT, "build"));
fs.writeFileSync(path.join(ROOT, "build", "icon.ico"), buildIco([16, 24, 32, 48, 64, 128, 256], legacyIcon));

console.log("Icônes web / Electron / Windows générées.");
console.log("Terminé.");