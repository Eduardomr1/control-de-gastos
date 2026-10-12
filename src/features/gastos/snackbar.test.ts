import {
  crearEstadoInicialSnackbar,
  crearGastoEliminadoPendiente,
  programarEliminacion,
  deshacerEliminacion,
  expirarEliminacion,
  reducirColaSnackbar,
  estaPendienteDeEliminacion,
  obtenerIdsPendientes,
  filtrarGastosVisibles,
  calcularProgresoTiempo,
  calcularTiempoRestanteMs,
  formatearMensajeSnackbar,
  generarA11ySnackbar,
  CONFIG_SNACKBAR_PREDETERMINADA,
  type EstadoColaSnackbar,
  type GastoEliminadoPendiente,
} from './snackbar';

describe('CONFIG_SNACKBAR_PREDETERMINADA', () => {
  it('establece duración entre 4 y 5 segundos (4500ms)', () => {
    expect(CONFIG_SNACKBAR_PREDETERMINADA.duracionMs).toBe(4500);
    expect(CONFIG_SNACKBAR_PREDETERMINADA.duracionMs).toBeGreaterThanOrEqual(4000);
    expect(CONFIG_SNACKBAR_PREDETERMINADA.duracionMs).toBeLessThanOrEqual(5000);
    expect(CONFIG_SNACKBAR_PREDETERMINADA.maxElementosEnCola).toBe(10);
  });
});

describe('crearEstadoInicialSnackbar', () => {
  it('inicializa con valores predeterminados y snackbar oculto', () => {
    const estado = crearEstadoInicialSnackbar();
    expect(estado.itemsPendientes).toEqual([]);
    expect(estado.itemActivo).toBeNull();
    expect(estado.visibilidad).toBe('oculto');
    expect(estado.duracionMs).toBe(4500);
    expect(estado.tiempoInicioMs).toBeNull();
  });

  it('permite sobrescribir la duración mediante configuración', () => {
    const estado = crearEstadoInicialSnackbar({ duracionMs: 4000 });
    expect(estado.duracionMs).toBe(4000);
  });
});

describe('crearGastoEliminadoPendiente', () => {
  it('prioriza el nombre de categoría para la descripción amigable', () => {
    const gasto = {
      id: 'gasto-1',
      amountCents: 15000,
      currency: 'MXN',
      categoryId: 'cat-super',
      note: 'Compras de la semana',
    };
    const item = crearGastoEliminadoPendiente(gasto, {
      nombreCategoria: 'Supermercado',
      ahora: 1000,
    });

    expect(item).toEqual({
      id: 'gasto-1',
      amountCents: 15000,
      currency: 'MXN',
      descripcion: 'Supermercado',
      categoryId: 'cat-super',
      nombreCategoria: 'Supermercado',
      timestamp: 1000,
    });
  });

  it('usa la nota como fallback si no hay nombre de categoría', () => {
    const gasto = {
      id: 'gasto-2',
      amountCents: 3500,
      currency: 'USD',
      note: 'Café matutino',
    };
    const item = crearGastoEliminadoPendiente(gasto, { ahora: 2000 });
    expect(item.descripcion).toBe('Café matutino');
    expect(item.currency).toBe('USD');
  });

  it('usa categoryId si la nota y el nombre de categoría están vacíos', () => {
    const gasto = {
      id: 'gasto-3',
      amountCents: 8000,
      currency: 'EUR',
      categoryId: 'transporte',
    };
    const item = crearGastoEliminadoPendiente(gasto, { ahora: 3000 });
    expect(item.descripcion).toBe('transporte');
  });

  it('usa "Gasto" si no existe ningún descriptor disponible', () => {
    const gasto = {
      id: 'gasto-4',
      amountCents: NaN,
      currency: '',
    };
    const item = crearGastoEliminadoPendiente(gasto);
    expect(item.descripcion).toBe('Gasto');
    expect(item.amountCents).toBe(0);
    expect(item.currency).toBe('MXN');
    expect(typeof item.timestamp).toBe('number');
  });
});

