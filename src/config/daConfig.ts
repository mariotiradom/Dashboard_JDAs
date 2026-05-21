export interface DepartamentoAcademico {
  code: string;
  name: string;
}

export const DEPARTAMENTOS: DepartamentoAcademico[] = [
  { code: 'D3sm0nt31X1NG8', name: 'Ingeniería'},
  { code: 'D3sm0nt31XC0nT3', name: 'Contabilidad'},
  { code: 'D3sm0nt31X3c05', name: 'Economía'},
  { code: 'D3sm0nt31XD3r4', name: 'Derecho'},
  { code: 'D3sm0nt31XhUm7', name: 'Humanidades'},
  { code: 'D3sm0nt31XAdm1', name: 'Administración'},
  { code: 'D3sm0nt31XMkN19', name: 'Marketing y Negocios Internacionales'},
  { code: 'D3sm0nt31Xf1N6', name: 'Finanzas'},
  { code: 'D3sm0nt31XC5P2', name: 'Ciencias Sociales y Políticas'},
];

export function validateAccessCode(code: string): DepartamentoAcademico | null {
  const normalized = code.trim().toUpperCase();
  return DEPARTAMENTOS.find(d => d.code.toUpperCase() === normalized) || null;
}
