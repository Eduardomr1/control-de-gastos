import { aplicarMigraciones, MIGRACIONES, type MotorSqlite } from './migraciones';

/**
 * Motor de mentira que registra el SQL ejecutado y lleva su propio
 * `user_version`. No valida SQL: lo que se prueba aquí es el versionado —
 * cuáles migraciones corren y cuáles no— no que SQLite entienda las sentencias.
 */
function motorFalso(versionInicial = 0) {
  let version = versionInicial;
  const ejecutado: string[] = [];
  let transacciones = 0;

  const db: MotorSqlite = {
    getFirstSync<T>(): T | null {
      return { user_version: version } as T;
    },
    execSync(sql: string): void {
      const bump = /^pragma user_version = (\d+)$/.exec(sql);
      if (bump?.[1] !== undefined) version = Number(bump[1]);
      else ejecutado.push(sql);
    },
    withTransactionSync(fn: () => void): void {
      transacciones += 1;
      fn();
    },
  };

  return {
    db,
    ejecutado,
    get version() {
      return version;
    },
    get transacciones() {
      return transacciones;
    },
  };
}

const M = ['create table a (x);', 'create table b (y);', 'create table c (z);'];

describe('aplicarMigraciones', () => {
  it('en una base nueva aplica todas y deja la versión en el largo del arreglo', () => {
    const m = motorFalso(0);
    expect(aplicarMigraciones(m.db, M)).toBe(3);
    expect(m.ejecutado).toEqual(M);
    expect(m.version).toBe(3);
  });

  it('desde una versión intermedia solo aplica las pendientes', () => {
    const m = motorFalso(2);
    expect(aplicarMigraciones(m.db, M)).toBe(3);
    expect(m.ejecutado).toEqual([M[2]]);
    expect(m.version).toBe(3);
  });

  it('no ejecuta nada si el esquema ya está al día', () => {
    const m = motorFalso(3);
    aplicarMigraciones(m.db, M);
    expect(m.ejecutado).toEqual([]);
    expect(m.transacciones).toBe(0);
  });

  it('es idempotente: correrlo dos veces no reaplica nada', () => {
    const m = motorFalso(0);
    aplicarMigraciones(m.db, M);
    aplicarMigraciones(m.db, M);
    expect(m.ejecutado).toEqual(M);
  });

  /**
   * El bump de versión va DENTRO de la transacción de su migración. Si fuera
   * una transacción aparte, un corte de energía entre ambas dejaría la tabla
   * creada con la versión sin subir, y al reabrir la app la migración
   * reintentaría sobre un esquema que ya cambió.
   */
  it('usa una transacción por migración', () => {
    const m = motorFalso(0);
    aplicarMigraciones(m.db, M);
    expect(m.transacciones).toBe(3);
  });

  it('no retrocede la versión si la base viene de un binario más nuevo', () => {
    const m = motorFalso(5);
    expect(aplicarMigraciones(m.db, M)).toBe(5);
    expect(m.ejecutado).toEqual([]);
  });

  it('sin argumento usa el arreglo real y deja la tabla de gastos', () => {
    const m = motorFalso(0);
    expect(aplicarMigraciones(m.db)).toBe(MIGRACIONES.length);
    expect(m.version).toBe(MIGRACIONES.length);
    expect(m.ejecutado[0]).toContain('create table if not exists gastos');
  });

  /**
   * `pragma user_version` siempre devuelve fila en SQLite, pero el tipo de
   * getFirstSync admite null y un nulo silencioso saltándose a la versión 0
   * reaplicaría todo el esquema. La rama existe; queda fijada.
   */
  it('trata la ausencia de fila como versión 0', () => {
    const db: MotorSqlite = {
      getFirstSync: () => null,
      execSync: () => {},
      withTransactionSync: (fn) => fn(),
    };
    expect(aplicarMigraciones(db, M)).toBe(3);
  });
});
