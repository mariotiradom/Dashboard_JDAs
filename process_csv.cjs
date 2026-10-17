const fs = require('fs');
const path = require('path');

// Normalize string for consistent matching
function normalizeStr(str) {
  if (!str) return '';
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// 1. Read BD files to build records
const bdFiles = [
  'DataBase/Data Bruta EP - BD 24-1.csv',
  'DataBase/Data Bruta EP - BD 24-2.csv',
  'DataBase/Data Bruta EP - BD 25-1.csv',
  'DataBase/Data Bruta EP - BD 25-2.csv',
  'DataBase/DB EP 26-1 - Enlace.csv',
  'DataBase/DB EP 26-2 - Enlace.csv'
];

let records = [];
const processedProfs = new Set(); // to attach comments only once per prof-course combo
const grouped = new Map(); // to aggregate student rows into section rows

let enrollment = {};
try {
  enrollment = JSON.parse(fs.readFileSync(path.join(__dirname, 'DataBase/enrollment.json'), 'utf-8'));
} catch (e) {
  console.log("No enrollment.json found or error reading it.", e);
}

for (const file of bdFiles) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf-8').split('\n');
  if (content.length < 2) continue;
  
  // Parse headers
  const headerLine = content[0].trim();
  const headers = [];
  let inQ = false; let curr = '';
  for (const char of headerLine) {
    if (char === '"') inQ = !inQ;
    else if (char === ',' && !inQ) { headers.push(curr.trim()); curr = ''; }
    else curr += char;
  }
  headers.push(curr.trim());

  const getCol = (cols, name) => {
    const idx = headers.indexOf(name);
    return idx >= 0 ? cols[idx] : undefined;
  };

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
    
    const anioRaw = getCol(cols, 'anio_academico');
    const semRaw = getCol(cols, 'semestre');
    const daRaw = getCol(cols, 'departamento_academico');
    const courseRaw = getCol(cols, 'nombre_curso');
    const profRaw = getCol(cols, 'profesor');
    const seccionRaw = getCol(cols, 'seccion');
    
    // Some older files might use different names, we take the average of all available ratings anyway.
    // We'll calculate 'promedio' as the average of all columns that start with 'profesor_' (excluding rea_evaluacion)
    let ratingSum = 0;
    let ratingCount = 0;
    for (let j = 0; j < headers.length; j++) {
      if (headers[j].startsWith('profesor_')) {
        const val = parseFloat((cols[j] || '').replace(',', '.'));
        if (!isNaN(val) && val > 0) {
          ratingSum += val;
          ratingCount++;
        }
      }
    }
    const promedio = ratingCount > 0 ? (ratingSum / ratingCount) : 0;
    
    // Extract 6 dimensions for the Hexagon, averaging motivacion1 and motivacion2
    const ayuda = parseFloat((getCol(cols, 'profesor_ayuda') || '').replace(',','.')) || 0;
    const motiv1 = parseFloat((getCol(cols, 'profesor_motivacion') || '').replace(',','.')) || 0;
    const motiv2 = parseFloat((getCol(cols, 'profesor_motivacion2') || '').replace(',','.')) || 0;
    let motivacionFinal = 0;
    if (motiv1 > 0 && motiv2 > 0) motivacionFinal = (motiv1 + motiv2) / 2;
    else if (motiv1 > 0) motivacionFinal = motiv1;
    else if (motiv2 > 0) motivacionFinal = motiv2;

    const retroalimentacion = parseFloat((getCol(cols, 'profesor_retroalimentacion') || '').replace(',','.')) || 0;
    const estimulacion = parseFloat((getCol(cols, 'profesor_estimulacion') || '').replace(',','.')) || 0;
    const interes = parseFloat((getCol(cols, 'profesor_interes') || '').replace(',','.')) || 0;
    const respeto = parseFloat((getCol(cols, 'profesor_respeto') || '').replace(',','.')) || 0;
    
    // Extract values specifically for the Mediana calculation (raw ungrouped data)
    const rowMedianValues = [];
    if (ayuda > 0) rowMedianValues.push(ayuda);
    if (motiv1 > 0) rowMedianValues.push(motiv1);
    if (motiv2 > 0) rowMedianValues.push(motiv2);
    if (retroalimentacion > 0) rowMedianValues.push(retroalimentacion);
    if (estimulacion > 0) rowMedianValues.push(estimulacion);
    
    const codeRaw = getCol(cols, 'Codigo PROG REA') || `${courseRaw}_${seccionRaw}`;
    const evaluacionComentario = (getCol(cols, 'otros_2') || getCol(cols, 'otros_3') || getCol(cols, 'otros_1') || '').trim();
    
    if (!courseRaw || !profRaw) continue;
    if (profRaw.includes('?')) continue;
    if (courseRaw.includes('?')) continue;

    // Build cycle string: "24-2"
    const anioShort = anioRaw ? anioRaw.slice(-2) : '';
    const ciclo = (anioShort && semRaw) ? `${anioShort}-${semRaw}` : '';

    // Unify professor name (Title Case)
    const formattedProf = profRaw
      .toLowerCase()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    // Format DA
    let da = (daRaw || 'Humanidades').trim().toUpperCase();
    let formattedDa = 'Humanidades';
    if (da.includes('ECONOM')) formattedDa = 'Economía';
    else if (da.includes('INGENIER') || da.includes('ENGINEER')) formattedDa = 'Ingeniería';
    else if (da.includes('HUMAN')) formattedDa = 'Humanidades';
    else if (da.includes('ADMINISTR')) formattedDa = 'Administración';
    else if (da.includes('DERECHO') || da.includes('RECHTS')) formattedDa = 'Derecho';
    else if (da.includes('MARKETING')) formattedDa = 'Marketing y Negocios Internacionales';
    else if (da.includes('CONTABILIDAD')) formattedDa = 'Contabilidad';
    else if (da.includes('CIENCIAS SOCIALES') || da.includes('SOCIALE')) formattedDa = 'Ciencias Sociales y Políticas';
    else if (da.includes('FINANZAS')) formattedDa = 'Finanzas';

    // Extract section exactly from the code (e.g. "_A")
    const codeParts = codeRaw.split('_');
    const parsedSection = codeParts.length > 1 ? codeParts[codeParts.length - 1] : (seccionRaw || 'Única');
    
    const finalSection = ciclo ? `${parsedSection} [${ciclo}]` : parsedSection;
    const finalCourseCode = ciclo ? `${codeRaw} [${ciclo}]` : codeRaw;

    // Group by courseCode + professor (Now includes cycle)
    const key = `${finalCourseCode}|${formattedProf}`;
    
    if (!grouped.has(key)) {
      grouped.set(key, {
        courseCode: finalCourseCode,
        courseName: courseRaw,
        section: finalSection,
        ciclo: ciclo,
        professor: formattedProf,
        departamento: formattedDa,
        enrolled: 40,
        responses: 0,
        ayudaSum: 0,
        motivacionSum: 0,
        retroalimentacionSum: 0,
        estimulacionSum: 0,
        interesSum: 0,
        respetoSum: 0,
        promedioSum: 0,
        count: 0,
        rawMedianScores: [],
        comentarios: []
      });
    }

    const group = grouped.get(key);
    group.responses += 1;
    group.count += 1;
    group.ayudaSum += ayuda || promedio;
    group.motivacionSum += motivacionFinal || promedio;
    group.retroalimentacionSum += retroalimentacion || promedio;
    group.estimulacionSum += estimulacion || promedio;
    group.interesSum += interes || promedio;
    group.respetoSum += respeto || promedio;
    group.promedioSum += promedio;
    
    group.rawMedianScores.push(...rowMedianValues);
    
    if (evaluacionComentario) {
      const lower = evaluacionComentario.toLowerCase();
      if (!['null', 'rea1', 'rea2', 'rea3', 'none', 'nan', 'n/a', '-'].includes(lower)) {
        group.comentarios.push(evaluacionComentario);
      }
    }
  }
}

