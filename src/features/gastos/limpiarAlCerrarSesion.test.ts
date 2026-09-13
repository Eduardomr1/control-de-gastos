import { limpiarAlCerrarSesion } from './limpiarAlCerrarSesion';

jest.mock('./store/syncQueueInstance', () => ({
  syncQueue: { clear: jest.fn() },
}));
jest.mock('./store/expenseCache', () => ({
  expenseCache: { clear: jest.fn() },
}));
jest.mock('./api/sync', () => ({ pushQueue: jest.fn().mockResolvedValue(undefined) }));

const { syncQueue } = jest.requireMock('./store/syncQueueInstance');
const { expenseCache } = jest.requireMock('./store/expenseCache');
const { pushQueue } = jest.requireMock('./api/sync');

beforeEach(() => {
  jest.clearAllMocks();
  pushQueue.mockResolvedValue(undefined);
});

describe('limpiarAlCerrarSesion', () => {
  it('intenta enviar lo pendiente antes de limpiar', async () => {
    const orden: string[] = [];
    pushQueue.mockImplementation(async () => {
      orden.push('push');
    });
    syncQueue.clear.mockImplementation(() => {
      orden.push('limpiar-cola');
    });

    await limpiarAlCerrarSesion();

    expect(orden).toEqual(['push', 'limpiar-cola']);
  });

  it('borra la copia local y la cola', async () => {
    await limpiarAlCerrarSesion();
    expect(syncQueue.clear).toHaveBeenCalledTimes(1);
    expect(expenseCache.clear).toHaveBeenCalledTimes(1);
  });

  // El caso que importa: si no se limpiara al fallar la red, la siguiente
  // persona que entrara en el dispositivo veria los gastos de la anterior.
  it('limpia igual cuando no hay red para enviar lo pendiente', async () => {
    pushQueue.mockRejectedValue(new Error('sin conexion'));

    await expect(limpiarAlCerrarSesion()).resolves.toBeUndefined();

    expect(syncQueue.clear).toHaveBeenCalledTimes(1);
    expect(expenseCache.clear).toHaveBeenCalledTimes(1);
  });
});
