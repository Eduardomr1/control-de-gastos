# Plan de Implementación por Fases — Control de Gastos
## Migración a Feature-First (estándar NexGen) — Portafolio personal

---

## Ficha

| Campo | Valor |
|---|---|
| **Iniciativa** | Normalización arquitectónica Feature-First + errores tipados |
| **Producto** | Control de Gastos (proyecto personal de portafolio) |
| **Stack** | React Native 0.86.3 + Expo SDK 57, Expo Router 6, TypeScript strict, TanStack Query, Supabase, MMKV |
| **Repositorio** | `eduardo-mr1/control-de-gastos`, rama base `main` |
| **Prioridad** | P2 |
| **Objetivo** | Que el 100% del código de `src/` viva bajo Feature-First con fronteras verificadas por lint, y que ningún error de backend llegue crudo a la UI |
| **Inicio** | Lunes 14 de septiembre de 2026 |
| **Duración** | 13 días laborales |
| **Fin** | Jueves 1 de octubre de 2026 |

> **[SUPUESTO]** Miércoles 16 de septiembre (Independencia) se excluye del calendario como día no laborable.
> **[SUPUESTO]** Un solo desarrollador (tú), trabajando en fases seriales.

---

## 1. Estado actual

**Lo que existe hoy:**

```
gastos/
├── app/                      # expo-router: 4 rutas planas
│   ├── _layout.tsx           # QueryClientProvider + AuthGate
│   ├── index.tsx             # lista + total + borrado + logout  (231 líneas)
│   ├── add.tsx               # formulario de alta
│   └── login.tsx             # autenticación
├── src/
│   ├── components/           # VACÍA
│   ├── lib/                  # 13 módulos planos + 9 archivos de prueba
│   │   ├── auth.ts           money.ts      date.ts       sync.ts
│   │   ├── mappers.ts        queue.ts      storage.ts    remote.ts
│   │   ├── supabase.ts       typography.ts
│   │   └── repository.ts  repository.local.ts  repository.remote.ts
│   └── types/                # database.ts, expense.ts
├── docs/                     # test-plan, test-cases, bug-log (13 bugs), accessibility-audit
├── .maestro/                 # 6 flujos E2E
├── supabase/migrations/      # 0001_initial.sql
└── .github/workflows/        # ci.yml (quality + e2e manual), calidad-pruebas.yml (Vigía)
```

**Lo que está mal:**

| Síntoma | Evidencia | Regla violada |
|---|---|---|
| Estructura Layer-First disfrazada | `src/lib/` es una bolsa de 13 módulos sin frontera de feature | Regla 2 — Features aislados |
| Errores con prefijos quemados | `repository.remote.ts:17` → `` throw new Error(`No se pudieron cargar las categorías: ${error.message}`) `` | **Regla 5 — Errores se traducen en el repositorio** |
| La UI no distingue causas de fallo | `app/index.tsx:213` muestra "No se pudieron cargar los gastos" para *cualquier* error: tabla inexistente, RLS, sesión caída, red muerta | Regla 5 |
| Sin barrel ni puerta de salida | Las pantallas importan rutas internas (`@/lib/repository.remote`) directamente | Regla 4 — Barrel por feature |
| Un archivo, muchas responsabilidades | `app/index.tsx` tiene pantalla + skeleton + empty state + error state + fila | Regla 3 |
| Basura trackeada | `global.css`, `tailwind.config.js`, `nativewind-env.d.ts` — restos de NativeWind ya desinstalado | — |
| Working dir contaminado | Carpetas de otros repositorios sin trackear dentro de `gastos/` | — |
| Carpeta muerta | `src/components/` vacía | — |

**Documentación relacionada:** `docs/bug-log.md` (BUG-001 a BUG-013), `docs/test-plan.md`, `docs/test-cases.md` (TC-001 a TC-031).

---

## 2. Objetivo

Que todo el código de `src/` esté organizado Feature-First con fronteras verificadas automáticamente por lint, y que ningún mensaje crudo de Supabase llegue a la UI — reemplazado por `Failure` tipado con copy propio por caso.

---

## 3. Alcance

### Dentro
- Reestructuración completa de `src/` a Feature-First (variante React Native de la guía NexGen).
- Design system mínimo en `src/shared/ui/`.
- Sistema de errores tipados (`Failure`) con traducción en la capa de datos.
- Extracción de sub-componentes de `app/index.tsx` y `app/add.tsx`.
- Regla de lint que prohíbe imports cruzados entre features.
- Actualización de rutas en los 141 tests existentes.
- Limpieza de archivos muertos.

### Fuera (explícitamente NO se toca)
- El esquema de Supabase (`supabase/migrations/`) — no se modifica ninguna tabla, política ni función RPC.
- La lógica de dominio ya probada: `money.ts`, `date.ts`, `sync.ts` cambian de **ubicación**, no de **comportamiento**. Cero cambios a su cuerpo.
- El proyecto Vigía (`PortafolioProfesional/vigia/`).
- Rediseño visual. Los colores y tipografía actuales se mueven a tokens, no se rediseñan.
- Adopción de las 3 capas estrictas de Flutter (`data/domain/presentation` con `usecases`). Ver Decisión 1.