// Compute averages and build final records
records = [];
for (const [key, group] of grouped.entries()) {
  const [_, profRaw] = key.split('|');
  const courseRaw = group.courseName;

  const n = group.count;
  const avgPromedio = group.promedioSum / n;
  
  if (avgPromedio === 0) continue;
  
  // Calculate Median of ungrouped raw data
  let medianVal = 0;
  if (group.rawMedianScores.length > 0) {
    const sorted = group.rawMedianScores.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      medianVal = (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
      medianVal = sorted[mid];
    }
  }
  
  const finalPuntajeDocente = medianVal > 0 ? (avgPromedio + medianVal) / 2 : avgPromedio;
  
  const pureSection = group.section.split(' ')[0];
  const enrollKey = `${group.ciclo}_${group.courseName}_${pureSection}`;
  let enrolledStudents = enrollment[enrollKey];
  
  if (!enrolledStudents) {
    // Fallback ONLY if not found in database. If found but responses > matriculados, trust the database.
    enrolledStudents = Math.max(group.responses * 2, 40);
  }

  records.push({
    courseCode: group.courseCode,
    courseName: group.courseName,
    section: group.section,
    ciclo: group.ciclo,
    professor: group.professor,
    departamento: group.departamento,
    enrolled: enrolledStudents,
    responses: group.responses,
    alumnoCom: avgPromedio, alumnoPunt: avgPromedio, alumnoResp: avgPromedio, alumnoDedic: avgPromedio,
    cursoIncent: avgPromedio, cursoObj: avgPromedio, cursoRec: avgPromedio, cursoDist: avgPromedio,
    docenteAyuda: group.ayudaSum / n,
    docenteMotiv: group.motivacionSum / n,
    docenteRetro: group.retroalimentacionSum / n,
    docenteEstim: group.estimulacionSum / n,
    docenteInteres: group.interesSum / n,
    docenteRespeto: group.respetoSum / n,
    docentePromedio: finalPuntajeDocente,
    comentarios: group.comentarios
  });
}

