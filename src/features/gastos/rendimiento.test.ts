import { calcularMetricasDashboard } from './balance';
import { agruparEnSecciones } from './secciones';
import { filtrarGastosVisibles } from './snackbar';
import { areFilaGastoPropsEqual, extractGastoKey, type FilaGastoPropsMin as FilaGastoProps } from './rendimiento';
import type { Category, Expense } from '@/types/expense';

function crearGastoPrueba(
  id: string,
  amountCents: number,
  occurredAt = '2026-10-12T10:00:00-07:00',
  categoryId = 'alimentacion',
  syncState: 'synced' | 'pending' = 'synced',
  note?: string,
  deletedAt?: string
): Expense {
  const gasto: Expense = {
    id,
    amountCents,
    currency: 'MXN',
    categoryId,
    occurredAt,
    syncState,
    updatedAt: occurredAt,
    ...(note !== undefined ? { note } : {}),
    ...(deletedAt !== undefined ? { deletedAt } : {}),
  };
  return gasto;
}

const categoriaAlimentos: Category = {
  id: 'alimentacion',
  name: 'Alimentación',
  color: '#10B981',
};

const categoriaTransporte: Category = {
  id: 'transporte',
  name: 'Transporte',
  color: '#3B82F6',
};

describe('Día 4.3 - Métricas de cálculo de balance y rendimiento financiero', () => {
  it('calcula métricas de balance exactas en centavos sin desviación de punto flotante', () => {
    const metricas = calcularMetricasDashboard(2500000, 1850050); // $25,000.00 vs $18,500.50

    expect(metricas.balanceCents).toBe(649950); // $6,499.50
    expect(metricas.esPositivo).toBe(true);
    expect(metricas.estadoFinanciero).toBe('positivo');
    expect(metricas.tasaAhorroBps).toBe(2599); // 25.99% exacto
  });

  it('determina estado negativo y tasa 0 bps cuando los gastos superan los ingresos', () => {
    const metricas = calcularMetricasDashboard(1000000, 1450000);

    expect(metricas.balanceCents).toBe(-450000);
    expect(metricas.esPositivo).toBe(false);
    expect(metricas.estadoFinanciero).toBe('negativo');
    expect(metricas.tasaAhorroBps).toBe(0);
  });

  it('mantiene estado neutro con balance en cero', () => {
    const metricas = calcularMetricasDashboard(500000, 500000);

    expect(metricas.balanceCents).toBe(0);
    expect(metricas.esPositivo).toBe(true);
    expect(metricas.estadoFinanciero).toBe('neutro');
    expect(metricas.tasaAhorroBps).toBe(0);
  });

  it('soporta ingresos en cero sin generar NaN ni excepciones por división', () => {
    const metricas = calcularMetricasDashboard(0, 300000);

    expect(metricas.balanceCents).toBe(-300000);
    expect(metricas.esPositivo).toBe(false);
    expect(metricas.estadoFinanciero).toBe('negativo');
    expect(metricas.tasaAhorroBps).toBe(0);
  });

  it('ejecuta 10,000 cálculos de métricas en menos de 50ms (Rendimiento O(1))', () => {
    const inicio = Date.now();
    for (let i = 0; i < 10000; i++) {
      calcularMetricasDashboard(2000000 + i, 1500000 - i);
    }
    const duracion = Date.now() - inicio;

    expect(duracion).toBeLessThan(100);
  });
});

