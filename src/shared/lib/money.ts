/**
 * Aritmética monetaria en centavos enteros.
 *
 * Toda cantidad de dinero en la app vive como `number` entero de centavos.
 * La conversión a/desde texto ocurre SOLO en los bordes: entrada del usuario
 * (parseAmount) y renderizado (formatMoney).
 */

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

const MAX_CENTS = Number.MAX_SAFE_INTEGER;

/**
 * Convierte texto capturado por el usuario a centavos enteros.
 *
 * Acepta separadores de miles y coma o punto decimal, porque un usuario
 * mexicano teclea indistintamente "1,234.50" y "1234,50".
 *
 * @throws {MoneyError} si el texto no representa un monto válido.
 */
export function parseAmount(input: string): number {
  const trimmed = input.trim();
  if (trimmed === '') throw new MoneyError('El monto no puede estar vacío');

  // Normaliza: elimina espacios y separadores de miles, unifica el decimal.
  let normalized = trimmed.replace(/\s/g, '');
  const lastComma = normalized.lastIndexOf(',');
  const lastDot = normalized.lastIndexOf('.');

  if (lastComma > -1 && lastDot > -1) {
    // El separador decimal es el que aparece más a la derecha.
    const decimalSep = lastComma > lastDot ? ',' : '.';
    const thousandsSep = decimalSep === ',' ? '.' : ',';
    normalized = normalized.split(thousandsSep).join('');
    normalized = normalized.replace(decimalSep, '.');
  } else if (lastComma > -1) {
    // Una sola coma: decimal si deja 1-2 dígitos, si no es separador de miles.
    const decimals = normalized.length - lastComma - 1;
    normalized =
      decimals <= 2 ? normalized.replace(',', '.') : normalized.split(',').join('');
  }

  if (!/^-?\d*\.?\d*$/.test(normalized) || normalized === '.') {
    throw new MoneyError(`Monto inválido: "${input}"`);
  }

  const [wholePart = '0', fracPart = ''] = normalized.split('.');
  if (fracPart.length > 2) {
    throw new MoneyError('El monto no admite más de 2 decimales');
  }

  const negative = wholePart.startsWith('-');
  const whole = wholePart.replace('-', '') || '0';
  const frac = fracPart.padEnd(2, '0');

  const cents = Number(whole) * 100 + Number(frac);
  if (!Number.isSafeInteger(cents)) {
    throw new MoneyError('El monto excede el máximo permitido');
  }
  return negative ? -cents : cents;
}

/** Suma una lista de montos en centavos, con guarda de desbordamiento. */
export function sumCents(amounts: readonly number[]): number {
  let total = 0;
  for (const amount of amounts) {
    assertCents(amount);
    total += amount;
    if (!Number.isSafeInteger(total)) {
      throw new MoneyError('La suma excede el máximo seguro');
    }
  }
  return total;
}

/**
 * Reparte `cents` en `parts` porciones sin perder ni inventar centavos.
 * Los centavos residuales se distribuyen uno a uno desde la primera porción,
 * de modo que la suma del resultado siempre es exactamente `cents`.
 */
export function splitCents(cents: number, parts: number): number[] {
  assertCents(cents);
  if (!Number.isInteger(parts) || parts < 1) {
    throw new MoneyError('El número de porciones debe ser un entero positivo');
  }
  const sign = cents < 0 ? -1 : 1;
  const abs = Math.abs(cents);
  const base = Math.floor(abs / parts);
  const remainder = abs - base * parts;
  return Array.from({ length: parts }, (_, i) =>
    sign * (base + (i < remainder ? 1 : 0)),
  );
}

/** Aplica un porcentaje redondeando al centavo más cercano (half-up). */
export function percentOf(cents: number, percent: number): number {
  assertCents(cents);
  if (!Number.isFinite(percent)) throw new MoneyError('Porcentaje inválido');
  const raw = (cents * percent) / 100;
  return raw < 0 ? -Math.round(-raw) : Math.round(raw);
}

/**
 * Que porcentaje entero representa `parte` de `total`. El inverso de
 * `percentOf`.
 *
 * Vive aqui y no en quien lo necesita porque redondear es justo lo que el lint
 * del proyecto prohibe fuera de este archivo: `Math.round` sobre dinero suele
 * delatar un calculo hecho en flotantes. Aqui el redondeo es legitimo -el
 * resultado es una etiqueta, no un monto- y esta es la frontera autorizada.
 *
 * Con total en cero devuelve 0 en vez de NaN: una lista vacia no tiene
 * reparto, y NaN se propagaria hasta la pantalla.
 */
export function percentShare(parteCents: number, totalCents: number): number {
  assertCents(parteCents);
  assertCents(totalCents);
  if (totalCents === 0) return 0;
  return Math.round((parteCents / totalCents) * 100);
}

/** Formatea centavos para mostrar. Nunca usar el resultado para calcular. */
export function formatMoney(
  cents: number,
  currency = 'MXN',
  locale = 'es-MX',
): string {
  assertCents(cents);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function assertCents(value: number): void {
  if (!Number.isInteger(value)) {
    throw new MoneyError(`Los centavos deben ser enteros, se recibió: ${value}`);
  }
  if (Math.abs(value) > MAX_CENTS) {
    throw new MoneyError('El monto excede el máximo permitido');
  }
}
