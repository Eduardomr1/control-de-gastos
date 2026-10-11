import { parseAmount } from '@/shared/lib/money';

export interface ValidacionGastoInput {
  readonly amountText: string;
  readonly categoryId: string;
  readonly noteText?: string | undefined;
  readonly cuentaId?: string | undefined;
  readonly reciboUri?: string | undefined;
}

export interface GastoPayloadValidado {
  readonly amountCents: number;
  readonly currency: 'MXN';
  readonly categoryId: string;
  readonly note?: string;
  readonly cuentaId?: string;
  readonly reciboUri?: string;
}

export interface ValidacionGastoExitosa {
  readonly esValido: true;
  readonly payload: GastoPayloadValidado;
}

export interface ValidacionGastoFallida {
  readonly esValido: false;
  readonly error: string;
}

export type ValidacionGastoResultado =
  | ValidacionGastoExitosa
  | ValidacionGastoFallida;

export function validarEntradaGasto(input: ValidacionGastoInput): ValidacionGastoResultado {
  const categoryIdLimpio = input.categoryId.trim();
  if (!categoryIdLimpio) {
    return {
      esValido: false,
      error: 'Selecciona una categoría para el gasto',
    };
  }

  let amountCents: number;
  try {
    amountCents = parseAmount(input.amountText);
  } catch {
    return {
      esValido: false,
      error: 'Ingresa un monto numérico válido',
    };
  }

  if (amountCents <= 0) {
    return {
      esValido: false,
      error: 'El monto debe ser mayor a cero',
    };
  }

  const notaLimpia = input.noteText?.trim();
  const cuentaIdLimpia = input.cuentaId?.trim();
  const reciboUriLimpia = input.reciboUri?.trim();

  return {
    esValido: true,
    payload: {
      amountCents,
      currency: 'MXN',
      categoryId: categoryIdLimpio,
      ...(notaLimpia ? { note: notaLimpia } : {}),
      ...(cuentaIdLimpia ? { cuentaId: cuentaIdLimpia } : {}),
      ...(reciboUriLimpia ? { reciboUri: reciboUriLimpia } : {}),
    },
  };
}
