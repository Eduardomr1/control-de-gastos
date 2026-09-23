/**
 * Copia local de los presupuestos. El `require()` es perezoso a propósito: un
 * import estático arrastraría expo-sqlite a las pruebas en Node, que no tienen
 * binding nativo y por eso caen a memoria.
 */

import { crearRepositorio, type Disco } from '@/shared/lib/db/repositorioLocal';

import type { Presupuesto } from '../types';

export const presupuestosCache = crearRepositorio<Presupuesto>(
  () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('./presupuestosDb') as { presupuestosDb: Disco<Presupuesto> })
      .presupuestosDb,
);