describe('programarEliminacion', () => {
  const itemA: GastoEliminadoPendiente = {
    id: 'gasto-a',
    amountCents: 5000,
    currency: 'MXN',
    descripcion: 'Restaurante',
    timestamp: 1000,
  };

  const itemB: GastoEliminadoPendiente = {
    id: 'gasto-b',
    amountCents: 2000,
    currency: 'MXN',
    descripcion: 'Cine',
    timestamp: 1500,
  };

  it('activa el primer gasto en el snackbar sin items a confirmar', () => {
    const inicial = crearEstadoInicialSnackbar();
    const { nuevoEstado, itemsAConfirmar } = programarEliminacion(
      inicial,
      itemA,
      1000
    );

    expect(nuevoEstado.visibilidad).toBe('visible');
    expect(nuevoEstado.itemActivo).toEqual(itemA);
    expect(nuevoEstado.itemsPendientes).toEqual([itemA]);
    expect(nuevoEstado.tiempoInicioMs).toBe(1000);
    expect(itemsAConfirmar).toEqual([]);
  });

  it('es idempotente si se vuelve a programar el mismo gasto activo', () => {
    const inicial = crearEstadoInicialSnackbar();
    const { nuevoEstado: primerEstado } = programarEliminacion(
      inicial,
      itemA,
      1000
    );
    const { nuevoEstado: segundoEstado, itemsAConfirmar } = programarEliminacion(
      primerEstado,
      itemA,
      1100
    );

    expect(segundoEstado).toBe(primerEstado);
    expect(itemsAConfirmar).toEqual([]);
  });

  it('confirma inmediatamente el gasto anterior si se elimina un nuevo gasto', () => {
    const inicial = crearEstadoInicialSnackbar();
    const { nuevoEstado: estadoConA } = programarEliminacion(
      inicial,
      itemA,
      1000
    );
    const { nuevoEstado: estadoConB, itemsAConfirmar } = programarEliminacion(
      estadoConA,
      itemB,
      2000
    );

    expect(itemsAConfirmar).toEqual([itemA]);
    expect(estadoConB.itemActivo).toEqual(itemB);
    expect(estadoConB.itemsPendientes).toEqual([itemB]);
    expect(estadoConB.tiempoInicioMs).toBe(2000);
  });

  it('respeta configuraciones personalizadas de duración', () => {
    const inicial = crearEstadoInicialSnackbar();
    const { nuevoEstado } = programarEliminacion(
      inicial,
      itemA,
      1000,
      { duracionMs: 4200 }
    );
    expect(nuevoEstado.duracionMs).toBe(4200);
  });
});

describe('deshacerEliminacion', () => {
  const item: GastoEliminadoPendiente = {
    id: 'gasto-1',
    amountCents: 4500,
    currency: 'MXN',
    descripcion: 'Farmacia',
    timestamp: 1000,
  };

  it('retorna null si no hay gastos pendientes para deshacer', () => {
    const estado = crearEstadoInicialSnackbar();
    const { nuevoEstado, gastoRestaurado } = deshacerEliminacion(estado);

    expect(nuevoEstado).toBe(estado);
    expect(gastoRestaurado).toBeNull();
  });

  it('retorna null si se busca un id que no está en la cola', () => {
    const estado = crearEstadoInicialSnackbar();
    const { nuevoEstado: conItem } = programarEliminacion(estado, item, 1000);
    const { nuevoEstado, gastoRestaurado } = deshacerEliminacion(conItem, 'id-inexistente');

    expect(nuevoEstado).toBe(conItem);
    expect(gastoRestaurado).toBeNull();
  });

  it('restaura el gasto activo y oculta el snackbar cuando era el único item', () => {
    const inicial = crearEstadoInicialSnackbar();
    const { nuevoEstado: conItem } = programarEliminacion(inicial, item, 1000);
    const { nuevoEstado, gastoRestaurado } = deshacerEliminacion(conItem);

    expect(gastoRestaurado).toEqual(item);
    expect(nuevoEstado.visibilidad).toBe('oculto');
    expect(nuevoEstado.itemActivo).toBeNull();
    expect(nuevoEstado.itemsPendientes).toEqual([]);
    expect(nuevoEstado.tiempoInicioMs).toBeNull();
  });

  it('restaura un item específico si hay múltiples en cola', () => {
    const item2: GastoEliminadoPendiente = {
      id: 'gasto-2',
      amountCents: 1000,
      currency: 'MXN',
      descripcion: 'Gasolina',
      timestamp: 1100,
    };
    const estadoConDos: EstadoColaSnackbar = {
      itemsPendientes: [item, item2],
      itemActivo: item2,
      visibilidad: 'visible',
      duracionMs: 4500,
      tiempoInicioMs: 1100,
    };

    const { nuevoEstado, gastoRestaurado } = deshacerEliminacion(estadoConDos, 'gasto-1');
    expect(gastoRestaurado).toEqual(item);
    expect(nuevoEstado.itemsPendientes).toEqual([item2]);
    expect(nuevoEstado.itemActivo).toEqual(item2);
    expect(nuevoEstado.visibilidad).toBe('visible');
  });

  it('restaura el item activo y activa el anterior si quedaba otro pendiente', () => {
    const itemPrevio: GastoEliminadoPendiente = {
      id: 'gasto-previo',
      amountCents: 900,
      currency: 'MXN',
      descripcion: 'Pan',
      timestamp: 900,
    };
    const estado: EstadoColaSnackbar = {
      itemsPendientes: [itemPrevio, item],
      itemActivo: item,
      visibilidad: 'visible',
      duracionMs: 4500,
      tiempoInicioMs: 1000,
    };

    const { nuevoEstado, gastoRestaurado } = deshacerEliminacion(estado, 'gasto-1');
    expect(gastoRestaurado).toEqual(item);
    expect(nuevoEstado.itemActivo).toEqual(itemPrevio);
    expect(nuevoEstado.visibilidad).toBe('visible');
  });
});

