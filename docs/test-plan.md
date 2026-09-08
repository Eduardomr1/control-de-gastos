# Plan de Pruebas — Gastos

| Campo | Valor |
|---|---|
| Producto | Gastos v0.1.0 (Expo / React Native) |
| Autor | Eduardo Maytorena |
| Plataformas | iOS 16+, Android 10+ |
| Última revisión | 2026-09-05 |

---

## 1. Objetivo

Verificar que la app registra, calcula y sincroniza gastos sin pérdida ni
duplicación de datos, incluyendo operación sin conectividad, y que la interfaz
es utilizable con escalado de fuente accesible.

## 2. Alcance

**Dentro del alcance**

- Registro y borrado de gastos
- Aritmética monetaria y totales por periodo
- Agrupación mensual con manejo de zona horaria
- Persistencia local y cola de sincronización
- Resolución de conflictos entre dispositivos
- Autenticación y expiración de sesión
- Accesibilidad: Dynamic Type, contraste, lectores de pantalla

**Fuera del alcance**

- Edición de gastos (se registra de nuevo y se borra el anterior)
- Presupuestos, gastos recurrentes, multi-usuario
- Integración bancaria y escaneo de tickets
- Pruebas de carga del backend (Supabase gestionado)

## 3. Estrategia

| Nivel | Herramienta | Cobertura objetivo | Qué se valida |
|---|---|---|---|
| Unitario | Jest + ts-jest | ≥ 90% en `src/lib` | Aritmética, fechas, conflictos, cola de sync, mapeo de datos |
| E2E | Maestro | 6 flujos principales | Recorridos reales en dispositivo |
| Accesibilidad | Manual + auditoría | Todas las pantallas | Dynamic Type, contraste, VoiceOver / TalkBack |

La lógica de dominio (`src/lib`) se prueba de forma exhaustiva y aislada porque
es donde vive el riesgo real. La UI se prueba a nivel de flujo con Maestro, no
con pruebas de componente: en una app de cinco pantallas, un E2E que recorre el
flujo real cubre más que un render aislado, y no se rompe en cada refactor de
markup.

## 4. Riesgos identificados

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Precisión de punto flotante en montos | Totales incorrectos | Enteros en centavos, prohibido `float` en el dominio |
| Corte de mes desfasado por zona horaria | Reportes mensuales erróneos | Periodo calculado sobre hora local, ISO con offset obligatorio |
| Duplicados por doble tap o reintento | Datos inflados | UUID generado en cliente, cola idempotente |
| Divergencia entre réplicas | Pérdida silenciosa de datos | Last-write-wins con desempate determinista, mismo criterio en cliente y servidor |
| Mapeo incorrecto entre dominio y base de datos | Datos equivocados sin error visible | Módulo `mappers.ts` con pruebas de ida y vuelta |
| Cola de sync corrupta en disco | La app no abre | Lectura tolerante a fallos: se descarta y se repuebla en el siguiente pull |
| Fuga de datos entre usuarios | Exposición de información privada | Row Level Security en todas las tablas, con verificación explícita documentada |
| Texto cortado con fuente ampliada | App inutilizable para parte de los usuarios | `minHeight` en lugar de `height`, auditoría al 310% |

## 5. Criterios de entrada

- Build instalable generado por EAS
- Suite unitaria y de integración en verde
- Datos de prueba cargados

## 6. Criterios de salida

- 100% de los casos de prueba ejecutados
- Cero defectos P1 abiertos
- Máximo 2 defectos P2 abiertos, con mitigación documentada
- Cobertura de `src/lib` ≥ 90%
- Auditoría de accesibilidad sin hallazgos P1

## 7. Clasificación de defectos

| Prioridad | Definición | Tiempo de atención |
|---|---|---|
| P1 | Pérdida de datos, cierre inesperado o bloqueo de flujo principal | Antes del release |
| P2 | Cálculo incorrecto o degradación relevante con workaround | En el sprint |
| P3 | Cosmético o de conveniencia | Backlog |

## 8. Entorno

| Elemento | Configuración |
|---|---|
| iOS | iPhone 15 (simulador) + dispositivo físico |
| Android | Pixel 6 (emulador) + dispositivo físico |
| Red | Normal, offline, y latencia alta simulada (3G) |
| Zonas horarias | America/Mazatlan (UTC-7), UTC, Asia/Tokyo (UTC+9) |
| Escalado de fuente | 100%, 200%, 310% |
