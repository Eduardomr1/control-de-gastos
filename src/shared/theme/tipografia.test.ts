/**
 * Los topes de escalado y el umbral de apilado son decisiones de
 * accesibilidad, no constantes de estilo: alguien puede deshacerlas sin notar
 * lo que rompe. Esta prueba las fija. Ver BUG-017.
 *
 * `react-native` se simula entero. En Node no hay binding nativo, y lo único
 * que se necesita de él es la escala que reporta el sistema.
 */

jest.mock('react-native', () => {
  const estado = { escala: 1 };
  return {
    PixelRatio: { getFontScale: (): number => estado.escala },
    __estado: estado,
  };
});

const { __estado: sistema } = jest.requireMock('react-native') as {
  __estado: { escala: number };
};

import {
  apilaPorEscala,
  controlSize,
  rowMinHeight,
  scaledSize,
  typography,
} from './tipografia';

beforeEach(() => {
  sistema.escala = 1;
});

describe('scaledSize', () => {
  it('multiplica por la escala del sistema', () => {
    sistema.escala = 2;
    expect(scaledSize(16)).toBe(32);
  });

  it('respeta el tope cuando la escala lo excede', () => {
    sistema.escala = 3;
    expect(scaledSize(34, 1.8)).toBe(61);
  });

  it('el tope no estorba por debajo de él', () => {
    sistema.escala = 1.2;
    expect(scaledSize(10, 1.8)).toBe(12);
  });
});

describe('typography', () => {
  // El tope existe porque a 300% un total de 34pt no cabe en la pantalla.
  it('topa los montos de display', () => {
    sistema.escala = 3;
    expect(typography.total().fontSize).toBe(61);
    expect(typography.montoGrande().fontSize).toBe(94);
  });

  // Lo contrario: el monto de fila NO se topa. Cuando lo hacía, el dato más
  // importante de la fila terminaba siendo el texto más pequeño.
  it('no topa el monto de una fila ni el texto corrido', () => {
    sistema.escala = 3;
    expect(typography.amount().fontSize).toBe(48);
    expect(typography.body().fontSize).toBe(45);
    expect(typography.amount().fontSize).toBeGreaterThan(typography.body().fontSize);
  });

  it('usa cifras de ancho fijo en todo lo que es dinero', () => {
    for (const variante of ['amount', 'total', 'montoGrande'] as const) {
      expect(typography[variante]().fontVariant).toEqual(['tabular-nums']);
    }
  });
});

describe('apilaPorEscala', () => {
  it('no apila a escala normal', () => {
    expect(apilaPorEscala()).toBe(false);
  });

  it('apila a partir del umbral', () => {
    sistema.escala = 1.5;
    expect(apilaPorEscala()).toBe(true);
  });

  it('apila a la escala máxima accesible', () => {
    sistema.escala = 3;
    expect(apilaPorEscala()).toBe(true);
  });

  // Por debajo del umbral la fila sigue horizontal, y ahí es donde el monto
  // convive con la categoría. Es lo que hace innecesario toparlo.
  it('deja la fila horizontal justo por debajo del umbral', () => {
    sistema.escala = 1.49;
    expect(apilaPorEscala()).toBe(false);
  });
});

describe('controlSize y rowMinHeight', () => {
  // 44pt es el mínimo táctil de Apple y Material.
  it('nunca devuelve un control por debajo del mínimo táctil', () => {
    sistema.escala = 0.5;
    expect(controlSize(32)).toBe(44);
  });

  it('topa el crecimiento del control para que no domine la pantalla', () => {
    sistema.escala = 3;
    expect(controlSize(64)).toBe(96);
  });

  it('la fila nunca baja de su altura mínima', () => {
    sistema.escala = 0.5;
    expect(rowMinHeight()).toBe(64);
  });
});

describe('la rampa completa', () => {
  // Cubre las nueve variantes: un tamaño en cero o negativo rompe el render
  // sin que ninguna otra prueba lo note.
  it('toda variante entrega un tamaño positivo a cualquier escala', () => {
    for (const escala of [0.85, 1, 1.5, 3]) {
      sistema.escala = escala;
      for (const variante of Object.keys(typography) as (keyof typeof typography)[]) {
        expect(typography[variante]().fontSize).toBeGreaterThan(0);
      }
    }
  });

  it('respeta la jerarquía: el total pesa más que el texto corrido', () => {
    sistema.escala = 1;
    expect(typography.total().fontSize).toBeGreaterThan(typography.body().fontSize);
    expect(typography.body().fontSize).toBeGreaterThan(typography.eyebrow().fontSize);
  });
});
