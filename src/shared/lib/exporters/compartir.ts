/**
 * Escribe el archivo y lo entrega al sistema operativo. Único módulo de
 * exportación que toca APIs nativas.
 *
 * No decide nada: el contenido lo arman `csv.ts` y `pdf.ts`, que son puros y sí
 * se prueban. Aquí solo hay plomería, y por eso está fuera de la cobertura —
 * mismo criterio que `deviceStorage.ts` o `scheduler.ts`.
 *
 * `expo-print` y `expo-sharing` en vez de `react-native-html-to-pdf` y
 * `react-native-share`, que proponía el plan: el proyecto es Expo, y estos dos
 * traen su configuración nativa resuelta en el plugin.
 */

import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/**
 * Los archivos van a caché y no a documentos: son de un solo uso —se generan
 * para compartirse en ese momento— y el sistema puede reclamar el espacio
 * cuando lo necesite, en vez de que se acumulen para siempre.
 */
function destino(nombre: string): File {
  const carpeta = new Directory(Paths.cache, 'exportaciones');
  if (!carpeta.exists) carpeta.create({ intermediates: true });
  return new File(carpeta, nombre);
}

export async function compartirCsv(contenido: string, nombre: string): Promise<void> {
  const archivo = destino(nombre);
  archivo.create({ overwrite: true });
  archivo.write(contenido);
  await entregar(archivo.uri, 'text/csv', 'Exportar movimientos');
}

export async function compartirPdf(html: string, nombre: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html });
  // printToFileAsync bautiza el archivo con un identificador aleatorio. Se
  // mueve a un nombre legible porque ese es el que verá quien lo reciba.
  const archivo = new File(uri);
  const final = destino(nombre);
  if (final.exists) final.delete();
  archivo.move(final);
  await entregar(final.uri, 'application/pdf', 'Exportar movimientos');
}

/**
 * Si no hay a quién compartir —un emulador sin apps, un Android sin nada
 * instalado que acepte el tipo— el archivo ya quedó escrito. Se avisa con su
 * ruta en vez de fallar en silencio.
 */
async function entregar(uri: string, mimeType: string, titulo: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    console.warn(`[exportar] no hay con qué compartir; el archivo quedó en ${uri}`);
    return;
  }
  await Sharing.shareAsync(uri, { mimeType, dialogTitle: titulo, UTI: mimeType });
}
