/**
 * Lectura de texto de una imagen, en el dispositivo. Único módulo que toca
 * `expo-text-extractor`.
 *
 * On-device y sin llave: ML Kit en Android, Vision de Apple en iOS. Ninguna
 * foto sale del teléfono y no hay costo por escaneo. La precisión es menor
 * que la de un servicio en la nube con recibos arrugados, y por eso la
 * pantalla siempre deja corregir lo leído antes de guardar.
 *
 * Fuera de la cobertura, como `scheduler.ts` o `compartir.ts`: aquí solo hay
 * plomería. Lo que puede fallar en silencio vive en `normalizar.ts`, que sí se
 * prueba.
 */

import { extractTextFromImage, isSupported } from 'expo-text-extractor';
import { Platform } from 'react-native';

import { aLineas, rutaParaOcr } from './normalizar';

/** Si el dispositivo puede leer texto. En web, no. */
export const ocrDisponible: boolean = isSupported;

/** Renglones de texto reconocidos, de arriba hacia abajo. */
export async function leerLineas(uri: string): Promise<string[]> {
  return aLineas(await extractTextFromImage(rutaParaOcr(uri, Platform.OS)));
}
