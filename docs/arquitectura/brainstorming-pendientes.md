# Brainstorming — Control de Gastos
## Qué le falta, qué quedó a medias, y qué mueve la aguja del portafolio

Fecha de revisión: estado del repo tras completar el plan Feature-First.

---

## 0. Lo que sí quedó bien

La migración se ejecutó completa. `src/lib/` desapareció, `src/features/{auth,categorias,gastos}` y `src/shared/{errors,lib,storage,theme,ui}` están en su lugar, los barrels existen, `Failure` está implementado con su tabla de traducción y sus pruebas, la basura de NativeWind se eliminó y los clones de EasyOrder ya no contaminan la carpeta. `ListaScreen` distingue los cuatro casos de error y hasta redirige a login cuando la sesión expira estando la lista en pantalla. Eso es más de lo que pedía el plan.

---

## 1. Hallazgo principal: el design system existe pero casi nadie lo usa

**Esto es lo que más urge y es lo que un revisor externo notaría primero.**

La Fase 1 creó `GTexto`, `GBoton`, `GCampo` y los tokens de `colores.ts` con una justificación explícita en el código: *"Nunca `fontSize` literal ni color fuera de la paleta: así el escalado de fuente y el tema quedan garantizados en un solo lugar en vez de por convención"*. La Fase 3 movió las pantallas sin adoptarlos.

Resultado: de seis archivos de UI, solo `LoginScreen` usa el design system. Los demás siguen con `Text` crudo y hex literales.

| Archivo | Usa tokens | Usa `GTexto`/`GBoton`/`GCampo` | Hex literales que quedaron |
|---|---|---|---|
| `LoginScreen.tsx` | Sí | Sí | — |
| `ListaScreen.tsx` | No | Solo `GAsyncGate` | `#FFFFFF`, `#0B0F14`, `#2563EB`, `#FEF3C7`, `#92400E` |
| `AgregarScreen.tsx` | No | No | `#FFFFFF`, `#0B0F14`, `#6B7280`, `#D1D5DB`, `#DC2626`, `#2563EB`, `#93C5FD`, `#fff` |
| `FilaGasto.tsx` | No | No | `#0B0F14`, `#374151`, `#B45309` |
| `TotalDelMes.tsx` | No | No | `#6B7280`, `#2563EB`, `#0B0F14` |
| `ListaVacia.tsx` | No | No | `#6B7280` |
| `EsqueletoLista.tsx` | No | No | `#FFFFFF`, `#E5E7EB` |

Dos consecuencias concretas, no teóricas:

**El FAB viola la regla de Dynamic Type que el propio proyecto declara.** En `ListaScreen`, el contenedor escala correctamente con `controlSize(56)`, pero el signo "+" de adentro es `fontSize: 28, lineHeight: 32` literal. Al ampliar la fuente del sistema, el círculo crece y el "+" no. Es exactamente la familia de BUG-005/BUG-007 y el `eslint` no lo cazó porque la regla prohíbe `height`, no `fontSize`.

**Hay dos grises casi iguales sin razón.** `FilaGasto` usa `#374151` para la categoría mientras `colores.textoSecundario` es `#6B7280`. Nadie decidió que fueran distintos; simplemente se quedó lo que había.

**Esto es material de portafolio en sí mismo.** El patrón "creamos el design system y luego migramos sin adoptarlo" es de los más comunes en equipos reales, y cazarlo con una regla de lint es justo lo que un QA Manager debería mostrar que sabe hacer. Sugiero registrarlo como **BUG-015** y cerrarlo con una regla de ESLint que prohíba literales de color hexadecimal fuera de `shared/theme/`.

---

## 2. Otra deuda del refactor: el tipo duplicado

`src/types/expense.ts` sigue existiendo y `FilaGasto.tsx` importa `Expense` de ahí, mientras `src/features/gastos/types.ts` también existe. El plan decía eliminar el primero. Hay dos fuentes de verdad para el mismo tipo: si alguien agrega un campo en uno, el otro no se entera.

---

## 3. Funcionalidad: la app registra gastos, pero no los *controla*

Aquí está el hueco de producto más grande. Ordenado por lo que más cambia la percepción de la app:

**Navegación entre meses.** `useGastos` calcula `currentMonth` y nunca cambia. No puedes ver septiembre estando en octubre. Toda la maquinaria de `monthKeyOf` y `groupByMonth` — que ya existe y está probada — sirve solo para un mes. Es la función que más valor desbloquea por menos código, y sin ella la app se siente incompleta a los 30 segundos de uso.

**Fecha del gasto.** `draftOccurredAt()` siempre devuelve *ahora*. No se puede registrar el café de ayer. El modelo, la base de datos y los mappers ya soportan `occurredAt` arbitrario; solo falta el selector en la UI.

**Nota del gasto.** `Expense.note` existe en el tipo, en la tabla SQLite, en el esquema de Supabase y en el validador de 280 caracteres. La pantalla de alta no lo captura. Es un campo muerto de punta a punta.

**Edición.** Solo hay alta y borrado. Equivocarte en el monto significa borrar y volver a capturar.

**Resumen por categoría.** Tienes categoría, color por categoría y totales en centavos. No hay ninguna vista que los cruce. Un desglose del mes por categoría es la pantalla que hace que la app se vea "de producto" en una captura.

