/**
 * Copia en memoria respaldada por una tabla de SQLite.
 *
 * Existe por una razón de entorno, no de diseño: en el dispositivo el respaldo
 * es SQLite, pero las pruebas corren en Node, donde no hay binding nativo y el
 * módulo de la tabla truena al importarse. Por eso el disco se pide con una
 * función que se evalúa perezosamente y dentro de un try: si no se puede
 * abrir, el repositorio se queda en memoria y todo lo demás funciona igual.
 *
 * `expenseCache` hace esto mismo a mano para gastos y se queda como está: es
 * el único que además reconcilia contra un backend remoto. Los features que
 * solo tienen backend local usan esta fábrica.
 */

export interface Disco<T> {
  read(): T[];
  write(filas: readonly T[]): void;
}

export interface RepositorioLocal<T> {
  read(): T[];
  write(filas: readonly T[]): void;
  /** Inserta o reemplaza por id y devuelve la copia resultante. */
  upsert(fila: T): T[];
  clear(): void;
}

export function crearRepositorio<T extends { readonly id: string }>(
  abrirDisco: () => Disco<T>,
): RepositorioLocal<T> {
  let memoria: T[] | null = null;
  // undefined = todavía no se intentó abrir; null = no hay disco en este
  // entorno. Distinguirlos evita reintentar el require en cada lectura.
  let disco: Disco<T> | null | undefined;

  function persistencia(): Disco<T> | null {
    if (disco === undefined) {
      try {
        disco = abrirDisco();
      } catch {
        disco = null;
      }
    }
    return disco;
  }

  function leer(): T[] {
    memoria ??= persistencia()?.read() ?? [];
    return memoria;
  }

  function guardar(siguiente: T[]): void {
    memoria = siguiente;
    persistencia()?.write(siguiente);
  }

  return {
    read: leer,
    write: (filas) => guardar([...filas]),

    upsert(fila) {
      const actual = leer();
      const i = actual.findIndex((f) => f.id === fila.id);
      // Reemplazo en el sitio, no filtrar-y-empujar: mover la fila al final
      // cambiaría el orden de la lista en memoria respecto al que devuelve el
      // `order by` de SQLite, y el orden dejaría de ser reproducible.
      const siguiente =
        i === -1 ? [...actual, fila] : actual.map((f, j) => (j === i ? fila : f));
      guardar(siguiente);
      return siguiente;
    },

    clear: () => guardar([]),
  };
}
