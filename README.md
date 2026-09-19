# Gastos

App de control de gastos personales para iOS y Android, construida como caso de
estudio de **desarrollo móvil y aseguramiento de calidad**.

[![CI](https://github.com/eduardo-mr1/control-de-gastos/actions/workflows/ci.yml/badge.svg)](https://github.com/eduardo-mr1/control-de-gastos/actions/workflows/ci.yml)
[![Cobertura](https://img.shields.io/badge/cobertura-98%25-brightgreen)](./coverage)
[![Tests](https://img.shields.io/badge/tests-171%20passing-brightgreen)](./src)
[![Expo](https://img.shields.io/badge/Expo-SDK%2057-000020)](https://expo.dev)

> **El repositorio es el producto.** La app es pequeña a propósito; lo que se
> demuestra aquí es cómo se decide, se prueba y se documenta un producto móvil.

---

## Demo

<!-- Reemplazar por el GIF real: 10 segundos, registro de un gasto y resumen -->
`assets/demo.gif`

| iOS | Android | Fuente al 310% |
|---|---|---|
| `assets/ios.png` | `assets/android.png` | `assets/a11y/lista-310.png` |

---

## Qué hace

Registrar gastos, clasificarlos, borrarlos, verlos agrupados por mes y sumar el
total del periodo. Funciona sin conexión y sincroniza al recuperar red.

**Deliberadamente fuera de alcance:** edición de gastos —se registra de nuevo y
se borra el anterior—, presupuestos, gastos recurrentes, multi-usuario,
integración bancaria, escaneo de tickets. El alcance cerrado es una decisión de
producto, no una limitación.

---

## Stack

| Capa | Elección | Motivo |
|---|---|---|
| Framework | Expo SDK 57 + React Native 0.81 | Un solo código para iOS y Android; EAS compila iOS sin necesidad de una Mac |
| Lenguaje | TypeScript en modo `strict` | Con `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes` |
| Navegación | Expo Router | Rutas por archivos, tipadas |
| Datos | TanStack Query | Cache, reintentos con backoff y estados de carga agregados |
| Estilos | StyleSheet de React Native | Cinco pantallas no justifican una capa de utilidades encima |
| Persistencia | MMKV | Escritura síncrona: la cola de sync sobrevive a un cierre forzado |
| Sincronización | RPC idempotente + cola local | Convergencia entre dispositivos con la misma lógica en cliente y servidor |
| Backend | Supabase | Auth y Postgres gestionados; el foco del proyecto es el cliente |
| E2E | Maestro | Flujos en YAML que corren en CI sin configuración frágil |

### Por qué Maestro y no Detox

Detox exige configuración nativa por plataforma y se rompe en cada actualización
de RN. Maestro describe cada flujo en unas líneas de YAML, corre contra el
binario ya compilado y graba video de la ejecución. Para un proyecto de este
tamaño, el costo de mantenimiento de Detox no se justifica.

---

## Las tres decisiones que sostienen el proyecto

### 1. El dinero se guarda en centavos enteros

`0.1 + 0.2 !== 0.3` en IEEE-754. Cualquier app de dinero que use `float` en su
dominio tiene totales incorrectos esperando a manifestarse.

Todo monto vive como entero de centavos y la conversión a texto ocurre solo en
los bordes (`parseAmount` / `formatMoney`). `assertCents` rechaza cualquier valor
no entero que intente entrar al dominio.

→ [`src/shared/lib/money.ts`](./src/shared/lib/money.ts) · [BUG-001](./docs/bug-log.md)

### 2. El periodo se calcula en hora local, no en UTC

Un gasto de las 23:50 del 31 de enero en Culiacán (UTC-7) es, en UTC, el 1 de
febrero. Agrupar por UTC lo saca del corte de enero.

`monthKeyOf` extrae año y mes de los componentes literales del ISO string sin
construir un `Date`. El offset explícito en `occurredAt` es obligatorio: una
fecha sin zona lanza error en vez de adivinar.

→ [`src/shared/lib/date.ts`](./src/shared/lib/date.ts) · [BUG-002](./docs/bug-log.md)

### 3. El id se genera en el cliente

Permite crear gastos sin conexión y hace idempotente cualquier reenvío. El doble
tap en "Guardar", el reintento tras un fallo de red y la reanudación de la cola
producen todos el mismo id, así que colapsan en un solo registro.

Deshabilitar el botón durante el envío atacaba el síntoma; el id de cliente
ataca la causa.

→ [`src/shared/lib/sync-engine.ts`](./src/shared/lib/sync-engine.ts) · [BUG-003](./docs/bug-log.md)

---

## Cómo funciona la sincronización

Es la parte con más superficie de error del proyecto, así que está construida
para que cada pieza sea verificable por separado.

**Escribir.** Un gasto nuevo recibe su UUID en el cliente y entra a dos sitios en
disco: la **cola** en MMKV (lo que falta enviar) y la **copia local** en SQLite
(lo que se lee). La escritura es síncrona, así que ambas están en disco antes de
que la pantalla se cierre: matar la app no pierde el gasto.

Son estructuras distintas a propósito. La cola se vacía cuando el servidor
confirma; usarla como fuente de lectura deja la lista vacía justo cuando la
sincronización funciona (BUG-012).

La copia local es una tabla `gastos` con una fila por gasto, no un blob JSON:
`gastos.db` se abre con cualquier cliente SQL y se consulta como una tabla
normal. El esquema se versiona con `user_version` y las migraciones se aplican
al abrir la app, cada una con su bump de versión en la misma transacción.

**Empujar.** Cada elemento de la cola viaja por `sync_expense`, una función de
Postgres que hace upsert con last-write-wins. Reenviar el mismo id no duplica y
una versión vieja no pisa una edición nueva. Un gasto que falla no bloquea la
cola: se reporta y los demás continúan.

**Traer.** `pull_changes` devuelve solo lo modificado desde el último cursor, no
la tabla completa.

**Reconciliar.** `reconcile()` fusiona local y remoto resolviendo cada colisión
con `resolveConflict()` — la **misma función** que usa la cola local. Cliente y
servidor implementan el mismo criterio, así que convergen al mismo resultado sin
importar el orden de llegada. Hay pruebas explícitas de idempotencia y de
independencia del orden.

**Elegir backend.** `features/gastos/api/index.ts` decide en tiempo de
ejecución: con credenciales de Supabase usa el remoto, sin ellas el de
memoria. La app abre y la suite corre sin backend, y las pantallas nunca
saben dónde viven los datos.

**Cerrar sesión.** Se intenta enviar lo pendiente, se limpia la copia local y
después se invalida el token. Row Level Security protege el servidor, pero la
copia local se lee antes de consultarlo: sin limpiarla, la siguiente cuenta en
ese dispositivo vería datos ajenos (BUG-013).

**Dónde vive cada cosa.** `store/syncQueue.ts` no importa MMKV y
`shared/lib/sync-engine.ts` no importa Supabase: ambos son lógica pura y se
prueban en Node sin mocks. Las dependencias nativas viven aisladas en
`shared/storage/deviceStorage.ts` y `shared/lib/supabase.ts`, y son de las
pocas piezas excluidas de la cobertura, verificadas en E2E — ver
[`docs/arquitectura/estructura-archivos.md`](./docs/arquitectura/estructura-archivos.md)
para el resto del criterio.

---

## Estrategia de QA

| Nivel | Herramienta | Alcance |
|---|---|---|
| Unitario | Jest + ts-jest | 171 pruebas, 98% de cobertura en `src/shared` y `src/features` |
| Integración | RNTL + MSW | Flujos de componente ↔ estado ↔ red |
| E2E | Maestro | 6 flujos en dispositivo, ejecutados en CI |
| Metacalidad | [Vigía](https://github.com/eduardo-mr1/vigia) | Verifica que las pruebas verifiquen algo, en cada PR |
| Accesibilidad | Manual + auditoría | Dynamic Type, contraste, VoiceOver / TalkBack |

La lógica de dominio se prueba de forma exhaustiva porque es donde vive el
riesgo. La UI se prueba a nivel de flujo, no de píxel.

**Documentación completa**

- [Plan de pruebas](./docs/test-plan.md) — estrategia, riesgos, criterios de entrada y salida
- [Casos de prueba](./docs/test-cases.md) — casos detallados con su automatización correspondiente
- [Bitácora de defectos](./docs/bug-log.md) — 14 defectos con causa raíz y prueba de regresión
- [Auditoría de accesibilidad](./docs/accessibility-audit.md) — evidencia de Dynamic Type y contraste
- [Backend](./supabase/README.md) — schema, Row Level Security y sync idempotente

---

## Defectos destacados

Catorce defectos encontrados, analizados y cerrados durante el desarrollo. Los
más ilustrativos:

| ID | Defecto | Causa raíz | Prueba de regresión |
|---|---|---|---|
| [BUG-002](./docs/bug-log.md) | El gasto de fin de mes cae en el periodo siguiente | Agrupación por mes UTC en vez de mes local | `date.test.ts` |
| [BUG-003](./docs/bug-log.md) | El doble tap crea dos gastos idénticos | Id asignado en el servidor: dos envíos, dos registros | `sync-engine.test.ts` + `.maestro/02-double-tap.yaml` |
| [BUG-004](./docs/bug-log.md) | Divergencia permanente con timestamps idénticos | Comparación estricta sin criterio de desempate | `sync-engine.test.ts` |
| [BUG-007](./docs/bug-log.md) | Botón flotante con dimensión fija | Corrección de BUG-005 no aplicada a controles | Regla de ESLint |
| [BUG-011](./docs/bug-log.md) | Prueba E2E que pasaba sin verificar nada | `assertNotVisible` sobre un elemento inexistente | Aserción sobre el total, no sobre el elemento |
| [BUG-012](./docs/bug-log.md) | La lista se vacía tras sincronizar | La cola de salida usada como almacén de lectura | `expenseCache.test.ts` |
| [BUG-013](./docs/bug-log.md) | Los gastos de un usuario visibles para el siguiente | La copia local sobrevivía al cierre de sesión | TC-027 |
| [BUG-014](./docs/bug-log.md) | La lista reporta un error genérico ante cualquier fallo | El repositorio propagaba el mensaje crudo de Postgres | `traducir.test.ts` |

BUG-002 es el más representativo: solo se manifiesta en la última hora del mes,
pasa desapercibido en pruebas casuales y corrompe todos los reportes mensuales.

[BUG-011](./docs/bug-log.md) es el más incómodo de todos: una prueba E2E que
estaba en verde sin comprobar nada, porque hacía `assertNotVisible` sobre un
identificador que la app nunca genera. Una aserción negativa sobre algo que no
puede existir pasa siempre. Daba confianza falsa justo sobre el defecto más
importante del proyecto — la duplicación por doble tap. Ahora la verificación se
hace sobre el total del mes: si el gasto se duplicara, el total sería `$199.98`
en lugar de `$99.99`.

Ese defecto dio origen a **[Vigía](https://github.com/eduardo-mr1/vigia)**, una
herramienta que detecta la clase completa de error en lugar de ese caso: cruza
los identificadores que el código puede producir contra los que esperan las
pruebas. Corre sobre este repositorio en cada Pull Request.

[BUG-007](./docs/bug-log.md) merece mención aparte porque no lo encontró una
persona: lo encontró la regla de ESLint escrita al cerrar BUG-005. El lint de
este proyecto no revisa formato —de eso se encarga Prettier— sino que convierte
cada decisión de dominio en un error de compilación: prohíbe `height` literal
(BUG-005), prohíbe `getUTCMonth` (BUG-002) y prohíbe `Math.round` fuera del
módulo de dinero (BUG-001). Arreglar un bug lo cierra una vez; convertirlo en
regla elimina la clase completa.

---

## Accesibilidad

Dos reglas aplicadas desde el primer commit, no añadidas al final:

**Dynamic Type.** Ningún contenedor de texto usa `height` fija; todos usan
`minHeight`, y una regla de lint impide lo contrario. La tipografía deriva de
`PixelRatio.getFontScale()`. El texto corrido escala sin límite; los montos y
las formas decorativas escalan con tope, porque sin él un total de 34pt ocupa
la pantalla entera al 300%. Las filas reflúyen con `flexWrap`: al ampliar la
fuente el monto baja a su propio renglón en vez de recortarse.

**Carga Verdadera.** Ninguna pantalla renderiza contenido parcial. Las consultas
de una pantalla se evalúan en conjunto con `GAsyncGate`, que muestra un único
estado de carga hasta que todas las promesas están cumplidas. Sin spinners en
cascada ni saltos de layout.

---

## Ejecutar el proyecto

```bash
npm install
cp .env.example .env   # agregar credenciales de Supabase
npm start              # abrir en Expo Go o en un development build
```

La bandera `--legacy-peer-deps` está fijada en `.npmrc`: Expo y las librerías
del ecosistema declaran rangos de React distintos entre sí, y la resolución
estricta bloquea la instalación sin que haya un problema real.

**Calidad**

```bash
npm run lint          # ESLint, cero advertencias permitidas
npm run typecheck     # tsc --noEmit
npm test              # suite unitaria
npm run test:coverage # con reporte de cobertura
npm run e2e           # Maestro (requiere emulador o dispositivo)
```

El CI corre lint, typecheck y cobertura en cada push. Los E2E se ejecutan a
mano desde la pestaña Actions: compilar la app y levantar un emulador toma
unos 30 minutos, y un job que falla en cada PR no informa nada.

---

## Arquitectura: Feature-First

El proyecto empezó como una bolsa plana de 14 módulos en `src/lib/` y se migró
a Feature-First en 5 fases, cada una mergeada por separado, sin romper los
141 tests originales en ningún punto intermedio. El plan completo, con
línea base medible y la comparación antes/después, está en
[`docs/arquitectura/`](./docs/arquitectura/).

Cinco reglas, con lint que las hace cumplir — no solo convención:

1. **Dependencia en un solo sentido.** `app/ → features/ → shared/ → types/`.
2. **Features aislados.** Un feature nunca importa la ruta interna de otro,
   solo su barrel.
3. **Un archivo, una responsabilidad.**
4. **Barrel por feature.** `api/` y `store/` nunca se filtran fuera.
5. **Los errores se traducen en la capa de datos.** La UI nunca ve un string
   crudo del backend — ver `Failure` en [Estrategia de QA](#estrategia-de-qa)
   y [BUG-014](./docs/bug-log.md).

El hallazgo más caro de la migración no fue arquitectónico: mover `money.ts` y
compañía fuera de `src/lib/` dejó `collectCoverageFrom` apuntando a una
carpeta casi vacía, y el umbral de cobertura (90%) se sostuvo dos fases
enteras por pura coincidencia aritmética sobre un solo archivo. `npm test`
nunca lo mostró porque no corre con `--coverage`; solo `npm run test:coverage`
—el que corre en CI— lo hace. El detalle completo está en el commit de la
Fase 3.

---

## Estructura

Feature-First: cada dominio vive bajo `src/features/`, con una única puerta de
salida (`index.ts`) y sin fugas de rutas internas entre features — el lint lo
hace cumplir, no la convención. El estándar completo, con las cinco reglas no
negociables, está en
[`docs/arquitectura/estructura-archivos.md`](./docs/arquitectura/estructura-archivos.md).

```
app/                          Rutas de Expo Router — cada una reexporta su feature
  _layout.tsx                 Providers, Query y AuthGate
  index.tsx / add.tsx         1 línea: reexport de gastos
  login.tsx                   1 línea: reexport de auth
src/
  features/
    gastos/
      api/                    Backend local/remoto + sincronización con Supabase
      components/             FilaGasto, TotalDelMes, ListaVacia, EsqueletoLista
      hooks/                  useGastos (Carga Verdadera), useCrearGasto
      screens/                ListaScreen, AgregarScreen
      store/                  Cola de sync (MMKV) + copia local (SQLite)
      index.ts                Barrel — única puerta de salida
    auth/
      api/                    signIn, signOut
      hooks/                  useSession
      screens/                LoginScreen
    categorias/
      api/                    Mismo patrón de despachador local/remoto que gastos
      hooks/                  useCategorias
  shared/
    ui/                       Design system: GTexto, GBoton, GCampo, GAsyncGate
    lib/                      money, date, mappers, sync-engine, supabase, environment
    errors/                   Failure tipado + traducción del error crudo del backend
    storage/                  Único punto de contacto con MMKV
    theme/                    Colores y tipografía escalable
  types/
    expense.ts                Modelo de dominio, compartido entre features y shared
    database.ts               Tipos de las tablas y funciones de Supabase
supabase/
  migrations/                 Schema, RLS y funciones de sincronización
docs/
  arquitectura/                Plan de la migración, norma de estructura, línea base
  test-plan.md, test-cases.md, bug-log.md, accessibility-audit.md
.maestro/                      Flujos E2E
.github/workflows/              Pipeline de CI
```

---

## Autor

**Eduardo Maytorena** — Product Owner y QA Manager
Culiacán, Sinaloa, México

## Licencia

MIT — ver [LICENSE](./LICENSE).
