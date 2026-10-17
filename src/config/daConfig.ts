import { DEFAULT_DEPARTAMENTOS } from './keys.default';
import { LOCAL_DEPARTAMENTOS } from './keys.local';

export interface DepartamentoAcademico {
  code: string;
  name: string;
}

export function getDepartamentos(): DepartamentoAcademico[] {
  // 1. Prioridad: Variable de entorno VITE_DA_KEYS (para despliegue seguro en Vercel)
  const envKeys = import.meta.env.VITE_DA_KEYS;
  if (envKeys) {
    try {
      const parsed = JSON.parse(envKeys);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error('Error al parsear VITE_DA_KEYS:', e);
    }
  }

  // 2. Claves locales generadas por generate_keys.cjs (ignoradas por Git)
  if (Array.isArray(LOCAL_DEPARTAMENTOS) && LOCAL_DEPARTAMENTOS.length > 0) {
    return LOCAL_DEPARTAMENTOS;
  }

  // 3. Fallback a claves por defecto
  return DEFAULT_DEPARTAMENTOS;
}

export const DEPARTAMENTOS: DepartamentoAcademico[] = getDepartamentos();

// Normaliza eliminando guiones, espacios y convirtiendo a mayúsculas
function sanitizeCode(str: string): string {
  return (str || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function validateAccessCode(code: string): DepartamentoAcademico | null {
  const cleanInput = sanitizeCode(code);
  if (!cleanInput) return null;

  const list = getDepartamentos();
  return list.find(d => sanitizeCode(d.code) === cleanInput) || null;
}
