import { useState } from 'react';
import { Alert } from 'react-native';

import type { Category, Expense } from '@/types/expense';

import type { Formato } from '../components/ExportarModal';
import {
  filasExportables,
  nombreDeArchivo,
  type IngresoExportable,
  type RangoDeExportacion,
} from '../exportar';

/**
 * Arma el archivo y lo entrega al sistema operativo.
 *
 * Los módulos nativos entran con `import()` perezoso: un import estático
 * arrastraría expo-print, expo-sharing y expo-file-system a cualquier contexto
 * que monte este hook, incluidas las pruebas en Node.
 */
export function useExportar({
  gastos,
  ingresos,
  categorias,
  cuentas,
}: {
  gastos: readonly Expense[];
  ingresos: readonly IngresoExportable[];
  categorias: ReadonlyMap<string, Category>;
  cuentas: ReadonlyMap<string, string>;
}) {
  const [exportando, setExportando] = useState(false);

  async function exportar(rango: RangoDeExportacion, formato: Formato): Promise<void> {
    setExportando(true);
    try {
      const filas = filasExportables(gastos, ingresos, categorias, cuentas, rango);
      const nombre = nombreDeArchivo(rango, formato);

      if (formato === 'csv') {
        const { generarCsv } = await import('@/shared/lib/exporters/csv');
        const { compartirCsv } = await import('@/shared/lib/exporters/compartir');
        await compartirCsv(generarCsv(filas), nombre);
      } else {
        const { generarHtml } = await import('@/shared/lib/exporters/pdf');
        const { compartirPdf } = await import('@/shared/lib/exporters/compartir');
        await compartirPdf(generarHtml(filas, rango.desde, rango.hasta), nombre);
      }
    } catch (e) {
      // El fallo se dice, no se traga: sin aviso, el usuario cree que compartió
      // un archivo que nunca existió.
      console.error('[exportar] no se pudo generar el archivo', e);
      Alert.alert(
        'No se pudo exportar',
        'Revisa que haya espacio en el dispositivo e inténtalo de nuevo.',
      );
    } finally {
      setExportando(false);
    }
  }

  return { exportando, exportar };
}