---

## 4. Restricciones

- **Técnicas:** los 141 tests deben seguir pasando al final de cada fase; sin dependencias nuevas de runtime; TypeScript en modo strict sin `any`; la app debe seguir compilando con `npx expo run:android`.
- **De producto:** el repositorio es material de portafolio — cada fase debe leerse bien en el historial de commits, con mensajes que expliquen el *por qué*.
- **De equipo:** un desarrollador, tiempo parcial.
- **Calendario:** SOLO DÍAS LABORALES. Inicio: 2026-09-14. Festivo excluido: 2026-09-16.

---

## 5. Criterios de aceptación

- **Dado** un feature cualquiera bajo `src/features/`, **cuando** intente importar de otro feature hermano, **entonces** `npm run lint` falla con error explícito.
- **Dado** que la tabla `expenses` no existe en Supabase, **cuando** la app carga la lista, **entonces** la pantalla muestra "Hay un problema con el servidor" y el detalle técnico queda en consola — nunca el string crudo de Postgres.
- **Dado** que el dispositivo está sin red, **cuando** la app carga la lista, **entonces** muestra los gastos locales y un aviso de "Sin conexión", no un estado de error.
- **Dado** el árbol final, **cuando** se ejecute `npm test`, **entonces** los 141 tests pasan y la cobertura no baja respecto a la línea base de la Fase 0.
- **Dado** cualquier archivo bajo `src/features/*/`, **cuando** se inspeccione, **entonces** ninguna pantalla importa `supabase` directamente: pasa siempre por el `api/` de su feature.

---

## 6. Estructura destino

Se aplica la variante **React Native** del estándar NexGen (la del App Comensal), no la de Flutter:

```
src/
├── features/
│   ├── gastos/
│   │   ├── api/
│   │   │   ├── expenses.remote.ts      # Supabase + cola offline
│   │   │   ├── expenses.local.ts       # backend en memoria (dev/test)
│   │   │   └── index.ts                # despachador según credenciales
│   │   ├── components/
│   │   │   ├── FilaGasto.tsx
│   │   │   ├── TotalDelMes.tsx
│   │   │   ├── ListaVacia.tsx
│   │   │   └── EsqueletoLista.tsx
│   │   ├── hooks/
│   │   │   ├── useGastos.ts            # useQueries + gating Carga Verdadera
│   │   │   └── useCrearGasto.ts
│   │   ├── screens/
│   │   │   ├── ListaScreen.tsx
│   │   │   └── AgregarScreen.tsx
│   │   ├── store/
│   │   │   ├── syncQueue.ts            # cola de salida persistente
│   │   │   └── expenseCache.ts         # copia local de lectura (BUG-012)
│   │   ├── types.ts
│   │   └── index.ts                    # barrel — única puerta de salida
│   ├── auth/
│   │   ├── api/auth.remote.ts
│   │   ├── hooks/useSession.ts
│   │   ├── screens/LoginScreen.tsx
│   │   ├── types.ts
│   │   └── index.ts
│   └── categorias/
│       ├── api/categorias.remote.ts
│       ├── hooks/useCategorias.ts
│       ├── types.ts
│       └── index.ts
├── shared/
│   ├── ui/
│   │   ├── GTexto.tsx
│   │   ├── GBoton.tsx
│   │   ├── GCampo.tsx
│   │   ├── GAsyncGate.tsx              # Carga Verdadera
│   │   └── index.ts
│   ├── lib/
│   │   ├── supabase.ts                 # api-client
│   │   ├── sync-engine.ts              # resolveConflict, dedupe, reconcile
│   │   ├── money.ts
│   │   ├── date.ts
│   │   └── mappers.ts
│   ├── errors/
│   │   ├── failures.ts                 # Failure tipado (dominio)
│   │   └── traducir.ts                 # Exception cruda → Failure
│   ├── storage/
│   │   └── deviceStorage.ts            # único punto que toca MMKV
│   ├── theme/
│   │   ├── colores.ts
│   │   └── tipografia.ts               # escalado Dynamic Type
│   └── hooks/
└── types/
    └── database.ts                     # tipos del esquema Supabase
```

`app/` se queda en la raíz (Expo Router lo exige) y sus archivos quedan reducidos a envoltorios de una línea que reexportan la screen del feature.

---

# FASES

---

## Fase 0 — Diagnóstico y línea base

**Objetivo de la fase:** Tener una medición reproducible del estado actual antes de mover un solo archivo.

**Entregable verificable:** `docs/arquitectura/baseline_2026-09-14.md` con conteo de tests, cobertura por módulo, inventario de imports cruzados y lista de archivos muertos.

**Archivos afectados**

