# Bitácora de Defectos — Gastos

Defectos encontrados durante el desarrollo de la app, con su análisis de causa
raíz y la prueba de regresión que impide que vuelvan.

> Este documento existe a propósito. Un proyecto sin bugs registrados no es un
> proyecto sin bugs: es un proyecto sin QA.

| ID | Título | Prioridad | Estado |
|---|---|---|---|
| BUG-001 | Total mensual con residuo de punto flotante | P1 | Cerrado |
| BUG-002 | Gasto de fin de mes cae en el periodo siguiente | P1 | Cerrado |
| BUG-003 | Doble tap crea dos gastos idénticos | P1 | Cerrado |
| BUG-004 | Divergencia permanente en conflictos con timestamp idéntico | P2 | Cerrado |
| BUG-005 | Monto cortado con Dynamic Type al 310% | P2 | Cerrado |
| BUG-006 | Resumen renderiza secciones en cascada | P3 | Cerrado |
| BUG-007 | Botón flotante con dimensión fija, detectado por lint | P3 | Cerrado |

---

## BUG-001 — Total mensual con residuo de punto flotante

**Prioridad:** P1 · **Estado:** Cerrado · **Encontrado en:** unitarias

**Descripción**
El total del resumen mensual mostraba `$0.30000000000000004` al sumar dos
gastos de `0.10` y `0.20`.

**Reproducción**
1. Registrar un gasto de `0.10`
2. Registrar un gasto de `0.20`
3. Abrir el resumen mensual

**Esperado:** `$0.30` — **Obtenido:** `$0.30000000000000004`

**Causa raíz**
Los montos se almacenaban como `number` en unidades de peso. La representación
IEEE-754 de doble precisión no puede expresar `0.1` ni `0.2` de forma exacta, y
el error se hace visible al sumar.

**Corrección**
Migración de todo el dominio a centavos enteros. `amountCents` es `number`
entero, la conversión ocurre solo en los bordes (`parseAmount` / `formatMoney`)
y `assertCents` rechaza cualquier valor no entero que entre al dominio.

**Regresión:** `src/lib/money.test.ts` → "suma 0.1 + 0.2 dando exactamente 0.3"

---

## BUG-002 — Gasto de fin de mes cae en el periodo siguiente

**Prioridad:** P1 · **Estado:** Cerrado · **Encontrado en:** exploratorias

**Descripción**
Un gasto registrado el 31 de enero a las 23:50 hora de Culiacán aparecía en el
resumen de febrero y desaparecía del de enero.

**Reproducción**
1. Poner el dispositivo en `America/Mazatlan` (UTC-7)
2. Registrar un gasto el 31 de enero a las 23:50
3. Abrir el resumen de enero

**Esperado:** el gasto aparece en enero — **Obtenido:** aparece en febrero

**Causa raíz**
La agrupación mensual usaba `new Date(occurredAt).getUTCMonth()`. Las 23:50 del
31 de enero en UTC-7 son las 06:50 del 1 de febrero en UTC, así que el gasto se
clasificaba en el mes equivocado. El defecto solo se manifiesta en la última y
la primera hora del mes, lo que lo hace fácil de pasar por alto.

**Corrección**
`monthKeyOf` extrae año y mes de los componentes literales del ISO string sin
construir un `Date`, preservando la hora local. Se volvió obligatorio el offset
explícito en `occurredAt`: una fecha sin offset ahora lanza `DateError` en vez
de adivinar la zona.

**Regresión:** `src/lib/date.test.ts` → "mantiene en enero un gasto de las 23:50
del 31 de enero en Culiacán"

---

## BUG-003 — Doble tap crea dos gastos idénticos

**Prioridad:** P1 · **Estado:** Cerrado · **Encontrado en:** E2E

**Descripción**
Presionar "Guardar" dos veces rápidamente creaba dos gastos con el mismo monto,
categoría y fecha.

**Reproducción**
1. Llenar el formulario de nuevo gasto
2. Presionar "Guardar" dos veces con menos de 300 ms entre taps

**Esperado:** un gasto — **Obtenido:** dos gastos

**Causa raíz**
El id se asignaba en el servidor. Cada envío era una petición independiente sin
forma de reconocerse entre sí. Deshabilitar el botón durante el envío atacaba el
síntoma pero no el reintento automático tras un fallo de red, que producía el
mismo duplicado.

**Corrección**
El id pasa a generarse en el cliente como UUID antes de encolar. La cola de
sincronización deduplica por id (`dedupeQueue`) y el servidor hace upsert, de
modo que cualquier reenvío es idempotente. El botón deshabilitado se conserva
como mejora de percepción, no como el mecanismo de corrección.

