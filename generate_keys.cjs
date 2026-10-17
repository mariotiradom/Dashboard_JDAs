const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Departamentos académicos
const DEPARTAMENTOS = [
  'Ingeniería',
  'Contabilidad',
  'Economía',
  'Derecho',
  'Humanidades',
  'Administración',
  'Marketing y Negocios Internacionales',
  'Finanzas',
  'Ciencias Sociales y Políticas',
];

// Alfabeto Base32 de alta seguridad sin caracteres ambiguos (excluye 0, O, 1, I, L)
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function generateSecureToken() {
  const bytes = crypto.randomBytes(16);
  const chars = [];
  for (let i = 0; i < 16; i++) {
    chars.push(ALPHABET[bytes[i] % ALPHABET.length]);
  }
  // Formato Licencia/Token: XXXX-XXXX-XXXX-XXXX (80 bits de entropía)
  return `${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8, 12).join('')}-${chars.slice(12, 16).join('')}`;
}

// Generar contraseñas únicas para cada departamento
const generated = DEPARTAMENTOS.map(name => ({
  name,
  code: generateSecureToken()
}));

// 1. Guardar en src/config/keys.local.ts (usado por Vite, ignorado por Git)
const localTsPath = path.join(__dirname, 'src/config/keys.local.ts');
const localTsContent = `// ARCHIVO GENERADO AUTOMÁTICAMENTE - NO COMPARTIR NI SUBIR A GIT
import type { DepartamentoAcademico } from './daConfig';

export const LOCAL_DEPARTAMENTOS: DepartamentoAcademico[] = ${JSON.stringify(generated, null, 2)};
`;
fs.writeFileSync(localTsPath, localTsContent, 'utf-8');

// 2. Guardar en .env.local (para soporte nativo de Vite, ignorado por Git)
const envLocalPath = path.join(__dirname, '.env.local');
const envJsonString = JSON.stringify(generated);
const envContent = `# Variables locales para desarrollo - Ignorado por Git
VITE_DA_KEYS='${envJsonString}'
`;
fs.writeFileSync(envLocalPath, envContent, 'utf-8');

// 3. Guardar en claves_departamentos.txt (formato legible para enviar a directores)
const txtPath = path.join(__dirname, 'claves_departamentos.txt');
const dateStr = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });
let txtContent = `========================================================================================
CLAVES DE ACCESO DE ALTA SEGURIDAD POR DEPARTAMENTO ACADÉMICO (PROGRAMA REA)
Fecha de generación: ${dateStr}
Entropía: 80 bits por clave (formato token de 16 caracteres, insensible a mayúsculas/guiones)
========================================================================================\n\n`;

for (const d of generated) {
  txtContent += `• ${d.name.padEnd(42, ' ')} ->  ${d.code}\n`;
}

txtContent += `\n----------------------------------------------------------------------------------------
INSTRUCCIONES PARA DESPLIEGUE EN VERCEL (PRODUCCIÓN):
Para que la versión web en producción reconozca estas claves sin exponerlas en GitHub:

1. Ingresa a tu proyecto en https://vercel.com
2. Ve a "Settings" -> "Environment Variables"
3. Añade la variable:
   - Key:   VITE_DA_KEYS
   - Value: ${envJsonString}
4. Guarda y haz un "Redeploy" en Vercel.
----------------------------------------------------------------------------------------\n`;

fs.writeFileSync(txtPath, txtContent, 'utf-8');

// Mostrar en consola
console.log('\n🔐 ¡Nuevas contraseñas de alta seguridad generadas con éxito!\n');
console.log('┌────────────────────────────────────────────┬────────────────────────┐');
console.log('│ Departamento Académico                     │ Clave de Acceso (Token)│');
console.log('├────────────────────────────────────────────┼────────────────────────┤');
for (const d of generated) {
  const nameCol = d.name.padEnd(42, ' ');
  const codeCol = d.code.padEnd(22, ' ');
  console.log(`│ ${nameCol} │ ${codeCol} │`);
}
console.log('└────────────────────────────────────────────┴────────────────────────┘\n');
console.log(` Archivos actualizados localmente:`);
console.log(`   - src/config/keys.local.ts (usado por Vite en build y dev)`);
console.log(`   - .env.local              (variable VITE_DA_KEYS)`);
console.log(`   - claves_departamentos.txt (lista para enviar a los directores)\n`);
console.log(`📋 Copia para Vercel (Environment Variable):`);
console.log(`   Key:   VITE_DA_KEYS`);
console.log(`   Value: ${envJsonString}\n`);
