# Auditoría de Accesibilidad — Gastos

**Alcance:** las 5 pantallas de la app
**Referencia:** WCAG 2.2 nivel AA, Apple HIG, Material Design
**Última revisión:** 2026-09-05

---

## Resumen

| Criterio | Estado |
|---|---|
| Dynamic Type hasta 310% | Cumple |
| Contraste de texto ≥ 4.5:1 | Cumple |
| Área táctil ≥ 44×44 pt | Cumple |
| Etiquetas de accesibilidad | Cumple |
| Orden de foco lógico | Cumple |
| Operable sin depender del color | Cumple |
| Reducción de movimiento respetada | Cumple |

Hallazgos abiertos: **0 P1**, **0 P2**, **1 P3**.

---

## 1. Dynamic Type

Es el criterio que más defectos produjo (ver BUG-005) y el que más se descuida
en apps React Native, porque `allowFontScaling` viene activo por defecto y da la
falsa impresión de que el tema está resuelto: la fuente escala, pero los
contenedores con altura fija recortan el texto.

**Reglas adoptadas**

- Ningún contenedor de texto usa `height`. Se usa `minHeight` con `paddingVertical`.
- La tipografía deriva de `PixelRatio.getFontScale()` con tope en el monto, que
  es el elemento visual protagonista.
- `numberOfLines` solo se aplica a la nota del gasto, nunca al monto.
- Las filas de la lista crecen verticalmente; no hay scroll horizontal.

**Evidencia**

| Escala | Captura | Resultado |
|---|---|---|
| 100% | `assets/a11y/lista-100.png` | Línea base |
| 200% | `assets/a11y/lista-200.png` | Fila crece, sin recorte |
| 310% | `assets/a11y/lista-310.png` | Fila a dos líneas, monto completo |

> Las tres capturas lado a lado van en el README. Demuestran más que cualquier
> párrafo afirmando que la accesibilidad importa.

---

## 2. Contraste

| Elemento | Contraste | Mínimo AA | Resultado |
|---|---|---|---|
| Monto sobre fondo de tarjeta | 12.6:1 | 4.5:1 | Cumple |
| Nombre de categoría | 7.1:1 | 4.5:1 | Cumple |
| Texto secundario (fecha) | 4.8:1 | 4.5:1 | Cumple |
| Etiqueta del botón primario | 8.2:1 | 4.5:1 | Cumple |
| Indicador de estado `pending` | 5.3:1 | 3:1 | Cumple |

Verificado en tema claro y oscuro.

---

## 3. Independencia del color

El estado de sincronización no se comunica solo con color: `pending` lleva un
ícono de reloj y su etiqueta de accesibilidad correspondiente. Un usuario con
daltonismo distingue el estado igual que cualquier otro.

---

## 4. Áreas táctiles

| Control | Medida | Resultado |
|---|---|---|
| Botón flotante de agregar | 56×56 | Cumple |
| Fila de gasto | ancho × 64 mínimo | Cumple |
| Selector de categoría | 48×48 | Cumple |
| Botón de cerrar del modal | 44×44 | Cumple |

---

## 5. Lectores de pantalla

Probado con VoiceOver (iOS 18) y TalkBack (Android 14).

Cada fila se anuncia como una sola unidad, no como tres elementos sueltos:

> "Gasto. Doscientos cincuenta pesos. Comida. 15 de enero. Pendiente de sincronizar."

El botón de agregar se anuncia como "Agregar gasto, botón", no como "más".

---

## 6. Hallazgo abierto

**A11Y-001 — El resumen mensual no anuncia el cambio de periodo**
**Prioridad:** P3

Al deslizar entre meses, el lector de pantalla no anuncia el nuevo periodo. El
usuario debe navegar hasta el encabezado para saber en qué mes está.

*Corrección propuesta:* `AccessibilityInfo.announceForAccessibility` con la
etiqueta del mes al confirmarse el cambio.
