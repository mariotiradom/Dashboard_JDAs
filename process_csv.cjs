const fs = require('fs');
const path = require('path');

// Normalize string for consistent matching
function normalizeStr(str) {
  if (!str) return '';
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function parseCSVLine(line) {
  let inQ = false, curr = '', cols = [];
  for (const char of line) {
    if (char === '"') inQ = !inQ;
    else if (char === ',' && !inQ) { cols.push(curr.trim()); curr = ''; }
    else curr += char;
  }
  cols.push(curr.trim());
  return cols;
}

function formatProfessor(name) {
  return (name || '')
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatDepartment(daRaw) {
  let da = (daRaw || 'Humanidades').trim().toUpperCase();
  if (da.includes('ECONOM')) return 'Economía';
  if (da.includes('INGENIER') || da.includes('ENGINEER')) return 'Ingeniería';
  if (da.includes('HUMAN')) return 'Humanidades';
  if (da.includes('ADMINISTR')) return 'Administración';
  if (da.includes('DERECHO') || da.includes('RECHTS')) return 'Derecho';
  if (da.includes('MARKETING')) return 'Marketing y Negocios Internacionales';
  if (da.includes('CONTABILIDAD')) return 'Contabilidad';
  if (da.includes('CIENCIAS SOCIALES') || da.includes('SOCIALE')) return 'Ciencias Sociales y Políticas';
  if (da.includes('FINANZAS')) return 'Finanzas';
  return 'Humanidades';
}

// 1. Read enrollment.json
let enrollment = {};
try {
  enrollment = JSON.parse(fs.readFileSync(path.join(__dirname, 'DataBase/enrollment.json'), 'utf-8'));
} catch (e) {
  console.log("No enrollment.json found or error reading it.", e);
}

// 2. Load official 26-2 BBDD file (Reportes Profesores - BBDD 2026-2.csv)
// This file is the source of truth for which professor teaches each salon and the exact enrolled count.
const official26_2File = path.join(__dirname, 'DataBase/Reportes Profesores - BBDD 2026-2.csv');
const official26_2Map = new Map();
const official26_2List = [];

if (fs.existsSync(official26_2File)) {
  const offLines = fs.readFileSync(official26_2File, 'utf-8').split('\n').filter(l => l.trim().length > 0);
  if (offLines.length > 1) {
    const offHeaders = parseCSVLine(offLines[0]);
    const getOffCol = (cols, name) => {
      const idx = offHeaders.indexOf(name);
      return idx >= 0 ? cols[idx] : undefined;
    };

    for (let i = 1; i < offLines.length; i++) {
      const cols = parseCSVLine(offLines[i]);
      const curso = getOffCol(cols, 'Curso');
      const seccion = getOffCol(cols, 'Sección');
      const prof = getOffCol(cols, 'Profesor(a)') || getOffCol(cols, 'Docente');
      const daRaw = getOffCol(cols, 'Departamento Académico') || getOffCol(cols, 'Departamento');
      const matRaw = getOffCol(cols, 'Total Matriculados');
      const code = getOffCol(cols, 'Codigo del Programa REA') || `${curso}_${seccion}`;

      if (!curso || !prof || !seccion) continue;

      const formattedProf = formatProfessor(prof);
      const formattedDa = formatDepartment(daRaw);
      const mat = parseInt((matRaw || '').trim(), 10) || 0;
      const pureSec = seccion.replace(/[[\]()]/g, '').trim().split(' ')[0].toUpperCase();

      const entry = {
        courseName: curso,
        section: pureSec,
        professor: formattedProf,
        departamento: formattedDa,
        enrolled: mat,
        code: code
      };
      official26_2List.push(entry);

      const salonKey = `${normalizeStr(curso)}|${normalizeStr(pureSec)}`;
      if (!official26_2Map.has(salonKey)) official26_2Map.set(salonKey, []);
      official26_2Map.get(salonKey).push(entry);

      // Keep enrollment in sync for both formats of keys
      enrollment[`26-2_${curso}_${pureSec}`] = mat;
      enrollment[`26-2_${code}`] = mat;
    }
    console.log(`Loaded ${official26_2List.length} assignments from Reportes Profesores - BBDD 2026-2.csv (${official26_2Map.size} unique salons).`);
  }
}

// 3. Read BD survey files to build records
const bdFiles = [
  'DataBase/Data Bruta EP - BD 24-1.csv',
  'DataBase/Data Bruta EP - BD 24-2.csv',
  'DataBase/Data Bruta EP - BD 25-1.csv',
  'DataBase/Data Bruta EP - BD 25-2.csv',
  'DataBase/DB EP 26-1 - Enlace.csv',
  'DataBase/DB EP 26-2 - Enlace.csv'
];

let records = [];
const grouped = new Map(); // to aggregate student rows into section rows

for (const file of bdFiles) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf-8').split('\n');
  if (content.length < 2) continue;
  
  // Parse headers
  const headers = parseCSVLine(content[0]);

  const getCol = (cols, name) => {
    const idx = headers.indexOf(name);
    return idx >= 0 ? cols[idx] : undefined;
  };

  for (let i = 1; i < content.length; i++) {
    const line = content[i].trim();
    if (!line) continue;
    const cols = parseCSVLine(line);
    
    const anioRaw = getCol(cols, 'anio_academico');
    const semRaw = getCol(cols, 'semestre');
    const daRaw = getCol(cols, 'departamento_academico');
    const courseRaw = getCol(cols, 'nombre_curso');
    const profRaw = getCol(cols, 'profesor');
    const seccionRaw = getCol(cols, 'seccion');
    
    // Average all columns that start with 'profesor_'
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
    
    // Extract 6 dimensions for Hexagon, averaging motivacion1 and motivacion2
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
    
    // Extract values specifically for Mediana calculation
    const rowMedianValues = [];
    if (ayuda > 0) rowMedianValues.push(ayuda);
    if (motiv1 > 0) rowMedianValues.push(motiv1);
    if (motiv2 > 0) rowMedianValues.push(motiv2);
    if (retroalimentacion > 0) rowMedianValues.push(retroalimentacion);
    if (estimulacion > 0) rowMedianValues.push(estimulacion);
    
    const codeRaw = getCol(cols, 'Codigo PROG REA') || `${courseRaw}_${seccionRaw}`;
    const evaluacionComentario = (getCol(cols, 'otros_2') || getCol(cols, 'otros_3') || getCol(cols, 'otros_1') || '').trim();
    
    if (!courseRaw || !profRaw) continue;
    if (profRaw.includes('?') && (!anioRaw || !anioRaw.includes('26') || semRaw !== '2')) continue;
    if (courseRaw.includes('?')) continue;

    // Build cycle string: "24-2"
    const anioShort = anioRaw ? anioRaw.slice(-2) : '';
    const ciclo = (anioShort && semRaw) ? `${anioShort}-${semRaw}` : '';

    // Extract section exactly from the code (e.g. "_A")
    const codeParts = codeRaw.split('_');
    const parsedSection = codeParts.length > 1 ? codeParts[codeParts.length - 1] : (seccionRaw || 'Única');
    const pureSec = parsedSection.replace(/[[\]()]/g, '').trim().split(' ')[0].toUpperCase();

    let targetAssignments = [];

    // For 26-2: Official BBDD is the ground truth for professor assignment and enrollment per salon
    if (ciclo === '26-2' && official26_2Map.size > 0) {
      const salonKey = `${normalizeStr(courseRaw)}|${normalizeStr(pureSec)}`;
      const matches = official26_2Map.get(salonKey);
      if (matches && matches.length > 0) {
        targetAssignments = matches;
      }
    }

    // Fallback for other cycles or unmatched courses
    if (targetAssignments.length === 0) {
      const formattedProf = formatProfessor(profRaw);
      const formattedDa = formatDepartment(daRaw);
      const enrollKey = `${ciclo}_${courseRaw}_${pureSec}`;
      const enrolledStudents = enrollment[enrollKey] || 40;

      targetAssignments.push({
        courseName: courseRaw,
        section: pureSec,
        professor: formattedProf,
        departamento: formattedDa,
        enrolled: enrolledStudents,
        code: codeRaw
      });
    }

    for (const assign of targetAssignments) {
      const finalSection = ciclo ? `${assign.section} [${ciclo}]` : assign.section;
      const finalCourseCode = ciclo ? `${assign.code} [${ciclo}]` : assign.code;
      const key = `${finalCourseCode}|${assign.professor}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          courseCode: finalCourseCode,
          courseName: assign.courseName,
          section: finalSection,
          ciclo: ciclo,
          professor: assign.professor,
          departamento: assign.departamento,
          enrolled: assign.enrolled,
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
}

// Compute averages and build final records
records = [];
for (const [key, group] of grouped.entries()) {
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
  
  let enrolledStudents = group.enrolled;
  if (!enrolledStudents || enrolledStudents === 40) {
    const pureSection = group.section.replace(/[[\]()]/g, '').trim().split(' ')[0].toUpperCase();
    const enrollKey = `${group.ciclo}_${group.courseName}_${pureSection}`;
    if (enrollment[enrollKey]) {
      enrolledStudents = enrollment[enrollKey];
    } else {
      enrolledStudents = Math.max(group.responses * 2, 40);
    }
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
  { ciclo: '26-2', file: fs.existsSync(official26_2File) ? official26_2File : 'DataBase/BBDD REA 26-2 - BBDDREDA.csv' },
  { ciclo: '26-1', file: 'DataBase/BBDD SALONES 26-1 - BBDD REDA.csv' },
  { ciclo: '25-1', file: 'DataBase/oferta académica 2025 I.xlsx - Consumo final de cupos por secc.csv' }
];

let zeroSectionsAdded = 0;
for (const offering of bbddOfferings) {
  if (!fs.existsSync(offering.file)) continue;
  const content = fs.readFileSync(offering.file, 'utf-8').split('\n');
  if (content.length < 2) continue;

  const headers = parseCSVLine(content[0]);

  const getCol = (cols, name) => {
    const idx = headers.indexOf(name);
    return idx >= 0 ? cols[idx] : undefined;
  };

  for (let i = 1; i < content.length; i++) {
    const line = content[i].trim();
    if (!line) continue;
    const cols = parseCSVLine(line);

    const daRaw = getCol(cols, 'Departamento Académico') || getCol(cols, 'Departamento');
    const courseRaw = getCol(cols, 'Curso');
    const seccionRaw = getCol(cols, 'Sección');
    const profRaw = getCol(cols, 'Profesor(a)') || getCol(cols, 'Docente');
    const matriculadosRaw = getCol(cols, 'Total Matriculados');
    const codeRaw = getCol(cols, 'Codigo del Programa REA') || `${courseRaw}_${seccionRaw}`;

    if (!courseRaw || !profRaw || !seccionRaw) continue;
    if (profRaw.includes('?') || courseRaw.includes('?')) continue;

    const formattedProf = formatProfessor(profRaw);
    const formattedDa = formatDepartment(daRaw);

    const pureSec = seccionRaw.replace(/[[\]()]/g, '').trim().split(' ')[0].toUpperCase();
    const matchKey = `${offering.ciclo}|${normalizeStr(courseRaw)}|${pureSec}|${normalizeStr(formattedProf)}`;

    if (!existingKeys.has(matchKey)) {
      existingKeys.add(matchKey);
      const enrolledNum = parseInt((matriculadosRaw || '').trim(), 10) || 30;
      const finalSection = `${pureSec} [${offering.ciclo}]`;
      const finalCourseCode = `${codeRaw} [${offering.ciclo}]`;

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

// Sync sorted enrollment.json back to disk
const sortedEnrollment = Object.fromEntries(
  Object.entries(enrollment).sort(([a], [b]) => a.localeCompare(b))
);
fs.writeFileSync(path.join(__dirname, 'DataBase/enrollment.json'), JSON.stringify(sortedEnrollment, null, 2), 'utf-8');
console.log(`Updated DataBase/enrollment.json (${Object.keys(sortedEnrollment).length} keys).`);

fs.writeFileSync('public/survey_data_v2.json', JSON.stringify(records, null, 2));
console.log('Processed ' + records.length + ' aggregated records from BD files.');
console.log('File saved to public/survey_data_v2.json');
