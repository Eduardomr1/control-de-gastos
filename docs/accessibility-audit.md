# Auditoría de Accesibilidad — Gastos

**Alcance:** las 5 pantallas de la app
**Referencia:** WCAG 2.2 nivel AA, Apple HIG, Material Design
**Última revisión:** 2026-09-19

---

## Resumen

| Criterio | Estado | Verificado en |
|---|---|---|
| Dynamic Type al 300% | Cumple | Android, lista (§1) |
| Contraste de texto ≥ 4.5:1 | Cumple | Cálculo sobre la paleta |
| Área táctil ≥ 44×44 pt | Cumple | Medición en código |
| Etiquetas de accesibilidad | Cumple | Revisión de código |
| Orden de foco lógico | Cumple | Revisión de código |
| Operable sin depender del color | Cumple | Revisión de código |
| Reducción de movimiento respetada | Cumple | Revisión de código |

Hallazgos abiertos: **0 P1**, **1 P2**, **3 P3**.

> **Sobre este documento.** Hasta el 2026-09-19 afirmaba "Dynamic Type hasta
> 310% · Cumple" y respaldaba esa afirmación con una tabla de capturas que
> nunca existieron (`assets/a11y/*.png`). Durante ese tiempo la app tenía tres
> defectos de escalado, uno de ellos P1, que la volvían inutilizable al 300%
> (BUG-017). La columna "Verificado en" existe desde entonces: una casilla
> marcada sin decir cómo se comprobó no vale más que una prueba que pasa sin
> verificar nada (BUG-011).

---

## 1. Dynamic Type

Es el criterio que más defectos ha producido de todo el proyecto: BUG-005,
BUG-007 y BUG-017, tres de ellos encadenados en el último.

Este documento ya advertía —desde antes de que BUG-017 existiera— que
`allowFontScaling` viene activo por defecto y "da la falsa impresión de que el
tema está resuelto". La advertencia era correcta y el código cayó igual: el
módulo de tipografía escalaba a mano **y** React Native volvía a escalar encima,
así que los topes quedaban anulados por una propiedad que nadie escribió.
Diagnosticar un riesgo no es lo mismo que cerrarlo.

**Reglas adoptadas**

- Ningún contenedor de texto usa `height`. Se usa `minHeight` con `paddingVertical`.
  Lo vigila una regla de ESLint (BUG-005).
- El escalado se aplica **una sola vez**: `typography` multiplica por
  `PixelRatio.getFontScale()`, y todo consumidor pasa `allowFontScaling={false}`
  para que el motor no lo repita. Lo garantizan `GTexto` y `GCampo`.
- Solo los montos de display llevan tope (total del encabezado y monto en
  captura): son los elementos más grandes y sin límite no caben en la pantalla.
  El texto corrido y el monto de fila escalan sin tope.
- Por encima de 1.5x, la fila de gasto se apila en columna. En horizontal el
  monto le roba a la categoría el ancho que necesita y React Native parte la
  palabra a la mitad.
- Las formas decorativas y los objetivos táctiles escalan con la fuente, con
  tope de 1.5x: quien amplía el texto también necesita blancos más grandes
  (BUG-007), pero un FAB de 192px no ayuda a nadie.
- `numberOfLines` solo se aplica a la nota del gasto, nunca al monto.
- Las filas crecen verticalmente; no hay scroll horizontal a ninguna escala.

**Qué se verificó y qué no**

| Pantalla | Escala | Plataforma | Resultado |
|---|---|---|---|
| Lista | 100% | Android (Pixel 8, API 35) | Línea base |
| Lista | 300% | Android (Pixel 8, API 35) | Apilada, sin cortes a media palabra, monto completo |
| Agregar | 300% | Android (Pixel 8, API 35) | Usable: se registró un gasto real a esa escala |
| Login, vacío, carga | 300% | — | **Sin verificar** |
| Todas | 300% | iOS | **Sin verificar** |

La verificación se hizo con `adb shell settings put system font_scale 3.0`,
cerrando y reabriendo la app: el escalado se lee al crear la actividad, no basta
con recargar el bundle.

Lo que se observó al 300% antes de la corrección, y que ninguna prueba
automatizada detectó: el total partido a media cifra (`$16` / `0.00`), la
versalita del encabezado fuera de pantalla, el conteo de gastos cortado contra
el borde inferior, y —tras corregir eso— la categoría partida en "Comid" / "a".

**Evidencia pendiente.** Las capturas del antes y el después existen pero aún no
están en el repositorio; `assets/` no existe todavía. Ver A11Y-003.

---

## 2. Contraste

| Elemento | Contraste | Mínimo AA | Resultado |
|---|---|---|---|
| Monto sobre fondo de tarjeta | 12.6:1 | 4.5:1 | Cumple |
| Nombre de categoría | 7.1:1 | 4.5:1 | Cumple |
| Texto secundario (fecha) | 4.8:1 | 4.5:1 | Cumple |
| Etiqueta del botón primario | 8.2:1 | 4.5:1 | Cumple |
| Indicador de estado `pending` | 5.3:1 | 3:1 | Cumple |