| Ruta | Acción | Cambio |
|---|---|---|
| `docs/arquitectura/baseline_2026-09-14.md` | CREAR | Inventario y métricas de partida |
| `docs/arquitectura/estructura-archivos.md` | CREAR | El estándar destino (sección 6 de este plan), como norma del repo |
| `scripts/mapa-imports.mjs` | CREAR | Script que lista todo import entre módulos de `src/` y `app/` |
| `global.css` | ELIMINAR | Resto de NativeWind desinstalado |
| `tailwind.config.js` | ELIMINAR | Resto de NativeWind desinstalado |
| `nativewind-env.d.ts` | ELIMINAR | Resto de NativeWind desinstalado |
| `src/components/` | ELIMINAR | Carpeta vacía |
| `.gitignore` | MODIFICAR | Ignorar las carpetas ajenas que contaminan el working dir |

**Órdenes**

1. Crear rama: `git checkout -b refactor/feature-first`.
2. Mover las carpetas de otros repositorios fuera de la carpeta del proyecto. No pertenecen a este repo.
3. Ejecutar `npm test -- --coverage` y guardar la salida en `docs/arquitectura/baseline_raw.txt`.
4. Escribir `scripts/mapa-imports.mjs`: recorre `app/**/*.tsx` y `src/**/*.ts(x)`, extrae cada `import ... from '@/...'`, e imprime una tabla `origen | destino`.
5. Ejecutar `node scripts/mapa-imports.mjs > docs/arquitectura/mapa-imports-antes.txt`.
6. Eliminar `global.css`, `tailwind.config.js`, `nativewind-env.d.ts` y la carpeta vacía `src/components/`. Verificar que `babel.config.js` y `metro.config.js` no los referencien; si lo hacen, quitar la referencia.
7. Redactar `baseline_2026-09-14.md` con: número total de tests, porcentaje de cobertura global, cobertura por archivo, número de imports cruzados, y la lista de archivos de `src/lib/` con su tamaño en líneas.
8. Publicar `docs/arquitectura/estructura-archivos.md` con el árbol destino de la sección 6.
9. Ejecutar `npm run lint && npm run typecheck && npm test` — todo en verde.
10. Commit: `chore(arquitectura): linea base y limpieza previa a la migracion`.

**Criterio de salida (DoD):** El documento de línea base existe con cifras concretas, los tres archivos de NativeWind ya no están en el repo, y `npm test` pasa con el mismo número de tests que antes de la limpieza.

**Pruebas de QA:** Ejecutar `npx expo run:android` y confirmar que la app sigue compilando y abriendo tras la limpieza. Login + lista visible.

**Riesgo y rollback:** Riesgo bajo. El único riesgo real es que `babel.config.js` referencie el CSS eliminado y rompa el bundle. Rollback: `git checkout main` y borrar la rama.

**Estimación:** 1 día laboral — **Lun 14 sep**

---

## Fase 1 — Fundación: `shared/`

**Objetivo de la fase:** Que exista el núcleo transversal (tema, utilidades, cliente de API, design system) antes de mover cualquier feature.

**Entregable verificable:** Carpeta `src/shared/` poblada, con los tests de `money`, `date` y `sync` pasando desde su nueva ubicación, y tres componentes de UI con prueba propia.

**Archivos afectados**

| Ruta | Acción | Cambio |
|---|---|---|
| `src/shared/lib/money.ts` | CREAR | Movido íntegro desde `src/lib/money.ts`. Cero cambios al cuerpo |
| `src/shared/lib/date.ts` | CREAR | Movido íntegro desde `src/lib/date.ts` |
| `src/shared/lib/sync-engine.ts` | CREAR | Movido desde `src/lib/sync.ts` (resolveConflict, dedupeQueue, reconcile) |
| `src/shared/lib/mappers.ts` | CREAR | Movido desde `src/lib/mappers.ts` |
| `src/shared/lib/supabase.ts` | CREAR | Movido desde `src/lib/supabase.ts` |
| `src/shared/storage/deviceStorage.ts` | CREAR | La parte de `src/lib/storage.ts` que instancia MMKV. Único punto de contacto con el módulo nativo |
| `src/shared/theme/tipografia.ts` | CREAR | Movido desde `src/lib/typography.ts` |
| `src/shared/theme/colores.ts` | CREAR | Extrae los hex literales hoy esparcidos en `app/*.tsx`: `#FFFFFF`, `#0B0F14`, `#6B7280`, `#2563EB` |
| `src/shared/ui/GTexto.tsx` | CREAR | Texto con token de tipografía + color de tema. Sin `fontSize` literal |
| `src/shared/ui/GBoton.tsx` | CREAR | Pressable con `minHeight: 44`, estado `busy`, y máximo una acción por instancia |
| `src/shared/ui/GCampo.tsx` | CREAR | TextInput con estado de error y `placeholderTextColor` del tema |
| `src/shared/ui/GAsyncGate.tsx` | CREAR | Carga Verdadera: recibe N resultados de query, renderiza `children` solo cuando todos están listos |
| `src/shared/ui/index.ts` | CREAR | Barrel del design system |
| `src/lib/money.ts` y hermanos movidos | ELIMINAR | Tras mover, borrar el original |
| `src/lib/*.test.ts` correspondientes | MODIFICAR | Actualizar la ruta del `import` al nuevo destino |
| `tsconfig.json` | MODIFICAR | Confirmar que el alias `@/*` cubre `src/*` sin cambios |

**Órdenes**

