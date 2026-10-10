const fs = require('fs');
const path = require('path');

const CYCLE = '26-2';
const CSV_FILE = path.join(__dirname, 'DataBase/BBDD REA 26-2 - BBDDREDA.csv');
const ENROLLMENT_FILE = path.join(__dirname, 'DataBase/enrollment.json');

// --- Parse CSV (handles quoted fields) ---
function parseCSVLine(line) {
  const cols = [];
  let inQ = false, curr = '';
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { cols.push(curr.trim()); curr = ''; }
    else curr += ch;
  }
  cols.push(curr.trim());
  return cols;
}

const content = fs.readFileSync(CSV_FILE, 'utf-8')
  .split('\n')
  .map(l => l.replace(/\r/g, '').trim())
  .filter(l => l.length > 0);

const headers = parseCSVLine(content[0]);
console.log('Headers found:', headers);

const codigoIdx = headers.indexOf('Código del Programa REA');
const totalIdx  = headers.indexOf('Total Matriculados');

if (codigoIdx === -1 || totalIdx === -1) {
  console.error('ERROR: Could not find required columns.');
  console.error(`  "Código del Programa REA" → index ${codigoIdx}`);
  console.error(`  "Total Matriculados"       → index ${totalIdx}`);
  process.exit(1);
}

// --- Load existing enrollment.json ---
let enrollment = {};
try {
  enrollment = JSON.parse(fs.readFileSync(ENROLLMENT_FILE, 'utf-8'));
} catch (e) {
  console.log('No existing enrollment.json — will create a new one.');
}

// --- Merge new 26-2 entries ---
let added = 0, updated = 0, skipped = 0;

for (let i = 1; i < content.length; i++) {
  const cols = parseCSVLine(content[i]);
  const codigoRaw = cols[codigoIdx];
  const totalRaw  = cols[totalIdx];

  if (!codigoRaw || !totalRaw) { skipped++; continue; }

  const total = parseInt(totalRaw, 10);
  if (isNaN(total)) { skipped++; continue; }

  const key = `${CYCLE}_${codigoRaw}`;
  const existed = key in enrollment;
  enrollment[key] = total;
  existed ? updated++ : added++;
}

// --- Write back sorted ---
const sorted = Object.fromEntries(
  Object.entries(enrollment).sort(([a], [b]) => a.localeCompare(b))
);

fs.writeFileSync(ENROLLMENT_FILE, JSON.stringify(sorted, null, 2), 'utf-8');

console.log(`\nDone! enrollment.json updated:`);
console.log(`  ✅ Added   : ${added}`);
console.log(`  🔄 Updated : ${updated}`);
console.log(`  ⚠️  Skipped : ${skipped}`);
console.log(`  📦 Total keys in file: ${Object.keys(sorted).length}`);

