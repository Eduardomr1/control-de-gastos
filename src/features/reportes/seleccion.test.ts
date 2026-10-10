import type { BarraDeMes, TajadaDeCategoria } from './agregados';
import {
  calcularDetalleSeleccion,
  calcularMetricasBarras,
} from './seleccion';

describe('calcularDetalleSeleccion', () => {
  const tajadasEjemplo: readonly TajadaDeCategoria[] = [
    {
      categoryId: 'cat-alimentacion',
      nombre: 'Alimentación',
      color: '#F97316',
      totalCents: 450_00,
      porcentaje: 60,
    },
    {
      categoryId: 'cat-transporte',
      nombre: 'Transporte',
      color: '#3B82F6',
      totalCents: 300_00,
      porcentaje: 40,
    },
  ];

  it('retorna el total general y 100% cuando no hay selección activa (null)', () => {
    const detalle = calcularDetalleSeleccion(tajadasEjemplo, null);

    expect(detalle.activa).toBeNull();
    expect(detalle.montoCents).toBe(750_00);
    expect(detalle.porcentaje).toBe(100);
    expect(detalle.esFiltroActivo).toBe(false);
    expect(detalle.etiqueta).toBe('Total');
  });

  it('retorna los datos específicos de la categoría seleccionada', () => {
    const detalle = calcularDetalleSeleccion(tajadasEjemplo, 'cat-alimentacion');

    expect(detalle.activa).toEqual(tajadasEjemplo[0]);
    expect(detalle.montoCents).toBe(450_00);
    expect(detalle.porcentaje).toBe(60);
    expect(detalle.esFiltroActivo).toBe(true);
    expect(detalle.etiqueta).toBe('Alimentación');
  });

  it('retorna el total general de forma segura si la categoría buscada no existe en la lista', () => {
    const detalle = calcularDetalleSeleccion(tajadasEjemplo, 'cat-inexistente');

    expect(detalle.activa).toBeNull();
    expect(detalle.montoCents).toBe(750_00);
    expect(detalle.porcentaje).toBe(100);
    expect(detalle.esFiltroActivo).toBe(false);
    expect(detalle.etiqueta).toBe('Total');
  });

  it('maneja listas vacías de tajadas sin errores', () => {
    const detalle = calcularDetalleSeleccion([], null);

    expect(detalle.activa).toBeNull();
    expect(detalle.montoCents).toBe(0);
    expect(detalle.porcentaje).toBe(100);
    expect(detalle.esFiltroActivo).toBe(false);
    expect(detalle.etiqueta).toBe('Total');
  });
});

describe('calcularMetricasBarras', () => {
  const barrasEjemplo: readonly BarraDeMes[] = [
    { mes: '2026-07', totalCents: 200_00 },
    { mes: '2026-08', totalCents: 500_00 },
    { mes: '2026-09', totalCents: 100_00 },
  ];

  it('calcula los porcentajes relativos basados en el mes más alto', () => {
    const metricas = calcularMetricasBarras(barrasEjemplo, '2026-08');

    expect(metricas).toHaveLength(3);

    // 2026-07: 200/500 = 40%
    expect(metricas[0]?.porcentajeRelativo).toBe(40);
    expect(metricas[0]?.esActivo).toBe(false);

    // 2026-08 (máximo): 500/500 = 100% y activo
    expect(metricas[1]?.porcentajeRelativo).toBe(100);
    expect(metricas[1]?.esActivo).toBe(true);

    // 2026-09: 100/500 = 20%
    expect(metricas[2]?.porcentajeRelativo).toBe(20);
    expect(metricas[2]?.esActivo).toBe(false);
  });

  it('evita división entre cero si todos los meses tienen 0 gastos', () => {
    const barrasCero: readonly BarraDeMes[] = [
      { mes: '2026-07', totalCents: 0 },
      { mes: '2026-08', totalCents: 0 },
    ];

    const metricas = calcularMetricasBarras(barrasCero);

    expect(metricas[0]?.porcentajeRelativo).toBe(0);
    expect(metricas[1]?.porcentajeRelativo).toBe(0);
  });

  it('funciona correctamente sin mes seleccionado', () => {
    const metricas = calcularMetricasBarras(barrasEjemplo);

    expect(metricas.every((m) => !m.esActivo)).toBe(true);
  });
});
