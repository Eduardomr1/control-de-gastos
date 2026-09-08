# Casos de Prueba — Gastos

Los casos marcados **Automatizado** tienen su verificación correspondiente en la
suite; la columna "Evidencia" indica dónde.

---

## Suite: Aritmética monetaria

### TC-001 — Suma sin error de punto flotante
**Prioridad:** P1 · **Automatizado** · `src/lib/money.test.ts`

| | |
|---|---|
| Precondición | App instalada, sesión iniciada |
| Pasos | 1. Registrar un gasto de `0.10`<br>2. Registrar un gasto de `0.20`<br>3. Abrir el resumen mensual |
| Resultado esperado | El total muestra `$0.30`, no `$0.30000000000000004` |
| Nota | En JavaScript `0.1 + 0.2 !== 0.3`. Todo el dominio opera en centavos enteros. |

### TC-002 — Acumulación en volumen
**Prioridad:** P1 · **Automatizado** · `src/lib/money.test.ts`

| | |
|---|---|
| Pasos | Registrar 100 gastos de `0.01` |
| Resultado esperado | El total es exactamente `$1.00` |

### TC-003 — Entrada con formato local
**Prioridad:** P2 · **Automatizado** · `src/lib/money.test.ts`

| | |
|---|---|
| Pasos | Capturar `1,234.56`, `1234,56` y `1.234,56` en el campo de monto |
| Resultado esperado | Los tres se interpretan como `$1,234.56` |

### TC-004 — Rechazo de entrada inválida
**Prioridad:** P2 · **Automatizado** · `src/lib/money.test.ts`

| | |
|---|---|
| Pasos | Capturar `abc`, `1.2.3`, `$50`, vacío, y `1.005` |
| Resultado esperado | Mensaje de error específico; el gasto no se guarda; `1.005` se rechaza en lugar de redondearse en silencio |

---

## Suite: Periodos y zona horaria

### TC-010 — Corte de mes en hora local
**Prioridad:** P1 · **Automatizado** · `src/lib/date.test.ts`

| | |
|---|---|
| Precondición | Dispositivo en `America/Mazatlan` (UTC-7) |
| Pasos | 1. Registrar un gasto el 31 de enero a las 23:50<br>2. Verificar el total del mes en la lista |
| Resultado esperado | El gasto entra al total de **enero**. En UTC ese instante ya es 1 de febrero, y agrupar por UTC lo colocaría en el mes equivocado. |
| Alcance | La app muestra solo el mes actual, sin navegación entre periodos. La comparación entre meses contiguos se cubre en `date.test.ts`, que fija ambas fechas sin depender del reloj del dispositivo. |

### TC-011 — Consistencia al cambiar de zona horaria
**Prioridad:** P2 · Manual

| | |
|---|---|
| Pasos | 1. Registrar un gasto en `America/Mazatlan`<br>2. Cambiar el dispositivo a `Asia/Tokyo`<br>3. Reabrir la app |
| Resultado esperado | El gasto conserva el mes en que fue registrado; no migra de periodo |

---

## Suite: Sincronización offline

### TC-020 — Doble tap en Guardar
**Prioridad:** P1 · **Automatizado** · `src/lib/sync.test.ts` + `.maestro/02-double-tap.yaml`

| | |
|---|---|
| Pasos | Presionar "Guardar" dos veces en menos de 300 ms |
| Resultado esperado | Se crea **un solo** gasto. El id se genera en cliente, por lo que el segundo envío colapsa contra el primero. |
| Verificación | Sobre el **total del mes**, no sobre contar filas: si se duplicara sería `$199.98` en lugar de `$99.99`. Ver BUG-011. |

### TC-021 — Persistencia de la cola tras cierre forzado
**Prioridad:** P1 · Manual

| | |
|---|---|
| Pasos | 1. Activar modo avión<br>2. Registrar 3 gastos<br>3. Forzar el cierre de la app<br>4. Reabrir<br>5. Desactivar modo avión |
| Resultado esperado | Los 3 gastos siguen presentes tras reabrir y se sincronizan al recuperar red, sin duplicarse |

