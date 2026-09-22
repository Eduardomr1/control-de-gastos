import { useQuery } from '@tanstack/react-query';

import { monthKeyOf, nowLocalIso } from '@/shared/lib/date';

import { fetchIngresos } from '../api/ingresos.local';
import { ingresosDelMes } from '../totales';

/**
 * Ingresos del mes en curso. Devuelve la consulta cruda además del total
 * porque quien la consume la pasa a `GAsyncGate`: la pantalla no debe
 * renderizar un balance con la mitad de los datos cargados (BUG-006).
 */
export function useIngresos() {
  const mes = monthKeyOf(nowLocalIso());
  const query = useQuery({ queryKey: ['ingresos'], queryFn: fetchIngresos });

  return { query, totalDelMes: ingresosDelMes(query.data ?? [], mes) };
}
