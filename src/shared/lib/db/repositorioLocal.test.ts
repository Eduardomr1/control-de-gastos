import { crearRepositorio, type Disco } from './repositorioLocal';

interface Fila {
  readonly id: string;
  readonly valor: string;
}

function discoFalso(inicial: Fila[] = []) {
  let filas = inicial;
  let lecturas = 0;
  const disco: Disco<Fila> = {
    read() {
      lecturas += 1;
      return filas;
    },
    write(siguiente) {
      filas = [...siguiente];
    },
  };
  return {
    disco,
    get filas() {
      return filas;
    },
    get lecturas() {
      return lecturas;
    },
  };
}

describe('crearRepositorio', () => {
  it('lee lo que ya había en disco', () => {
    const d = discoFalso([{ id: 'a', valor: 'uno' }]);
    const repo = crearRepositorio(() => d.disco);
    expect(repo.read()).toEqual([{ id: 'a', valor: 'uno' }]);
  });

  it('escribe a disco y a memoria', () => {
    const d = discoFalso();
    const repo = crearRepositorio(() => d.disco);
    repo.write([{ id: 'a', valor: 'uno' }]);
    expect(d.filas).toEqual([{ id: 'a', valor: 'uno' }]);
    expect(repo.read()).toEqual([{ id: 'a', valor: 'uno' }]);
  });

  it('upsert agrega cuando el id es nuevo', () => {
    const d = discoFalso([{ id: 'a', valor: 'uno' }]);
    const repo = crearRepositorio(() => d.disco);
    expect(repo.upsert({ id: 'b', valor: 'dos' })).toEqual([
      { id: 'a', valor: 'uno' },
      { id: 'b', valor: 'dos' },
    ]);
  });

  /**
   * El reemplazo conserva la posición. Filtrar y empujar al final sería una
   * línea menos y dejaría el orden en memoria distinto del que devuelve el
   * `order by` de SQLite tras reabrir la app.
   */
  it('upsert reemplaza en el sitio, sin mover la fila al final', () => {
    const d = discoFalso([
      { id: 'a', valor: 'uno' },
      { id: 'b', valor: 'dos' },
      { id: 'c', valor: 'tres' },
    ]);
    const repo = crearRepositorio(() => d.disco);
    expect(repo.upsert({ id: 'a', valor: 'EDITADO' }).map((f) => f.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(repo.read()[0]?.valor).toBe('EDITADO');
  });

  it('clear vacía memoria y disco', () => {
    const d = discoFalso([{ id: 'a', valor: 'uno' }]);
    const repo = crearRepositorio(() => d.disco);
    repo.clear();
    expect(repo.read()).toEqual([]);
    expect(d.filas).toEqual([]);
  });

  it('solo lee de disco la primera vez; después sirve desde memoria', () => {
    const d = discoFalso([{ id: 'a', valor: 'uno' }]);
    const repo = crearRepositorio(() => d.disco);
    repo.read();
    repo.read();
    repo.read();
    expect(d.lecturas).toBe(1);
  });

  /**
   * El caso de Node: el módulo de la tabla truena al importarse porque no hay
   * binding nativo. El repositorio no debe propagarlo — se queda en memoria.
   */
  it('funciona en memoria cuando el disco no se puede abrir', () => {
    const repo = crearRepositorio<Fila>(() => {
      throw new Error('Cannot find native module ExpoSQLite');
    });
    expect(repo.read()).toEqual([]);
    repo.upsert({ id: 'a', valor: 'uno' });
    expect(repo.read()).toEqual([{ id: 'a', valor: 'uno' }]);
  });

  it('no reintenta abrir el disco que ya falló', () => {
    let intentos = 0;
    const repo = crearRepositorio<Fila>(() => {
      intentos += 1;
      throw new Error('sin binding nativo');
    });
    repo.read();
    repo.upsert({ id: 'a', valor: 'uno' });
    repo.read();
    expect(intentos).toBe(1);
  });

  it('no comparte el arreglo que recibe en write', () => {
    const d = discoFalso();
    const repo = crearRepositorio(() => d.disco);
    const entrada: Fila[] = [{ id: 'a', valor: 'uno' }];
    repo.write(entrada);
    entrada.push({ id: 'b', valor: 'dos' });
    expect(repo.read()).toHaveLength(1);
  });
});
