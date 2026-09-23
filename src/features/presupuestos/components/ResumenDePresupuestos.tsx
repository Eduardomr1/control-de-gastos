import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import type { MonthKey } from '@/shared/lib/date';
import { colores } from '@/shared/theme/colores';
import { GTexto } from '@/shared/ui';
import type { Category, Expense } from '@/types/expense';

import { gastoPorCategoria, presupuestoVigente } from '../progreso';
import type { Presupuesto } from '../types';
import { BarraDePresupuesto } from './BarraDePresupuesto';

/**
 * Las barras del mes, una por categoría con límite.
 *
 * Presentacional a propósito: recibe presupuestos y gastos en vez de pedirlos
 * con sus propios hooks. Así la pantalla que lo monta puede meter ambas
 * consultas en el mismo `GAsyncGate` y las barras nunca aparecen después del
 * resto, con un porcentaje que cambia bajo el pulgar (BUG-006).
 *
 * Sin ningún límite fijado no muestra barras vacías: muestra la invitación a
 * fijarlos. Una lista de ceros no informa de nada.
 */
export function ResumenDePresupuestos({
  presupuestos,
  gastosDelMes,
  mes,
  categorias,
}: {
  presupuestos: readonly Presupuesto[];
  gastosDelMes: readonly Expense[];
  mes: MonthKey;
  categorias: ReadonlyMap<string, Category>;
}) {
  const gastado = gastoPorCategoria(gastosDelMes, mes);

  const conLimite = [...categorias.values()]
    .map((categoria) => ({
      categoria,
      vigente: presupuestoVigente(presupuestos, categoria.id, mes),
    }))
    .filter((fila) => fila.vigente !== undefined);

  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
        gap: 14,
        borderBottomWidth: 1,
        borderBottomColor: colores.borde,
      }}
      testID="resumen-presupuestos"
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <GTexto variante="eyebrow" color={colores.textoSecundario}>
          Presupuestos
        </GTexto>
        <Link href="/presupuestos" asChild>
          <Pressable
            testID="btn-configurar-presupuestos"
            accessibilityRole="button"
            accessibilityLabel="Configurar presupuestos"
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <GTexto variante="caption" color={colores.acento}>
              {conLimite.length === 0 ? 'Fijar límites' : 'Editar'}
            </GTexto>
          </Pressable>
        </Link>
      </View>

      {conLimite.length === 0 ? (
        <GTexto variante="caption" color={colores.textoSecundario}>
          Sin límites fijados. Ponlos y la app avisa al 80% y al 100%.
        </GTexto>
      ) : (
        conLimite.map(({ categoria, vigente }) => (
          <BarraDePresupuesto
            key={categoria.id}
            nombre={categoria.name}
            gastadoCents={gastado.get(categoria.id) ?? 0}
            limiteCents={vigente?.limiteCents ?? 0}
          />
        ))
      )}
    </View>
  );
}
