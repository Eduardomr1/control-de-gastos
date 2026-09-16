# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/);
versionado según [SemVer](https://semver.org/lang/es/).

## [No publicado]

### Agregado
- La lista agrupa por mes con subtotal por periodo; antes solo era visible el
  mes en curso
- Nota opcional al registrar un gasto. El modelo y la columna de SQLite ya la
  soportaban; faltaba la interfaz
- Categorías Compras y Salud (migración `0002`)

### Cambiado
- El esquema de SQLite se versiona con `user_version` y aplica migraciones al
  abrir la app. Antes era un `create table if not exists` suelto, que es mudo
  ante una tabla ya existente: la primera columna que se agregara nunca habría
  llegado a los dispositivos con la app ya instalada
- Rediseño de las cinco pantallas (Login, Lista, Agregar, estado vacío y estado
  de carga). Acento Electric Indigo `#5D3FD3`; en la fila el protagonista pasa
  a ser la categoría, con el monto alineado a la derecha
- Rampa tipográfica de 3 a 9 variantes, con `tabular-nums` en todo lo que es
  dinero para que los montos no bailen al cambiar de dígito
- Las versalitas usan `textTransform` y no `.toUpperCase()` sobre la cadena:
  así el texto que leen los lectores de pantalla y las pruebas E2E sigue siendo
  "Total de enero 2026" y no una versión gritada
- El estado de carga de la lista pasa de bloques grises a un indicador con copy
- Migración completa a Feature-First (`src/lib/` → `src/features/{gastos,auth,categorias}/` +
  `src/shared/`), en 5 fases mergeadas por separado. Ver `docs/arquitectura/`.
- `app/index.tsx`, `app/add.tsx` y `app/login.tsx` reducidos a un reexport de una línea
- El respaldo local de gastos se unificó en SQLite; antes convivían dos copias
  (MMKV para el backend remoto, SQLite para el local)
- `isRemote` se movió de un módulo de gastos a `shared/lib/environment.ts`:
  no era un concepto de ese feature
- Design system mínimo: `GTexto`, `GBoton`, `GCampo`, `GAsyncGate`
- Lint de fronteras: un feature no puede importar la ruta interna de otro,
  ni `shared/` importar de ningún feature; solo `deviceStorage.ts` importa
  `react-native-mmkv`

### Corregido
- BUG-016 — en modo local todo gasto mostraba "Pendiente de sincronizar" para
  siempre. Sin backend no hay cola ni servidor que lo resuelvan, así que el
  gasto nace `synced`: el disco local es la fuente de verdad.
- BUG-015 — la app no arrancaba sin credenciales de Supabase, pese a que el
  modo local no las necesita. El cliente se construía al evaluar el módulo, así
  que el fallo ocurría antes de que `isRemote` pudiera elegir backend.
- BUG-014 — la lista mostraba el mismo error genérico ante cualquier fallo
  (servidor roto, sesión caída, sin red). Ahora cada causa traduce a un
  `Failure` tipado y produce una pantalla distinta.

### Eliminado
- NativeWind y Tailwind: la app usa `StyleSheet` y ninguna pantalla llevaba `className`
- Zustand: declarado en el stack y sin una sola importación
- `jest-expo` y `@testing-library/react-native`: el preset es `ts-jest` y no hay pruebas de componente

### Por agregar
- Resumen por categoría con desglose porcentual
- Exportación a CSV

## [0.1.0] — 2026-09-05

### Agregado
- Alta, listado y borrado de gastos con categorías cargadas del backend
- Borrado con confirmación manteniendo presionada la fila
- Cierre de sesión desde el encabezado de la lista
- Resumen mensual con total del periodo
- Operación sin conexión con cola de sincronización idempotente
- Resolución de conflictos entre dispositivos por `updatedAt`
- Soporte de Dynamic Type hasta el máximo escalado accesible
- Suite de 134 pruebas unitarias con 99% de cobertura en `src/lib`
- 6 flujos E2E en Maestro, ejecutables a mano desde Actions
- `.npmrc` con `legacy-peer-deps` para que `npm ci` funcione sin argumentos
- Licencia MIT
- Documentación de QA: plan, casos, bitácora de defectos y auditoría de accesibilidad
- Schema de Supabase con Row Level Security y upsert idempotente
- Cliente de Supabase con sesión persistida en MMKV
- Despachador de backend: Supabase si hay credenciales, memoria si no
- Escritura optimista: el gasto entra a disco antes de intentar la red
- Cola de sincronización persistente, desacoplada de dependencias nativas
- Mapeo dominio ↔ base de datos con pruebas de ida y vuelta de zona horaria
- Reconciliación local/remoto con pruebas de idempotencia e independencia del orden
- Reglas de ESLint que protegen las decisiones de dominio
- Perfiles de build de EAS: development, preview y production

### Corregido
- BUG-001 · Residuo de punto flotante en el total mensual
- BUG-002 · Gasto de fin de mes clasificado en el periodo siguiente
- BUG-003 · Duplicación de gasto por doble tap en Guardar
- BUG-004 · Divergencia permanente en conflictos con timestamp idéntico
- BUG-005 · Monto recortado con la fuente ampliada al 310%
- BUG-006 · Renderizado en cascada del resumen mensual
- BUG-007 · Botón flotante con dimensión fija, detectado por regla de lint
- BUG-008 · Migración rechazada por expresión generada no inmutable
- BUG-009 · Render parcial silencioso por versiones desalineadas del SDK
- BUG-010 · Pantallas ilegibles en tema oscuro por falta de paleta propia
- BUG-011 · Prueba E2E que pasaba sin verificar nada
- BUG-012 · La lista se vaciaba tras la primera sincronización exitosa
- BUG-013 · Los gastos permanecían en el dispositivo al cerrar sesión
