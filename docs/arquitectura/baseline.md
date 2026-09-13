# Línea base — antes de la migración Feature-First

**Medido el:** 2026-09-13 · **Rama:** `refactor/feature-first` · **Commit de partida:** `8d89bf1`

Este documento existe para poder demostrar al cerrar la migración que no se
degradó nada. Sin cifras previas, "no rompí nada" es una afirmación sin
respaldo. La tabla comparativa de cierre se agrega al final, en la Fase 5.

---

## 1. Pruebas

| Métrica | Valor |
|---|---|
| Suites | 9 |
| Casos | 141 |
| Resultado | 141 pasan, 0 fallan |
| Tiempo | ~24 s con cobertura |

**Invariante de la migración:** al cerrar cada fase, `npm test` debe seguir
reportando **141 o más** casos, nunca menos. El número sube si una fase agrega
pruebas; si baja, se perdió cobertura y la fase se revierte.

> El número fijo "141" no sirve como criterio de salida literal a partir de la
> Fase 2, que modifica `auth.test.ts` y agrega `traducir.test.ts`. El criterio
> real es **≥ 141 y ninguna suite roja**.

### 1.1 Advertencia sobre el conteo

Hasta esta fase, `npm test` reportaba **62 suites, 41 en rojo**. No era código
de este proyecto: había carpetas de otros repositorios dentro de `gastos/` y
Jest recogía sus archivos de prueba. Sacadas de la carpeta del proyecto, el
conteo real quedó a la vista. Cualquier medición anterior a este commit es
inválida.

La lección va más allá de la limpieza: **un `npm test` que recoge lo que no es
suyo miente en las dos direcciones.** Reportaba fallos ajenos como propios, y
habría podido esconder un fallo propio entre 41 rojos que uno aprende a
ignorar.

## 2. Cobertura

Línea base global — el umbral configurado en `jest.config.js` es
`branches 80 / functions 90 / lines 90 / statements 90`.

| Archivo | % Stmts | % Branch | % Funcs | % Lines | Sin cubrir |
|---|---|---|---|---|---|
| **Global** | **95.57** | **88.46** | **91.04** | **95.71** | |
| `auth.ts` | 68.96 | 42.85 | 54.54 | 69.23 | 20-34 |
| `date.ts` | 100 | 87.5 | 100 | 100 | 45 |
| `mappers.ts` | 100 | 100 | 100 | 100 | — |
| `money.ts` | 98.38 | 92.1 | 100 | 98.33 | 128 |
| `queue.ts` | 100 | 75 | 100 | 100 | 36, 95 |
| `repository.local.ts` | 100 | 100 | 100 | 100 | — |
| `repository.ts` | 88.23 | 50 | 85.71 | 87.5 | 35-36 |
| `sync.ts` | 100 | 100 | 100 | 100 | — |

Excluidos de cobertura a propósito (`collectCoverageFrom` en `jest.config.js`):
`typography.ts`, `storage.ts`, `db.ts`, `supabase.ts`, `remote.ts`,
`repository.remote.ts`. Todos envuelven dependencias nativas o de red; su
comportamiento se verifica en E2E, no en unitarias.

**El punto bajo es `auth.ts` (42.85% de ramas).** Las líneas 20-34 son el
`useEffect` de `useSession`, que necesita un entorno React. Relevante porque la
Fase 4 reescribe ese archivo: se mueve con la red de seguridad más floja de todo
el proyecto.

> ⚠️ `collectCoverageFrom` tiene las rutas `src/lib/**` quemadas. La Fase 1 saca
> archivos de ahí; si no se actualiza en la misma fase, la cobertura reportada
> cae en silencio y el umbral global deja de significar nada.

## 3. Mapa de imports

`docs/arquitectura/mapa-imports-antes.txt` — **42 referencias** entre módulos de
`app/` y `src/`, de las cuales **4 son perezosas**.

### 3.1 Las 4 referencias perezosas

Son las peligrosas de esta migración: rutas relativas resueltas en tiempo de
ejecución, invisibles para `tsc` y para ESLint. Si un `git mv` las deja mal, **no
se rompe ninguna compuerta**: lint, typecheck y las 141 pruebas siguen en verde,
y el fallo solo aparece en el dispositivo.

| Origen | Destino | Por qué es perezosa | Riesgo al mover |
|---|---|---|---|
| `src/lib/repository.ts:35` | `./repository.remote` | Un import estático arrastraría MMKV a las pruebas en Node | Alto — se cae al backend equivocado |
| `src/lib/repository.local.ts:41` | `./db` | Igual, con `expo-sqlite` | **Crítico — el `catch` traga el fallo**: `disco = null`, la persistencia SQLite muere en silencio |
| `src/lib/auth.ts:50` | `./storage` | Evita cargar MMKV al importar `auth` | Alto — `signOut` deja de limpiar datos locales (reintroduce BUG-013) |
| `src/lib/auth.ts:51` | `./remote` | Igual | Medio — `signOut` deja de enviar lo pendiente |

