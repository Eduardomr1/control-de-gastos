/**
 * Notificaciones locales programadas. Único módulo que toca
 * expo-notifications.
 *
 * Solo entrega al sistema operativo lo que otro ya decidió: qué avisar y
 * cuándo se calcula en `features/recurrentes/avisos.ts`, que es puro y sí se
 * prueba. Aquí no hay una sola decisión de negocio, y por eso este archivo
 * está fuera de la cobertura — como `deviceStorage.ts` o `supabase.ts`.
 *
 * `expo-notifications` se elige sobre `notifee`, que proponía el plan: el
 * proyecto es Expo con `android/` generado por prebuild, y notifee exige
 * configuración nativa que expo-notifications ya trae resuelta en su plugin.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface AvisoProgramable {
  readonly id: string;
  readonly titulo: string;
  readonly cuerpo: string;
  readonly cuando: Date;
}

const CANAL_ANDROID = 'recordatorios';

/**
 * Reemplaza TODOS los avisos programados por los que se le pasan.
 *
 * Cancelar y volver a programar en vez de llevar la cuenta de qué notificación
 * corresponde a qué recurrente: la lista completa se recalcula al abrir la
 * app, y sincronizarla contra la que tenga el sistema operativo cuesta más
 * código que rehacerla. El borrón es seguro porque los recordatorios de
 * recurrentes son las únicas notificaciones que esta app programa.
 *
 * No lanza: quedarse sin recordatorios es molesto, pero no abrir la app lo es
 * más, y esto corre al arranque.
 */
export async function reprogramarAvisos(
  avisos: readonly AvisoProgramable[],
): Promise<number> {
  try {
    if (!(await hayPermiso())) return 0;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CANAL_ANDROID, {
        name: 'Recordatorios de cobros',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    await Notifications.cancelAllScheduledNotificationsAsync();

    for (const aviso of avisos) {
      await Notifications.scheduleNotificationAsync({
        identifier: aviso.id,
        content: { title: aviso.titulo, body: aviso.cuerpo },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: aviso.cuando,
          ...(Platform.OS === 'android' ? { channelId: CANAL_ANDROID } : {}),
        },
      });
    }

    return avisos.length;
  } catch (e) {
    console.error('[notificaciones] no se pudieron programar los avisos', e);
    return 0;
  }
}

/**
 * Pide el permiso si todavía no se ha decidido. No vuelve a pedirlo si el
 * usuario ya dijo que no: insistir en cada arranque es lo que hace que la
 * gente desinstale.
 */
async function hayPermiso(): Promise<boolean> {
  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted) return true;
  if (!actual.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}
