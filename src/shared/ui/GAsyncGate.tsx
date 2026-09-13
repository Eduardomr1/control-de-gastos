import type { ReactNode } from 'react';

/**
 * "Carga Verdadera": ninguna vista renderiza parcialmente (BUG-006). Recibe
 * el resultado de N queries y solo construye `children` cuando todas
 * terminaron con éxito; si alguna falla, delega el copy a `error`.
 *
 * La forma de `ResultadoAsync` es estructural, no importa el tipo de
 * TanStack Query: cualquier objeto con esa forma sirve, lo que evita atar
 * este componente a una librería de datos concreta.
 */
interface ResultadoAsync {
  isPending: boolean;
  isError: boolean;
  error: unknown;
}

interface GAsyncGateProps {
  resultados: readonly ResultadoAsync[];
  cargando: ReactNode;
  // ponytail: `unknown` en vez de `Failure` porque ese tipo no existe todavía
  // (llega en la Fase 2, src/shared/errors/failures.ts). Se estrecha ahí.
  error: (e: unknown) => ReactNode;
  children: ReactNode;
}

export function GAsyncGate({ resultados, cargando, error, children }: GAsyncGateProps) {
  if (resultados.some((r) => r.isPending)) return <>{cargando}</>;

  const fallido = resultados.find((r) => r.isError);
  if (fallido) return <>{error(fallido.error)}</>;

  return <>{children}</>;
}
