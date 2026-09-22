/**
 * Identificadores de registro.
 *
 * El id se genera en el CLIENTE, no en el servidor: es lo que permite crear
 * sin red y lo que hace idempotente el reenvío —el servidor reconoce el id y
 * no duplica (BUG-003)—. Vive en `shared/` porque toda tabla nueva lo
 * necesita, no solo gastos.
 */

/** UUID v4 sin dependencias externas. */
export function generarId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
