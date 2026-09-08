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
| BUG-008 | La migración falla: expresión generada no inmutable | P1 | Cerrado |
| BUG-009 | Render parcial silencioso por versiones desalineadas del SDK | P1 | Cerrado |
| BUG-010 | Pantallas ilegibles en tema oscuro por falta de paleta propia | P2 | Cerrado |
| BUG-011 | Flujos E2E apuntando a elementos que la app no tiene | P2 | Cerrado |
| BUG-012 | La lista se vacía tras la primera sincronización exitosa | P1 | Cerrado |
| BUG-013 | Los gastos quedan en el dispositivo al cerrar sesión | P1 | Cerrado |

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

---

## BUG-008 — La migración falla: expresión generada no inmutable

**Prioridad:** P1 · **Estado:** Cerrado · **Encontrado en:** primera aplicación del schema

**Descripción**
Aplicar `0001_initial.sql` en un proyecto nuevo abortaba con
`ERROR: 42P17: generation expression is not immutable`. La migración quedaba a
medias: las tablas creadas, la columna `month_key` no.

**Reproducción**
1. Proyecto de Supabase recién creado
2. Ejecutar `supabase/migrations/0001_initial.sql` completo

**Esperado:** "Success. No rows returned" — **Obtenido:** error 42P17

**Causa raíz**
La columna generada usaba
`to_char(occurred_at + make_interval(...), 'YYYY-MM')` sobre un `timestamptz`.
Esa variante de `to_char` es STABLE, no IMMUTABLE, porque su resultado depende
del parámetro `TimeZone` de la sesión. Postgres exige inmutabilidad en columnas
generadas: el valor se almacena en disco y debe ser reproducible con
independencia de quién ejecute la consulta.

**Corrección**
`occurred_at at time zone 'UTC'` convierte a `timestamp` sin zona antes del
cálculo. Sobre ese tipo, `to_char` sí es inmutable. El resultado es idéntico —
el desplazamiento sigue viniendo de `tz_offset_minutes` — pero ahora no depende
de la configuración de la sesión.

**Aprendizaje**
El mismo defecto que BUG-002, un nivel más abajo. En el cliente, agrupar por
mes tomaba la zona equivocada; en el servidor, tomaba la zona de quien
consultaba. La lección se repite: una fecha sin zona explícita siempre acaba
resolviéndose con la zona de alguien más.

**Regresión:** aplicar la migración en un proyecto limpio es parte de los
criterios de entrada del plan de pruebas.

---

## BUG-009 — Render parcial silencioso por versiones desalineadas del SDK

**Prioridad:** P1 · **Estado:** Cerrado · **Encontrado en:** prueba en dispositivo

**Descripción**
La pantalla de login mostraba únicamente el título. Los dos campos de texto y el
botón no aparecían. Sin pantalla roja, sin error en consola, sin advertencia: la
app simplemente renderizaba una fracción del árbol.

**Reproducción**
1. `package.json` declara `expo@57`
2. `node_modules` contiene `react@18`, `react-native@0.76` y `expo-router@4`
3. Abrir cualquier pantalla en Expo Go

**Esperado:** la pantalla completa — **Obtenido:** solo los componentes `Text`

**Causa raíz**
Dos fallos encadenados. Primero, el proyecto se alineó hacia abajo, a SDK 52,
para que coincidiera con lo instalado; pero Expo Go se distribuye solo con el
SDK más reciente, así que la app no era ejecutable en el dispositivo. Al subir
a SDK 57, `expo install --fix` actualizó `package.json` pero la instalación no
llegó a materializarse en `node_modules`, que quedó con las versiones viejas.

La combinación `expo@57` + `react-native@0.76` no lanza error: los componentes
nativos que cambiaron de interfaz entre versiones simplemente no montan. El
resultado es una pantalla a medias, que es peor que un fallo ruidoso, porque
parece un bug de layout propio y desvía la búsqueda.

**Corrección**
Reinstalación limpia con las versiones de SDK 57 y verificación explícita de lo
que quedó en disco, no de lo declarado:

