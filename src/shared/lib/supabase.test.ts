/**
 * Regresión de BUG-015.
 *
 * El defecto no estaba en lo que hacía el cliente sino en CUÁNDO se construía:
 * al evaluar el módulo. Eso convertía la ausencia de credenciales en un crash
 * de arranque para cualquiera que importara la cadena, aunque la app corriera
 * en modo local y nunca fuera a hablar con Supabase.
 *
 * Las dependencias nativas se simulan porque no hay binding en Node: el sujeto
 * de prueba es el momento del throw, no el cliente real.
 */

jest.mock('@/shared/storage/deviceStorage', () => ({ authStorage: {} }));
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ marca: 'cliente-de-prueba' })),
}));

interface ModuloSupabase {
  supabase: () => unknown;
}

/** Carga el módulo desde cero, para que el cliente memoizado no se filtre. */
function cargarModulo(): ModuloSupabase {
  let modulo: ModuloSupabase | undefined;
  jest.isolateModules(() => {
    modulo = jest.requireActual('./supabase') as ModuloSupabase;
  });
  if (!modulo) throw new Error('El módulo no se cargó');
  return modulo;
}

const ENTORNO_ORIGINAL = { ...process.env };

beforeEach(() => {
  delete process.env['EXPO_PUBLIC_SUPABASE_URL'];
  delete process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'];
});

afterAll(() => {
  process.env = ENTORNO_ORIGINAL;
});

describe('cliente de Supabase', () => {
  it('no lanza al importar el módulo sin credenciales', () => {
    expect(() => cargarModulo()).not.toThrow();
  });

  it('lanza solo cuando alguien pide el cliente sin credenciales', () => {
    const { supabase } = cargarModulo();
    expect(() => supabase()).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);
  });

  it('devuelve el cliente cuando hay credenciales', () => {
    process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://ejemplo.supabase.co';
    process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'llave-de-prueba';

    const { supabase } = cargarModulo();
    expect(supabase()).toEqual({ marca: 'cliente-de-prueba' });
  });

  it('memoiza: no construye un cliente nuevo en cada llamada', () => {
    process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://ejemplo.supabase.co';
    process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'llave-de-prueba';

    const { supabase } = cargarModulo();
    expect(supabase()).toBe(supabase());
  });
});
