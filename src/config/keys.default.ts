export interface DepartamentoAcademico {
  code: string;
  name: string;
}

export const DEFAULT_DEPARTAMENTOS: DepartamentoAcademico[] = [
  { code: 'REA-ING-DEMO', name: 'Ingeniería' },
  { code: 'REA-CON-DEMO', name: 'Contabilidad' },
  { code: 'REA-ECO-DEMO', name: 'Economía' },
  { code: 'REA-DER-DEMO', name: 'Derecho' },
  { code: 'REA-HUM-DEMO', name: 'Humanidades' },
  { code: 'REA-ADM-DEMO', name: 'Administración' },
  { code: 'REA-MKT-DEMO', name: 'Marketing y Negocios Internacionales' },
  { code: 'REA-FIN-DEMO', name: 'Finanzas' },
  { code: 'REA-CSP-DEMO', name: 'Ciencias Sociales y Políticas' },
];

export const LOCAL_DEPARTAMENTOS = DEFAULT_DEPARTAMENTOS;

