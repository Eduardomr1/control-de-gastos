/**
 * Copia local de todos los ingresos conocidos.
 *
 * El `require()` de `ingresosDb` es perezoso a propósito: un import estático
 * arrastraría expo-sqlite a cualquier contexto que importe este módulo,
 * incluidas las pruebas en Node, que no tienen el binding nativo y por eso
 * caen a memoria. La fábrica se encarga del try/catch y del fallback.
 */

import { crearRepositorio, type Disco } from '@/shared/lib/db/repositorioLocal';

import type { Income } from '../types';

export const ingresosCache = crearRepositorio<Income>(
  () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('./ingresosDb') as { ingresosDb: Disco<Income> }).ingresosDb,
);
