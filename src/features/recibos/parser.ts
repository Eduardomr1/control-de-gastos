/**
 * Lee total, fecha y comercio de los renglones que devuelve el OCR.
 *
 * Todo aquí son heurísticas, y la regla que las ordena es una sola: **un total
 * equivocado es peor que ninguno.** Si el parser no está seguro devuelve null,
 * la pantalla muestra el campo vacío y el usuario lo captura; si inventa un
 * monto, lo prellena y el usuario, que confía en la cámara, lo guarda sin
 * mirarlo. Por eso cada paso prefiere quedarse callado a adivinar.
 *
 * Puro y sin dependencias nativas: el binding del OCR está en
 * `shared/lib/ocr`, y esto se prueba en Node contra un corpus de recibos.
 *
 * Sin lookbehind en ninguna regex: Hermes lo soporta desde hace poco, y un
 * parser que truena al cargar en un motor viejo es peor que uno un poco más
 * largo.
 */

import { esFechaDelCalendario } from '@/shared/lib/date';

export interface DatosDeRecibo {
  /** Centavos enteros, o null si no se pudo leer con confianza. */
  readonly totalCents: number | null;
  /** `YYYY-MM-DD`, o null. */
  readonly fecha: string | null;
  readonly comercio: string | null;
}

/** Mayúsculas y sin acentos: el OCR los pierde la mitad de las veces. */
function plano(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

// ================================================================ palabras

/**
 * Letras que el OCR confunde con dígitos y otros signos. Una palabra clave se
 * busca con su clase entera, así "T0TAL" y "TOTA1" siguen siendo TOTAL.
 */
const PARECIDAS: Readonly<Record<string, string>> = {
  O: '[O0QD]',
  I: '[I1L|!]',
  L: '[L1I|]',
  S: '[S5$]',
  A: '[A4]',
  B: '[B8]',
  E: '[E3]',
  Z: '[Z2]',
  G: '[G6]',
};

const ESPECIALES = new Set(['.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\', '/']);

/** Regex que tolera los errores típicos de OCR dentro de una palabra. */
function difusa(palabra: string): string {
  return [...palabra]
    .map((c) => {
      if (c === ' ') return '\\s*';
      const clase = PARECIDAS[c];
      if (clase !== undefined) return clase;
      return ESPECIALES.has(c) ? `\\${c}` : c;
    })
    .join('');
}

/** Alguna de las palabras, como palabra completa y con tolerancia de OCR. */
function busca(...palabras: string[]): RegExp {
  return new RegExp(`(?:^|[^A-Z0-9])(?:${palabras.map(difusa).join('|')})(?![A-Z])`);
}

/**
 * Para CLASIFICAR un renglón, los dígitos metidos entre letras vuelven a ser
 * letras ("T0TAL" → "TOTAL"). Nunca se usa para leer montos.
 */
function repararPalabras(linea: string): string {
  return linea
    .replace(/([A-Z])0(?=[A-Z])/g, (_, letra: string) => `${letra}O`)
    .replace(/([A-Z])1(?=[A-Z])/g, (_, letra: string) => `${letra}I`);
}

/**
 * Rótulos que anuncian el total final. Van de más fuerte a más débil: un
 * "TOTAL CON PROPINA" gana a un "TOTAL" pelón que aparece antes en el mismo
 * ticket, y un "TOTAL" gana a un "IMPORTE", que en gasolineras es el total y
 * en otros tickets es el precio de un renglón.
 */
const TOTAL_FUERTE = busca(
  'TOTAL CON PROPINA',
  'TOTAL A PAGAR',
  'GRAN TOTAL',
  'TOTAL FINAL',
  'TOTAL NETO',
  'IMPORTE TOTAL',
  'TOTAL PAGADO',
  'NETO A PAGAR',
  'TOTAL VENTA',
);
const TOTAL = busca('TOTAL', 'TO TAL', 'TOTAL M.N.', 'TOTAL MN');
// Sin 'VENTA': "NOTA DE VENTA 12345" haría del folio un total de $12,345.
const TOTAL_DEBIL = busca('IMPORTE', 'MONTO', 'A PAGAR', 'CARGO');

/**
 * Renglones con dinero que NO es el total. Casi todos los errores de un parser
 * ingenuo salen de aquí: el EFECTIVO es mayor que el total, el SUBTOTAL viene
 * antes, y "TOTAL ARTICULOS 7" dice TOTAL y no es dinero.
 */
const NO_ES_TOTAL = busca(
  'SUBTOTAL',
  'SUB TOTAL',
  'SUB-TOTAL',
  'ARTICULOS',
  'ARTICULO',
  'ARTS',
  'PIEZAS',
  'PZAS',
  'PRODUCTOS',
  'NUM',
  'NO. DE',
  'CANT',
  'CANTIDAD',
  'IVA',
  'I.V.A',
  'IEPS',
  'IMPUESTO',
  'IMPUESTOS',
  'CAMBIO',
  'EFECTIVO',
  'PAGO CON',
  'PAGA CON',
  'RECIBIDO',
  'SU PAGO',
  'PROPINA',
  'SUGERIDA',
  'DESCUENTO',
  'DESCUENTOS',
  'DESC',
  'AHORRO',
  'AHORRASTE',
  'PUNTOS',
  'SALDO',
  'LITROS',
  'LTS',
  'PRECIO',
  'P.U',
  'P/U',
  'MESES',
  'MSI',
  'MENSUAL',
  'MENSUALIDAD',
  'PAGO MINIMO',
  'SIN PROPINA',
  'REDONDEO',
  'DONATIVO',
);

/** Renglones cuyos números nunca son dinero. */
const NO_ES_DINERO = busca(
  'FOLIO',
  'TICKET',
  'TKT',
  'CAJA',
  'CAJERO',
  'TEL',
  'TELEFONO',
  'RFC',
  'AUT',
  'AUTORIZACION',
  'AFILIACION',
  'REF',
  'REFERENCIA',
  'TRANSACCION',
  'OPERACION',
  'TARJETA',
  'CUENTA',
  'C.P',
  'CP',
  'SUCURSAL',
  'TIENDA',
  'TERMINAL',
  'LOTE',
  'SERIE',
  'CERTIFICADO',
  'CODIGO',
  'MESA',
  'COMENSALES',
  'PERSONAS',
  'MEMBRESIA',
  'SOCIO',
  'CLIENTE',
  'PEDIDO',
  'ORDEN',
  'BOMBA',
  'ISLA',
  'POSICION',
  'DESPACHADOR',
);

type Rotulo = 'fuerte' | 'total' | 'debil' | 'excluido' | 'ninguno';

function rotuloDe(linea: string): Rotulo {
  const p = repararPalabras(plano(linea));
  if (TOTAL_FUERTE.test(p)) return 'fuerte';
  if (NO_ES_TOTAL.test(p)) return 'excluido';
  if (TOTAL.test(p)) return 'total';
  if (NO_ES_DINERO.test(p)) return 'excluido';
  if (TOTAL_DEBIL.test(p)) return 'debil';
  return 'ninguno';
}

// ================================================================ montos

/**
 * Corrige confusiones de OCR que caen DENTRO de un número: "1O0.5O" → 100.50,
 * "2L4.00" → 214.00, "3B.50" → 38.50. Solo toca letras pegadas a dígitos o al
 * separador decimal, para no convertir palabras en números. Recibe texto ya
 * en mayúsculas, así que la "l" minúscula llega como L.
 */
function repararNumeros(linea: string): string {
  const pon = (digito: string) => (_: string, antes: string) => antes + digito;
  let actual = linea;
  for (let i = 0; i < 5; i += 1) {
    const siguiente = actual
      .replace(/(\d|[.,])[OQD](?=[OQD\d.,\s]|$)/g, pon('0'))
      // Al inicio de un número, solo si no viene pegada a una palabra: sin
      // esta condición, "TOTAL234.50" perdería la L y dejaría de decir TOTAL.
      .replace(/(^|[^A-Z])[OQD](?=[OQD]*\d)/g, pon('0'))
      .replace(/(\d)[LI|](?=[LI|\d.,\s]|$)/g, pon('1'))
      .replace(/(^|[^A-Z])[LI|](?=[LI|]*\d)/g, pon('1'))
      .replace(/(\d)B(?=[\d.,])/g, pon('8'))
      .replace(/(\d)S(?=\d)/g, pon('5'));
    if (siguiente === actual) break;
    actual = siguiente;
  }
  return actual;
}

/**
 * Un monto en texto a centavos, tolerando los formatos que aparecen en
 * tickets mexicanos: "1,234.56", "1234.56", "1 234.56", "1.234,56", "234,50",
 * "234". El separador decimal es el que deja exactamente dos dígitos al final;
 * todo lo demás es separador de miles.
 *
 * Aritmética sobre la cadena, sin flotantes: `Number("1234.56") * 100` da
 * 123456.00000000001 (BUG-001).
 */
function aCentavos(texto: string): number | null {
  const limpio = texto.replace(/\s/g, '');
  const decimal = /^(.*?)[.,](\d{2})$/.exec(limpio);
  const entero = decimal ? (decimal[1] ?? '') : limpio;
  const centavos = decimal ? (decimal[2] ?? '00') : '00';
  const digitos = entero.replace(/[.,]/g, '');
  if (!/^\d+$/.test(digitos)) return null;
  const valor = Number(digitos) * 100 + Number(centavos);
  return Number.isSafeInteger(valor) ? valor : null;
}

interface Monto {
  readonly cents: number;
  /** Tenía decimales o signo de pesos: más probable que sea dinero. */
  readonly conFormato: boolean;
}

/**
 * Frontera izquierda que no sea letra ni dígito ("600ML" puede ser un monto,
 * "ML600" no), signo de pesos opcional ($, o una S suelta que el OCR leyó en
 * su lugar), y el número con miles y decimales opcionales.
 */
const MONTO =
  /(?:^|[^A-Z0-9])(\$|S(?=\s?\d))?\s?(\d{1,3}(?:[,. ]\d{3})+(?:[.,]\d{2})?|\d+(?:[.,]\d{1,2})?)(?!\d)/g;

const ROTULO_PEGADO =
  /(TOTAL|IMPORTE|EFECTIVO|CAMBIO|SUBTOTAL|IVA|PROPINA|MONTO|PAGAR|NETO)(?=\$?\d)/g;

/**
 * Los montos de un renglón.
 *
 * Antes de buscar se borra lo que tiene forma de número y no es dinero: horas,
 * fechas, tarjetas enmascaradas y porcentajes. Un número largo sin decimales
 * (código de barras, teléfono, folio) se descarta por tamaño.
 */
function montosDe(linea: string): Monto[] {
  const sinRuido = repararNumeros(repararPalabras(plano(linea)))
    // "TOTAL234.50": el monto pegado a su rotulo. La frontera de MONTO rechaza
    // un numero pegado a letras -"SKU12345" no es dinero-, asi que para los
    // rotulos de dinero se separa aqui, y solo para ellos.
    .replace(ROTULO_PEGADO, (_, rotulo: string) => `${rotulo} `)
    .replace(/\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]\.?M\.?)?/g, ' ')
    .replace(/\d{1,4}[/.-]\d{1,2}[/.-]\d{2,4}/g, ' ')
    .replace(/\*+\s?\d+/g, ' ')
    .replace(/\d+(?:[.,]\d+)?\s?%/g, ' ');

  const encontrados: Monto[] = [];
  for (const m of sinRuido.matchAll(MONTO)) {
    const cuerpo = m[2] ?? '';
    // Un solo decimal ("234.5") suele ser un dígito perdido por el OCR: se
    // completa con cero en vez de leerlo como 2345.
    const normalizado = /[.,]\d$/.test(cuerpo) ? `${cuerpo}0` : cuerpo;
    const conDecimales = /[.,]\d{2}$/.test(normalizado);
    if (!conDecimales && normalizado.replace(/\D/g, '').length >= 7) continue;
    const cents = aCentavos(normalizado);
    if (cents === null || cents === 0) continue;
    encontrados.push({ cents, conFormato: conDecimales || m[1] !== undefined });
  }
  return encontrados;
}

/** El renglón es solo un monto: "$234.50", "234.50 MXN", "M.N. 234.50". */
function esSoloMonto(linea: string): boolean {
  const resto = repararNumeros(plano(linea))
    .replace(/M\.?\s?N\.?|MXN|PESOS|\$|(?:^|[^A-Z])S(?=\d)/g, '')
    .replace(/[\d.,\s]/g, '');
  return resto.length <= 1 && montosDe(linea).length === 1;
}

// ================================================================ total

interface Asociado {
  readonly rotulo: Rotulo;
  readonly monto: Monto;
}

/**
 * Asocia cada rótulo de dinero con su monto, en las tres formas en que el OCR
 * los entrega:
 *
 * 1. En el mismo renglón: "TOTAL 234.50".
 * 2. En el renglón siguiente: "TOTAL" y abajo "$234.50".
 * 3. En columnas separadas: el OCR lee primero toda la columna de rótulos y
 *    después toda la de importes. Una racha de N rótulos sin monto seguida de
 *    una racha de N montos solos se empareja en orden.
 *
 * El 3 va ANTES que el 2 a propósito. Con SUBTOTAL / IVA / TOTAL y abajo sus
 * tres importes, emparejar "TOTAL con el renglón siguiente" le daría el
 * importe del SUBTOTAL. Una racha de un solo rótulo es el caso 2; una de
 * varios, el 3.
 */
function asociar(lineas: readonly string[]): Map<number, Asociado> {
  const asociados = new Map<number, Asociado>();
  const rotulos = lineas.map(rotuloDe);
  const montos = lineas.map(montosDe);
  const soloMonto = lineas.map(esSoloMonto);

  // 1. Mismo renglón. El último monto: "TOTAL 3 ART 234.50" trae el conteo
  // antes del importe.
  rotulos.forEach((rotulo, i) => {
    const aqui = montos[i] ?? [];
    const ultimo = aqui[aqui.length - 1];
    if (rotulo !== 'ninguno' && ultimo) asociados.set(i, { rotulo, monto: ultimo });
  });

  const sinMonto = (i: number) =>
    rotulos[i] !== 'ninguno' && !asociados.has(i) && (montos[i]?.length ?? 0) === 0;

  let i = 0;
  while (i < lineas.length) {
    if (!sinMonto(i)) {
      i += 1;
      continue;
    }
    const inicio = i;
    while (i < lineas.length && sinMonto(i)) i += 1;
    const racha = i - inicio;

    if (racha === 1) {
      // 2. Un rótulo suelto toma el renglón inmediato de abajo, y solo ese:
      // saltar renglones para buscarle monto es como se empareja un TOTAL
      // perdido con el importe de otra cosa.
      if (soloMonto[i]) {
        const monto = montos[i]?.[0];
        const rotulo = rotulos[inicio] ?? 'ninguno';
        if (monto) asociados.set(inicio, { rotulo, monto });
      }
      continue;
    }

    // 3. La racha de montos puede empezar un par de renglones después (un
    // "M.N." suelto o basura en medio), pero no más lejos.
    let j = i;
    while (j < lineas.length && j < i + 3 && !soloMonto[j]) j += 1;
    const inicioMontos = j;
    while (j < lineas.length && soloMonto[j]) j += 1;
    // Solo con rachas del mismo largo: si hay más montos que rótulos no hay
    // forma de saber cuál va con cuál, y adivinar es justo lo que no se hace.
    if (j - inicioMontos === racha) {
      for (let k = 0; k < racha; k += 1) {
        const monto = montos[inicioMontos + k]?.[0];
        const rotulo = rotulos[inicio + k] ?? 'ninguno';
        if (monto) asociados.set(inicio + k, { rotulo, monto });
      }
    }
  }

  return asociados;
}

const PESO: Readonly<Record<Rotulo, number>> = {
  fuerte: 3,
  total: 2,
  debil: 1,
  excluido: 0,
  ninguno: 0,
};

const PAGADO = busca('EFECTIVO', 'PAGO CON', 'PAGA CON', 'RECIBIDO', 'SU PAGO');
const CAMBIO = busca('CAMBIO');

/** EFECTIVO − CAMBIO, cuando el ticket trae los dos. */
function pagadoMenosCambio(
  lineas: readonly string[],
  asociados: ReadonlyMap<number, Asociado>,
): number | null {
  let pagado: number | null = null;
  let cambio: number | null = null;
  for (const [i, { monto }] of asociados) {
    const p = repararPalabras(plano(lineas[i] ?? ''));
    if (CAMBIO.test(p)) cambio = monto.cents;
    else if (PAGADO.test(p)) pagado = monto.cents;
  }
  if (pagado === null || cambio === null) return null;
  const total = pagado - cambio;
  return total > 0 ? total : null;
}

/**
 * El total del recibo, o null.
 *
 * Primero, el monto del rótulo más fuerte; si hay varios igual de fuertes, el
 * último, porque los parciales van antes que el final. Un rótulo débil
 * ("IMPORTE") solo cuenta si trae formato de dinero y es el único débil: en
 * muchos tickets "IMPORTE" es la columna del precio de cada renglón.
 *
 * Si no hay rótulo, la aritmética del propio ticket: lo que se pagó menos el
 * cambio. Y como último recurso, el único monto con formato de todo el
 * recibo — pero solo si es el único. Con dos o más, elegir el mayor es
 * exactamente cómo un parser termina registrando el EFECTIVO.
 */
function leerTotal(lineas: readonly string[]): number | null {
  const asociados = asociar(lineas);

  const candidatos = [...asociados]
    .map(([indice, { rotulo, monto }]) => ({ indice, monto, peso: PESO[rotulo] }))
    .filter((c) => c.peso > PESO.debil || (c.peso === PESO.debil && c.monto.conFormato));

  if (candidatos.length > 0) {
    const maximo = Math.max(...candidatos.map((c) => c.peso));
    const mejores = candidatos.filter((c) => c.peso === maximo);
    if (maximo > PESO.debil || mejores.length === 1) {
      const ultimo = mejores.reduce((a, b) => (b.indice > a.indice ? b : a));
      return ultimo.monto.cents;
    }
  }

  const porAritmetica = pagadoMenosCambio(lineas, asociados);
  if (porAritmetica !== null) return porAritmetica;

  const distintos = new Set(
    lineas
      .filter((l) => rotuloDe(l) === 'ninguno')
      .flatMap((l) => montosDe(l).filter((m) => m.conFormato).map((m) => m.cents)),
  );
  return distintos.size === 1 ? ([...distintos][0] ?? null) : null;
}

// ================================================================ fecha

const MESES: Readonly<Record<string, number>> = {
  ENE: 1, ENERO: 1, JAN: 1,
  FEB: 2, FEBRERO: 2,
  MAR: 3, MARZO: 3,
  ABR: 4, ABRIL: 4, APR: 4,
  MAY: 5, MAYO: 5,
  JUN: 6, JUNIO: 6,
  JUL: 7, JULIO: 7,
  AGO: 8, AGOSTO: 8, AUG: 8,
  SEP: 9, SEPT: 9, SEPTIEMBRE: 9, SETIEMBRE: 9,
  OCT: 10, OCTUBRE: 10,
  NOV: 11, NOVIEMBRE: 11,
  DIC: 12, DICIEMBRE: 12, DEC: 12,
};

/** Fechas que aparecen en un ticket y no son la de la compra. */
const NO_ES_FECHA_DE_COMPRA = busca(
  'CADUCIDAD',
  'CAD',
  'VENCE',
  'VENCIMIENTO',
  'VIGENCIA',
  'VIG',
  'VALIDO',
  'VALIDA',
  'HASTA',
  'CORTE',
  'LIMITE',
  'EXP',
  'EXPIRA',
  'PROMO',
  'PROMOCION',
  'CANJE',
  'CONSUMIR',
  'NACIMIENTO',
);

const ROTULO_FECHA = busca('FECHA', 'FEC', 'EMISION', 'EXPEDICION');

function fechaIso(anio: number, mes: number, dia: number): string | null {
  const a = anio < 100 ? 2000 + anio : anio;
  const iso = `${String(a).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  return esFechaDelCalendario(iso) ? iso : null;
}

/** Todas las fechas legibles de un renglón, en el orden en que aparecen. */
function fechasDe(linea: string): string[] {
  const p = repararNumeros(plano(linea));
  const fechas: string[] = [];
  const agregar = (f: string | null) => {
    if (f !== null) fechas.push(f);
  };

  // 2026-09-23 o 2026/09/23: año primero.
  for (const m of p.matchAll(/(?:^|\D)(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})(?!\d)/g)) {
    agregar(fechaIso(Number(m[1]), Number(m[2]), Number(m[3])));
  }
  // 23/09/2026, 23-09-26, 23.09.2026: día primero, como se escribe en México.
  for (const m of p.matchAll(/(?:^|\D)(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?!\d)/g)) {
    agregar(fechaIso(Number(m[3]), Number(m[2]), Number(m[1])));
  }
  // 23/SEP/2026, 23-SEP-26, 23 SEP 2026, 23 DE SEPTIEMBRE DE 2026.
  for (const m of p.matchAll(
    /(?:^|\D)(\d{1,2})\s?(?:[/.-]|\s|DE\s)\s?([A-Z]{3,10})\.?\s?(?:[/.-]|\s|DE\s|,)\s?(\d{4}|\d{2})(?!\d)/g,
  )) {
    const mes = MESES[m[2] ?? ''];
    if (mes !== undefined) agregar(fechaIso(Number(m[3]), mes, Number(m[1])));
  }
  // SEP 23 2026, SEP 23, 2026.
  for (const m of p.matchAll(/(?:^|[^A-Z])([A-Z]{3,10})\.?\s(\d{1,2}),?\s(\d{4})(?!\d)/g)) {
    const mes = MESES[m[1] ?? ''];
    if (mes !== undefined) agregar(fechaIso(Number(m[3]), mes, Number(m[2])));
  }
  return fechas;
}

/**
 * La fecha de la compra.
 *
 * Se descartan las de renglones de caducidad o vigencia y las futuras —una
 * compra no pasó mañana—. De las que quedan gana la que va junto a un rótulo
 * de fecha o a una hora; si ninguna, la primera del ticket, que es donde van
 * la fecha y la hora de la venta.
 */
function leerFecha(lineas: readonly string[], hoy: string): string | null {
  const opciones: { fecha: string; rotulada: boolean }[] = [];
  lineas.forEach((linea, i) => {
    const p = plano(linea);
    if (NO_ES_FECHA_DE_COMPRA.test(p)) return;
    // El rotulo de arriba cuenta solo si no trae fecha propia: "FECHA" sola en
    // un renglon y el valor en el siguiente. Si el de arriba ya tiene la suya,
    // el rotulo es de ella, no de esta.
    const anterior = lineas[i - 1] ?? '';
    const rotuloArriba = ROTULO_FECHA.test(plano(anterior)) && fechasDe(anterior).length === 0;
    const rotulada = ROTULO_FECHA.test(p) || /\d{1,2}:\d{2}/.test(p) || rotuloArriba;
    for (const fecha of fechasDe(linea)) {
      if (fecha <= hoy) opciones.push({ fecha, rotulada });
    }
  });
  return (opciones.find((o) => o.rotulada) ?? opciones[0])?.fecha ?? null;
}

// ================================================================ comercio

/**
 * Cadenas conocidas, de la más específica a la más general: "OXXO GAS" antes
 * que "OXXO". El valor es el nombre como lo reconoce un usuario, no la razón
 * social. Las que podrían aparecer en una dirección o en otro rótulo ("NETO"
 * de "TOTAL NETO", "SAN PABLO" de una colonia) solo cuentan con su nombre
 * completo.
 */
const CADENAS: readonly (readonly [RegExp, string])[] = [
  [busca('OXXO GAS'), 'Oxxo Gas'],
  [busca('OXXO'), 'OXXO'],
  [/(?:^|[^A-Z0-9])(?:7\s?-?\s?ELEVEN|SEVEN\s?-?\s?ELEVEN)/, '7-Eleven'],
  [busca('CIRCLE K'), 'Circle K'],
  [busca('BODEGA AURRERA', 'AURRERA'), 'Bodega Aurrerá'],
  [/(?:^|[^A-Z0-9])WAL\s?-?\s?MART/, 'Walmart'],
  [busca('SORIANA'), 'Soriana'],
  [busca('CHEDRAUI'), 'Chedraui'],
  [busca('LA COMER', 'CITY MARKET', 'FRESKO'), 'La Comer'],
  [/(?:^|[^A-Z0-9])H\s?-?\s?E\s?-?\s?B(?![A-Z])/, 'HEB'],
  [busca('COSTCO'), 'Costco'],
  [/(?:^|[^A-Z0-9])SAM'?S\s?CLUB/, "Sam's Club"],
  [busca('HOME DEPOT'), 'Home Depot'],
  [busca('LIVERPOOL'), 'Liverpool'],
  [busca('COPPEL'), 'Coppel'],
  [busca('SUBURBIA'), 'Suburbia'],
  [busca('SEARS'), 'Sears'],
  [busca('SANBORNS'), 'Sanborns'],
  [busca('STARBUCKS'), 'Starbucks'],
  [busca('FARMACIAS GUADALAJARA', 'FARMACIA GUADALAJARA'), 'Farmacias Guadalajara'],
  [busca('FARMACIAS DEL AHORRO', 'FARMACIA DEL AHORRO'), 'Farmacias del Ahorro'],
  [busca('FARMACIAS SIMILARES', 'SIMILARES', 'DR SIMI', 'DR. SIMI'), 'Farmacias Similares'],
  [busca('FARMACIAS BENAVIDES', 'FARMACIA BENAVIDES'), 'Farmacias Benavides'],
  [busca('FARMACIA SAN PABLO', 'FARMACIAS SAN PABLO'), 'Farmacia San Pablo'],
  [busca('PEMEX'), 'Pemex'],
  [busca('SHELL'), 'Shell'],
  [busca('MOBIL'), 'Mobil'],
  [busca('G500'), 'G500'],
  [/(?:^|[^A-Z0-9])BP(?![A-Z])/, 'BP'],
  [busca('OFFICE DEPOT'), 'Office Depot'],
  [busca('OFFICEMAX', 'OFFICE MAX'), 'OfficeMax'],
  [busca('ELEKTRA'), 'Elektra'],
  [busca('TIENDAS 3B', 'TIENDA 3B'), 'Tiendas 3B'],
  [busca('TIENDAS NETO', 'TIENDA NETO'), 'Tiendas Neto'],
  [busca('VIPS'), 'Vips'],
  [busca('TOKS'), 'Toks'],
  [busca('MCDONALDS', "MCDONALD'S"), "McDonald's"],
  [busca('BURGER KING'), 'Burger King'],
  [busca('DOMINOS', "DOMINO'S"), "Domino's"],
  [busca('LITTLE CAESARS'), 'Little Caesars'],
  [busca('CINEPOLIS'), 'Cinépolis'],
  [busca('CINEMEX'), 'Cinemex'],
  [busca('WALDOS'), "Waldo's"],
];

/** Renglones de encabezado que nunca son el nombre del negocio. */
const NO_ES_NOMBRE = busca(
  'TICKET',
  'FACTURA',
  'CFDI',
  'COMPROBANTE',
  'RECIBO',
  'NOTA DE VENTA',
  'SUCURSAL',
  'SUC',
  'CALLE',
  'AV',
  'AVENIDA',
  'BLVD',
  'COL',
  'COLONIA',
  'MUNICIPIO',
  'C.P',
  'CP',
  'TEL',
  'RFC',
  'REGIMEN',
  'BIENVENIDO',
  'BIENVENIDOS',
  'GRACIAS',
  'FECHA',
  'HORA',
  'CAJA',
  'CAJERO',
  'FOLIO',
  'RECEPTOR',
  'LUGAR DE EXPEDICION',
  'ORIGINAL',
  'COPIA',
);

/** La razón social al final del nombre: "S.A. DE C.V.", "S DE RL DE CV", "SAPI DE CV". */
const RAZON_SOCIAL =
  /(?:^|[\s,])+(?:S\.?\s?A\.?(?:\s?P\.?\s?I\.?)?(?:\s?DE\s?C\.?\s?V\.?)?|S\.?\s?DE\s?R\.?\s?L\.?(?:\s?DE\s?C\.?\s?V\.?)?|S\.?\s?C\.?)\s*$/;

const RFC = /[A-Z&]{3,4}\d{6}[A-Z0-9]{3}/;

function titulo(texto: string): string {
  return texto
    .toLowerCase()
    .split(' ')
    .map((palabra) => (palabra ? palabra.charAt(0).toUpperCase() + palabra.slice(1) : palabra))
    .join(' ');
}

/**
 * El nombre del negocio: una cadena conocida en cualquier parte del ticket, o
 * si no, el primer renglón del encabezado que parezca un nombre — letras en
 * su mayoría, sin RFC, sin dirección, sin teléfono.
 */
function leerComercio(lineas: readonly string[]): string | null {
  const planas = lineas.map((l) => repararPalabras(plano(l)));
  for (const [patron, nombre] of CADENAS) {
    if (planas.some((l) => patron.test(l))) return nombre;
  }

  for (const linea of lineas.slice(0, 6)) {
    const sinEmisor = linea.replace(/^\s*EMISOR\s*:?\s*/i, '').trim();
    const p = plano(sinEmisor);
    if (NO_ES_NOMBRE.test(p) || RFC.test(p.replace(/[\s-]/g, ''))) continue;
    const letras = (p.match(/[A-Z]/g) ?? []).length;
    const digitos = (p.match(/\d/g) ?? []).length;
    if (letras < 3 || digitos * 3 > letras) continue;
    const largo = p.replace(RAZON_SOCIAL, '').trim().length;
    if (largo < 3) continue;
    // `plano` conserva el largo de la cadena (quita la marca del acento, no la
    // letra), así que el corte cae en el mismo lugar del original.
    return titulo(sinEmisor.slice(0, largo).trim());
  }
  return null;
}

// ================================================================ entrada

/**
 * @param lineas Renglones del OCR, de arriba hacia abajo (ver `aLineas`).
 * @param hoy    `YYYY-MM-DD` del dispositivo. Una fecha posterior no puede
 *               ser la de la compra y se descarta.
 */
export function leerRecibo(lineas: readonly string[], hoy: string): DatosDeRecibo {
  return {
    totalCents: leerTotal(lineas),
    fecha: leerFecha(lineas, hoy),
    comercio: leerComercio(lineas),
  };
}