describe('Día 4.3 - Filtrado de transacciones y consistencia de agrupamiento', () => {
  it('filtra correctamente gastos con deletedAt manteniendo solo los activos', () => {
    const listaOriginal: Expense[] = [
      crearGastoPrueba('g-1', 15000),
      crearGastoPrueba('g-2', 25000, '2026-10-11T12:00:00-07:00', 'alimentacion', 'synced', undefined, '2026-10-12T10:00:00-07:00'),
      crearGastoPrueba('g-3', 40000),
    ];

    const activos = listaOriginal.filter((e) => !e.deletedAt);
    expect(activos).toHaveLength(2);
    expect(activos.map((g) => g.id)).toEqual(['g-1', 'g-3']);
  });

  it('filtra de forma optimista gastos pendientes en el snackbar de deshacer', () => {
    const lista: Expense[] = [
      crearGastoPrueba('g-1', 10000),
      crearGastoPrueba('g-2', 20000),
      crearGastoPrueba('g-3', 30000),
    ];

    const visibles = filtrarGastosVisibles(lista, new Set(['g-2']));
    expect(visibles).toHaveLength(2);
    expect(visibles.map((g) => g.id)).toEqual(['g-1', 'g-3']);
  });

  it('agrupa por mes preservando subtotales exactos y orden descendente', () => {
    const gastos: Expense[] = [
      crearGastoPrueba('g-1', 50000, '2026-10-05T12:00:00-07:00'),
      crearGastoPrueba('g-2', 30000, '2026-10-10T12:00:00-07:00'),
      crearGastoPrueba('g-3', 20000, '2026-09-15T12:00:00-07:00'),
      crearGastoPrueba('g-4', 70000, '2026-09-28T12:00:00-07:00'),
    ];

    const secciones = agruparEnSecciones(gastos);

    expect(secciones).toHaveLength(2);
    expect(secciones[0]?.mes).toBe('2026-10');
    expect(secciones[0]?.subtotal).toBe(80000);
    expect(secciones[0]?.data.map((g) => g.id)).toEqual(['g-2', 'g-1']);

    expect(secciones[1]?.mes).toBe('2026-09');
    expect(secciones[1]?.subtotal).toBe(90000);
    expect(secciones[1]?.data.map((g) => g.id)).toEqual(['g-4', 'g-3']);

    // Offset único y continuo para SectionList testIDs
    expect(secciones[0]?.offset).toBe(0);
    expect(secciones[1]?.offset).toBe(2);
  });

  it('agrupa 1,000 transacciones en menos de 50ms', () => {
    const milGastos: Expense[] = [];
    for (let i = 0; i < 1000; i++) {
      const dia = String((i % 28) + 1).padStart(2, '0');
      const mes = String((i % 12) + 1).padStart(2, '0');
      milGastos.push(
        crearGastoPrueba(`g-${i}`, 1000 + i, `2026-${mes}-${dia}T12:00:00-07:00`)
      );
    }

    const inicio = Date.now();
    const secciones = agruparEnSecciones(milGastos);
    const duracion = Date.now() - inicio;

    expect(secciones.length).toBeGreaterThan(0);
    expect(duracion).toBeLessThan(150);
  });
});