```
node -e "console.log(require('react-native/package.json').version)"
```

**Aprendizaje**
`package.json` declara intenciones; `node_modules` es lo que corre. Cuando el
síntoma no tiene sentido, verificar lo segundo antes de sospechar del propio
código. Se perdió cerca de una hora buscando un error de estilos que no existía.

**Regresión:** el CI corre `npm ci`, que instala exactamente el lockfile y falla
en lugar de quedarse a medias.

---

## BUG-010 — Pantallas ilegibles en tema oscuro por falta de paleta propia

**Prioridad:** P2 · **Estado:** Cerrado · **Encontrado en:** prueba en dispositivo

**Descripción**
Con el tema oscuro del sistema activo, el texto de las pantallas quedaba negro
sobre fondo oscuro: contenido presente pero ilegible.

**Causa raíz**
`app.json` declaraba `userInterfaceStyle: "automatic"`, que permite al sistema
pintar fondos oscuros, mientras que ningún componente definía color de texto ni
de fondo. React Native no aporta una paleta por defecto que se adapte: sin color
explícito, el texto es negro pase lo que pase.

Es un defecto de accesibilidad, no cosmético: el contraste resultante es
aproximadamente 1.2:1, muy por debajo del mínimo AA de 4.5:1.

**Corrección**
Colores explícitos en las tres pantallas y `userInterfaceStyle: "light"` mientras
la app tenga una sola paleta. Declarar soporte de tema oscuro sin implementarlo
es peor que no declararlo.

**Aprendizaje**
Fue detectado en dispositivo, no en la auditoría de accesibilidad, porque esta
se hizo sobre capturas en tema claro. La auditoría ahora incluye ambos temas.

**Regresión:** `docs/accessibility-audit.md`, sección de contraste

---

## BUG-011 — Flujos E2E apuntando a elementos que la app no tiene

**Prioridad:** P2 · **Estado:** Cerrado · **Encontrado en:** revisión cruzada de identificadores

**Descripción**
Tres de los cinco flujos de Maestro referenciaban identificadores inexistentes:
`screen-detalle`, `tab-resumen` y `gasto-monto-9999-duplicado`. Ninguna de esas
pantallas ni elementos llegó a construirse.

**Cómo se encontró**
Contrastando los `testID` presentes en `app/*.tsx` contra los `id:` esperados por
`.maestro/*.yaml`. Es una comparación de dos listas que toma segundos y que nadie
hace hasta que la suite falla.

**Causa raíz**
Los flujos se escribieron a partir del plan de pruebas, que describe la app
completa, en lugar de la app construida. El plan contemplaba una pantalla de
detalle y navegación entre meses; el alcance se cerró antes de implementarlas y
los flujos no se ajustaron.

El caso más engañoso era `gasto-monto-9999-duplicado`: un identificador inventado
que la app nunca genera. `assertNotVisible` sobre algo que no puede existir pasa
siempre. La prueba habría estado en verde sin verificar nada — el peor resultado
posible, porque da confianza falsa sobre el defecto más importante del proyecto.

**Corrección**
Los tres flujos se reescribieron contra la interfaz real. La verificación del
doble tap ahora se hace sobre el **total del mes**: si el gasto se duplicara, el
total sería `$199.98` en lugar de `$99.99`. Es una aserción sobre datos, no sobre
la existencia de un elemento, y no puede pasar por vacuidad.

La verificación del corte de mes entre periodos contiguos se movió a
`date.test.ts`, que puede fijar ambas fechas sin depender del reloj del
dispositivo.

**Aprendizaje**
Una aserción negativa sobre un elemento inexistente es una prueba que siempre
pasa. Al escribir `assertNotVisible`, verificar primero que el elemento pueda
existir en algún estado; si no, la aserción no prueba nada.

