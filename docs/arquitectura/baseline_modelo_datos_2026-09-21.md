# Línea base del modelo de datos — antes de la expansión funcional

**Medido el:** 2026-09-21 · **Rama:** `feat/fase-0-modelo-de-datos` · **Commit de partida:** `a11f6c8`

Fase 0 del *Plan de Implementación — Expansión funcional*. Existe para que las
ocho fases siguientes no diseñen a ciegas: qué hay hoy, qué se agrega, y por
qué cada decisión es la que es. Sin este mapa, la Fase 5 (multi-cuenta, la
única que toca tablas con datos de usuarios reales) se planea con supuestos.

---

## 1. Qué había, y qué se corrigió antes de empezar

El plan asumía una carpeta `src/shared/lib/db/migrations/` con un archivo por
migración. No existía: las migraciones vivían **dentro** de
`src/features/gastos/store/expenseDb.ts`, como un arreglo de SQL versionado con
`pragma user_version`.

Eso funcionaba mientras gastos fuera el único dueño de la base. Deja de
funcionar en la Fase 1, y por una razón que no es de gusto sino estructural:

> El archivo `gastos.db` es **uno solo** y su `user_version` también. Si cada
> feature llevara su propia lista de migraciones, dos listas competirían por el
> mismo contador y la segunda se saltaría en silencio las migraciones de la
> primera. **Una base física, una sola línea de tiempo.**

Y la Regla 1 de `estructura-archivos.md` lo cierra por el otro lado: `ingresos`
no puede importar `@/features/gastos/store/expenseDb`. No hay forma de que el
esquema compartido viva dentro de un feature.

**Movimiento de Fase 0:**

| Ruta | Acción | Qué es |
|---|---|---|
| `src/shared/lib/db/migraciones.ts` | CREAR | Arreglo de migraciones + `aplicarMigraciones(db, migraciones)`. No importa expo-sqlite: recibe el motor por parámetro, así el versionado se prueba en Node |
| `src/shared/lib/db/index.ts` | CREAR | Abre `gastos.db`, aplica migraciones al importarse, exporta el handle. Único módulo que toca expo-sqlite |
| `src/features/gastos/store/expenseDb.ts` | MODIFICAR | Pierde el handle y las migraciones; se queda solo con la tabla `gastos`. De 150 a 87 líneas |
| `src/shared/lib/db/migraciones.test.ts` | CREAR | 9 casos sobre el versionado |
| `jest.config.js` | MODIFICAR | `index.ts` fuera de cobertura (abre binding nativo); `migraciones.ts` dentro, al 100% |

El comportamiento no cambió: mismo SQL, mismo `user_version`, mismo archivo.
Un dispositivo con la app ya instalada no nota nada.

---

## 2. Esquema actual

### 2.1 SQLite local — `gastos.db`, `user_version = 1`

Tabla `gastos`, poblada por `expenseCache` (la copia de lectura compartida por
el backend local y el remoto).

| Columna | Tipo | Nota |
|---|---|---|
| `id` | text pk | UUID generado en el **cliente**. Es lo que hace idempotente el sync |
| `amount_cents` | integer | Centavos enteros. Nunca float (BUG-001) |
| `currency` | text | `MXN` |
| `category_id` | text | Sin FK local: las categorías viven en el backend |
| `occurred_at` | text | ISO 8601 **con offset explícito**. Nunca fecha desnuda (BUG-002) |
| `note` | text null | ≤ 280 caracteres, validado en el servidor |
| `sync_state` | text | `pending` / `synced` / `conflict` |
| `updated_at` | text | Criterio de last-write-wins |
| `deleted_at` | text null | Soft delete: sin él, borrar offline es indistinguible de no haber sincronizado |

Fuera de SQLite, en MMKV (`deviceStorage.ts`): la cola de salida (`syncQueue`)
y la sesión de Supabase. Ninguna de las dos es esquema de datos del usuario.

### 2.2 Supabase — `public`

`categories(id text pk, name, color)` — 6 filas semilla (migraciones `0001` y `0002`).

`expenses` — espejo de la tabla local más lo que solo el servidor puede
sostener: `user_id` con RLS, `tz_offset_minutes` para reconstruir el mes local
sin depender de la zona del servidor, y `month_key` como columna generada
indexada. Dos funciones: `sync_expense` (upsert idempotente con last-write-wins)
y `pull_changes(p_since)`.

### 2.3 Invariantes que cualquier tabla nueva hereda

Cinco, y no son negociables porque cada una es un bug ya pagado:

1. **Dinero en centavos enteros.** `*_cents integer`. Nunca `real`.
2. **Fechas ISO 8601 con offset.** El periodo se calcula con `monthKeyOf`, en hora local (BUG-002).
3. **`id` UUID del cliente.** Permite crear sin red y hace idempotente el reenvío (BUG-003).
4. **Soft delete con `deleted_at`.** Nunca `delete from`.
5. **`sync_state` + `updated_at`.** Toda tabla que sincronice los lleva; la que sea puramente local puede omitirlos, y hay que decir cuál es cuál.

