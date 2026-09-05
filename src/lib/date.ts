/**
 * Agrupación de gastos por periodo.
 *
 * El bug que este módulo existe para prevenir: un gasto registrado a las
 * 23:50 del 31 de enero en Culiacán (UTC-7) se guarda como
 * "2026-02-01T06:50:00Z". Si el agrupamiento mensual se hace sobre el
 * timestamp UTC, ese gasto aparece en febrero y el corte de enero queda mal.
 *
 * La regla: el periodo SIEMPRE se calcula sobre la hora local del usuario,
 * derivada del offset embebido en el propio ISO string.
 */

export class DateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DateError';
  }
}

/** Clave de mes en formato `YYYY-MM`, calculada en hora local. */
export type MonthKey = string;

const ISO_WITH_OFFSET =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * Extrae la clave de mes local de un ISO 8601 con offset.
 * Trabaja sobre los componentes literales del string, sin pasar por Date,
 * que normalizaría a UTC y reintroduciría el bug.
 */
export function monthKeyOf(isoWithOffset: string): MonthKey {
  const match = ISO_WITH_OFFSET.exec(isoWithOffset);
  if (!match) {
    throw new DateError(
      `Se requiere ISO 8601 con offset explícito, se recibió: "${isoWithOffset}"`,
    );
  }
  const [, year, month] = match;
  return `${year}-${month}`;
}

/** Timestamp ISO con el offset local del dispositivo. */
export function nowLocalIso(now: Date = new Date()): string {
  const offsetMinutes = -now.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const offset = `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}${offset}`
  );
}

/** Agrupa por mes local. Los registros con `deletedAt` deben filtrarse antes. */
export function groupByMonth<T extends { occurredAt: string }>(
  items: readonly T[],
): Map<MonthKey, T[]> {
  const groups = new Map<MonthKey, T[]>();
  for (const item of items) {
    const key = monthKeyOf(item.occurredAt);
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

/** Etiqueta legible de un `MonthKey`, ej. "enero 2026". */
export function formatMonthKey(key: MonthKey, locale = 'es-MX'): string {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) throw new DateError(`MonthKey inválido: "${key}"`);
  const [, year, month] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