### TC-022 — Conflicto entre dos dispositivos
**Prioridad:** P1 · **Automatizado** · `src/lib/sync.test.ts`

| | |
|---|---|
| Pasos | 1. Editar el mismo gasto en A y en B, ambos offline<br>2. Reconectar A, luego B |
| Resultado esperado | Gana la edición con `updatedAt` más reciente. Ambos dispositivos convergen al mismo valor. |

### TC-023 — Borrado contra edición concurrente
**Prioridad:** P2 · **Automatizado** · `src/lib/sync.test.ts`

| | |
|---|---|
| Pasos | Borrar el gasto en A y editarlo en B, ambos offline; reconectar |
| Resultado esperado | El borrado prevalece; no reaparece un "gasto zombie" |

### TC-024 — Reintento con red intermitente
**Prioridad:** P2 · Manual

| | |
|---|---|
| Pasos | Registrar un gasto y cortar la red a mitad del envío |
| Resultado esperado | El gasto queda en estado `pending` con indicador visible y se reenvía solo, sin duplicar |

---

## Suite: Aislamiento entre cuentas

### TC-027 — Los datos no se filtran entre usuarios
**Prioridad:** P1 · Manual

| | |
|---|---|
| Pasos | 1. Entrar con el usuario A y registrar un gasto<br>2. Cerrar sesión<br>3. Entrar con el usuario B |
| Resultado esperado | B no ve ningún gasto de A, ni en la lista ni en el total. La copia local se limpia al cerrar sesión. |
| Nota | Row Level Security protege el servidor; esta prueba cubre el dispositivo, donde RLS no aplica. |

---

## Suite: Borrado

### TC-025 — Borrado con confirmación
**Prioridad:** P2 · Manual

| | |
|---|---|
| Pasos | 1. Mantener presionada una fila de la lista<br>2. Confirmar en el diálogo |
| Resultado esperado | El gasto desaparece de la lista y el total se ajusta. El borrado viaja al servidor como `deletedAt`, no como eliminación física. |

### TC-026 — Cancelar el borrado
**Prioridad:** P2 · Manual

| | |
|---|---|
| Pasos | Mantener presionada una fila y elegir Cancelar |
| Resultado esperado | Nada cambia; el gasto permanece |

---

## Suite: Sesión

### TC-031 — Cierre de sesión
**Prioridad:** P2 · Manual

| | |
|---|---|
| Pasos | Tocar "Salir" en el encabezado de la lista |
| Resultado esperado | Vuelve a la pantalla de login. Lo pendiente se intenta enviar antes de salir, y la copia local se borra: al entrar con otra cuenta la lista arranca vacía, sin gastos de la sesión anterior. |

### TC-030 — Expiración de sesión
**Prioridad:** P1 · Manual

| | |
|---|---|
| Pasos | Invalidar el token en el backend y ejecutar una acción que requiera red |
| Resultado esperado | Redirección a login con mensaje claro; los gastos locales pendientes **no** se pierden |

---

## Suite: Accesibilidad

### TC-040 — Dynamic Type al 310%
**Prioridad:** P1 · Manual

| | |
|---|---|
| Precondición | Dispositivo con tamaño de texto en el máximo accesible |
| Pasos | Recorrer la lista y el formulario de alta |
| Resultado esperado | Ningún texto cortado ni superpuesto; el monto sigue legible; todos los controles alcanzables |

### TC-041 — Área táctil mínima
**Prioridad:** P2 · Manual

| | |
|---|---|
| Resultado esperado | Todo control interactivo mide al menos 44×44 pt |

### TC-042 — Lectura con VoiceOver / TalkBack
**Prioridad:** P2 · Manual

| | |
|---|---|
| Resultado esperado | Cada gasto se anuncia como monto, categoría y fecha en un orden comprensible |

---

## Suite: Carga

### TC-050 — Carga Verdadera en el resumen
**Prioridad:** P2 · Manual

| | |
|---|---|
| Pasos | Abrir el resumen mensual con red lenta (3G simulado) |
| Resultado esperado | Un único skeleton a nivel pantalla hasta que gastos, categorías y totales estén resueltos. No se permite el renderizado en cascada de secciones parciales. |
