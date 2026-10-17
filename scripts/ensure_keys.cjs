const fs = require('fs');
const path = require('path');

const localKeysPath = path.join(__dirname, '../src/config/keys.local.ts');
const defaultKeysPath = path.join(__dirname, '../src/config/keys.default.ts');

if (!fs.existsSync(localKeysPath)) {
  if (fs.existsSync(defaultKeysPath)) {
    fs.copyFileSync(defaultKeysPath, localKeysPath);
    console.log('[ensure_keys] Created src/config/keys.local.ts from template.');
  } else {
    console.warn('[ensure_keys] keys.default.ts not found.');
  }
}

