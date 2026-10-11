import { parseAmount } from '@/shared/lib/money';
import { FRECUENCIAS, type Frecuencia, type TipoRecurrente } from './types';

export interface ValidacionRecurrenteInput {
  nombre: string;
  montoText: string;
  frecuencia: Frecuencia;
  tipo?: TipoRecurrente;
  categoryId?: string;
  fuente?: string;
}

export interface ValidacionRecurrenteExitosa {
  readonly esValido: true;
  readonly payload: {
    readonly tipo: TipoRecurrente;
    readonly nombre: string;
    readonly amountCents: number;
    readonly currency: string;
    readonly frecuencia: Frecuencia;
    readonly categoryId?: string;
    readonly fuente?: string;
  };
}

export interface ValidacionRecurrenteFallida {
  readonly esValido: false;
  readonly error: string;
}

export type ValidacionRecurrenteResultado =
  | ValidacionRecurrenteExitosa
  | ValidacionRecurrenteFallida;

export function validarEntradaRecurrente(
  input: ValidacionRecurrenteInput
): ValidacionRecurrenteResultado {
  const nombreLimpio = input.nombre.trim();
  if (nombreLimpio === '') {
    return {
      esValido: false,
      error: 'Ponle un nombre para reconocerlo',
    };
  }

  if (nombreLimpio.length > 60) {
    return {
      esValido: false,
      error: 'El nombre no puede exceder 60 caracteres',
    };
  }

  let amountCents: number;
  try {
    amountCents = parseAmount(input.montoText);
  } catch {
    return {
      esValido: false,
      error: 'Ingresa un monto válido',
    };
  }

  if (amountCents <= 0) {
    return {
      esValido: false,
      error: 'El monto debe ser mayor a cero',
    };
  }

  if (!FRECUENCIAS.includes(input.frecuencia)) {
    return {
      esValido: false,
      error: 'Frecuencia no válida',
    };
  }

  const tipo: TipoRecurrente = input.tipo ?? 'gasto';

  return {
    esValido: true,
    payload: {
      tipo,
      nombre: nombreLimpio,
      amountCents,
      currency: 'MXN',
      frecuencia: input.frecuencia,
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(input.fuente ? { fuente: input.fuente } : {}),
    },
  };
}