1. Crear el árbol: `mkdir -p src/shared/{lib,ui,theme,storage,errors,hooks}`.
2. Mover con `git mv` (preserva historial): `money.ts`, `date.ts`, `mappers.ts`, `supabase.ts` a `src/shared/lib/`; `sync.ts` a `src/shared/lib/sync-engine.ts`; `typography.ts` a `src/shared/theme/tipografia.ts`.
3. Mover los archivos de prueba junto a su módulo: cada `*.test.ts` vive al lado del archivo que prueba.
4. Actualizar las rutas de import en todos los archivos afectados. Ejecutar `npm run typecheck` y corregir hasta cero errores.
5. Partir `src/lib/storage.ts`: la instancia de MMKV y el objeto `deviceStorage` van a `src/shared/storage/deviceStorage.ts`; las clases `SyncQueue` y `ExpenseCache` **se quedan** en `src/lib/` por ahora — se moverán al feature en la Fase 3.
6. Crear `src/shared/theme/colores.ts` exportando los cuatro tokens con nombre: `fondo`, `texto`, `textoSecundario`, `acento`.
7. Implementar `GTexto`, `GBoton`, `GCampo` consumiendo `tipografia.ts` y `colores.ts`. Ningún hex literal ni `fontSize` numérico dentro de estos componentes.
8. Implementar `GAsyncGate`: recibe `{ resultados: UseQueryResult[], cargando: ReactNode, error: (f: Failure) => ReactNode, children: ReactNode }`. Solo construye `children` cuando `resultados.every(r => r.isSuccess)`.
9. Escribir una prueba por componente de UI: que `GBoton` respete `minHeight: 44`, que `GTexto` escale con `tipografia`, que `GAsyncGate` no renderice `children` mientras haya un resultado pendiente.
10. Ejecutar `npm run lint && npm run typecheck && npm test`. Todo en verde.
11. Commit: `refactor(shared): nucleo transversal y design system minimo`.

**Criterio de salida (DoD):** `src/shared/` existe con los 13 archivos listados, los tests de `money`, `date` y `sync` pasan desde la nueva ruta sin haber cambiado su contenido, y la app sigue compilando.

**Pruebas de QA:** Correr la app en emulador. Login, lista y alta deben verse **idénticos** a antes — esta fase no debe producir ningún cambio visual.

**Riesgo y rollback:** Riesgo medio: mover archivos rompe imports en cadena. Mitigación: mover y arreglar módulo por módulo, corriendo `typecheck` tras cada uno. Rollback: `git revert` del commit único de la fase.

**Estimación:** 3 días laborales — **Mar 15, Jue 17, Vie 18 sep**

---

## Fase 2 — Errores tipados (`Failure`)

**Objetivo de la fase:** Que la UI nunca vea un string del backend y que pueda distinguir "sin red" de "servidor roto".

**Entregable verificable:** `src/shared/errors/failures.ts` con el tipo `Failure`, cero `throw new Error(\`...${error.message}\`)` en toda la base de código, y la pantalla de lista mostrando copy distinto según el caso.

**Archivos afectados**

| Ruta | Acción | Cambio |
|---|---|---|
| `src/shared/errors/failures.ts` | CREAR | Unión discriminada: `SinRed`, `SesionExpirada`, `ServidorNoDisponible`, `DatosInvalidos`, `Desconocido` |
| `src/shared/errors/traducir.ts` | CREAR | `traducirPostgrest(error)` y `traducirAuth(error)`: mapean el error crudo a `Failure`. Único lugar que conoce los códigos de Supabase |
| `src/shared/errors/index.ts` | CREAR | Barrel |
| `src/lib/repository.remote.ts` | MODIFICAR | Sustituir los `throw new Error` con prefijo quemado por `throw traducirPostgrest(error)` |
| `src/lib/auth.ts` | MODIFICAR | `traducirError()` local se elimina; se usa `traducirAuth()` de `shared/errors` |
| `src/lib/remote.ts` | MODIFICAR | Los fallos de `pushQueue`/`pullChanges` devuelven `Failure`, no `Error` genérico |
| `app/index.tsx` | MODIFICAR | `ErrorState` recibe el `Failure` y elige copy: sin red → aviso no bloqueante; servidor → mensaje de error |
| `app/login.tsx` | MODIFICAR | Consume `Failure` en vez de `e.message` |
| `src/shared/errors/traducir.test.ts` | CREAR | Un caso por código de Postgres relevante: `42P01` (tabla inexistente), `PGRST301` (JWT), fallo de red, error desconocido |
| `docs/bug-log.md` | MODIFICAR | Registrar BUG-014: "la lista reporta error genérico ante cualquier fallo, incluida la ausencia de esquema" |

**Órdenes**