**Regresión:** `src/lib/sync.test.ts` → "colapsa dos envíos del mismo gasto en
uno solo" + `.maestro/double-tap.yaml`

---

## BUG-004 — Divergencia permanente en conflictos con timestamp idéntico

**Prioridad:** P2 · **Estado:** Cerrado · **Encontrado en:** unitarias

**Descripción**
Cuando dos dispositivos editaban el mismo gasto y ambas ediciones quedaban con
el mismo `updatedAt` al milisegundo, cada dispositivo conservaba su propia
versión indefinidamente.

**Causa raíz**
La comparación era `local.updatedAt > remote.updatedAt`. En el empate exacto la
condición es falsa en ambos dispositivos, y cada uno se quedaba con lo suyo. Sin
un criterio de desempate compartido, las réplicas nunca convergen.

**Corrección**
`resolveConflict` agrega un desempate determinista e idéntico en todos los
clientes, y devuelve `wasTie` para poder instrumentar con qué frecuencia ocurre.

**Regresión:** `src/lib/sync.test.ts` → "desempata de forma determinista cuando
los timestamps son idénticos"

---

## BUG-005 — Monto cortado con Dynamic Type al 310%

**Prioridad:** P2 · **Estado:** Cerrado · **Encontrado en:** auditoría de accesibilidad

**Descripción**
Con el tamaño de texto de iOS en el máximo accesible, el monto de cada gasto en
la lista se cortaba verticalmente y los centavos quedaban ilegibles.

**Reproducción**
1. Ajustes → Pantalla y brillo → Tamaño del texto al máximo
2. Abrir la lista de gastos

**Causa raíz**
Las filas usaban `height: 64` fija. Al escalar la fuente, el texto excedía el
contenedor y se recortaba en lugar de expandirlo.

**Corrección**
Sustitución de `height` por `minHeight` en todos los contenedores de texto y
tipografía derivada de `PixelRatio.getFontScale()` con un tope razonable para el
monto. Se agregó a la definición de terminado del proyecto: ningún contenedor de
texto lleva altura fija.

**Regresión:** `docs/accessibility-audit.md` (capturas al 100% y 310%)

---

## BUG-006 — Resumen renderiza secciones en cascada

**Prioridad:** P3 · **Estado:** Cerrado · **Encontrado en:** exploratorias con red lenta

**Descripción**
En 3G, el resumen mensual mostraba el encabezado, luego el total, luego las
categorías, cada uno con su propio spinner, provocando saltos de layout.

**Causa raíz**
Cada sección consumía su propio `useQuery` y renderizaba en cuanto resolvía.

**Corrección**
Las tres consultas se agrupan con `useQueries` y la pantalla muestra un skeleton
único hasta que el `isPending` agregado es falso. Aplicación del principio de
Carga Verdadera: nada se renderiza hasta que todas las promesas de datos están
cumplidas.

**Regresión:** TC-050 (manual, con red limitada)

---

## BUG-007 — Botón flotante con dimensión fija, detectado por lint

**Prioridad:** P3 · **Estado:** Cerrado · **Encontrado en:** regla de ESLint

**Descripción**
El botón flotante de agregar declaraba `width: 56, height: 56` literales. Con el
escalado de fuente al máximo, el resto de la interfaz crecía y el botón se
quedaba proporcionalmente pequeño, volviéndose difícil de acertar justo para el
usuario que más lo necesita.

**Cómo se encontró**
No lo encontró una persona: lo encontró la regla `no-restricted-syntax` escrita
tras cerrar BUG-005, que prohíbe `height` literal en cualquier componente. El
primer `npm run lint` del proyecto lo marcó.

**Causa raíz**
La corrección de BUG-005 se aplicó a los contenedores de texto, que era donde el
defecto se manifestaba, pero no a los controles. La regla de lint cubría un
alcance mayor que la corrección original y expuso el caso faltante.

**Corrección**
Se agregó `controlSize()` en `typography.ts`: escala el control con el ajuste de
fuente del sistema, con tope de 1.5x y piso de 44 pt para respetar el mínimo
táctil de Apple y Material.

**Aprendizaje**
Convertir una corrección en una regla de lint la extiende a código que aún no
existe. BUG-005 se corrigió una vez; la regla que dejó atrás sigue encontrando
casos. Es la diferencia entre arreglar un bug y eliminar una clase de bugs.

**Regresión:** `eslint.config.js` → regla `no-restricted-syntax` sobre `height`
