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

  // 2 — ingresos (Fase 1).
  //
  // `cuenta_id` nace nullable y sin usar: la Fase 5 solo tendrá que poblarla,
  // no agregarla con un `alter table` sobre una tabla ya con datos.
  //
  // No lleva `recurrente boolean`: un ingreso recurrente es una fila de la
  // tabla `recurrentes` (v4) con tipo 'ingreso'. El booleano sería la misma
  // información en dos lugares, y el día que se contradigan no hay forma de
  // saber cuál manda.
  `create table if not exists ingresos (
     id            text primary key not null,
     amount_cents  integer not null,
     currency      text not null,
     fuente        text not null,
     occurred_at   text not null,
     note          text,
     cuenta_id     text,
     sync_state    text not null,
     updated_at    text not null,
     deleted_at    text
   );`,

  // 3 — presupuestos por categoría (Fase 2).
  //
  // `mes_referencia` nulo significa "vigente todos los meses". Resuelve el
  // caso normal —500 al mes en Comida, siempre— con UNA fila, no con doce al
  // año por categoría. Una fila con mes explícito gana sobre la nula: es el
  // override de diciembre sin tocar el resto del año.
  //
  // El gasto acumulado no se guarda: se suma de `gastos`. Un contador
  // materializado es un segundo lugar donde la verdad puede quedar mal.
  `create table if not exists presupuestos (
     id              text primary key not null,
     category_id     text not null,
     limite_cents    integer not null check (limite_cents > 0),
     mes_referencia  text,
     sync_state      text not null,
     updated_at      text not null,
     deleted_at      text
   );
   -- Un presupuesto vivo por categoría y periodo. El índice es la garantía:
   -- sin él, dos altas seguidas dejarían dos límites para la misma categoría y
   -- la pantalla mostraría el que SQLite devolviera primero.
   create unique index if not exists presupuestos_categoria_mes_idx
     on presupuestos (category_id, ifnull(mes_referencia, ''))
     where deleted_at is null;`,

  // 4 — movimientos recurrentes (Fase 3).
  //
  // Una sola tabla para gastos e ingresos recurrentes, distinguidos por
  // `tipo`. Dos tablas serían el mismo calendario, el mismo job y la misma
  // pantalla duplicados para cambiar el signo del movimiento generado.
  //
  // NO hay columna `proxima_fecha`, que es lo que pedía el plan: se deriva de
  // `inicio` con `proximaOcurrencia`. Una columna con la próxima fecha es un
  // segundo lugar donde la verdad puede quedar mal, y basta un cálculo
  // equivocado para que un cobro mensual se corra para siempre.
  //
  // `generadas_hasta` es la defensa contra el duplicado: avanza cobro por
  // cobro, justo después de insertar cada movimiento y no al final del lote,
  // así que reabrir la app tres veces el mismo día no genera nada la segunda
  // ni la tercera.
  `create table if not exists recurrentes (
     id               text primary key not null,
     tipo             text not null check (tipo in ('gasto', 'ingreso')),
     nombre           text not null,
     amount_cents     integer not null check (amount_cents > 0),
     currency         text not null,
     category_id      text,
     fuente           text,
     frecuencia       text not null check (frecuencia in ('semanal', 'mensual', 'anual')),
     inicio           text not null,
     generadas_hasta  text,
     activo           integer not null default 1,
     sync_state       text not null,
     updated_at       text not null,
     deleted_at       text
   );`,

  // 5 — indice de fecha en gastos (Fase 4).
  //
  // `expenseDb.read()` hace `order by occurred_at desc` en cada lectura, y los
  // reportes agrupan por mes sobre esa misma columna. Sin indice, SQLite
  // ordena en memoria cada vez; se nota a partir de unos cientos de filas, que
  // es justo el volumen con el que un reporte empieza a tener sentido.
  `create index if not exists gastos_occurred_at_idx on gastos (occurred_at);`,
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