---

## 3. Esquema propuesto

Versiones de `user_version` reservadas por fase. El número se gana al mergearse
la fase, no antes:

| Versión | Fase | Migración |
|---|---|---|
| 1 | — | `gastos` (ya aplicada) |
| 2 | 1 | `ingresos` |
| 3 | 2 | `presupuestos` |
| 4 | 3 | `recurrentes` |
| 5 | 4 | índice `gastos(occurred_at)` |
| 6 | 5 | `cuentas` + poblar `cuenta_id` |
| 7 | 7 | `metas_ahorro` |
| 8 | 8 | `recibo_uri` en `gastos` |

### 3.1 `ingresos` — v2

```sql
create table ingresos (
  id            text primary key not null,
  amount_cents  integer not null,
  currency      text not null,
  fuente        text not null,
  occurred_at   text not null,
  note          text,
  cuenta_id     text,             -- null hasta v6
  sync_state    text not null,
  updated_at    text not null,
  deleted_at    text
);
```

**Se descarta la columna `recurrente boolean` que pedía el plan.** Un ingreso
recurrente es una fila en `recurrentes` (v4) con `tipo = 'ingreso'`. El booleano
sería la misma información en dos lugares, y el día que se contradigan no hay
forma de saber cuál manda.

`cuenta_id` se agrega desde v2, nullable y sin usar todavía, en vez de esperar a
v6. Cuesta nada ahora y le ahorra a la Fase 5 un `alter table` sobre una tabla
ya poblada.

### 3.2 `presupuestos` — v3

```sql
create table presupuestos (
  id              text primary key not null,
  category_id     text not null,
  limite_cents    integer not null check (limite_cents > 0),
  mes_referencia  text,            -- 'YYYY-MM', o null = vigente todos los meses
  sync_state      text not null,
  updated_at      text not null,
  deleted_at      text
);
create unique index presupuestos_categoria_mes_idx
  on presupuestos (category_id, ifnull(mes_referencia, ''))
  where deleted_at is null;
```

`mes_referencia` nullable resuelve el caso normal —"500 al mes en Comida, todos
los meses"— con **una fila**, no con doce al año por categoría. Una fila con mes
explícito gana sobre la fila nula: es el override de diciembre sin tocar el
resto del año.

El gasto acumulado **no se guarda**: se calcula con un `sum()` sobre `gastos`
del mes. Un contador materializado es un segundo lugar donde la verdad puede
quedar mal, y con el volumen de esta app el `sum()` no se nota.

**Presupuesto por categoría, no por cuenta** (decisión 3 del plan). Si más
adelante hace falta por cuenta, es una columna `cuenta_id` nullable más dentro
del índice único, no un rediseño.

### 3.3 `recurrentes` — v4

```sql
create table recurrentes (
  id                 text primary key not null,
  tipo               text not null,   -- 'gasto' | 'ingreso'
  amount_cents       integer not null,
  currency           text not null,
  category_id        text,
  cuenta_id          text,
  nota               text,
  frecuencia         text not null,   -- 'semanal' | 'mensual' | 'anual'
  proxima_fecha      text not null,
  ultima_generacion  text,            -- hasta qué fecha ya se generó
  activo             integer not null default 1,
  sync_state         text not null,
  updated_at         text not null,
  deleted_at         text
);
```

**`ultima_generacion` es la defensa contra el duplicado**, que es el riesgo
central de la Fase 3. El job genera desde `ultima_generacion` hasta hoy y avanza
la marca **en la misma transacción** que inserta el gasto: o quedan los dos o no
queda ninguno. Reabrir la app tres veces el mismo día no genera nada la segunda
ni la tercera, porque la marca ya pasó esa fecha — sin tabla de deduplicación ni
consulta previa. El mismo mecanismo cubre la reapertura tardía: si la app estuvo
cerrada dos meses, el rango a generar son esos dos meses.

Alternativa descartada: id determinista del gasto derivado de
`(recurrente_id, fecha)`. Funciona, pero obliga a inventar un UUID con forma
válida a partir de un hash, y ese UUID tiene que sobrevivir al viaje a Supabase,
donde `expenses.id` es `uuid` de verdad. Una columna es más barata.

### 3.4 `cuentas` — v6 · la migración de riesgo

```sql
create table cuentas (
  id                  text primary key not null,
  nombre              text not null,
  tipo                text not null,   -- 'efectivo' | 'debito' | 'credito'
  saldo_inicial_cents integer not null default 0,
  currency            text not null,
  sync_state          text not null,
  updated_at          text not null,
  deleted_at          text
);
-- La cuenta General nace en la migración, con id fijo y conocido.
insert into cuentas (...) values ('00000000-0000-4000-8000-000000000001', 'General', ...);
update gastos   set cuenta_id = '00000000-0000-4000-8000-000000000001' where cuenta_id is null;
update ingresos set cuenta_id = '00000000-0000-4000-8000-000000000001' where cuenta_id is null;
```

