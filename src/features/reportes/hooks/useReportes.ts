import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { useCategorias } from '@/features/categorias';
import { useCuentas } from '@/features/cuentas';
import { obtenerGastos } from '@/features/gastos';
import { useIngresos } from '@/features/ingresos';
import { monthKeyOf, nowLocalIso, type MonthKey } from '@/shared/lib/date';
import type { Category } from '@/types/expense';

import { porCategoria, porMes } from '../agregados';

/** Cuántos meses entran en el comparativo. */
export const MESES_DEL_COMPARATIVO = 6;

/**
 * Datos de la pantalla de reportes.
 *
 * Usa la misma `queryKey` que la lista a propósito: react-query sirve la copia
 * que ya tiene en memoria y abrir el reporte no dispara una segunda lectura de
 * los mismos gastos.
 *
 * Los gastos se piden por el barrel de su feature, nunca por su ruta interna
 * (Regla 2).
 */
export function useReportes() {
  const [mes, setMes] = useState<MonthKey>(() => monthKeyOf(nowLocalIso()));

  const gastosQuery = useQuery({ queryKey: ['expenses'], queryFn: obtenerGastos });
  const categoriasQuery = useCategorias();
  // Ingresos y cuentas solo los necesita el export, pero sus consultas entran
  // al mismo GAsyncGate: abrir el modal y encontrarlo a medio cargar seria
  // peor que esperar un instante mas por la pantalla.
  const ingresos = useIngresos();
  const cuentas = useCuentas();

  const gastos = gastosQuery.data ?? [];
  const categorias = new Map(
    ((categoriasQuery.data ?? []) as Category[]).map((c) => [c.id, c]),
  );
  const barras = porMes(gastos, mes, MESES_DEL_COMPARATIVO);

  return {
    mes,
    setMes,
    resultados: [gastosQuery, categoriasQuery, ingresos.query, cuentas.query],
    tajadas: porCategoria(gastos, mes, categorias),
    barras,
    // Lo que el modal de exportacion necesita, ya resuelto aqui.
    exportable: {
      gastos,
      ingresos: ingresos.ingresos,
      categorias,
      cuentas: new Map(cuentas.cuentas.map((c) => [c.id, c.nombre])),
      meses: barras.map((b) => b.mes),
    },
  };
}
