import { sectores, type EntradaDeAnillo } from './donut';

const R = 100;
const GROSOR = 30;

function entrada(key: string, valor: number): EntradaDeAnillo {
  return { key, valor, color: '#000000' };
}

/** Los números que SVG lee del `d`, en orden. */
function numeros(d: string): number[] {
  return (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

describe('sectores', () => {
  it('sin entradas no dibuja nada', () => {
    expect(sectores([], R, GROSOR)).toEqual([]);
  });

  it('con todo en cero no dibuja nada, en vez de dividir entre cero', () => {
    expect(sectores([entrada('a', 0), entrada('b', 0)], R, GROSOR)).toEqual([]);
  });

  it('omite las categorías sin gasto', () => {
    const s = sectores([entrada('a', 100), entrada('b', 0), entrada('c', 50)], R, GROSOR);
    expect(s.map((x) => x.key)).toEqual(['a', 'c']);
  });

  it('un sector por categoría con gasto', () => {
    expect(sectores([entrada('a', 1), entrada('b', 1), entrada('c', 1)], R, GROSOR)).toHaveLength(
      3,
    );
  });

  it('conserva la clave y el color de cada entrada', () => {
    const s = sectores(
      [
        { key: 'comida', valor: 2, color: '#F97316' },
        { key: 'hogar', valor: 1, color: '#22C55E' },
      ],
      R,
      GROSOR,
    );
    expect(s[0]).toMatchObject({ key: 'comida', color: '#F97316' });
    expect(s[1]).toMatchObject({ key: 'hogar', color: '#22C55E' });
  });

  /**
   * El primer sector arranca a las 12 en punto: x en el centro, y en 0. Sin el
   * ajuste de -90°, SVG empezaría a las 3 y el anillo saldría girado un cuarto
   * de vuelta.
   */
  it('empieza a las 12 en punto', () => {
    const [primero] = sectores([entrada('a', 1), entrada('b', 1)], R, GROSOR);
    expect(primero?.d.startsWith(`M ${R} 0`)).toBe(true);
  });

  /**
   * `largeArc` en 1 para los sectores de más de media vuelta. Sin esa bandera
   * SVG dibuja el camino corto, y la categoría mayoritaria aparecería como la
   * minoritaria: el error más caro posible en esta gráfica.
   */
  it('marca largeArc en el sector que pasa de media vuelta', () => {
    const [mayoritario, minoritario] = sectores(
      [entrada('a', 3), entrada('b', 1)],
      R,
      GROSOR,
    );
    // Orden del `d`: M x y · A rx ry rot largeArc sweep x y
    expect(numeros(mayoritario?.d ?? '')[5]).toBe(1);
    expect(numeros(minoritario?.d ?? '')[5]).toBe(0);
  });

  it('no marca largeArc en el sector de exactamente media vuelta', () => {
    const [primero] = sectores([entrada('a', 1), entrada('b', 1)], R, GROSOR);
    expect(numeros(primero?.d ?? '')[5]).toBe(0);
  });

  /**
   * Los sectores se encadenan: cada uno arranca donde terminó el anterior. Si
   * cada uno partiera de su porcentaje redondeado, el anillo mostraría huecos
   * o solapes de hasta grado y medio.
   */
  it('cada sector arranca donde terminó el anterior', () => {
    const s = sectores([entrada('a', 1), entrada('b', 1), entrada('c', 1)], R, GROSOR);
    for (let i = 1; i < s.length; i += 1) {
      // Indices del `d`: 0-1 son la x,y de la M; 2-8 son los siete de la A
      // (rx, ry, rotacion, largeArc, sweep, x, y), asi que el punto final del
      // arco exterior son el 7 y el 8.
      const finAnterior = numeros(s[i - 1]?.d ?? '').slice(7, 9);
      const inicioActual = numeros(s[i]?.d ?? '').slice(0, 2);
      expect(inicioActual).toEqual(finAnterior);
    }
  });

  /**
   * Un arco de 360° tiene el mismo punto de inicio y de fin, y SVG no sabe qué
   * camino tomar: no pinta nada. Con una sola categoría hay que dar dos
   * semicírculos, y eso se nota en que el `d` lleva cuatro comandos `A`.
   */
  it('con una sola categoría dibuja el anillo completo, no un arco vacío', () => {
    const [unico] = sectores([entrada('a', 500)], R, GROSOR);
    expect(unico?.d.match(/A /g)).toHaveLength(4);
    expect(unico?.d).not.toBe('');
  });

  it('el anillo completo deja el agujero girando al revés por dentro', () => {
    const [unico] = sectores([entrada('a', 500)], R, GROSOR);
    // sweep 1 en los dos arcos exteriores, sweep 0 en los dos interiores.
    const sweeps = [...(unico?.d.match(/A [\d.]+ [\d.]+ 0 1 (\d)/g) ?? [])].map((a) =>
      a.trim().endsWith('1') ? 1 : 0,
    );
    expect(sweeps).toEqual([1, 1, 0, 0]);
  });

  it('todas las coordenadas van a dos decimales', () => {
    const s = sectores([entrada('a', 7), entrada('b', 3), entrada('c', 11)], R, GROSOR);
    for (const sector of s) {
      for (const n of numeros(sector.d)) {
        expect(Number(n.toFixed(2))).toBe(n);
      }
    }
  });

  it('cada sector cierra su contorno', () => {
    for (const sector of sectores([entrada('a', 2), entrada('b', 1)], R, GROSOR)) {
      expect(sector.d.endsWith('Z')).toBe(true);
    }
  });
});