1. Definir en `failures.ts` la unión discriminada con el campo `tipo` y un `detalleTecnico?: string` que **nunca** se renderiza, solo se loguea.
2. Implementar `traducirPostgrest`: mapear `error.code === '42P01'` y cualquier `5xx` a `ServidorNoDisponible`; `PGRST301` y `401` a `SesionExpirada`; `TypeError: Network request failed` a `SinRed`; el resto a `Desconocido`.
3. Implementar `traducirAuth`: `Invalid login credentials` → `DatosInvalidos`; `Email not confirmed` → `DatosInvalidos` con copy propio; fallo de red → `SinRed`.
4. Reemplazar en `repository.remote.ts:17` el throw con prefijo quemado por `throw traducirPostgrest(error)`. Repetir en cada `if (error)` del archivo.
5. En `app/index.tsx`, sustituir el `ErrorState` mudo: si el `Failure` es `SinRed`, renderizar la lista local con una franja de "Sin conexión — mostrando datos guardados"; si es `ServidorNoDisponible`, mensaje de servidor; si es `SesionExpirada`, redirigir a `/login`.
6. Escribir `traducir.test.ts` con un caso por rama. Mínimo 6 casos.
7. Registrar BUG-014 en `docs/bug-log.md` siguiendo el formato de los 13 anteriores: síntoma, causa raíz, corrección, prueba que lo cubre.
8. Agregar a `docs/test-cases.md` los casos TC-032 a TC-035 correspondientes.
9. Ejecutar `npm run lint && npm run typecheck && npm test`. Todo en verde.
10. Commit: `fix(errores): Failure tipado y traduccion en la capa de datos (BUG-014)`.

**Criterio de salida (DoD):** `grep -rn "error.message" src/ app/` devuelve coincidencias **únicamente** dentro de `src/shared/errors/`. Los cuatro escenarios de error producen cuatro pantallas distintas, verificado manualmente.

**Pruebas de QA:**
- Renombrar temporalmente la tabla `expenses` en Supabase (`alter table expenses rename to expenses_tmp`) → la app debe decir "problema con el servidor", no el error de Postgres. Revertir al terminar.
- Activar modo avión → la app muestra los gastos locales con franja de "Sin conexión".
- Credenciales incorrectas en login → "Correo o contraseña incorrectos".
- Borrar la sesión desde Supabase (Authentication → Users → Sign out) y refrescar → redirige a login.

**Riesgo y rollback:** Riesgo medio: tocar el manejo de errores puede tragarse fallos reales. Mitigación: `detalleTecnico` siempre va a `console.error`, nunca se pierde. Rollback: revertir el commit de la fase; ninguna otra fase depende todavía de `Failure`.

**Estimación:** 2 días laborales — **Lun 21, Mar 22 sep**

---

## Fase 3 — Feature `gastos`

**Objetivo de la fase:** Mover todo lo que pertenece al dominio de gastos dentro de `src/features/gastos/`, con barrel y sin fugas de rutas internas.

**Entregable verificable:** `src/features/gastos/index.ts` exportando la superficie pública del feature, y `app/index.tsx` + `app/add.tsx` reducidos a menos de 10 líneas cada uno.

**Archivos afectados**

| Ruta | Acción | Cambio |
|---|---|---|
| `src/features/gastos/api/expenses.remote.ts` | CREAR | Desde `src/lib/repository.remote.ts` |
| `src/features/gastos/api/expenses.local.ts` | CREAR | Desde `src/lib/repository.local.ts` |
| `src/features/gastos/api/index.ts` | CREAR | Desde `src/lib/repository.ts` (despachador local/remoto) |
| `src/features/gastos/api/sync.ts` | CREAR | Desde `src/lib/remote.ts` (pushQueue, pullChanges) |
| `src/features/gastos/store/syncQueue.ts` | CREAR | Clase `SyncQueue` desde `src/lib/queue.ts` |
| `src/features/gastos/store/expenseCache.ts` | CREAR | Clase `ExpenseCache` desde `src/lib/queue.ts` (BUG-012) |
| `src/features/gastos/screens/ListaScreen.tsx` | CREAR | Cuerpo de `app/index.tsx` |
| `src/features/gastos/screens/AgregarScreen.tsx` | CREAR | Cuerpo de `app/add.tsx` |
| `src/features/gastos/components/FilaGasto.tsx` | CREAR | Extraído de `app/index.tsx` |
| `src/features/gastos/components/TotalDelMes.tsx` | CREAR | Extraído de `app/index.tsx` |
| `src/features/gastos/components/ListaVacia.tsx` | CREAR | `EmptyState` extraído |
| `src/features/gastos/components/EsqueletoLista.tsx` | CREAR | `ScreenSkeleton` extraído |
| `src/features/gastos/hooks/useGastos.ts` | CREAR | El `useQueries` + gating, hoy inline en la pantalla |
| `src/features/gastos/hooks/useCrearGasto.ts` | CREAR | La mutación de alta |
| `src/features/gastos/types.ts` | CREAR | Desde `src/types/expense.ts` |
| `src/features/gastos/index.ts` | CREAR | Barrel: exporta screens y hooks. **No** exporta `api/` ni `store/` |
| `app/index.tsx` | MODIFICAR | Queda: `export { ListaScreen as default } from '@/features/gastos'` |
| `app/add.tsx` | MODIFICAR | Igual, con `AgregarScreen` |
| `src/lib/repository*.ts`, `queue.ts`, `remote.ts` | ELIMINAR | Ya movidos |

**Órdenes**