**Presupuesto mensual.** Es lo que separa "registro de gastos" de "control de gastos". Un límite por mes y un indicador de cuánto llevas es poco código y cambia el nombre del producto.

Menores pero visibles: no hay deshacer tras eliminar (solo confirmación), no hay pull-to-refresh, la moneda está fija en `'MXN'`, y no hay búsqueda ni filtro.

---

## 4. QA: falta un piso entero de la pirámide

Este es el punto más delicado **precisamente porque el portafolio se vende como dev + QA**.

Hoy `jest.config.js` corre con `testEnvironment: 'node'` y `testMatch: ['**/*.test.ts']` — con extensión `.ts`, no `.tsx`. Eso significa que **ninguna pantalla ni componente tiene prueba unitaria**. Todo lo que está probado es dominio puro: dinero, fechas, sync, cola, traducción de errores. Excelente cobertura de esa capa, cero de la capa de presentación.

Las consecuencias se ven en este mismo repo: el hallazgo del §1 (el design system sin adoptar, el FAB que no escala) habría salido en una prueba de componente. Ninguna prueba lo detectó porque no hay pruebas de componentes.

`@testing-library/react-native` se removió en una limpieza de dependencias hace varias sesiones. Volverlo a meter, con tres o cuatro pruebas bien elegidas — que `GAsyncGate` no renderice hijos con una query pendiente, que `PantallaDeFallo` muestre copy distinto por tipo de `Failure`, que `FilaGasto` anuncie el badge de pendiente a accesibilidad — cierra el hueco sin convertirse en un proyecto.

**Los E2E existen pero no corren.** `.maestro/` tiene seis flujos y el job de CI está en `workflow_dispatch` manual, así que nunca se ejecuta en un PR. Están ahí para ser leídos, no para proteger. Vale la pena que corran al menos en un cron nocturno o en los PR que tocan `app/` y `src/features/*/screens/`.

**Falta la prueba negativa de las reglas de lint.** La Fase 5 pedía verificar que un import cruzado falla; conviene dejarlo como un test permanente (un archivo de fixture y una aserción sobre la salida de ESLint), no como una verificación manual que se hizo una vez.

---

## 5. Lo que hace que alguien *vea* la app sin compilarla

Esto es puro portafolio y hoy no existe:

**No hay APK descargable.** Cualquiera que entre al repo necesita Android Studio, el SDK, el JDK 17 y veinte minutos para ver la app. Un APK en GitHub Releases lo resuelve — o mejor, un build de EAS con link público.

**No hay capturas ni GIF en el README.** El README tiene 16 KB de texto bien escrito y cero imágenes. Las capturas de Dynamic Type al 100% y al 310% lado a lado son la prueba visual de todo el trabajo de accesibilidad que ya hiciste, y hoy solo existe como descripción.

**No hay badges.** Estado de CI, cobertura, licencia. Son tres líneas y comunican "esto está vivo y verificado" antes de leer nada.

**`app.json` está a medias.** No hay `icon` ni `splash`, y el `adaptiveIcon` solo define `backgroundColor` sin `foregroundImage`. La app se instala con el ícono genérico de Expo — lo primero que ve quien prueba el APK.

**Falta `expo-system-ui`.** El prebuild lo avisó explícitamente: sin ese paquete, `userInterfaceStyle` no se aplica de verdad en Android.

---

## 6. Qué haría primero

Si el criterio es "máximo impacto en el portafolio por unidad de esfuerzo":

**Primero**, cerrar §1 y §2 — la adopción del design system y el tipo duplicado. Es deuda del refactor que acabas de terminar, se cierra rápido, y deja el código coherente antes de meterle diseño encima. Además el BUG-015 es una buena historia.

**Segundo**, las pruebas de componentes del §4. Cierran el hueco de la pirámide y protegen todo lo que venga después, incluido el rediseño.

**Tercero**, navegación entre meses, fecha y nota. Tres funciones pequeñas que usan infraestructura que ya está construida y probada.

**Cuarto**, el APK y las capturas. Es lo que convierte el repo en algo que alguien puede *ver* en dos minutos.

El presupuesto mensual y el resumen por categoría son el siguiente escalón, ya como producto y no como deuda.

---

## Apéndice — Bugs candidatos a registrar

| Id | Síntoma | Causa raíz |
|---|---|---|
| BUG-015 | El design system creado en la Fase 1 no se adoptó al migrar las pantallas; hay 20+ hex literales fuera de `shared/theme/` | La migración movió archivos sin reescribir su contenido, y ninguna regla de lint protege la paleta |
| BUG-016 | El "+" del botón flotante no escala con el ajuste de fuente del sistema; el círculo crece y el signo no | `fontSize: 28` literal en `ListaScreen`; la regla de ESLint prohíbe `height` pero no `fontSize` |
| BUG-017 | Dos grises distintos (`#374151` y `#6B7280`) para el mismo rol semántico de texto secundario | Consecuencia de BUG-015 |
| BUG-018 | `Expense` está declarado en dos lugares (`src/types/expense.ts` y `src/features/gastos/types.ts`) | La Fase 4 no eliminó el archivo viejo como indicaba el plan |
