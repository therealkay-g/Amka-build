const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

const root = process.cwd();
const srcStatic = path.join(root, '.next', 'static');
const destStatic = path.join(root, '.next', 'standalone', '.next', 'static');

const srcPublic = path.join(root, 'public');
const destPublic = path.join(root, '.next', 'standalone', 'public');

console.log('--- Copying Standalone Static Assets ---');
if (fs.existsSync(srcStatic)) {
  console.log(`Copying ${srcStatic} -> ${destStatic}`);
  copyRecursiveSync(srcStatic, destStatic);
}
if (fs.existsSync(srcPublic)) {
  console.log(`Copying ${srcPublic} -> ${destPublic}`);
  copyRecursiveSync(srcPublic, destPublic);
}
console.log('--- Static Assets Copy Completed ---');
