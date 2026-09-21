/**
 * Handle único de la base local. El único módulo que abre expo-sqlite.
 *
 * Una fila por registro, no un blob JSON: el archivo `gastos.db` se abre con
 * cualquier cliente SQL (DBeaver) y se consulta como una tabla normal.
 *
 * El esquema se lleva a la última versión al importar el módulo. Un
 * `create table if not exists` suelto no basta: es mudo ante una tabla que ya
 * existe, así que la primera columna que se agregara nunca llegaría a los
 * dispositivos que ya abrieron la app.
 *
 * En Node (pruebas) no hay binding nativo y este módulo truena al importarse:
 * por eso quien lo consume lo hace con `require()` perezoso y cae a memoria.
 */

import * as SQLite from 'expo-sqlite';

import { aplicarMigraciones } from './migraciones';

export const db = SQLite.openDatabaseSync('gastos.db');

aplicarMigraciones(db);

export { MIGRACIONES, aplicarMigraciones } from './migraciones';
export type { MotorSqlite } from './migraciones';
