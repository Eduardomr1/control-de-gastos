import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatMonthKey, type MonthKey } from '@/shared/lib/date';
import { colores } from '@/shared/theme/colores';
import { GBoton, GTexto } from '@/shared/ui';

import { rangoDelMes, type RangoDeExportacion } from '../exportar';

export type Formato = 'csv' | 'pdf';

/**
 * Elige rango y formato, y dispara la exportación.
 *
 * El rango se arma con los mismos seis meses que ya ofrece el comparativo, más
 * un "todo el periodo": un calendario de dos fechas para elegir entre siete
 * opciones conocidas es más control del que la pregunta necesita.
 */
export function ExportarModal({
  visible,
  meses,
  onCerrar,
  onExportar,
  exportando,
}: {
  visible: boolean;
  /** Los meses disponibles, del más antiguo al más reciente. */
  meses: readonly MonthKey[];
  onCerrar: () => void;
  onExportar: (rango: RangoDeExportacion, formato: Formato) => void;
  exportando: boolean;
}) {
  const [mes, setMes] = useState<MonthKey | 'todo'>('todo');

  const primero = meses[0];
  const ultimo = meses[meses.length - 1];

  function rango(): RangoDeExportacion {
    if (mes !== 'todo') return rangoDelMes(mes);
    if (primero === undefined || ultimo === undefined) {
      return { desde: '0000-01-01', hasta: '9999-12-31' };
    }
    return { desde: rangoDelMes(primero).desde, hasta: rangoDelMes(ultimo).hasta };
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCerrar}
    >
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colores.fondo }}
        testID="modal-exportar"
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: colores.borde,
          }}
        >
          <Pressable
            testID="btn-cerrar-exportar"
            accessibilityRole="button"
            accessibilityLabel="Cancelar exportación"
            onPress={onCerrar}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <GTexto variante="body" color={colores.acento} style={{ fontWeight: '600' }}>
              Cancelar
            </GTexto>
          </Pressable>
          <GTexto variante="label" style={{ fontWeight: '600' }}>
            Exportar
          </GTexto>
          <View style={{ width: 70 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
          <GTexto variante="eyebrow" color={colores.textoSecundario}>
            Periodo
          </GTexto>

          <View style={{ gap: 8 }}>
            <OpcionDeRango
              testID="rango-todo"
              etiqueta="Todo el periodo"
              activa={mes === 'todo'}
              onPress={() => setMes('todo')}
            />
            {[...meses].reverse().map((m) => (
              <OpcionDeRango
                key={m}
                testID={`rango-${m}`}
                etiqueta={formatMonthKey(m)}
                activa={mes === m}
                onPress={() => setMes(m)}
              />
            ))}
          </View>

          <View
            style={{
              gap: 12,
              paddingTop: 18,
              borderTopWidth: 1,
              borderTopColor: colores.borde,
            }}
          >
            <GTexto variante="eyebrow" color={colores.textoSecundario}>
              Formato
            </GTexto>
            <GTexto variante="caption" color={colores.textoSecundario}>
              CSV para trabajarlo en una hoja de cálculo; PDF para enviarlo o
              imprimirlo.
            </GTexto>

            <GBoton
              testID="btn-exportar-csv"
              label={exportando ? 'Generando…' : 'Exportar CSV'}
              busy={exportando}
              onPress={() => onExportar(rango(), 'csv')}
              accessibilityLabel="Exportar como CSV"
            />
            <GBoton
              testID="btn-exportar-pdf"
              label={exportando ? 'Generando…' : 'Exportar PDF'}
              busy={exportando}
              onPress={() => onExportar(rango(), 'pdf')}
              accessibilityLabel="Exportar como PDF"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function OpcionDeRango({
  testID,
  etiqueta,
  activa,
  onPress,
}: {
  testID: string;
  etiqueta: string;
  activa: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityLabel={etiqueta}
      accessibilityState={{ selected: activa }}
      onPress={onPress}
      style={{
        minHeight: 48,
        justifyContent: 'center',
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: activa ? colores.acento : colores.borde,
        backgroundColor: activa ? colores.acento : colores.superficie,
      }}
    >
      <GTexto
        color={activa ? colores.sobreAcento : colores.texto}
        style={{ fontWeight: '600' }}
      >
        {etiqueta}
      </GTexto>
    </Pressable>
  );
}