Verificado en tema claro. La app declara `userInterfaceStyle: "light"` de forma
deliberada: tiene una sola paleta, y anunciar soporte de tema oscuro sin
implementarlo produjo BUG-010 — texto negro sobre fondo oscuro, contraste de
1.2:1. Soportar tema oscuro es trabajo pendiente, no una casilla que se marca
en la configuración.

---

## 3. Independencia del color

El estado de sincronización no se comunica solo con color: `pending` lleva un
ícono de reloj y su etiqueta de accesibilidad correspondiente. Un usuario con
daltonismo distingue el estado igual que cualquier otro.

La categoría tampoco depende del color. El chip tintado es refuerzo visual, no
el portador del dato: el nombre va siempre en texto, y la etiqueta de
accesibilidad de la fila lo incluye. Sin esa regla, la paleta de categorías
sería la única forma de distinguirlas.

Desde BUG-016 el aviso de `pending` solo aparece con backend remoto. En modo
local no hay nada que sincronizar, y mostrarlo era comunicar un estado
inexistente — otra forma de información engañosa, aunque no sea de color.

---

## 4. Áreas táctiles

| Control | Medida a escala 1x | Escala con la fuente | Resultado |
|---|---|---|---|
| Botón flotante de agregar | 64×64 | Sí, tope 1.5x | Cumple |
| Fila de gasto | ancho × 64 mínimo | Sí, sin tope | Cumple |
| Selector de categoría | 48 mínimo | Sí, vía `minHeight` | Cumple |
| Botón Cancelar del modal | 44 mínimo | Sí, vía `minHeight` | Cumple |
| Botón Salir del encabezado | 44×44 | Sí, vía `minHeight` | Cumple |

Ningún control usa dimensión fija: todos pasan por `controlSize()` o por
`minHeight`, que garantizan el mínimo de 44pt de Apple y Material aunque el
usuario **reduzca** el tamaño de texto por debajo del 100%.

---

## 5. Lectores de pantalla

Probado con VoiceOver (iOS 18) y TalkBack (Android 14).

Cada fila se anuncia como una sola unidad, no como cuatro elementos sueltos.
La etiqueta se compone en `FilaGasto` y hoy produce:

> "Gasto. $250.00. Comida. 15 ene. Pendiente de sincronizar."

El botón de agregar se anuncia como "Agregar gasto, botón", no como "más". El
chip de color va marcado `accessible={false}`: es decorativo y anunciarlo
duplicaría la categoría que ya viene en la etiqueta.

Ver A11Y-004 sobre la fecha abreviada.

---

## 6. Hallazgos abiertos

**A11Y-004 — La etiqueta de la fila hereda la fecha abreviada de la UI**
**Prioridad:** P3

La fila reutiliza `formatDayShort()` tanto para el texto visible como para la
etiqueta de accesibilidad, así que un lector de pantalla anuncia "15 ene" y
pronuncia la abreviatura, no "15 de enero". Abreviar es correcto para la vista
—el ancho es escaso— pero la etiqueta no tiene esa restricción.

*Corrección propuesta:* que la etiqueta use un formateador de fecha completo,
independiente del que compone el texto visible. Es el mismo principio que ya
aplica al chip de color: lo que se ve y lo que se anuncia son dos canales, no
uno reutilizado.

---

**A11Y-003 — La auditoría no tiene evidencia visual en el repositorio**
**Prioridad:** P2

`assets/` no existe. Este documento citaba tres capturas
(`assets/a11y/lista-{100,200,310}.png`) que nunca se crearon, y el README cita
otras cuatro en la misma situación. Durante ese tiempo la afirmación "Dynamic
Type hasta 310% · Cumple" no estuvo respaldada por nada, y convivió con tres
defectos de escalado sin que nadie lo notara.

Las capturas del 300% antes y después de BUG-017 ya se tomaron; falta
incorporarlas. El flujo `.maestro/05-dynamic-type.yaml` las genera solo, pero
Maestro no corre en este entorno de Windows.

*Corrección propuesta:* crear `assets/a11y/` con las capturas de lista y
agregar al 100% y al 300%, y enlazarlas desde la tabla de la §1. Mientras no
existan, la tabla declara "Sin verificar" en vez de marcar la casilla.

---

**A11Y-001 — El encabezado de sección no se distingue de una fila**
**Prioridad:** P3

Redactado de nuevo el 2026-09-19: describía un deslizamiento entre meses que la
app nunca tuvo. Desde que la lista agrupa por mes en un `SectionList`, el hueco
real es otro.

El encabezado de cada mes ("Septiembre de 2026") se anuncia como texto suelto,
sin rol de encabezado. Un usuario de lector de pantalla no puede saltar de mes
en mes ni distinguir el separador de una fila más.

*Corrección propuesta:* `accessibilityRole="header"` en `renderSectionHeader`,
que en TalkBack y VoiceOver habilita la navegación por encabezados.

---

**A11Y-002 — Sin soporte de tema oscuro**
**Prioridad:** P3

La app fija el tema claro. Un usuario con el sistema en oscuro recibe una
pantalla luminosa, lo que molesta de noche aunque sea legible.

*Corrección propuesta:* tokens de color por tema y `useColorScheme()`. Se
difiere a propósito: media paleta oscura es peor que ninguna (ver BUG-010).
