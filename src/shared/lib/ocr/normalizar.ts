/**
 * Lo que hay que hacerle a la entrada y a la salida de `expo-text-extractor`
 * para que se porte igual en las dos plataformas.
 *
 * Puro y aparte del módulo que llama al binding nativo, porque las dos cosas
 * que corrige aquí fallan en silencio: no lanzan un error que se vea en
 * desarrollo, simplemente el OCR no devuelve nada o devuelve renglones pegados.
 */

/**
 * La ruta que el módulo nativo espera.
 *
 * En Android, `expo-text-extractor` trata todo lo que no empiece con
 * `content://` como ruta de archivo y la abre con `File(ruta)`. La URI que
 * entrega `expo-image-picker` es `file:///data/...`, y `File("file:///...")`
 * no existe: el OCR falla con "File not found" en cada foto. En iOS el módulo
 * recibe una `URL` y la URI completa es justo lo que necesita.
 */
export function rutaParaOcr(uri: string, plataforma: string): string {
  if (plataforma !== 'android' || !uri.startsWith('file://')) return uri;
  // decodeURIComponent: una ruta con espacios llega como %20 dentro de la URI.
  return decodeURIComponent(uri.slice('file://'.length));
}

/**
 * Bloques de OCR → renglones.
 *
 * ML Kit devuelve BLOQUES de texto, y un bloque puede traer varios renglones
 * unidos con `\n` ("SUBTOTAL\nIVA\nTOTAL"). Apple Vision devuelve un renglón
 * por observación. Partir aquí deja al parser una sola forma de entrada, venga
 * de la plataforma que venga.
 */
export function aLineas(bloques: readonly string[]): string[] {
  return bloques
    .flatMap((bloque) => bloque.split(/\r?\n/))
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0);
}
