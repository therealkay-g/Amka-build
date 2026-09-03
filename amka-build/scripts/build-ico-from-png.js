"use strict";
/*
 * Assemble les .ico Windows (build/icon.ico + public/favicon.ico) à partir
 * des PNG de scripts/gen-icons-ps.ps1 (build/ico/icon-<size>.png).
 * N'utilise PAS le renderer de generate-icons.js (qui dessine sans texte).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ICO_DIR = path.join(ROOT, "build", "ico");

function buildIco(sizes) {
  const images = sizes.map((s) => {
    const data = fs.readFileSync(path.join(ICO_DIR, `icon-${s}.png`));
    return { size: s, data };
  });
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

fs.writeFileSync(path.join(ROOT, "build", "icon.ico"), buildIco([16, 24, 32, 48, 64, 128, 256]));
console.log("build/icon.ico OK (" + fs.statSync(path.join(ROOT, "build", "icon.ico")).size + " bytes)");

fs.writeFileSync(path.join(ROOT, "public", "favicon.ico"), buildIco([16, 24, 32, 48, 64]));
console.log("public/favicon.ico OK (" + fs.statSync(path.join(ROOT, "public", "favicon.ico")).size + " bytes)");