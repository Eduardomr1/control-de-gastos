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

/**
 * Componentes literales de un ISO con offset, tal como los escribio el
 * dispositivo. Existe para poder hacer aritmetica de calendario sin pasar por
 * `Date`, que normalizaria a UTC y reintroduciria el bug que este modulo
 * previene.
 */
export interface ComponentesLocales {
  readonly anio: number;
  readonly mes: number;
  readonly dia: number;
  readonly hora: number;
  readonly minuto: number;
  readonly segundo: number;
  /** El offset tal cual, ej. `-07:00` o `Z`. */
  readonly offset: string;
}

export function componentesLocales(isoWithOffset: string): ComponentesLocales {
  const match = ISO_WITH_OFFSET.exec(isoWithOffset);
  if (!match) {
    throw new DateError(
      `Se requiere ISO 8601 con offset explicito, se recibio: "${isoWithOffset}"`,
    );
  }
  const [, anio, mes, dia, hora, minuto, segundo, offset] = match;
  return {
    anio: Number(anio),
    mes: Number(mes),
    dia: Number(dia),
    hora: Number(hora),
    minuto: Number(minuto),
    segundo: Number(segundo ?? '0'),
    offset: offset as string,
  };
}

/** La operacion inversa de `componentesLocales`. */
export function isoLocal(c: ComponentesLocales): string {
  return (
    `${String(c.anio).padStart(4, '0')}-${pad(c.mes)}-${pad(c.dia)}` +
    `T${pad(c.hora)}:${pad(c.minuto)}:${pad(c.segundo)}${c.offset}`
  );
}

/**
 * Cuantos dias tiene un mes. `Date.UTC(anio, mes, 0)` es el dia cero del mes
 * SIGUIENTE, que es el ultimo del pedido; `mes` ya viene 1-based, asi que no
 * se le resta uno.
 *
 * Es lo que hace que "el 31 de cada mes" no se convierta en "el 28 de cada
 * mes" en cuanto pasa por febrero.
 */
export function diasDelMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/**
 * Compara dos ISO con offset como INSTANTES, no como cadenas.
 *
 * `localeCompare` alcanza mientras todos los registros compartan offset, y
 * deja de alcanzar en cuanto uno viene de otra zona: las 22:00-07:00 del dia 5
 * son posteriores a las 02:00+02:00 del dia 6, y ordenadas como texto salen al
 * reves.
 */
export function comparaInstantes(a: string, b: string): number {
  return Date.parse(a) - Date.parse(b);
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

/**
 * Etiqueta corta de día, ej. "11 sep". Se lee de los componentes literales del
 * ISO, nunca de `Date`: pasar por Date normalizaría a UTC y un gasto de las
 * 23:50 del 31 de enero en Culiacán se mostraría con la fecha del día siguiente.
 */
export function formatDayShort(isoWithOffset: string, locale = 'es-MX'): string {
  const match = ISO_WITH_OFFSET.exec(isoWithOffset);
  if (!match) {
    throw new DateError(
      `Se requiere ISO 8601 con offset explícito, se recibió: "${isoWithOffset}"`,
    );
  }
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const mes = new Intl.DateTimeFormat(locale, {
    month: 'short',
    timeZone: 'UTC',
  }).format(date);
  return `${Number(day)} ${mes.replace('.', '')}`;
}

/** Primer día del mes en UTC. Base común de las etiquetas de periodo. */
function primerDiaDelMes(key: MonthKey): Date {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) throw new DateError(`MonthKey inválido: "${key}"`);
  const [, year, month] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, 1));
}

/** Etiqueta legible de un `MonthKey`, ej. "enero 2026". */
export function formatMonthKey(key: MonthKey, locale = 'es-MX'): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(primerDiaDelMes(key));
}

/**
 * Nombre del mes, sin año. Ej. "enero".
 *
 * El encabezado de la lista siempre habla del mes en curso, así que el año ahí
 * no desambigua nada y produce "Total de enero de 2026". El año sí aparece en
 * el encabezado de cada sección, donde distingue un enero de otro.
 */
export function formatMonthName(key: MonthKey, locale = 'es-MX'): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    timeZone: 'UTC',
  }).format(primerDiaDelMes(key));
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
