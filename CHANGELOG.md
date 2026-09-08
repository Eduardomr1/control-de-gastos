# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/);
versionado según [SemVer](https://semver.org/lang/es/).

## [No publicado]

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