Este defecto dio origen a **[Vigía](https://github.com/eduardo-mr1/vigia)**, una
herramienta que automatiza esa verificación: cruza los identificadores que el
código puede producir contra los que esperan las pruebas, y marca los que solo
existen en las pruebas. Corre sobre este repositorio en cada Pull Request.

**Regresión:** [Vigía](https://github.com/eduardo-mr1/vigia) en cada PR, más el
contraste manual de `testID` contra `id:` de Maestro antes de cada release

---

## BUG-012 — La lista se vacía tras la primera sincronización exitosa

**Prioridad:** P1 · **Estado:** Cerrado · **Encontrado en:** revisión de código

**Descripción**
Al abrir la app por segunda vez, con red disponible, la lista aparecía vacía
aunque hubiera gastos guardados en el servidor. Los gastos recién creados se
veían un momento y desaparecían en el siguiente refresco.

**Reproducción**
1. Registrar un gasto con red disponible
2. Esperar a que se sincronice
3. Volver a abrir la lista

**Esperado:** el gasto sigue visible — **Obtenido:** lista vacía

**Causa raíz**
`fetchExpenses` usaba la cola de sincronización como fuente de lectura. Pero la
cola guarda **lo que falta enviar**, y `acknowledge()` la vacía en cuanto el
servidor confirma. Después de un envío exitoso la cola queda vacía por diseño, y
con ella la lista.

El defecto quedaba oculto porque `pullChanges` devolvía los gastos del servidor
en la misma llamada, así que el primer refresco se veía bien. Solo a partir del
segundo, con el cursor ya avanzado, `pull_changes` devolvía cero filas —no había
cambios nuevos— y el resultado del merge era el conjunto vacío.

Es una confusión de responsabilidades: una cola de salida y un almacén de
lectura resuelven problemas distintos, y usar una como el otro funciona
exactamente hasta que la cola cumple su función.

**Corrección**
Se agregó `ExpenseCache`: una copia local de todos los gastos conocidos, con su
propia clave de almacenamiento. La cola sigue siendo solo de pendientes.
`fetchExpenses` lee de la copia, reconcilia contra el servidor y reescribe la
copia con el resultado. Sin red, la copia es lo que se muestra.

**Aprendizaje**
El defecto no lo habría encontrado ninguna prueba existente: la cola se
comportaba correctamente y la reconciliación también. El error estaba en la
composición de dos piezas sanas. Las pruebas unitarias verifican unidades; los
errores de integración necesitan una prueba que atraviese el ciclo completo,
o una lectura atenta del flujo.

**Regresión:** `queue.test.ts` → "conserva los gastos aunque la cola se vacíe
tras sincronizar"

---

## BUG-013 — Los gastos quedan en el dispositivo al cerrar sesión

**Prioridad:** P1 · **Estado:** Cerrado · **Encontrado en:** revisión de código

**Descripción**
Al cerrar sesión, la copia local de gastos y la cola de sincronización
permanecían en MMKV. La siguiente persona en entrar en ese dispositivo veía los
gastos de la cuenta anterior.

**Reproducción**
1. Entrar con el usuario A y registrar un gasto
2. Cerrar sesión
3. Entrar con el usuario B

**Esperado:** lista vacía para B — **Obtenido:** los gastos de A

**Causa raíz**
`signOut` solo invalidaba el token en Supabase. El almacenamiento local es
independiente de la sesión: nada lo vinculaba al usuario ni lo limpiaba al
salir.

El defecto no lo cubría Row Level Security, y ahí está lo interesante: RLS
protege el servidor, y una consulta con el token de B nunca devolvería filas de
A. Pero la copia local se lee **antes** de consultar, precisamente para poder
funcionar sin red. La protección del servidor no alcanza a los datos ya
descargados.

**Corrección**
`signOut` ahora intenta enviar lo pendiente, limpia la cola y la copia local, y
después cierra la sesión. Si no hay red, lo pendiente se pierde: es el precio de
no filtrar datos entre cuentas, y salir es una acción explícita del usuario.

**Aprendizaje**
Una app offline-first mantiene una copia de los datos fuera del alcance de las
políticas del servidor. Cada mecanismo de seguridad del backend necesita su
contraparte en el cliente, o protege solo la mitad del camino.

**Regresión:** TC-027 — aislamiento entre cuentas
