# Estructura de archivos — norma del repositorio

Variante **React Native** del estándar Feature-First de NexGen. No se aplican las
tres capas estrictas (`data/domain/presentation` con `usecases/`) de la app
Flutter: con tres pantallas y un solo dominio, una capa `domain` con usecases de
una línea sería andamiaje vacío.

## Árbol destino

```
app/                                  # expo-router lo exige en la raíz
├── _layout.tsx                       # providers + AuthGate
├── index.tsx                         # reexport de una línea
├── add.tsx                           # reexport de una línea
└── login.tsx                         # reexport de una línea

src/
├── features/
│   ├── gastos/
│   │   ├── api/                      # habla con el backend
│   │   │   ├── expenses.remote.ts    # Supabase + cola offline
│   │   │   ├── expenses.local.ts     # backend local (dev/test)
│   │   │   ├── sync.ts               # pushQueue, pullChanges
│   │   │   └── index.ts              # despachador según credenciales
│   │   ├── components/               # un componente exportado por archivo
│   │   │   ├── FilaGasto.tsx
│   │   │   ├── TotalDelMes.tsx
│   │   │   ├── ListaVacia.tsx
│   │   │   └── EsqueletoLista.tsx
│   │   ├── hooks/
│   │   │   ├── useGastos.ts
│   │   │   └── useCrearGasto.ts
│   │   ├── screens/
│   │   │   ├── ListaScreen.tsx
│   │   │   └── AgregarScreen.tsx
│   │   ├── store/                    # persistencia local del feature
│   │   │   ├── syncQueue.ts          # cola de salida (MMKV)
│   │   │   └── expenseDb.ts          # copia de lectura (SQLite)
│   │   ├── types.ts
│   │   └── index.ts                  # barrel — única puerta de salida
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
├── shared/                           # transversal: lo que usan dos o más features
│   ├── ui/                           # design system
│   │   ├── GTexto.tsx
│   │   ├── GBoton.tsx
│   │   ├── GCampo.tsx
│   │   ├── GAsyncGate.tsx            # Carga Verdadera
│   │   └── index.ts
│   ├── lib/
│   │   ├── supabase.ts               # cliente de API
│   │   ├── sync-engine.ts            # resolveConflict, dedupeQueue, reconcile
│   │   ├── money.ts                  # aritmética en centavos enteros
│   │   ├── date.ts                   # periodo en hora local
│   │   └── mappers.ts                # frontera con el esquema de la BD
│   ├── errors/
│   │   ├── failures.ts               # Failure tipado (dominio)
│   │   ├── traducir.ts               # Exception cruda → Failure
│   │   └── index.ts
│   ├── storage/
│   │   └── deviceStorage.ts          # único punto que toca MMKV
│   └── theme/
│       ├── colores.ts
│       └── tipografia.ts             # escalado Dynamic Type
└── types/
    ├── database.ts                   # tipos del esquema Supabase
    └── expense.ts                    # entidad compartida por features y shared
```

## Las cinco reglas no negociables

1. **Dependencia en un solo sentido.** `app/ → features/ → shared/ → types/`.
   Nunca al revés: `shared/` no importa de `features/`, y `features/` no
   importa de `app/`.
2. **Features aislados.** Un feature nunca importa la ruta interna de otro. Si
   dos lo necesitan, sube a `shared/`. La excepción es el barrel: `gastos` puede
   importar `@/features/categorias`, nunca `@/features/categorias/api/...`.
3. **Un archivo = una responsabilidad pública.** Un componente exportado por
   archivo. Nada de `utils.ts` de 900 líneas.
4. **Barrel por feature.** Todo lo que el resto de la app puede usar sale por
   `index.ts`. El barrel **no** exporta `api/` ni `store/`: son internos.
5. **Los errores se traducen en la capa de datos.** `api/` captura la excepción
   cruda y devuelve un `Failure` tipado; la pantalla mapea `Failure` a copy
   visible. La UI nunca ve un string del backend, y el repositorio nunca inventa
   prefijos.

> La regla 5, sola, elimina BUG-014 de raíz.

## Dónde va cada cosa

| Si es... | Va en... |
|---|---|
| Una pantalla completa | `features/<x>/screens/` |
| Un pedazo de esa pantalla, usado solo ahí | `features/<x>/components/` |
| Un componente visual que usan dos features | `shared/ui/` |
| Una llamada al backend | `features/<x>/api/` |
| Persistencia local del feature | `features/<x>/store/` |
| Lógica de dominio pura (dinero, fechas, sync) | `shared/lib/` |
| Un tipo que solo conoce un feature | `features/<x>/types.ts` |
| Un tipo que cruzan features y `shared/` | `src/types/` |

## Qué lo hace cumplir

`eslint.config.js` bloquea las violaciones de las reglas 1, 2 y 4 con
`no-restricted-imports` por zona, y el job `quality` del CI corre el lint en cada
PR. Una violación de frontera no se merge.

Además, reglas de dominio que convierten bugs ya corregidos en errores de lint:

| Regla | Bug que previene |
|---|---|
| `Math.round` prohibido fuera de `money.ts`/`tipografia.ts` | BUG-001, cálculo en flotantes |
| `getUTCMonth`/`getUTCFullYear` prohibidos fuera de `mappers.ts` | BUG-002, periodo en UTC |
| `height` literal prohibido | BUG-005, texto recortado con Dynamic Type |
| `react-native-mmkv` prohibido fuera de `shared/storage/` | Acoplamiento al módulo nativo |

Los overrides de estas reglas usan **globs por nombre de archivo**
(`'**/money.ts'`), no rutas literales: una ruta literal deja de coincidir en
cuanto el archivo cambia de carpeta, y la regla se dispara sobre código que no
cambió.

## Lo que no verifica ninguna herramienta

Las referencias perezosas — `require('./x')` y `await import('./x')` — se
resuelven en tiempo de ejecución. `tsc` no las revisa y ESLint tampoco. Hay
cuatro en el proyecto y están listadas en
[`baseline.md`](baseline.md#31-las-4-referencias-perezosas). Al mover cualquiera
de esos archivos, la ruta se verifica a mano y se prueba en dispositivo: si queda
mal, lint, typecheck y las 141 pruebas siguen en verde y el fallo solo aparece
en el teléfono.
