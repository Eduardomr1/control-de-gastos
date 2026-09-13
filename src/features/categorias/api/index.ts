/**
 * Punto único de acceso a datos de categorías. Elige el backend en tiempo de
 * ejecución, igual que `features/gastos/api/index.ts`.
 *
 * `categorias.remote.ts` se carga con require() perezoso a propósito: importa
 * `@/shared/lib/supabase`, que arrastra el binding nativo de MMKV (vía
 * `authStorage`) a cualquier contexto que lo importe, incluidas las pruebas
 * en Node.
 */

import type { Category } from '@/types/expense';
import { isRemote } from '@/shared/lib/environment';
import * as local from './categorias.local';

interface RemoteModule {
  fetchCategories(): Promise<Category[]>;
}

let remoteCache: RemoteModule | null = null;
function remote(): RemoteModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  remoteCache ??= require('./categorias.remote') as RemoteModule;
  return remoteCache;
}

function backend(): RemoteModule {
  return isRemote ? remote() : local;
}

export function fetchCategories(): Promise<Category[]> {
  return backend().fetchCategories();
}
