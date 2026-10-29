'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

for (const locale of ['es', 'fr', 'de', 'pt', 'it', 'ru']) {
  const source = path.join(__dirname, 'dist/multilingual', locale);
  const target = path.join(__dirname, 'dist/mempool/browser', locale);
  if (!fs.existsSync(path.join(source, 'index.html'))) throw new Error(`Missing ${locale} Angular build`);
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(source, target, { recursive: true });
  execFileSync(process.execPath, [path.join(__dirname, 'async-native-styles.cjs'), target], { stdio: 'inherit' });
}
