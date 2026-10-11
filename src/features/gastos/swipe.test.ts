import {
  determinarDireccionSwipe,
  calcularDesplazamientoSwipe,
  calcularEstadoSwipe,
  calcularFeedbackVisualSwipe,
  resolverReleaseSwipe,
  generarA11yAccionSwipe,
  CONFIG_SWIPE_PREDETERMINADA,
} from './swipe';

describe('CONFIG_SWIPE_PREDETERMINADA', () => {
  it('define constantes coherentes de umbrales y limites', () => {
    expect(CONFIG_SWIPE_PREDETERMINADA.umbralActivacion).toBe(72);
    expect(CONFIG_SWIPE_PREDETERMINADA.maxDesplazamientoIzquierda).toBe(110);
    expect(CONFIG_SWIPE_PREDETERMINADA.maxDesplazamientoDerecha).toBe(36);
    expect(CONFIG_SWIPE_PREDETERMINADA.resistenciaFriccion).toBe(0.22);
    expect(CONFIG_SWIPE_PREDETERMINADA.velocidadMinimaActivacion).toBe(-0.65);
  });
});

describe('determinarDireccionSwipe', () => {
  it('retorna "izquierda" para desplazamientos negativos mayores a 1px', () => {
    expect(determinarDireccionSwipe(-5)).toBe('izquierda');
    expect(determinarDireccionSwipe(-100)).toBe('izquierda');
  });

  it('retorna "derecha" para desplazamientos positivos mayores a 1px', () => {
    expect(determinarDireccionSwipe(5)).toBe('derecha');
    expect(determinarDireccionSwipe(80)).toBe('derecha');
  });

  it('retorna "ninguna" en la zona muerta de micro-movimientos (<= 1px)', () => {
    expect(determinarDireccionSwipe(0)).toBe('ninguna');
    expect(determinarDireccionSwipe(0.5)).toBe('ninguna');
    expect(determinarDireccionSwipe(-1)).toBe('ninguna');
  });

  it('retorna "ninguna" con valores invalidos o no numericos', () => {
    expect(determinarDireccionSwipe(NaN)).toBe('ninguna');
    // @ts-expect-error probando robustez ante tipos incorrectos
    expect(determinarDireccionSwipe('invalido')).toBe('ninguna');
  });
});

describe('calcularDesplazamientoSwipe', () => {
  it('permite desplazamiento directo hacia la izquierda antes del limite maximo', () => {
    expect(calcularDesplazamientoSwipe(-50)).toBe(-50);
    expect(calcularDesplazamientoSwipe(-110)).toBe(-110);
  });

  it('aplica friccion elástica (rubber-banding) al superar el limite izquierdo', () => {
    // maxDesplazamientoIzquierda = 110, exceso de 50 * 0.22 = 11 => -121
    const resultado = calcularDesplazamientoSwipe(-160);
    expect(resultado).toBeCloseTo(-121);
  });

  it('permite desplazamiento hacia la derecha hasta su limite propio', () => {
    expect(calcularDesplazamientoSwipe(20)).toBe(20);
    expect(calcularDesplazamientoSwipe(36)).toBe(36);
  });

  it('aplica amortiguacion al superar el limite derecho', () => {
    // maxDesplazamientoDerecha = 36, exceso de 100 * 0.22 = 22 => 58
    const resultado = calcularDesplazamientoSwipe(136);
    expect(resultado).toBeCloseTo(58);
  });

  it('respeta configuraciones personalizadas de limites y friccion', () => {
    const config = {
      maxDesplazamientoIzquierda: 80,
      maxDesplazamientoDerecha: 20,
      resistenciaFriccion: 0.1,
    };
    // Exceso izquierda: 120 - 80 = 40 * 0.1 = 4 => -84
    expect(calcularDesplazamientoSwipe(-120, config)).toBe(-84);
    // Exceso derecha: 50 - 20 = 30 * 0.1 = 3 => 23
    expect(calcularDesplazamientoSwipe(50, config)).toBe(23);
  });

  it('retorna 0 para desplazamientos nulos o invalidos', () => {
    expect(calcularDesplazamientoSwipe(0)).toBe(0);
    expect(calcularDesplazamientoSwipe(NaN)).toBe(0);
    // @ts-expect-error prueba de seguridad de tipos
    expect(calcularDesplazamientoSwipe(null)).toBe(0);
  });
});

describe('calcularEstadoSwipe', () => {
  it('calcula estado inicial con desplazamiento en 0', () => {
    const estado = calcularEstadoSwipe(0);
    expect(estado.direccion).toBe('ninguna');
    expect(estado.desplazamiento).toBe(0);
    expect(estado.distancia).toBe(0);
    expect(estado.progreso).toBe(0);
    expect(estado.umbralAlcanzado).toBe(false);
    expect(estado.accion).toBe('ninguna');
  });

  it('calcula progreso proporcional hacia la izquierda antes de alcanzar el umbral', () => {
    // umbral por defecto: 72
    const estado = calcularEstadoSwipe(-36);
    expect(estado.direccion).toBe('izquierda');
    expect(estado.desplazamiento).toBe(-36);
    expect(estado.distancia).toBe(36);
    expect(estado.progreso).toBe(0.5);
    expect(estado.umbralAlcanzado).toBe(false);
    expect(estado.accion).toBe('ninguna');
  });

  it('activa accion "eliminar" y umbralAlcanzado al superar el umbral de activacion', () => {
    const estado = calcularEstadoSwipe(-72);
    expect(estado.direccion).toBe('izquierda');
    expect(estado.distancia).toBe(72);
    expect(estado.progreso).toBe(1);
    expect(estado.umbralAlcanzado).toBe(true);
    expect(estado.accion).toBe('eliminar');
  });

  it('acota el progreso maximo a 1 aunque se rebase ampliamente el umbral', () => {
    const estado = calcularEstadoSwipe(-150);
    expect(estado.progreso).toBe(1);
    expect(estado.umbralAlcanzado).toBe(true);
    expect(estado.accion).toBe('eliminar');
  });

  it('no activa accion de eliminar al deslizar hacia la derecha', () => {
    const estado = calcularEstadoSwipe(80);
    expect(estado.direccion).toBe('derecha');
    expect(estado.umbralAlcanzado).toBe(false);
    expect(estado.accion).toBe('ninguna');
  });

  it('utiliza umbral personalizado cuando se especifica en configuracion', () => {
    const estado = calcularEstadoSwipe(-50, { umbralActivacion: 50 });
    expect(estado.umbralAlcanzado).toBe(true);
    expect(estado.accion).toBe('eliminar');
  });

  it('sanea valores no numericos o NaN en calcularEstadoSwipe', () => {
    const estado = calcularEstadoSwipe(NaN);
    expect(estado.desplazamiento).toBe(0);
    expect(estado.progreso).toBe(0);
  });
});