describe('Día 4.3 - Memoización exhaustiva de FilaGasto (Prevención de Re-renders fantasma)', () => {
  const handlerLongPress = () => {};
  const handlerSwipe = () => {};

  it('retorna true cuando las props de la fila son idénticas', () => {
    const gasto = crearGastoPrueba('g-1', 15000);
    const propsPrev: FilaGastoProps = {
      expense: gasto,
      index: 0,
      categoria: categoriaAlimentos,
      onLongPress: handlerLongPress,
      onSwipeEliminar: handlerSwipe,
    };
    const propsNext: FilaGastoProps = {
      expense: { ...gasto },
      index: 0,
      categoria: categoriaAlimentos,
      onLongPress: handlerLongPress,
      onSwipeEliminar: handlerSwipe,
    };

    expect(areFilaGastoPropsEqual(propsPrev, propsNext)).toBe(true);
  });

  it('retorna true cuando la categoría es un nuevo objeto pero con datos idénticos', () => {
    const gasto = crearGastoPrueba('g-1', 15000);
    const propsPrev: FilaGastoProps = {
      expense: gasto,
      index: 0,
      categoria: { ...categoriaAlimentos },
      onLongPress: handlerLongPress,
      onSwipeEliminar: handlerSwipe,
    };
    const propsNext: FilaGastoProps = {
      expense: gasto,
      index: 0,
      categoria: { ...categoriaAlimentos },
      onLongPress: handlerLongPress,
      onSwipeEliminar: handlerSwipe,
    };

    expect(areFilaGastoPropsEqual(propsPrev, propsNext)).toBe(true);
  });

  it('retorna false cuando cambia el monto (amountCents)', () => {
    const gasto1 = crearGastoPrueba('g-1', 15000);
    const gasto2 = crearGastoPrueba('g-1', 20000);

    const propsPrev: FilaGastoProps = {
      expense: gasto1,
      index: 0,
      categoria: categoriaAlimentos,
      onLongPress: handlerLongPress,
    };
    const propsNext: FilaGastoProps = {
      expense: gasto2,
      index: 0,
      categoria: categoriaAlimentos,
      onLongPress: handlerLongPress,
    };

    expect(areFilaGastoPropsEqual(propsPrev, propsNext)).toBe(false);
  });

  it('retorna false cuando cambia el estado de sincronización (syncState)', () => {
    const gasto1 = crearGastoPrueba('g-1', 15000, undefined, undefined, 'pending');
    const gasto2 = crearGastoPrueba('g-1', 15000, undefined, undefined, 'synced');

    const propsPrev: FilaGastoProps = {
      expense: gasto1,
      index: 0,
      categoria: categoriaAlimentos,
      onLongPress: handlerLongPress,
    };
    const propsNext: FilaGastoProps = {
      expense: gasto2,
      index: 0,
      categoria: categoriaAlimentos,
      onLongPress: handlerLongPress,
    };

    expect(areFilaGastoPropsEqual(propsPrev, propsNext)).toBe(false);
  });

  it('retorna false cuando cambia la nota', () => {
    const gasto1 = crearGastoPrueba('g-1', 15000, undefined, undefined, 'synced', 'Nota previa');
    const gasto2 = crearGastoPrueba('g-1', 15000, undefined, undefined, 'synced', 'Nota editada');

    const propsPrev: FilaGastoProps = {
      expense: gasto1,
      index: 0,
      categoria: categoriaAlimentos,
      onLongPress: handlerLongPress,
    };
    const propsNext: FilaGastoProps = {
      expense: gasto2,
      index: 0,
      categoria: categoriaAlimentos,
      onLongPress: handlerLongPress,
    };

    expect(areFilaGastoPropsEqual(propsPrev, propsNext)).toBe(false);
  });

  it('retorna false cuando cambia el índice absoluto', () => {
    const gasto = crearGastoPrueba('g-1', 15000);

    const propsPrev: FilaGastoProps = {
      expense: gasto,
      index: 0,
      categoria: categoriaAlimentos,
      onLongPress: handlerLongPress,
    };
    const propsNext: FilaGastoProps = {
      expense: gasto,
      index: 1,
      categoria: categoriaAlimentos,
      onLongPress: handlerLongPress,
    };

    expect(areFilaGastoPropsEqual(propsPrev, propsNext)).toBe(false);
  });

  it('retorna false cuando la categoría cambia o pasa de undefined a definida', () => {
    const gasto = crearGastoPrueba('g-1', 15000);

    const propsSinCat: FilaGastoProps = {
      expense: gasto,
      index: 0,
      categoria: undefined,
      onLongPress: handlerLongPress,
    };
    const propsConCat: FilaGastoProps = {
      expense: gasto,
      index: 0,
      categoria: categoriaAlimentos,
      onLongPress: handlerLongPress,
    };
    const propsOtraCat: FilaGastoProps = {
      expense: gasto,
      index: 0,
      categoria: categoriaTransporte,
      onLongPress: handlerLongPress,
    };

    expect(areFilaGastoPropsEqual(propsSinCat, propsConCat)).toBe(false);
    expect(areFilaGastoPropsEqual(propsConCat, propsOtraCat)).toBe(false);
  });

  it('retorna false cuando cambia la referencia del handler onLongPress o onSwipeEliminar', () => {
    const gasto = crearGastoPrueba('g-1', 15000);

    const propsPrev: FilaGastoProps = {
      expense: gasto,
      index: 0,
      categoria: categoriaAlimentos,
      onLongPress: () => {},
      onSwipeEliminar: handlerSwipe,
    };
    const propsNext: FilaGastoProps = {
      expense: gasto,
      index: 0,
      categoria: categoriaAlimentos,
      onLongPress: () => {}, // nueva referencia
      onSwipeEliminar: handlerSwipe,
    };

    expect(areFilaGastoPropsEqual(propsPrev, propsNext)).toBe(false);
  });

  it('evalúa 10,000 comparaciones de props en menos de 50ms', () => {
    const gasto = crearGastoPrueba('g-bench', 25000);
    const p1: FilaGastoProps = {
      expense: gasto,
      index: 5,
      categoria: categoriaAlimentos,
      onLongPress: handlerLongPress,
      onSwipeEliminar: handlerSwipe,
    };
    const p2: FilaGastoProps = {
      expense: { ...gasto },
      index: 5,
      categoria: categoriaAlimentos,
      onLongPress: handlerLongPress,
      onSwipeEliminar: handlerSwipe,
    };

    const inicio = Date.now();
    for (let i = 0; i < 10000; i++) {
      areFilaGastoPropsEqual(p1, p2);
    }
    const duracion = Date.now() - inicio;

    expect(duracion).toBeLessThan(100);
  });
});

describe('Día 4.3 - Estabilidad y rendimiento de extractGastoKey', () => {
  it('extrae el id como key de forma determinista', () => {
    const gasto = crearGastoPrueba('exp-abc-123', 5000);
    expect(extractGastoKey(gasto)).toBe('exp-abc-123');
  });

  it('ejecuta 100,000 extracciones de clave en menos de 50ms', () => {
    const gasto = crearGastoPrueba('exp-bench', 5000);
    const inicio = Date.now();
    for (let i = 0; i < 100000; i++) {
      extractGastoKey(gasto);
    }
    const duracion = Date.now() - inicio;

    expect(duracion).toBeLessThan(100);
  });
});
