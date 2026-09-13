import { syncQueue } from './store/syncQueueInstance';
import { expenseCache } from './store/expenseCache';
import { pushQueue } from './api/sync';

/**
 * Envía lo pendiente y limpia la copia local y la cola. La usa `signOut` de
 * auth: cerrar sesión es un evento de gastos ("olvida los datos de este
 * usuario en este dispositivo"), no algo que auth deba conocer con la cola y
 * el caché de otro feature — por eso vive aquí, detrás del barrel. Ver
 * BUG-013.
 *
 * Mejor esfuerzo con lo pendiente: si no hay red, se pierde al limpiar. Es el
 * precio de no filtrar datos entre cuentas, y salir es una acción explícita.
 */
export async function limpiarAlCerrarSesion(): Promise<void> {
  await pushQueue(syncQueue).catch(() => undefined);
  syncQueue.clear();
  expenseCache.clear();
}