describe('calcularFeedbackVisualSwipe', () => {
  it('retorna estilos inactivos cuando la direccion no es hacia la izquierda', () => {
    const estado = calcularEstadoSwipe(30);
    const feedback = calcularFeedbackVisualSwipe(estado);

    expect(feedback.opacidadAccion).toBe(0);
    expect(feedback.escalaIcono).toBe(0.8);
    expect(feedback.textoAccion).toBe('');
    expect(feedback.colorFondo).toBe('#EF4444');
  });

  it('genera feedback gradual mientras se desliza hacia la izquierda', () => {
    const estado = calcularEstadoSwipe(-36); // 50% de progreso
    const feedback = calcularFeedbackVisualSwipe(estado);

    expect(feedback.opacidadAccion).toBe(0.5);
    expect(feedback.escalaIcono).toBeCloseTo(0.925); // 0.85 + 0.15 * 0.5
    expect(feedback.colorFondo).toBe('#EF4444');
    expect(feedback.textoAccion).toBe('Eliminar');
  });

  it('otorga pop de escala (1.15) y resalta color (#DC2626) al alcanzar el umbral', () => {
    const estado = calcularEstadoSwipe(-80);
    const feedback = calcularFeedbackVisualSwipe(estado);

    expect(feedback.opacidadAccion).toBe(1);
    expect(feedback.escalaIcono).toBe(1.15);
    expect(feedback.colorFondo).toBe('#DC2626');
    expect(feedback.colorTexto).toBe('#FFFFFF');
    expect(feedback.textoAccion).toBe('Eliminar');
  });
});

describe('resolverReleaseSwipe', () => {
  it('no activa accion si el desplazamiento es menor al umbral y velocidad baja', () => {
    const decision = resolverReleaseSwipe(-30, -0.1);
    expect(decision.accionEjecutada).toBe('ninguna');
    expect(decision.posicionDestinoX).toBe(0);
  });

  it('activa accion "eliminar" si la distancia supera el umbral sin importar la velocidad', () => {
    const decision = resolverReleaseSwipe(-75, 0);
    expect(decision.accionEjecutada).toBe('eliminar');
    expect(decision.posicionDestinoX).toBe(0);

    // Prueba llamando sin segundo argumento (vx por defecto = 0)
    const decisionSinVx = resolverReleaseSwipe(-80);
    expect(decisionSinVx.accionEjecutada).toBe('eliminar');
  });

  it('respeta configuracion personalizada de velocidad minima en resolverReleaseSwipe', () => {
    const decision = resolverReleaseSwipe(-40, -0.4, {
      umbralActivacion: 60,
      velocidadMinimaActivacion: -0.3,
    });
    expect(decision.accionEjecutada).toBe('eliminar');
  });

  it('activa accion "eliminar" por flick rápido si supera velocidad minima y 45% del umbral', () => {
    // 72 * 0.45 = 32.4px, velocidad = -0.7 <= -0.65
    const decision = resolverReleaseSwipe(-35, -0.75);
    expect(decision.accionEjecutada).toBe('eliminar');
  });

  it('no activa accion por flick si la distancia recorrida es insignificante (< 45% umbral)', () => {
    const decision = resolverReleaseSwipe(-10, -0.9);
    expect(decision.accionEjecutada).toBe('ninguna');
  });

  it('no activa accion para desplazamientos hacia la derecha', () => {
    const decision = resolverReleaseSwipe(60, 0.5);
    expect(decision.accionEjecutada).toBe('ninguna');
    expect(decision.posicionDestinoX).toBe(0);
  });

  it('maneja valores NaN o atipicos retornando accion ninguna', () => {
    const decision = resolverReleaseSwipe(NaN, NaN);
    expect(decision.accionEjecutada).toBe('ninguna');
    expect(decision.posicionDestinoX).toBe(0);
  });
});

describe('generarA11yAccionSwipe', () => {
  it('compone label y hint descriptivos con categoria y monto', () => {
    const a11y = generarA11yAccionSwipe('Supermercado', '$450.00');
    expect(a11y.label).toBe('Eliminar Supermercado de $450.00');
    expect(a11y.hint).toContain('Desliza a la izquierda o mantén presionado');
  });

  it('usa fallback si el nombre de gasto esta vacio', () => {
    const a11y = generarA11yAccionSwipe('   ', '$20.00');
    expect(a11y.label).toBe('Eliminar Gasto de $20.00');
  });
});
