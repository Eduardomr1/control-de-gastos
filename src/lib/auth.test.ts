/**
 * Pruebas de sesion.
 *
 * useSession() no se cubre aqui: es un hook de React y este proyecto corre las
 * pruebas en entorno node, igual que el resto de modulos ligados a la
 * plataforma. Lo que si se cubre es la logica propia del modulo: la traduccion
 * de errores y, sobre todo, la limpieza de datos locales al cerrar sesion.
 */
import { signIn, signOut } from './auth';

jest.mock('./supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  },
}));
jest.mock('./storage', () => ({
  expenseCache: { clear: jest.fn() },
  syncQueue: { clear: jest.fn() },
}));
jest.mock('./remote', () => ({ pushQueue: jest.fn().mockResolvedValue(undefined) }));

const { supabase } = jest.requireMock('./supabase');
const { expenseCache, syncQueue } = jest.requireMock('./storage');
const { pushQueue } = jest.requireMock('./remote');

beforeEach(() => {
  jest.clearAllMocks();
  supabase.auth.signOut.mockResolvedValue({ error: null });
  pushQueue.mockResolvedValue(undefined);
});

describe('signIn', () => {
  it('no lanza cuando las credenciales son validas', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null });
    await expect(signIn('a@test.com', 'secreta123')).resolves.toBeUndefined();
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@test.com',
      password: 'secreta123',
    });
  });

  it('traduce credenciales invalidas a un mensaje util', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });
    await expect(signIn('a@test.com', 'mala')).rejects.toThrow('Correo o contraseña incorrectos');
  });

  it('traduce la cuenta sin confirmar', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      error: { message: 'Email not confirmed' },
    });
    await expect(signIn('a@test.com', 'secreta123')).rejects.toThrow('La cuenta aún no está confirmada');
  });

  it('usa un mensaje generico ante un error desconocido', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      error: { message: 'network layer exploded' },
    });
    // No se filtra el mensaje crudo de Supabase al usuario final.
    await expect(signIn('a@test.com', 'secreta123')).rejects.toThrow(
      'No se pudo iniciar sesión. Revisa tu conexión.'
    );
  });
});

describe('signOut', () => {
  it('intenta enviar lo pendiente antes de limpiar', async () => {
    const orden: string[] = [];
    pushQueue.mockImplementation(async () => { orden.push('push'); });
    syncQueue.clear.mockImplementation(() => { orden.push('limpiar-cola'); });

    await signOut();

    expect(orden).toEqual(['push', 'limpiar-cola']);
  });

  it('borra la copia local y la cola del usuario que sale', async () => {
    await signOut();
    expect(syncQueue.clear).toHaveBeenCalledTimes(1);
    expect(expenseCache.clear).toHaveBeenCalledTimes(1);
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });

  // El caso que importa: si no se limpiara al fallar la red, la siguiente
  // persona que entrara en el dispositivo veria los gastos de la anterior.
  it('limpia igual cuando no hay red para enviar lo pendiente', async () => {
    pushQueue.mockRejectedValue(new Error('sin conexion'));

    await expect(signOut()).resolves.toBeUndefined();

    expect(syncQueue.clear).toHaveBeenCalledTimes(1);
    expect(expenseCache.clear).toHaveBeenCalledTimes(1);
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });
});
