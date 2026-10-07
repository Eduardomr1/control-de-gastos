/**
 * Las migraciones contra un SQLite de verdad.
 *
 * `migraciones.test.ts` prueba el versionado —cuáles corren y cuáles no— con
 * un motor de mentira. Esto prueba el SQL: que las sentencias sean válidas,
 * que los `check` rechacen lo que deben, y sobre todo que la migración v6 no
 * pierda un centavo de una base que ya tiene datos. Eso es el criterio de
 * salida de la Fase 5 y no hay forma de verificarlo sin ejecutar el SQL.
 *
 * `node:sqlite` es el SQLite que trae Node desde la 22. No es el mismo binario
 * que expo-sqlite en el dispositivo, pero sí el mismo dialecto, que es lo que
 * aquí se pone a prueba. El binario real se verifica al abrir la app.
 */

// `node:sqlite` no trae tipos porque el proyecto no incluye @types/node (ver
// `types` en tsconfig). La forma que se usa aquí es mínima y se declara a mano.
interface DbNode {
  exec(sql: string): void;
  prepare(sql: string): {
    get(...params: unknown[]): Record<string, unknown> | undefined;
    all(...params: unknown[]): Record<string, unknown>[];
    run(...params: unknown[]): unknown;
  };
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require('node:sqlite') as {
  new (path: string): DbNode;
  DatabaseSync: new (path: string) => DbNode;
};

import { aplicarMigraciones, MIGRACIONES, type MotorSqlite } from './migraciones';

const GENERAL = '00000000-0000-4000-8000-000000000001';

/** Adapta el SQLite de Node a la forma que espera el runner. */
function motor(db: DbNode): MotorSqlite {
  return {
    getFirstSync<T>(sql: string): T | null {
      return (db.prepare(sql).get() as T) ?? null;
    },
    execSync(sql: string): void {
      db.exec(sql);
    },
    withTransactionSync(fn: () => void): void {
      db.exec('begin');
      try {
        fn();
        db.exec('commit');
      } catch (e) {
        db.exec('rollback');
        throw e;
      }
    },
  };
}

function baseNueva(): DbNode {
  return new DatabaseSync(':memory:');
}

function version(db: DbNode): number {
  return (db.prepare('pragma user_version').get()?.['user_version'] as number) ?? -1;
}

function tablas(db: DbNode): string[] {
  return db
    .prepare("select name from sqlite_master where type = 'table' order by name")
    .all()
    .map((f) => f['name'] as string);
}

/** El esquema tal como quedó en la v1, antes de que existiera esta expansión. */
function comoDispositivoViejo(db: DbNode): void {
  db.exec(`create table gastos (
     id            text primary key not null,
     amount_cents  integer not null,
     currency      text not null,
     category_id   text not null,
     occurred_at   text not null,
     note          text,
     sync_state    text not null,
     updated_at    text not null,
     deleted_at    text
   );`);
  db.exec('pragma user_version = 1');
}

function sembrarGastos(db: DbNode, montos: readonly number[]): void {
  for (const [i, monto] of montos.entries()) {
    db.prepare(
      `insert into gastos
         (id, amount_cents, currency, category_id, occurred_at, sync_state, updated_at)
       values (?, ?, 'MXN', 'comida', '2026-09-10T10:00:00-07:00', 'synced', '2026-09-10T10:00:00-07:00')`,
    ).run(`g-${i}`, monto);
  }
}

describe('el esquema completo sobre una base nueva', () => {
  it('aplica todas las migraciones y deja la versión al día', () => {
    const db = baseNueva();
    expect(aplicarMigraciones(motor(db))).toBe(MIGRACIONES.length);
    expect(version(db)).toBe(MIGRACIONES.length);
  });

  it('crea las cinco tablas del dominio', () => {
    const db = baseNueva();
    aplicarMigraciones(motor(db));
    expect(tablas(db)).toEqual(
      expect.arrayContaining([
        'cuentas',
        'gastos',
        'ingresos',
        'presupuestos',
        'recurrentes',
      ]),
    );
  });

  it('aplicarlas dos veces no rompe nada', () => {
    const db = baseNueva();
    aplicarMigraciones(motor(db));
    expect(() => aplicarMigraciones(motor(db))).not.toThrow();
    expect(version(db)).toBe(MIGRACIONES.length);
  });

  it('crea la cuenta General con su id fijo', () => {
    const db = baseNueva();
    aplicarMigraciones(motor(db));
    const cuenta = db.prepare('select * from cuentas').get();
    expect(cuenta?.['id']).toBe(GENERAL);
    expect(cuenta?.['nombre']).toBe('General');
  });

  it('el updated_at de General es un ISO con offset explícito', () => {
    const db = baseNueva();
    aplicarMigraciones(motor(db));
    expect(db.prepare('select updated_at from cuentas').get()?.['updated_at']).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
    );
  });
});

