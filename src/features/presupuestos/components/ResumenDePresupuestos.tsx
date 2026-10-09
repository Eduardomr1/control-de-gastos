import { Link } from 'expo-router';
import { View } from 'react-native';

import type { MonthKey } from '@/shared/lib/date';
import { formatMoney } from '@/shared/lib/money';
import { colores } from '@/shared/theme/colores';
import { GBarraDeProgreso, GTexto, GAnimatedPressable } from '@/shared/ui';
import type { Category, Expense } from '@/types/expense';

import { fraccionUsada, gastoPorCategoria, presupuestoVigente } from '../progreso';
import type { Presupuesto } from '../types';

/**
 * Resumen de presupuestos del mes con barras de progreso animadas.
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
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 8,
        paddingHorizontal: 18,
        paddingTop: 16,
        paddingBottom: 16,
        borderRadius: 20,
        backgroundColor: colores.superficie,
        borderWidth: 1,
        borderColor: colores.borde,
        gap: 14,
        ...colores.sombraTarjeta,
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
          <GAnimatedPressable
            testID="btn-configurar-presupuestos"
            accessibilityRole="button"
            accessibilityLabel="Configurar presupuestos"
            scaleTarget={0.93}
            style={{
              minHeight: 34,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: colores.fondoPildora,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <GTexto variante="caption" color={colores.acento} style={{ fontWeight: '700' }}>
              {conLimite.length === 0 ? 'Fijar límites' : 'Editar'}
            </GTexto>
          </GAnimatedPressable>
        </Link>
      </View>

      {conLimite.length === 0 ? (
        <GTexto variante="caption" color={colores.textoSecundario}>
          Sin límites fijados. Ponlos y la app avisa al 80% y al 100%.
        </GTexto>
      ) : (
        conLimite.map(({ categoria, vigente }) => {
          const gastadoCents = gastado.get(categoria.id) ?? 0;
          const limiteCents = vigente?.limiteCents ?? 0;
          return (
            <GBarraDeProgreso
              key={categoria.id}
              testID={`presupuesto-${categoria.id}`}
              etiqueta={categoria.name}
              detalle={`${formatMoney(gastadoCents)} de ${formatMoney(limiteCents)}`}
              actualCents={gastadoCents}
              objetivoCents={limiteCents}
              color={colorDeAvance(fraccionUsada(gastadoCents, limiteCents))}
            />
          );
        })
      )}
    </View>
  );
}

/**
 * Ámbar al 80% y rojo al pasarse.
 */
function colorDeAvance(fraccion: number): string {
  if (fraccion >= 1) return colores.error;
  return fraccion >= 0.8 ? '#D97706' : colores.acento;
}