describe('expirarEliminacion', () => {
  const item: GastoEliminadoPendiente = {
    id: 'gasto-exp',
    amountCents: 12000,
    currency: 'MXN',
    descripcion: 'Electricidad',
    timestamp: 1000,
  };

  it('retorna null si no hay item activo ni id para expirar', () => {
    const estado = crearEstadoInicialSnackbar();
    const { nuevoEstado, gastoExpirado } = expirarEliminacion(estado);

    expect(nuevoEstado).toBe(estado);
    expect(gastoExpirado).toBeNull();
  });

  it('retorna null si el id solicitado no existe', () => {
    const inicial = crearEstadoInicialSnackbar();
    const { nuevoEstado: conItem } = programarEliminacion(inicial, item, 1000);
    const { nuevoEstado, gastoExpirado } = expirarEliminacion(conItem, 'id-inexistente');

    expect(nuevoEstado).toBe(conItem);
    expect(gastoExpirado).toBeNull();
  });

  it('marca el gasto como expirado y oculta el snackbar al completarse el tiempo', () => {
    const inicial = crearEstadoInicialSnackbar();
    const { nuevoEstado: conItem } = programarEliminacion(inicial, item, 1000);
    const { nuevoEstado, gastoExpirado } = expirarEliminacion(conItem);

    expect(gastoExpirado).toEqual(item);
    expect(nuevoEstado.itemActivo).toBeNull();
    expect(nuevoEstado.visibilidad).toBe('oculto');
    expect(nuevoEstado.itemsPendientes).toEqual([]);
    expect(nuevoEstado.tiempoInicioMs).toBeNull();
  });

  it('permite expirar un item específico de la cola de pendientes', () => {
    const itemExtra: GastoEliminadoPendiente = {
      id: 'gasto-extra',
      amountCents: 300,
      currency: 'MXN',
      descripcion: 'Agua',
      timestamp: 1200,
    };
    const estado: EstadoColaSnackbar = {
      itemsPendientes: [item, itemExtra],
      itemActivo: itemExtra,
      visibilidad: 'visible',
      duracionMs: 4500,
      tiempoInicioMs: 1200,
    };

    const { nuevoEstado, gastoExpirado } = expirarEliminacion(estado, 'gasto-exp');
    expect(gastoExpirado).toEqual(item);
    expect(nuevoEstado.itemsPendientes).toEqual([itemExtra]);
    expect(nuevoEstado.itemActivo).toEqual(itemExtra);
  });
});

