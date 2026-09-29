import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatMonthKey } from '@/shared/lib/date';
import { colores } from '@/shared/theme/colores';
import { scaledSize } from '@/shared/theme/tipografia';
import { GAsyncGate, GTexto } from '@/shared/ui';

import { AnilloDeCategorias } from '../components/AnilloDeCategorias';
import { BarrasPorMes } from '../components/BarrasPorMes';
import { ExportarModal } from '../components/ExportarModal';
import { useExportar } from '../hooks/useExportar';
import { useReportes } from '../hooks/useReportes';

/**
 * Reportes del periodo: reparto por categoría y comparativo de seis meses.
 *
 * El selector de rango es el propio comparativo: tocar la barra de un mes
 * cambia el mes del anillo. Un selector de fechas aparte sería un control más
 * para elegir entre los seis valores que ya están en pantalla.
 */
export function ReportesScreen() {
  const { mes, setMes, resultados, tajadas, barras, exportable } = useReportes();
  const [exportarAbierto, setExportarAbierto] = useState(false);
  const { exportando, exportar } = useExportar(exportable);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      testID="screen-reportes"
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          paddingHorizontal: 20,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: colores.borde,
        }}
      >
        <Pressable
          testID="btn-cancelar"
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          onPress={() => router.back()}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <GTexto variante="body" color={colores.acento} style={{ fontWeight: '600' }}>
            Cerrar
          </GTexto>
        </Pressable>

        <GTexto variante="label" style={{ fontWeight: '600' }}>
          Reportes
        </GTexto>

        <Pressable
          testID="btn-exportar"
          accessibilityRole="button"
          accessibilityLabel="Exportar movimientos"
          onPress={() => setExportarAbierto(true)}
          style={{ minHeight: 44, minWidth: scaledSize(58), justifyContent: 'center' }}
        >
          <GTexto
            variante="body"
            color={colores.acento}
            style={{ fontWeight: '600', textAlign: 'right' }}
          >
            Exportar
          </GTexto>
        </Pressable>
      </View>

      <ExportarModal
        visible={exportarAbierto}
        meses={exportable.meses}
        exportando={exportando}
        onCerrar={() => setExportarAbierto(false)}
        onExportar={async (rango, formato) => {
          await exportar(rango, formato);
          setExportarAbierto(false);
        }}
      />

      <GAsyncGate
        resultados={resultados}
        cargando={
          <View style={{ flex: 1, padding: 32 }}>
            <GTexto variante="body" color={colores.textoSecundario}>
              Calculando…
            </GTexto>
          </View>
        }
        error={() => (
          <View style={{ flex: 1, padding: 32 }} testID="error-reportes">
            <GTexto variante="titulo">No se pudieron cargar los reportes</GTexto>
          </View>
        )}
      >
        <ScrollView contentContainerStyle={{ padding: 20, gap: 28 }}>
          <View style={{ gap: 14 }}>
            <GTexto variante="eyebrow" color={colores.textoSecundario}>
              {`En qué se fue · ${formatMonthKey(mes)}`}
            </GTexto>
            <AnilloDeCategorias tajadas={tajadas} />
          </View>

          <View
            style={{
              gap: 14,
              paddingTop: 22,
              borderTopWidth: 1,
              borderTopColor: colores.borde,
            }}
          >
            <GTexto variante="eyebrow" color={colores.textoSecundario}>
              Mes a mes
            </GTexto>
            <GTexto variante="caption" color={colores.textoSecundario}>
              Toca un mes para ver su reparto.
            </GTexto>

            <BarrasPorMes barras={barras} seleccionado={mes} onSeleccionar={setMes} />
          </View>
        </ScrollView>
      </GAsyncGate>
    </SafeAreaView>
  );
}