1. Crear el árbol del feature: `mkdir -p src/features/gastos/{api,components,hooks,screens,store}`.
2. Mover con `git mv` los cuatro archivos de `api/` y actualizar sus imports a `@/shared/...`.
3. Partir `src/lib/queue.ts`: `SyncQueue` a `store/syncQueue.ts`, `ExpenseCache` a `store/expenseCache.ts`. Ambos siguen recibiendo `deviceStorage` por inyección — no importan MMKV directo.
4. Mover los tests correspondientes junto a cada archivo y actualizar rutas.
5. Extraer de `app/index.tsx` los cuatro componentes internos a `components/`, uno por archivo (Regla 3).
6. Extraer el `useQueries` a `hooks/useGastos.ts`, devolviendo `{ gastos, categorias, total, estado }`. La pantalla no debe conocer TanStack Query.
7. Sustituir el gating manual de `isPending`/`isError` por `GAsyncGate` de la Fase 1.
8. Mover el cuerpo restante de `app/index.tsx` a `screens/ListaScreen.tsx`; repetir con `add.tsx` → `AgregarScreen.tsx`.
9. Escribir `src/features/gastos/index.ts` exportando **solo** `ListaScreen`, `AgregarScreen`, `useGastos`, `useCrearGasto` y los tipos públicos.
10. Reducir `app/index.tsx` y `app/add.tsx` a un reexport de una línea.
11. Verificar que ningún archivo fuera del feature importe `@/features/gastos/api/...` ni `.../store/...`: `grep -rn "features/gastos/" app/ src/ --include=*.tsx --include=*.ts | grep -v "features/gastos/"`.
12. Ejecutar `npm run lint && npm run typecheck && npm test`. Todo en verde.
13. Commit: `refactor(gastos): feature-first con barrel y componentes extraidos`.

**Criterio de salida (DoD):** `app/index.tsx` y `app/add.tsx` tienen ≤ 10 líneas cada uno; el barrel no expone `api/` ni `store/`; los 141 tests pasan; la app compila y se comporta igual.

**Pruebas de QA:** Recorrido completo en emulador: login → lista vacía → agregar gasto → verlo en la lista → total correcto → long-press → borrar → total recalculado. Más el flujo offline: modo avión → agregar → reconectar → confirmar sincronización. Ejecutar también los 6 flujos de `.maestro/`.

**Riesgo y rollback:** Riesgo alto — es el movimiento más grande, toca las dos pantallas principales. Mitigación: los tests de dominio ya cubren la lógica movida; si pasan, el comportamiento se preservó. Rollback: revertir el commit; las Fases 0-2 quedan intactas.

**Estimación:** 3 días laborales — **Mié 23, Jue 24, Vie 25 sep**

---

## Fase 4 — Features `auth` y `categorias`

**Objetivo de la fase:** Cerrar la migración: que `src/lib/` deje de existir.

**Entregable verificable:** La carpeta `src/lib/` eliminada del repositorio, y `app/login.tsx` reducido a un reexport.

**Archivos afectados**

| Ruta | Acción | Cambio |
|---|---|---|
| `src/features/auth/api/auth.remote.ts` | CREAR | `signIn` y `signOut` desde `src/lib/auth.ts` |
| `src/features/auth/hooks/useSession.ts` | CREAR | El hook `useSession` desde `src/lib/auth.ts` |
| `src/features/auth/screens/LoginScreen.tsx` | CREAR | Cuerpo de `app/login.tsx`, usando `GCampo` y `GBoton` |
| `src/features/auth/types.ts` | CREAR | `SessionState` |
| `src/features/auth/index.ts` | CREAR | Barrel: `LoginScreen`, `useSession`, `signOut` |
| `src/features/categorias/api/categorias.remote.ts` | CREAR | `fetchCategories` desde `repository.remote.ts` |
| `src/features/categorias/hooks/useCategorias.ts` | CREAR | Query de categorías |
| `src/features/categorias/types.ts` | CREAR | `Category` |
| `src/features/categorias/index.ts` | CREAR | Barrel |
| `app/login.tsx` | MODIFICAR | Reexport de una línea |
| `app/_layout.tsx` | MODIFICAR | Importa `useSession` desde `@/features/auth`, no desde `@/lib/auth` |
| `src/lib/` | ELIMINAR | Carpeta completa |
| `src/types/expense.ts` | ELIMINAR | Sus tipos ya viven en el `types.ts` de cada feature |

**Órdenes**

1. Crear los árboles de ambos features.
2. Mover `signIn`/`signOut` a `auth/api/auth.remote.ts` y `useSession` a `auth/hooks/useSession.ts`.
3. Mover el cuerpo de `app/login.tsx` a `auth/screens/LoginScreen.tsx`, reemplazando los `TextInput` y `Pressable` crudos por `GCampo` y `GBoton`.
4. Extraer `fetchCategories` de `expenses.remote.ts` al feature `categorias`. El feature `gastos` lo consume **por el barrel** `@/features/categorias`, nunca por ruta interna.
5. Ajustar `useGastos` para que consuma `useCategorias` del feature hermano vía barrel.
6. Actualizar `app/_layout.tsx` y `app/login.tsx`.
7. Confirmar que `src/lib/` quedó vacía y eliminarla: `git rm -r src/lib`.
8. Ejecutar `node scripts/mapa-imports.mjs > docs/arquitectura/mapa-imports-despues.txt` y comparar contra el de la Fase 0 en el documento de línea base.
9. Ejecutar `npm run lint && npm run typecheck && npm test`. Todo en verde.
10. Commit: `refactor(auth,categorias): cierre de la migracion feature-first`.