describe('reducirColaSnackbar', () => {
  const item: GastoEliminadoPendiente = {
    id: 'gasto-red',
    amountCents: 6000,
    currency: 'MXN',
    descripcion: 'Ropa',
    timestamp: 1000,
  };

  it('maneja la acción PROGRAMAR_ELIMINACION', () => {
    const inicial = crearEstadoInicialSnackbar();
    const estado = reducirColaSnackbar(inicial, {
      tipo: 'PROGRAMAR_ELIMINACION',
      payload: { gasto: item, ahora: 1000 },
    });
    expect(estado.visibilidad).toBe('visible');
    expect(estado.itemActivo).toEqual(item);
  });

  it('maneja la acción DESHACER', () => {
    const inicial = crearEstadoInicialSnackbar();
    const conItem = reducirColaSnackbar(inicial, {
      tipo: 'PROGRAMAR_ELIMINACION',
      payload: { gasto: item, ahora: 1000 },
    });
    const deshecho = reducirColaSnackbar(conItem, { tipo: 'DESHACER' });
    expect(deshecho.visibilidad).toBe('oculto');
    expect(deshecho.itemActivo).toBeNull();
  });

  it('maneja la acción EXPIRAR', () => {
    const inicial = crearEstadoInicialSnackbar();
    const conItem = reducirColaSnackbar(inicial, {
      tipo: 'PROGRAMAR_ELIMINACION',
      payload: { gasto: item, ahora: 1000 },
    });
    const expirado = reducirColaSnackbar(conItem, { tipo: 'EXPIRAR' });
    expect(expirado.visibilidad).toBe('oculto');
    expect(expirado.itemActivo).toBeNull();
  });

  it('maneja la acción LIMPIAR', () => {
    const inicial = crearEstadoInicialSnackbar();
    const conItem = reducirColaSnackbar(inicial, {
      tipo: 'PROGRAMAR_ELIMINACION',
      payload: { gasto: item, ahora: 1000 },
    });
    const limpio = reducirColaSnackbar(conItem, { tipo: 'LIMPIAR' });
    expect(limpio.itemsPendientes).toEqual([]);
    expect(limpio.itemActivo).toBeNull();
    expect(limpio.visibilidad).toBe('oculto');
  });

  it('retorna el mismo estado ante acciones no reconocidas', () => {
    const inicial = crearEstadoInicialSnackbar();
    // @ts-expect-error probando robustez de reducer ante acción externa
    const mismo = reducirColaSnackbar(inicial, { tipo: 'DESCONOCIDO' });
    expect(mismo).toBe(inicial);
  });
});

describe('estaPendienteDeEliminacion & obtenerIdsPendientes', () => {
  const item1: GastoEliminadoPendiente = {
    id: 'g-1',
    amountCents: 100,
    currency: 'MXN',
    descripcion: 'A',
    timestamp: 100,
  };
  const item2: GastoEliminadoPendiente = {
    id: 'g-2',
    amountCents: 200,
    currency: 'MXN',
    descripcion: 'B',
    timestamp: 200,
  };

  it('evalúa correctamente si un id está pendiente', () => {
    const estado: EstadoColaSnackbar = {
      itemsPendientes: [item1, item2],
      itemActivo: item2,
      visibilidad: 'visible',
      duracionMs: 4500,
      tiempoInicioMs: 200,
    };

    expect(estaPendienteDeEliminacion(estado, 'g-1')).toBe(true);
    expect(estaPendienteDeEliminacion(estado, 'g-2')).toBe(true);
    expect(estaPendienteDeEliminacion(estado, 'g-3')).toBe(false);
    expect(estaPendienteDeEliminacion(estado, '')).toBe(false);
  });

  it('recupera todos los IDs únicos pendientes', () => {
    const estado: EstadoColaSnackbar = {
      itemsPendientes: [item1, item2],
      itemActivo: item2,
      visibilidad: 'visible',
      duracionMs: 4500,
      tiempoInicioMs: 200,
    };

    const ids = obtenerIdsPendientes(estado);
    expect(ids).toHaveLength(2);
    expect(ids).toContain('g-1');
    expect(ids).toContain('g-2');
  });
});

