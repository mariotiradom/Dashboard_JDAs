const fs = require('fs');
const files = ['DataBase/Data Bruta EP - BD 24-1.csv', 'DataBase/Data Bruta EP - BD 24-2.csv', 'DataBase/Data Bruta EP - BD 25-1.csv', 'DataBase/Data Bruta EP - BD 25-2.csv'];
const das = new Set();
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf-8').split('\n');
  for (let i = 1; i < content.length; i++) {
    const line = content[i].trim();
    if (!line) continue;
    let inQuotes = false; let current = ''; let cols = [];
    for (const char of line) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) { cols.push(current); current = ''; }
      else current += char;
    }
    cols.push(current);
    if (cols[2]) das.add(cols[2].trim());
  }
}
console.log(Array.from(das));
