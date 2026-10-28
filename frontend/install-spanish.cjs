'use strict';
const fs = require('node:fs');
const path = require('node:path');
const source = path.join(__dirname, 'dist/spanish/es');
const target = path.join(__dirname, 'dist/mempool/browser/es');
if (!fs.existsSync(path.join(source, 'index.html'))) throw new Error('Missing Spanish Angular build');
fs.rmSync(target, {recursive: true, force: true});
fs.cpSync(source, target, {recursive: true});