describe('filtrarGastosVisibles', () => {
  const lista = [
    { id: '1', nombre: 'A' },
    { id: '2', nombre: 'B' },
    { id: '3', nombre: 'C' },
  ];

  it('oculta de forma reactiva los gastos contenidos en la lista de pendientes', () => {
    const visibles = filtrarGastosVisibles(lista, ['2']);
    expect(visibles).toEqual([
      { id: '1', nombre: 'A' },
      { id: '3', nombre: 'C' },
    ]);
  });

  it('soporta instancias de Set de pendientes', () => {
    const set = new Set(['1', '3']);
    const visibles = filtrarGastosVisibles(lista, set);
    expect(visibles).toEqual([{ id: '2', nombre: 'B' }]);
  });

  it('retorna copia completa si no hay pendientes', () => {
    expect(filtrarGastosVisibles(lista, [])).toEqual(lista);
    expect(filtrarGastosVisibles([], ['1'])).toEqual([]);
  });
});

describe('calcularProgresoTiempo & calcularTiempoRestanteMs', () => {
  it('calcula progreso proporcional de 0 a 1', () => {
    expect(calcularProgresoTiempo(0, 4500)).toBe(0);
    expect(calcularProgresoTiempo(2250, 4500)).toBe(0.5);
    expect(calcularProgresoTiempo(4500, 4500)).toBe(1);
    expect(calcularProgresoTiempo(6000, 4500)).toBe(1);
  });

  it('sanea tiempos de progreso negativos o duraciones inválidas', () => {
    expect(calcularProgresoTiempo(-50, 4500)).toBe(0);
    expect(calcularProgresoTiempo(1000, 0)).toBe(1);
    expect(calcularProgresoTiempo(NaN, 4500)).toBe(0);
    expect(calcularProgresoTiempo(100, NaN)).toBe(1);
  });

  it('calcula milisegundos restantes correctamente', () => {
    expect(calcularTiempoRestanteMs(1000, 2000, 4500)).toBe(3500);
    expect(calcularTiempoRestanteMs(1000, 5500, 4500)).toBe(0);
    expect(calcularTiempoRestanteMs(1000, 6000, 4500)).toBe(0);
  });

  it('maneja valores no numéricos en cálculo de tiempo restante', () => {
    expect(calcularTiempoRestanteMs(NaN, 2000, 4500)).toBe(0);
    expect(calcularTiempoRestanteMs(1000, NaN, 4500)).toBe(0);
    expect(calcularTiempoRestanteMs(1000, 2000, NaN)).toBe(0);
  });
});

describe('formatearMensajeSnackbar', () => {
  it('formatea mensaje con descripción y monto formateado', () => {
    expect(formatearMensajeSnackbar('Supermercado', '$450.00')).toBe(
      'Supermercado ($450.00) eliminado'
    );
  });

  it('formatea solo con descripción si no se especifica monto', () => {
    expect(formatearMensajeSnackbar('Gimnasio')).toBe('Gimnasio eliminado');
  });

  it('aplica fallback "Gasto" si la descripción está vacía', () => {
    expect(formatearMensajeSnackbar('   ', '$20.00')).toBe('Gasto ($20.00) eliminado');
    expect(formatearMensajeSnackbar('')).toBe('Gasto eliminado');
  });
});

describe('generarA11ySnackbar', () => {
  it('compone descripción accesible con segundos restantes y pistas', () => {
    const item: GastoEliminadoPendiente = {
      id: 'g-1',
      amountCents: 5000,
      currency: 'MXN',
      descripcion: 'Gasolina',
      timestamp: 1000,
    };
    const a11y = generarA11ySnackbar(item, 4.2);

    expect(a11y.label).toBe(
      'Gasto de Gasolina eliminado. Tienes 5 segundos para deshacer.'
    );
    expect(a11y.actionLabel).toBe('Deshacer eliminación');
    expect(a11y.hint).toContain('Toca dos veces para restaurar este gasto');
  });

  it('omite texto de segundos si el tiempo restante es nulo o 0', () => {
    const item: GastoEliminadoPendiente = {
      id: 'g-1',
      amountCents: 5000,
      currency: 'MXN',
      descripcion: 'Cine',
      timestamp: 1000,
    };
    const a11y = generarA11ySnackbar(item, 0);
    expect(a11y.label).toBe('Gasto de Cine eliminado.');
  });

  it('ofrece fallback accesible cuando no hay gasto pendiente', () => {
    const a11y = generarA11ySnackbar(null);
    expect(a11y.label).toBe('Sin acciones pendientes');
    expect(a11y.actionLabel).toBe('Deshacer');
    expect(a11y.hint).toBe('No hay elementos para restaurar');
  });
});