**Criterio de salida (DoD):** `src/lib/` no existe; `ls src/` devuelve exactamente `features`, `shared`, `types`; los 141 tests pasan.

**Pruebas de QA:** Login con credenciales correctas e incorrectas. Logout y verificar que los datos locales se limpian (BUG-013: entrar con un segundo usuario y confirmar que no ve gastos del primero). Selector de categorías poblado en la pantalla de alta.

**Riesgo y rollback:** Riesgo medio. El punto delicado es `categorias`: si `gastos` termina importando su ruta interna, se viola la Regla 2 — el lint de la Fase 5 lo cazaría, pero conviene revisarlo aquí a mano. Rollback: revertir el commit de la fase.

**Estimación:** 2 días laborales — **Lun 28, Mar 29 sep**

---

## Fase 5 — Blindaje: lint de fronteras y CI

**Objetivo de la fase:** Que la estructura no pueda degradarse: que el CI rechace un PR que viole las reglas.

**Entregable verificable:** Regla de ESLint que falla ante import cruzado entre features, activa y bloqueante en CI, más prueba negativa que lo demuestra.

**Archivos afectados**

| Ruta | Acción | Cambio |
|---|---|---|
| `eslint.config.js` | MODIFICAR | Añadir `no-restricted-imports` por zonas: features no se importan entre sí salvo por barrel; `shared` no importa de `features`; `app/` no importa rutas internas de features |
| `.github/workflows/ci.yml` | MODIFICAR | El job `quality` corre el lint de fronteras y bloquea el merge |
| `docs/arquitectura/checklist-pr.md` | CREAR | Checklist obligatorio de PR |
| `docs/arquitectura/baseline_2026-09-14.md` | MODIFICAR | Sección de cierre con las cifras finales vs. las iniciales |
| `README.md` | MODIFICAR | Sección de arquitectura con el árbol y las 5 reglas |
| `CHANGELOG.md` | MODIFICAR | Entrada de la migración |

**Órdenes**

1. Añadir a `eslint.config.js` tres bloques de `no-restricted-imports` con `patterns`:
   - dentro de `src/features/*/`: prohibido `@/features/*/api/*`, `@/features/*/store/*`, `@/features/*/screens/*`, `@/features/*/components/*` — solo se permite `@/features/<nombre>` (el barrel);
   - dentro de `src/shared/`: prohibido cualquier `@/features/*`;
   - dentro de `app/`: prohibido cualquier `@/features/*/**` (solo barrels).
2. Añadir la regla que prohíbe importar `react-native-mmkv` fuera de `src/shared/storage/`.
3. Verificar que las reglas custom existentes (prohibición de `height` literal, `getUTCMonth`, `Math.round` fuera de `money.ts`) sigan apuntando a las rutas nuevas tras la migración. Actualizar las rutas.
4. Ejecutar `npm run lint` — debe pasar en verde sobre el código ya migrado.
5. **Prueba negativa:** crear una rama desechable, añadir en `ListaScreen.tsx` un `import { signIn } from '@/features/auth/api/auth.remote'`, correr `npm run lint` y confirmar que falla. Borrar la rama.
6. Actualizar `ci.yml` para que el job `quality` incluya explícitamente el lint de fronteras y sea requerido para el merge.
7. Redactar `docs/arquitectura/checklist-pr.md`: feature correcto, import por barrel, un archivo una responsabilidad, error traducido a `Failure`, componente de UI del design system, estado de carga por `GAsyncGate`, prueba añadida.
8. Cerrar `baseline_2026-09-14.md` con la tabla comparativa antes/después.
9. Actualizar `README.md` y `CHANGELOG.md`.
10. Abrir PR `refactor/feature-first` → `main`, confirmar que Vigía comenta sin hallazgos y que el CI pasa. Mergear.
11. Commit final y merge.

**Criterio de salida (DoD):** La prueba negativa falla como se espera, el CI está en verde sobre el PR real, y el PR está mergeado a `main`.

**Pruebas de QA:** Regresión completa: los 6 flujos de Maestro más el recorrido manual de la Fase 3. Adicionalmente, correr `npx expo run:android` desde cero (borrando `android/`) para confirmar que la reestructuración no rompió el build nativo.

**Riesgo y rollback:** Riesgo bajo. Si las reglas de lint resultan demasiado estrictas y bloquean trabajo legítimo, degradarlas a `warn` durante una semana antes de volverlas a `error`. Rollback: revertir el commit de `eslint.config.js`.

**Estimación:** 2 días laborales — **Mié 30 sep, Jue 1 oct**

---

## Tabla resumen

