const fs = require('fs');
const path = require('path');

const CYCLE = '26-2';
const OFFICIAL_FILE = path.join(__dirname, 'DataBase/Reportes Profesores - BBDD 2026-2.csv');
const FALLBACK_FILE = path.join(__dirname, 'DataBase/BBDD REA 26-2 - BBDDREDA.csv');
const CSV_FILE = fs.existsSync(OFFICIAL_FILE) ? OFFICIAL_FILE : FALLBACK_FILE;
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
console.log(`Using file: ${CSV_FILE}`);
console.log('Headers found:', headers);

const codigoIdx = headers.indexOf('Codigo del Programa REA') !== -1 
  ? headers.indexOf('Codigo del Programa REA') 
  : headers.indexOf('Código del Programa REA');
const totalIdx  = headers.indexOf('Total Matriculados');
const cursoIdx  = headers.indexOf('Curso');
const seccionIdx = headers.indexOf('Sección');

if (totalIdx === -1) {
  console.error('ERROR: Could not find "Total Matriculados" column.');
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
  const totalRaw  = cols[totalIdx];
  const total = parseInt(totalRaw, 10);
  if (isNaN(total)) { skipped++; continue; }

  const codigoRaw = codigoIdx !== -1 ? cols[codigoIdx] : '';
  const cursoRaw  = cursoIdx !== -1 ? cols[cursoIdx] : '';
  const secRaw    = seccionIdx !== -1 ? cols[seccionIdx].replace(/[[\]()]/g, '').trim().split(' ')[0].toUpperCase() : '';

  if (codigoRaw) {
    const key = `${CYCLE}_${codigoRaw}`;
    if (key in enrollment) updated++; else added++;
    enrollment[key] = total;
  }

  if (cursoRaw && secRaw) {
    const key = `${CYCLE}_${cursoRaw}_${secRaw}`;
    if (!(key in enrollment)) added++;
    enrollment[key] = total;
  }
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
