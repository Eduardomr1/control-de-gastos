/**
 * Copia local de los recurrentes. El `require()` es perezoso a propósito: un
 * import estático arrastraría expo-sqlite a las pruebas en Node, que no tienen
 * binding nativo y por eso caen a memoria.
 */

import { crearRepositorio, type Disco } from '@/shared/lib/db/repositorioLocal';

import type { Recurrente } from '../types';

export const recurrentesCache = crearRepositorio<Recurrente>(
  () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('./recurrentesDb') as { recurrentesDb: Disco<Recurrente> }).recurrentesDb,
);