// ═══ Include sections with 0 responses from official BBDD offerings ═══
const existingKeys = new Set(records.map(r => {
  const pureSec = r.section.replace(/[[\]()]/g, '').trim().split(' ')[0].toUpperCase();
  return `${r.ciclo}|${normalizeStr(r.courseName)}|${pureSec}|${normalizeStr(r.professor)}`;
}));

const bbddOfferings = [
  { ciclo: '26-2', file: 'DataBase/BBDD REA 26-2 - BBDDREDA.csv' },
  { ciclo: '26-1', file: 'DataBase/BBDD SALONES 26-1 - BBDD REDA.csv' },
  { ciclo: '25-1', file: 'DataBase/oferta académica 2025 I.xlsx - Consumo final de cupos por secc.csv' }
];

let zeroSectionsAdded = 0;
for (const offering of bbddOfferings) {
  if (!fs.existsSync(offering.file)) continue;
  const content = fs.readFileSync(offering.file, 'utf-8').split('\n');
  if (content.length < 2) continue;

  const headerLine = content[0].trim();
  const headers = [];
  let inQ = false; let curr = '';
  for (const char of headerLine) {
    if (char === '"') inQ = !inQ;
    else if (char === ',' && !inQ) { headers.push(curr.trim()); curr = ''; }
    else curr += char;
  }
  headers.push(curr.trim());

  const getCol = (cols, name) => {
    const idx = headers.indexOf(name);
    return idx >= 0 ? cols[idx] : undefined;
  };

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

    const daRaw = getCol(cols, 'Departamento');
    const courseRaw = getCol(cols, 'Curso');
    const seccionRaw = getCol(cols, 'Sección');
    const profRaw = getCol(cols, 'Docente');
    const matriculadosRaw = getCol(cols, 'Total Matriculados');

    if (!courseRaw || !profRaw || !seccionRaw) continue;
    if (profRaw.includes('?') || courseRaw.includes('?')) continue;

    const formattedProf = profRaw
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    let da = (daRaw || 'Humanidades').trim().toUpperCase();
    let formattedDa = 'Humanidades';
    if (da.includes('ECONOM')) formattedDa = 'Economía';
    else if (da.includes('INGENIER') || da.includes('ENGINEER')) formattedDa = 'Ingeniería';
    else if (da.includes('HUMAN')) formattedDa = 'Humanidades';
    else if (da.includes('ADMINISTR')) formattedDa = 'Administración';
    else if (da.includes('DERECHO') || da.includes('RECHTS')) formattedDa = 'Derecho';
    else if (da.includes('MARKETING')) formattedDa = 'Marketing y Negocios Internacionales';
    else if (da.includes('CONTABILIDAD')) formattedDa = 'Contabilidad';
    else if (da.includes('CIENCIAS SOCIALES') || da.includes('SOCIALE')) formattedDa = 'Ciencias Sociales y Políticas';
    else if (da.includes('FINANZAS')) formattedDa = 'Finanzas';

    const pureSec = seccionRaw.replace(/[[\]()]/g, '').trim().split(' ')[0].toUpperCase();
    const matchKey = `${offering.ciclo}|${normalizeStr(courseRaw)}|${pureSec}|${normalizeStr(formattedProf)}`;

    if (!existingKeys.has(matchKey)) {
      existingKeys.add(matchKey);
      const enrolledNum = parseInt((matriculadosRaw || '').trim(), 10) || 30;
      const finalSection = `${pureSec} [${offering.ciclo}]`;
      const finalCourseCode = `${courseRaw}_${pureSec} [${offering.ciclo}]`;

      records.push({
        courseCode: finalCourseCode,
        courseName: courseRaw,
        section: finalSection,
        ciclo: offering.ciclo,
        professor: formattedProf,
        departamento: formattedDa,
        enrolled: enrolledNum,
        responses: 0,
        alumnoCom: 0, alumnoPunt: 0, alumnoResp: 0, alumnoDedic: 0,
        cursoIncent: 0, cursoObj: 0, cursoRec: 0, cursoDist: 0,
        docenteAyuda: 0,
        docenteMotiv: 0,
        docenteRetro: 0,
        docenteEstim: 0,
        docenteInteres: 0,
        docenteRespeto: 0,
        docentePromedio: 0,
        comentarios: []
      });
      zeroSectionsAdded++;
    }
  }
}

console.log(`Added ${zeroSectionsAdded} zero-response sections from official BBDD offerings.`);
fs.writeFileSync('public/survey_data_v2.json', JSON.stringify(records, null, 2));
console.log('Processed ' + records.length + ' aggregated records from BD files.');


