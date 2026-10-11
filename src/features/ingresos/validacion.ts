import { MoneyError, parseAmount } from '@/shared/lib/money';

export interface ValidacionIngresoParams {
  amountText: string;
  fuente: string;
  noteText?: string | undefined;
  cuentaId?: string | undefined;
}

export interface IngresoValidoPayload {
  readonly amountCents: number;
  readonly currency: 'MXN';
  readonly fuente: string;
  readonly note?: string;
  readonly cuentaId?: string;
}

export interface ValidacionIngresoResultado {
  readonly esValido: boolean;
  readonly error: string | null;
  readonly payload?: IngresoValidoPayload;
}

/**
 * Valida de forma pura los campos de entrada de un nuevo ingreso antes de
 * persistir o disparar mutaciones de estado.
 */
export function validarEntradaIngreso(
  params: ValidacionIngresoParams,
): ValidacionIngresoResultado {
  const { amountText, fuente, noteText, cuentaId } = params;

  if (!amountText || amountText.trim() === '') {
    return {
      esValido: false,
      error: 'Ingresa un monto',
    };
  }

  let amountCents: number;
  try {
    amountCents = parseAmount(amountText);
  } catch (e) {
    return {
      esValido: false,
      error: e instanceof MoneyError ? e.message : 'Monto inválido',
    };
  }

  if (amountCents <= 0) {
    return {
      esValido: false,
      error: 'El monto debe ser mayor a cero',
    };
  }

  const fuenteLimpia = fuente?.trim() ?? '';
  if (!fuenteLimpia) {
    return {
      esValido: false,
      error: 'Selecciona una fuente de ingreso',
    };
  }

  const notaLimpia = noteText?.trim();

  return {
    esValido: true,
    error: null,
    payload: {
      amountCents,
      currency: 'MXN',
      fuente: fuenteLimpia,
      ...(notaLimpia ? { note: notaLimpia } : {}),
      ...(cuentaId ? { cuentaId } : {}),
    },
  };
}
