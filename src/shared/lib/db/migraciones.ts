/**
 * Esquema de la base local y su aplicación versionada.
 *
 * Vive en `shared/` y no dentro de un feature porque el archivo `gastos.db` es
 * uno solo y su `user_version` también: si cada feature llevara su propia
 * lista, dos listas competirían por el mismo contador y la segunda se saltaría
 * las migraciones de la primera. Una base física, una sola línea de tiempo.
 *
 * No toca expo-sqlite: recibe el motor por parámetro. Así la lógica de
 * versionado —lo único que puede romperse en silencio— se prueba en Node,
 * donde no hay binding nativo. El módulo que sí abre la base es `./index.ts`.
 */

/** Lo que el runner necesita del motor. Es el subconjunto de `SQLiteDatabase`. */
export interface MotorSqlite {
  getFirstSync<T>(sql: string): T | null;
  execSync(sql: string): void;
  withTransactionSync(fn: () => void): void;
}

/**
 * Migraciones en orden. Agregar una es empujar al final del arreglo; nunca
 * editar ni reordenar las que ya están, porque los dispositivos que las
 * aplicaron no vuelven a ejecutarlas.
 *
 * El índice+1 de cada entrada es su `user_version`, así que el largo del
 * arreglo es siempre la versión esperada del esquema.
 */
export const MIGRACIONES: readonly string[] = [
  // 1 — esquema inicial de gastos.
  //
  // `if not exists` no sobra aunque haya migraciones: las instalaciones
  // anteriores a este commit ya tienen la tabla pero user_version en 0, así
  // que esta migración les corre igual. Sin el `if not exists` tronarían al
  // abrir la app.
  `create table if not exists gastos (
     id            text primary key not null,
     amount_cents  integer not null,
     currency      text not null,
     category_id   text not null,
     occurred_at   text not null,
     note          text,
     sync_state    text not null,
     updated_at    text not null,
     deleted_at    text
   );`,
];

/**
 * Lleva el esquema a la última versión y devuelve la versión resultante.
 *
 * Cada migración va con su bump de versión en la misma transacción: si el
 * proceso muere a media aplicación, o quedó entera o no quedó, y al reabrir se
 * reintenta desde donde iba en vez de saltársela.
 */
export function aplicarMigraciones(
  db: MotorSqlite,
  migraciones: readonly string[] = MIGRACIONES,
): number {
  const fila = db.getFirstSync<{ user_version: number }>('pragma user_version');
  const actual = fila?.user_version ?? 0;

  migraciones.slice(actual).forEach((sql, i) => {
    const version = actual + i + 1;
    db.withTransactionSync(() => {
      db.execSync(sql);
      // pragma no admite parámetros vinculados. `version` es aritmética sobre
      // el largo del arreglo, nunca entrada del usuario.
      db.execSync(`pragma user_version = ${version}`);
    });
  });

  return Math.max(actual, migraciones.length);
}