| Fase | Entregable | Días laborales | Inicio | Fin |
|---|---|---|---|---|
| 0 — Diagnóstico | Línea base medible + limpieza | 1 | Lun 14 sep | Lun 14 sep |
| 1 — Fundación `shared/` | Núcleo transversal + design system | 3 | Mar 15 sep | Vie 18 sep |
| 2 — Errores tipados | `Failure` + traducción en datos (BUG-014) | 2 | Lun 21 sep | Mar 22 sep |
| 3 — Feature `gastos` | Barrel + componentes extraídos | 3 | Mié 23 sep | Vie 25 sep |
| 4 — `auth` y `categorias` | `src/lib/` eliminada | 2 | Lun 28 sep | Mar 29 sep |
| 5 — Blindaje | Lint de fronteras bloqueante en CI | 2 | Mié 30 sep | Jue 1 oct |
| | **Total** | **13** | **Lun 14 sep** | **Jue 1 oct** |

> Miércoles 16 de septiembre excluido por festivo.

## Dependencias entre fases

```
Fase 0 ──> Fase 1 ──┬──> Fase 2 ──> Fase 3 ──> Fase 4 ──> Fase 5
                    └──────────────────┘
```

- **Fase 1** requiere la línea base de la Fase 0: sin cifras previas no hay cómo demostrar que la migración no degradó nada.
- **Fase 2** requiere `shared/` creada (ahí vive `errors/`), pero **no** requiere que los features estén migrados: opera sobre `src/lib/` tal como está. Es deliberado — arregla el bug visible antes de la reestructuración grande.
- **Fase 3** requiere la 1 (usa `GAsyncGate` y `shared/lib`) y se beneficia de la 2 (mueve código ya corregido, no código roto).
- **Fase 4** requiere la 3: `categorias` se extrae de un archivo que la Fase 3 movió.
- **Fase 5** requiere que toda la estructura destino exista, o el lint no tendría qué proteger.

**Paralelización:** ninguna. Con un solo desarrollador y un solo repositorio, las fases son estrictamente seriales. Si en algún momento hay un segundo par de manos, la Fase 2 puede correr en paralelo con la 1 (tocan carpetas distintas), bajando el total a 11 días.

---

## Decisiones que requieren tu aprobación antes de arrancar

1. **Feature-First de React Native, no las 3 capas de Flutter.**
   Propuesta: aplicar la variante del App Comensal (`api/ components/ hooks/ screens/ store/ types.ts index.ts`), no la de la App Admin (`data/ domain/ presentation/` con `usecases/`).
   Razón: con 3 pantallas y un solo dominio, una capa `domain` con `usecases` de una línea cada uno sería andamiaje vacío. La guía ya define ambas variantes y ésta es la que corresponde al stack. **Si prefieres las 3 capas estrictas para que el portafolio muestre esa arquitectura explícitamente, dímelo — añade ~3 días laborales y el plan cierra el martes 6 de octubre.**

2. **Mover la Fase 2 al frente.**
   Propuesta: dejarla donde está (después de `shared/`).
   Alternativa: hacerla Fase 1 y corregir el error genérico de la lista **hoy**, antes de tocar estructura. Si te urge que la app se vea bien funcionando antes de refactorizar, esto es lo que conviene.

3. **Prefijo de los componentes del design system.**
   Propuesta: `G` de Gastos (`GBoton`, `GCampo`). EasyOrder usa `EO`. Confirma si prefieres otro prefijo o nombres sin prefijo.

4. **Qué hacer con las carpetas de otros repositorios dentro de la carpeta del proyecto.**
   Propuesta: moverlas fuera del árbol del portafolio. No están trackeadas, así que no hay riesgo de perder historial, pero quiero tu visto bueno antes de mover carpetas de trabajo tuyas.

5. **BUG-014 como parte del relato del portafolio.**
   Propuesta: documentarlo en `bug-log.md` igual que los 13 anteriores. El hallazgo es bueno: el mismo antipatrón de "prefijos quemados en el repositorio" que existe en EasyOrder apareció aquí, y lo cazaste corriendo la app, no leyendo código. Eso es material de entrevista.

---

## Guion para tu Daily

> "Arranqué la normalización arquitectónica del proyecto de gastos. La Fase 0 deja la línea base: conteo de tests, cobertura y un mapa de todos los imports cruzados, para poder demostrar al final que la migración no degradó nada.
>
> El hallazgo de la semana salió de correr la app, no de leer código: la pantalla de lista mostraba 'No se pudieron cargar los gastos' para cualquier fallo — sin red, sin esquema, sesión caída, todo igual. Es exactamente el antipatrón de prefijos quemados en el repositorio que ya tenemos identificado en EasyOrder. Lo registré como BUG-014 y lo ataco en la Fase 2 con `Failure` tipado, que es la Regla 5 de nuestra guía de arquitectura.
>
> El plan son 13 días laborales, cierra el jueves 1 de octubre. Lo dividí en seis fases mergeables por separado, ninguna de más de tres días.
>
> Bloqueos: ninguno técnico. Necesito decidir una cosa — si aplico Feature-First de React Native, que es lo que corresponde al stack, o las tres capas estrictas de Flutter para que el portafolio muestre esa arquitectura explícitamente. La segunda opción suma tres días."