**Regla para toda la migración:** cada fase que mueva alguno de estos cuatro
archivos verifica la ruta relativa **a mano**, en el mismo commit, y lo anota en
su DoD. Ninguna herramienta lo va a cazar.

### 3.2 Imports por capa (hoy)

- `app/` → `@/lib/*` y `@/types/*` directo. Ninguna puerta de salida: las
  pantallas conocen la ruta interna de cada módulo.
- `src/lib/` → entre sí por ruta relativa, sin fronteras.
- Ningún import cruzado entre features, porque **todavía no hay features**.

## 4. Inventario de `src/lib/` — 14 módulos

| Archivo | Líneas | Destino en la migración |
|---|---|---|
| `money.ts` | 130 | `shared/lib/` (Fase 1) |
| `queue.ts` | 117 | se parte → `features/gastos/store/` (Fase 3) |
| `db.ts` | 103 | `features/gastos/store/expenseDb.ts` (Fase 3) |
| `repository.local.ts` | 102 | `features/gastos/api/expenses.local.ts` (Fase 3) |
| `repository.remote.ts` | 94 | `features/gastos/api/expenses.remote.ts` (Fase 3) |
| `mappers.ts` | 87 | `shared/lib/` (Fase 1) |
| `sync.ts` | 85 | `shared/lib/sync-engine.ts` (Fase 1) |
| `date.ts` | 83 | `shared/lib/` (Fase 1) |
| `supabase.ts` | 81 | `shared/lib/` (Fase 1) |
| `auth.ts` | 71 | se parte → `features/auth/` (Fase 4) |
| `remote.ts` | 69 | `features/gastos/api/sync.ts` (Fase 3) |
| `repository.ts` | 59 | `features/gastos/api/index.ts` (Fase 3) |
| `typography.ts` | 50 | `shared/theme/tipografia.ts` (Fase 1) |
| `storage.ts` | 21 | se parte → `shared/storage/` (Fase 1) |

Pantallas: `app/index.tsx` 217 · `app/add.tsx` 129 · `app/login.tsx` 108 ·
`app/_layout.tsx` 58.

## 5. Limpieza ejecutada en esta fase

| Qué | Acción | Motivo |
|---|---|---|
| Carpetas de otros repositorios dentro de `gastos/` | Sacadas de la carpeta del proyecto | Rompían `npm test`: 41 suites en rojo que no eran de este proyecto |
| `global.css` | Eliminado | Resto de NativeWind, desinstalado hace tiempo |
| `tailwind.config.js` | Eliminado | Idem |
| `nativewind-env.d.ts` | Idem | Idem |
| `src/components/` | Eliminada | Carpeta vacía |
| `eslint.config.js` | Modificado | Rutas literales → globs por nombre |

Se verificó que `babel.config.js` y `metro.config.js` no referenciaran ninguno
de los archivos eliminados. No lo hacían.

### 5.1 Por qué el cambio a `eslint.config.js`

Tres overrides apuntaban a rutas literales:

```js
files: ['src/lib/money.ts', 'src/lib/typography.ts']   // apaga Math.round
files: ['src/lib/mappers.ts']                          // apaga getUTC*
```

La Fase 1 mueve esos tres archivos. Con rutas literales, los overrides dejarían
de coincidir y las reglas de dominio se dispararían sobre código que no cambió:
**5 errores de lint** en `money.ts:105` (dos `Math.round`), `typography.ts:15` y
`mappers.ts:50` (`getUTCFullYear` y `getUTCMonth`). El repo quedaría rojo desde
la Fase 1 hasta la 5, que era donde el plan original lo reparaba.

Cambiados a globs por nombre (`'**/money.ts'`), cubren la ruta vieja y la nueva
a la vez. Verificado copiando los tres archivos a su destino de la Fase 1 y
corriendo ESLint sobre ambas ubicaciones: exit 0 en las dos.

## 6. Deuda conocida al arrancar

1. **`auth.ts` al 42.85% de ramas** — el archivo peor cubierto es el que la
   Fase 4 reescribe.
2. **`collectCoverageFrom` con rutas quemadas** — se actualiza en la Fase 1 o la
   cobertura miente.
3. **Doble copia local de gastos** — `ExpenseCache` (MMKV) y `expenseDb`
   (SQLite) guardan la misma lista. Se unifica en SQLite; MMKV queda solo para
   la cola de salida.
4. **Supabase apagado y sin esquema** — `.env` está renombrado a `.env.supabase`
   y el proyecto remoto perdió sus tablas. Las pruebas de QA de la Fase 2 que
   asumen un backend vivo necesitan reaplicar `supabase/migrations/0001_initial.sql`
   antes, o sustituirse por pruebas unitarias de `traducirPostgrest`.
5. **BUG-014 sin corregir** — `repository.remote.ts:17` lanza
   `` throw new Error(`No se pudieron cargar las categorías: ${error.message}`) ``.
   Se ataca en la Fase 2.
