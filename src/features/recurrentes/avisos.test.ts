import { avisosDeRecurrentes } from './avisos';
import type { Recurrente } from './types';

const T = 'T09:00:00-07:00';

function recurrente(r: Partial<Recurrente> & { inicio: string }): Recurrente {
  return {
    id: r.inicio,
    tipo: 'gasto',
    nombre: 'Streaming',
    amountCents: 199_00,
    currency: 'MXN',
    frecuencia: 'mensual',
    activo: true,
    syncState: 'synced',
    updatedAt: '2026-09-01T09:00:00-07:00',
    ...r,
  };
}

describe('avisosDeRecurrentes', () => {
  it('programa el aviso dos días antes del cobro', () => {
    const [aviso] = avisosDeRecurrentes(
      [recurrente({ inicio: `2026-09-25${T}` })],
      `2026-09-20${T}`,
    );
    expect(aviso?.cuando.toISOString()).toBe(new Date(`2026-09-23${T}`).toISOString());
  });

  it('el aviso dice el nombre, el monto y el día', () => {
    const [aviso] = avisosDeRecurrentes(
      [recurrente({ inicio: `2026-09-25${T}`, nombre: 'Netflix' })],
      `2026-09-20${T}`,
    );
    expect(aviso?.titulo).toBe('Netflix se cobra pronto');
    expect(aviso?.cuerpo).toContain('$199.00');
    expect(aviso?.cuerpo).toContain('25 sep');
  });

  it('usa el id del recurrente, no uno nuevo', () => {
    const r = recurrente({ inicio: `2026-09-25${T}`, id: 'rec-1' });
    expect(avisosDeRecurrentes([r], `2026-09-20${T}`)[0]?.id).toBe('rec-1');
  });

  it('ignora los apagados', () => {
    expect(
      avisosDeRecurrentes(
        [recurrente({ inicio: `2026-09-25${T}`, activo: false })],
        `2026-09-20${T}`,
      ),
    ).toEqual([]);
  });

  it('ignora los borrados', () => {
    expect(
      avisosDeRecurrentes(
        [recurrente({ inicio: `2026-09-25${T}`, deletedAt: `2026-09-19${T}` })],
        `2026-09-20${T}`,
      ),
    ).toEqual([]);
  });

  /**
   * Programar una notificación para el pasado la dispara de inmediato en unas
   * plataformas y la descarta en silencio en otras. Ninguna de las dos es lo
   * que el usuario pidió.
   */
  it('omite el aviso cuyo momento ya pasó', () => {
    expect(
      avisosDeRecurrentes([recurrente({ inicio: `2026-09-21${T}` })], `2026-09-20${T}`),
    ).toEqual([]);
  });

  it('apunta a la próxima ocurrencia, no a la de inicio ya pasada', () => {
    const [aviso] = avisosDeRecurrentes(
      [recurrente({ inicio: `2026-01-25${T}` })],
      `2026-09-20${T}`,
    );
    expect(aviso?.cuerpo).toContain('25 sep');
  });

  it('un aviso por recurrente activo', () => {
    const avisos = avisosDeRecurrentes(
      [
        recurrente({ inicio: `2026-09-25${T}`, id: 'a' }),
        recurrente({ inicio: `2026-09-28${T}`, id: 'b' }),
        recurrente({ inicio: `2026-09-26${T}`, id: 'c', activo: false }),
      ],
      `2026-09-20${T}`,
    );
    expect(avisos.map((a) => a.id)).toEqual(['a', 'b']);
  });
});