Es la única migración que escribe sobre filas de usuarios reales. Tres cosas la
hacen reversible:

- El id de "General" es **fijo y literal**, no generado al vuelo: la migración
  se puede reejecutar y el `down` sabe exactamente qué borrar.
- `cuenta_id` ya existe como columna nullable desde v2; el `update` no es un
  `alter table` sobre una tabla poblada.
- El `down` es `update ... set cuenta_id = null` más `drop table cuentas`. No
  pierde un solo movimiento.

**Criterio de salida verificable:** la suma de `amount_cents` de `gastos` antes
y después de la migración debe ser idéntica al centavo, y `count(*)` también.

Saldo de una cuenta = `saldo_inicial_cents + Σ ingresos − Σ gastos` de esa
cuenta. Calculado, no materializado — mismo criterio que presupuestos.

### 3.5 `metas_ahorro` — v7

```sql
create table metas_ahorro (
  id              text primary key not null,
  nombre          text not null,
  objetivo_cents  integer not null check (objetivo_cents > 0),
  actual_cents    integer not null default 0,
  fecha_limite    text,
  sync_state      text not null,
  updated_at      text not null,
  deleted_at      text
);
```

`actual_cents` es una columna y no la suma de una tabla `aportes`. Contradice lo
dicho en 3.2 sobre no materializar, y a propósito: aquí no hay de dónde
derivarlo. Un aporte a una meta no es un gasto ni un ingreso, así que la suma no
existe en ninguna otra tabla. El día que se pida "historial de aportes", la
tabla se agrega y esta columna pasa a ser caché.

---

## 4. Contraparte en Supabase

El plan solo habla del cliente. Cada tabla que sincronice necesita su espejo en
`supabase/migrations/` con las cuatro piezas que ya tiene `expenses`: RLS por
`user_id`, trigger `touch_updated_at`, función `sync_*` idempotente y
participación en `pull_changes`.

**Decisión de alcance:** las fases 1 a 8 se implementan primero **solo en
local**. Las tablas nacen con `sync_state` en `synced` —el disco local es la
fuente de verdad, igual que decidió BUG-016 para gastos— y la app sigue
funcionando en modo local, que es el que corre sin credenciales. El espejo
remoto se agrega en un lote aparte, cuando las ocho features tengan su forma
final. Hacerlo al revés significa escribir ocho funciones `sync_*` en SQL y
reescribirlas cuando el esquema del cliente se mueva.

---

## 5. Desajustes del plan contra el repo

Para que las fases siguientes no busquen archivos que no existen:

| El plan dice | En el repo es | Por qué |
|---|---|---|
| `shared/lib/db/migrations/vN_x.ts` | Entrada nueva en `MIGRACIONES` de `shared/lib/db/migraciones.ts` | Un `user_version`, una lista |
| `features/dashboard/screens/DashboardScreen.tsx` | `features/gastos/screens/ListaScreen.tsx` + `components/TotalDelMes.tsx` | No hay feature dashboard |
| `features/gastos/screens/AddExpenseScreen.tsx` | `screens/AgregarScreen.tsx` | El repo nombra en español |
| `ingresos-api.ts`, `ingresos-store.ts` | `api/ingresos.local.ts` + `api/index.ts` | Convención de `gastos` y `categorias` |
| "Estado global de ingresos" (store) | react-query | Zustand se eliminó del stack por estar declarado y sin usar; un store nuevo lo reintroduce |
| `victory-native` para gráficas | Por confirmar contra RN 0.86 / Expo 57 | Se decide en la Fase 4, no antes |
| `notifee` para notificaciones | `expo-notifications` | El proyecto es Expo; notifee exige configuración nativa que expo-notifications ya resuelve |

---

## 6. Criterio de salida de la Fase 0

| Criterio | Estado |
|---|---|
| Documento con esquema actual y propuesto | ✅ este archivo |
| Estrategia de migraciones versionadas definida | ✅ `shared/lib/db/migraciones.ts` |
| El versionado corre sin error sobre una base existente | ✅ 9 casos en `migraciones.test.ts` |
| `npm test` sin regresión | ✅ 194 casos (eran 185), 20 suites verdes |
| `npm run lint` y `npm run typecheck` limpios | ✅ |

**Pendiente de dispositivo:** abrir la app en iOS y Android sobre una
instalación previa y confirmar que la lista carga con los gastos que ya tenía.
El código no cambió de comportamiento, pero el handle de SQLite sí cambió de
módulo, y eso solo se verifica con el binding nativo real.
