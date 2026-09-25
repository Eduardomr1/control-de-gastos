/**
 * Geometría del anillo de categorías.
 *
 * Existe en vez de `victory-native` por una razón de peso, no de gusto:
 * victory-native exige `@shopify/react-native-skia`, `react-native-reanimated`
 * y `react-native-gesture-handler` — tres módulos nativos más para dibujar dos
 * gráficas estáticas sin una sola interacción. `react-native-svg`, que ya
 * basta, es uno solo, y el arco son veinte líneas de trigonometría que además
 * se pueden probar en Node. Cuatro dependencias nativas contra una.
 *
 * El anillo y no el pastel: el agujero deja sitio para el total en el centro,
 * que es el dato que la gente busca primero.
 */

export interface Sector {
  /** El `d` de un `<Path>` de SVG. */
  readonly d: string;
  readonly color: string;
  readonly key: string;
}

export interface EntradaDeAnillo {
  readonly key: string;
  readonly valor: number;
  readonly color: string;
}

/**
 * Convierte una lista de montos en sectores de anillo.
 *
 * Reparte sobre los VALORES, no sobre porcentajes ya redondeados: redondear
 * antes deja huecos o solapes visibles de hasta un grado y medio. El ángulo de
 * cada sector arranca donde terminó el anterior, así que el anillo cierra
 * exactamente aunque la última fracción no sea exacta.
 *
 * Empieza a las 12 en punto y avanza en el sentido del reloj, que es como se
 * lee un anillo.
 */
export function sectores(
  entradas: readonly EntradaDeAnillo[],
  radio: number,
  grosor: number,
): Sector[] {
  const total = entradas.reduce((suma, e) => suma + e.valor, 0);
  if (total <= 0) return [];

  const vivas = entradas.filter((e) => e.valor > 0);

  // Un solo sector es un anillo completo, y un arco de 360° no se puede
  // dibujar con un solo `A`: su punto inicial y final coinciden y SVG no sabe
  // qué camino tomar, así que no pinta nada. Dos semicírculos sí.
  if (vivas.length === 1) {
    const unica = vivas[0];
    return unica === undefined
      ? []
      : [{ key: unica.key, color: unica.color, d: anilloCompleto(radio, grosor) }];
  }

  let anguloInicial = 0;
  return vivas.map((entrada) => {
    const barrido = (entrada.valor / total) * 360;
    const d = arco(anguloInicial, anguloInicial + barrido, radio, grosor);
    anguloInicial += barrido;
    return { key: entrada.key, color: entrada.color, d };
  });
}

/**
 * Punto sobre una circunferencia de radio `r` centrada en (`centro`,`centro`).
 * El -90 pone el 0° a las 12 en punto; sin el ajuste, SVG arranca a las 3.
 */
function punto(
  anguloGrados: number,
  r: number,
  centro: number,
): { x: number; y: number } {
  const radianes = ((anguloGrados - 90) * Math.PI) / 180;
  return {
    x: redondear(centro + r * Math.cos(radianes)),
    y: redondear(centro + r * Math.sin(radianes)),
  };
}

function arco(
  desde: number,
  hasta: number,
  radio: number,
  grosor: number,
): string {
  const interior = radio - grosor;
  const centro = radio;

  const externoInicio = punto(desde, radio, centro);
  const externoFin = punto(hasta, radio, centro);
  const internoFin = punto(hasta, interior, centro);
  const internoInicio = punto(desde, interior, centro);

  // `largeArc` decide cuál de los dos caminos posibles entre dos puntos toma
  // SVG. Sin él, todo sector de más de media vuelta se dibuja como su
  // complemento: la categoría mayoritaria aparecería como la minoritaria.
  const largeArc = hasta - desde > 180 ? 1 : 0;

  return [
    `M ${externoInicio.x} ${externoInicio.y}`,
    `A ${radio} ${radio} 0 ${largeArc} 1 ${externoFin.x} ${externoFin.y}`,
    `L ${internoFin.x} ${internoFin.y}`,
    `A ${interior} ${interior} 0 ${largeArc} 0 ${internoInicio.x} ${internoInicio.y}`,
    'Z',
  ].join(' ');
}

/**
 * Dos semicírculos, por lo dicho arriba sobre el arco de 360°.
 *
 * El agujero sale del sentido de giro: el contorno exterior va en el del reloj
 * (`sweep 1`) y el interior al revés (`sweep 0`). Con la regla de relleno
 * `nonzero` por defecto, los sentidos opuestos se cancelan y el centro queda
 * hueco — no hace falta `fillRule="evenodd"` ni un círculo tapando encima.
 */
function anilloCompleto(radio: number, grosor: number): string {
  const interior = radio - grosor;
  const centro = radio;
  return [
    `M ${centro} 0`,
    `A ${radio} ${radio} 0 1 1 ${centro} ${redondear(radio * 2)}`,
    `A ${radio} ${radio} 0 1 1 ${centro} 0`,
    `M ${centro} ${redondear(centro - interior)}`,
    `A ${interior} ${interior} 0 1 0 ${centro} ${redondear(centro + interior)}`,
    `A ${interior} ${interior} 0 1 0 ${centro} ${redondear(centro - interior)}`,
    'Z',
  ].join(' ');
}

/**
 * Dos decimales. No es cosmética: sin recortar, cada coordenada arrastra
 * diecisiete dígitos y el `d` de un anillo de seis categorías pasa de los dos
 * mil caracteres, que hay que serializar y cruzar el puente nativo en cada
 * render.
 */
function redondear(n: number): number {
  return Number(n.toFixed(2));
}
