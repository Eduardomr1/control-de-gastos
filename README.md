# Gastos

App de control de gastos personales para iOS y Android, construida como caso de
estudio de **desarrollo móvil y aseguramiento de calidad**.

[![CI](https://github.com/eduardo-mr1/control-de-gastos/actions/workflows/ci.yml/badge.svg)](https://github.com/eduardo-mr1/control-de-gastos/actions/workflows/ci.yml)
[![Cobertura](https://img.shields.io/badge/cobertura-99%25-brightgreen)](./coverage)
[![Tests](https://img.shields.io/badge/tests-125%20passing-brightgreen)](./src/lib)
[![Expo](https://img.shields.io/badge/Expo-SDK%2052-000020)](https://expo.dev)

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

Registrar gastos, clasificarlos, verlos agrupados por mes y sumar el total del
periodo. Funciona sin conexión y sincroniza al recuperar red.

**Deliberadamente fuera de alcance:** presupuestos, gastos recurrentes,
multi-usuario, integración bancaria, escaneo de tickets. El alcance cerrado es
una decisión de producto, no una limitación.

---

## Stack

| Capa | Elección | Motivo |
|---|---|---|
| Framework | Expo SDK 52 + React Native 0.76 | Un solo código para iOS y Android; EAS compila iOS sin necesidad de una Mac |
| Lenguaje | TypeScript en modo `strict` | Con `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes` |
| Navegación | Expo Router | Rutas por archivos, tipadas |
| Datos | TanStack Query | Cache, reintentos con backoff y estados de carga agregados |
| Estado local | Zustand | Sin boilerplate para el poco estado global que hay |
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

→ [`src/lib/money.ts`](./src/lib/money.ts) · [BUG-001](./docs/bug-log.md)

### 2. El periodo se calcula en hora local, no en UTC

Un gasto de las 23:50 del 31 de enero en Culiacán (UTC-7) es, en UTC, el 1 de
febrero. Agrupar por UTC lo saca del corte de enero.

`monthKeyOf` extrae año y mes de los componentes literales del ISO string sin
construir un `Date`. El offset explícito en `occurredAt` es obligatorio: una
fecha sin zona lanza error en vez de adivinar.

→ [`src/lib/date.ts`](./src/lib/date.ts) · [BUG-002](./docs/bug-log.md)

### 3. El id se genera en el cliente

Permite crear gastos sin conexión y hace idempotente cualquier reenvío. El doble
tap en "Guardar", el reintento tras un fallo de red y la reanudación de la cola
producen todos el mismo id, así que colapsan en un solo registro.

Deshabilitar el botón durante el envío atacaba el síntoma; el id de cliente
ataca la causa.

→ [`src/lib/sync.ts`](./src/lib/sync.ts) · [BUG-003](./docs/bug-log.md)

---

## Cómo funciona la sincronización

Es la parte con más superficie de error del proyecto, así que está construida
para que cada pieza sea verificable por separado.

**Escribir.** Un gasto nuevo recibe su UUID en el cliente y entra a una cola
persistida en MMKV. La escritura es síncrona, así que la cola ya está en disco
antes de que la pantalla se cierre: matar la app no pierde el gasto.

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

**Elegir backend.** `repository.ts` decide en tiempo de ejecución: con
credenciales de Supabase usa el remoto, sin ellas el de memoria. La app abre y
la suite corre sin backend, y las pantallas nunca saben dónde viven los datos.

**Dónde vive cada cosa.** `queue.ts` no importa MMKV y `sync.ts` no importa
Supabase: ambos son lógica pura y se prueban en Node sin mocks. Las dependencias
nativas viven aisladas en `storage.ts` y `supabase.ts`, y son las únicas piezas
excluidas de la cobertura, verificadas en E2E.

---

## Estrategia de QA

| Nivel | Herramienta | Alcance |
|---|---|---|
| Unitario | Jest + ts-jest | 125 pruebas, 98.6% de cobertura en `src/lib` |
| Integración | RNTL + MSW | Flujos de componente ↔ estado ↔ red |
| E2E | Maestro | 5 flujos en dispositivo, ejecutados en CI |
| Accesibilidad | Manual + auditoría | Dynamic Type, contraste, VoiceOver / TalkBack |

La lógica de dominio se prueba de forma exhaustiva porque es donde vive el
riesgo. La UI se prueba a nivel de flujo, no de píxel.

**Documentación completa**

- [Plan de pruebas](./docs/test-plan.md) — estrategia, riesgos, criterios de entrada y salida
- [Casos de prueba](./docs/test-cases.md) — casos detallados con su automatización correspondiente
- [Bitácora de defectos](./docs/bug-log.md) — 6 defectos con causa raíz y prueba de regresión
- [Auditoría de accesibilidad](./docs/accessibility-audit.md) — evidencia de Dynamic Type y contraste
- [Backend](./supabase/README.md) — schema, Row Level Security y sync idempotente

---

## Defectos destacados

Ocho defectos encontrados, analizados y cerrados durante el desarrollo. Los tres
más ilustrativos:

| ID | Defecto | Causa raíz | Prueba de regresión |
|---|---|---|---|
| [BUG-002](./docs/bug-log.md) | El gasto de fin de mes cae en el periodo siguiente | Agrupación por mes UTC en vez de mes local | `date.test.ts` |
| [BUG-003](./docs/bug-log.md) | El doble tap crea dos gastos idénticos | Id asignado en el servidor: dos envíos, dos registros | `sync.test.ts` + `.maestro/02-double-tap.yaml` |
| [BUG-004](./docs/bug-log.md) | Divergencia permanente con timestamps idénticos | Comparación estricta sin criterio de desempate | `sync.test.ts` |
| [BUG-007](./docs/bug-log.md) | Botón flotante con dimensión fija | Corrección de BUG-005 no aplicada a controles | Regla de ESLint |

BUG-002 es el más representativo: solo se manifiesta en la última hora del mes,
pasa desapercibido en pruebas casuales y corrompe todos los reportes mensuales.

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
`minHeight`. La tipografía deriva de `PixelRatio.getFontScale()`, con tope solo
en el monto para que no desplace al resto de la fila. Verificado al 100%, 200% y
310%.

**Carga Verdadera.** Ninguna pantalla renderiza contenido parcial. Las consultas
se agrupan con `useQueries` y se muestra un skeleton único hasta que todas las
promesas están cumplidas. Sin spinners en cascada ni saltos de layout.

---

## Ejecutar el proyecto

```bash
npm install
cp .env.example .env   # agregar credenciales de Supabase
npm start              # abrir en Expo Go o en un development build
```

**Calidad**

```bash
npm run lint          # ESLint, cero advertencias permitidas
npm run typecheck     # tsc --noEmit
npm test              # suite unitaria
npm run test:coverage # con reporte de cobertura
npm run e2e           # Maestro (requiere emulador o dispositivo)
```

---

## Estructura

```
app/                    Rutas de Expo Router
  _layout.tsx           Providers y configuración de Query
  index.tsx             Lista y resumen mensual
  add.tsx               Alta de gasto
src/
  lib/
    money.ts            Aritmética en centavos enteros
    date.ts             Periodos en hora local
    sync.ts             Resolución de conflictos, deduplicación y reconciliación
    queue.ts            Cola de sincronización (sin dependencias nativas)
    mappers.ts          Traducción dominio ↔ base de datos
    remote.ts           Push y pull contra Supabase
    storage.ts          Instancia real de MMKV
    supabase.ts         Cliente y envoltura tipada de rpc()
    typography.ts       Escalado de fuente accesible
    repository.ts       Despachador: elige backend segun credenciales
    repository.local.ts Backend en memoria, para desarrollo y pruebas
    repository.remote.ts Backend Supabase con escritura optimista
  types/
    expense.ts          Modelo de dominio
    database.ts         Tipos de las tablas y funciones
supabase/
  migrations/           Schema, RLS y funciones de sincronización
docs/                   Plan de pruebas, casos, bitácora, auditoría
.maestro/               Flujos E2E
.github/workflows/      Pipeline de CI
```

---

## Autor

**Eduardo Maytorena** — Product Owner y QA Manager
Culiacán, Sinaloa, México