describe('las restricciones del esquema', () => {
  /**
   * El índice único de presupuestos es lo que impide que dos altas seguidas
   * dejen dos límites vivos para la misma categoría.
   */
  it('rechaza dos presupuestos vivos de la misma categoría y periodo', () => {
    const db = baseNueva();
    aplicarMigraciones(motor(db));
    const insertar = (id: string) =>
      db
        .prepare(
          `insert into presupuestos (id, category_id, limite_cents, mes_referencia, sync_state, updated_at)
           values (?, 'comida', 50000, null, 'synced', '2026-09-01T00:00:00Z')`,
        )
        .run(id);

    insertar('p1');
    expect(() => insertar('p2')).toThrow();
  });

  /** El borrado es suave: la fila sigue ahí y no debe bloquear a la nueva. */
  it('permite volver a fijar el límite después de borrar el anterior', () => {
    const db = baseNueva();
    aplicarMigraciones(motor(db));
    db.prepare(
      `insert into presupuestos (id, category_id, limite_cents, mes_referencia, sync_state, updated_at, deleted_at)
       values ('p1', 'comida', 50000, null, 'synced', '2026-09-01T00:00:00Z', '2026-09-02T00:00:00Z')`,
    ).run();

    expect(() =>
      db
        .prepare(
          `insert into presupuestos (id, category_id, limite_cents, mes_referencia, sync_state, updated_at)
           values ('p2', 'comida', 80000, null, 'synced', '2026-09-03T00:00:00Z')`,
        )
        .run(),
    ).not.toThrow();
  });

  it('rechaza un presupuesto con límite en cero', () => {
    const db = baseNueva();
    aplicarMigraciones(motor(db));
    expect(() =>
      db
        .prepare(
          `insert into presupuestos (id, category_id, limite_cents, mes_referencia, sync_state, updated_at)
           values ('p1', 'comida', 0, null, 'synced', '2026-09-01T00:00:00Z')`,
        )
        .run(),
    ).toThrow();
  });

  it('rechaza una frecuencia que no existe', () => {
    const db = baseNueva();
    aplicarMigraciones(motor(db));
    expect(() =>
      db
        .prepare(
          `insert into recurrentes (id, tipo, nombre, amount_cents, currency, frecuencia, inicio, activo, sync_state, updated_at)
           values ('r1', 'gasto', 'Renta', 100, 'MXN', 'quincenal', '2026-09-01T00:00:00Z', 1, 'synced', '2026-09-01T00:00:00Z')`,
        )
        .run(),
    ).toThrow();
  });

  it('rechaza un tipo de cuenta que no existe', () => {
    const db = baseNueva();
    aplicarMigraciones(motor(db));
    expect(() =>
      db
        .prepare(
          `insert into cuentas (id, nombre, tipo, saldo_inicial_cents, currency, sync_state, updated_at)
           values ('c1', 'Cripto', 'bitcoin', 0, 'MXN', 'synced', '2026-09-01T00:00:00Z')`,
        )
        .run(),
    ).toThrow();
  });
});

/**
 * El criterio de salida de la Fase 5, ejecutado: la migración v6 escribe sobre
 * filas que ya tienen datos de usuarios reales, y no puede perder ni mover un
 * solo movimiento.
 */
describe('la migración sobre un dispositivo que ya tenía gastos', () => {
  const MONTOS = [12_345, 6_789, 100_001, 1, 999_999, 45_00, 7_777, 250_50];

  function dispositivoConDatos(): DbNode {
    const db = baseNueva();
    comoDispositivoViejo(db);
    sembrarGastos(db, MONTOS);
    return db;
  }

  function total(db: DbNode): number {
    return (db.prepare('select sum(amount_cents) as t from gastos').get()?.['t'] as number) ?? 0;
  }

  function cuantos(db: DbNode): number {
    return db.prepare('select count(*) as n from gastos').get()?.['n'] as number;
  }

  it('no pierde ni un centavo', () => {
    const db = dispositivoConDatos();
    const antes = total(db);
    aplicarMigraciones(motor(db));
    expect(total(db)).toBe(antes);
  });

  it('no pierde ni una fila', () => {
    const db = dispositivoConDatos();
    const antes = cuantos(db);
    aplicarMigraciones(motor(db));
    expect(cuantos(db)).toBe(antes);
  });

  it('asigna todos los gastos existentes a la cuenta General', () => {
    const db = dispositivoConDatos();
    aplicarMigraciones(motor(db));
    const ajenos = db
      .prepare('select count(*) as n from gastos where cuenta_id is not ?')
      .get(GENERAL)?.['n'] as number;
    expect(ajenos).toBe(0);
  });

  /**
   * La suma de lo asignado a las cuentas tiene que ser exactamente el total
   * anterior a la migración. Si cuadra, nada se quedó fuera de un saldo.
   */
  it('el total por cuenta es idéntico al total previo', () => {
    const db = dispositivoConDatos();
    const antes = total(db);
    aplicarMigraciones(motor(db));

    const porCuenta = db
      .prepare('select cuenta_id, sum(amount_cents) as t from gastos group by cuenta_id')
      .all();
    expect(porCuenta).toHaveLength(1);
    expect(porCuenta[0]?.['t']).toBe(antes);
  });

  it('arranca en la versión 1 y termina al día', () => {
    const db = dispositivoConDatos();
    expect(version(db)).toBe(1);
    aplicarMigraciones(motor(db));
    expect(version(db)).toBe(MIGRACIONES.length);
  });

  /**
   * El `down` de la v6: poner la columna en null y soltar la tabla. No pierde
   * un movimiento, y por eso el id de General es literal — un id generado al
   * vuelo obligaría a adivinar cuál cuenta creó la migración.
   */
  it('revertir la v6 devuelve la base a como estaba', () => {
    const db = dispositivoConDatos();
    const antes = total(db);
    aplicarMigraciones(motor(db));

    db.exec('update gastos set cuenta_id = null');
    db.prepare('delete from cuentas where id = ?').run(GENERAL);
    db.exec(`pragma user_version = ${MIGRACIONES.length - 1}`);

    expect(total(db)).toBe(antes);
    expect(cuantos(db)).toBe(MONTOS.length);
    expect(db.prepare('select count(*) as n from cuentas').get()?.['n']).toBe(0);
  });

  it('la v8 agrega recibo_uri sin alterar los datos existentes', () => {
    const db = dispositivoConDatos();
    const antes = total(db);
    aplicarMigraciones(motor(db));

    const fila = db.prepare('select * from gastos limit 1').get() as Record<string, unknown>;
    expect('recibo_uri' in fila).toBe(true);
    expect(total(db)).toBe(antes);
  });
});
