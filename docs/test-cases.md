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

## Suite: Errores tipados (BUG-014)

Cuatro escenarios de fallo, cuatro pantallas distintas. Antes de esta suite,
los cuatro producían el mismo texto genérico.

### TC-032 — Tabla remota inexistente
**Prioridad:** P1 · **Automatizado** · `src/shared/errors/traducir.test.ts`

| | |
|---|---|
| Precondición | Backend remoto configurado |
| Pasos | Renombrar temporalmente la tabla `expenses` en Supabase (`alter table expenses rename to expenses_tmp`) y cargar la lista |
| Resultado esperado | "Hay un problema con el servidor" — nunca el string crudo de Postgres. Revertir el renombrado al terminar. |

### TC-033 — Sin conexión
**Prioridad:** P1 · **Automatizado** · `src/shared/errors/traducir.test.ts`

| | |
|---|---|
| Pasos | Activar modo avión y cargar la lista |
| Resultado esperado | Se muestran los gastos guardados localmente con la franja "Sin conexión — mostrando datos guardados", no un estado de error |

### TC-034 — Credenciales de login incorrectas
**Prioridad:** P1 · **Automatizado** · `src/lib/auth.test.ts`

| | |
|---|---|
| Pasos | Intentar entrar con correo o contraseña incorrectos |
| Resultado esperado | "Correo o contraseña incorrectos" — distinto del mensaje de cuenta sin confirmar |

### TC-035 — Sesión cerrada desde el backend
**Prioridad:** P1 · Manual

| | |
|---|---|
| Pasos | Con la app abierta en la lista, cerrar la sesión desde Supabase (Authentication → Users → Sign out) y refrescar |
| Resultado esperado | Redirección a `/login`, sin mostrar un estado de error mudo primero |

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

---

## Suite: Ingresos y balance

### TC-070 — Balance neto del mes
**Prioridad:** P1 · **Automatizado** · `.maestro/07-balance-con-ingreso.yaml`

| | |
|---|---|
| Precondición | Mes en curso sin movimientos |
| Pasos | 1. Registrar un gasto de `300.00`<br>2. Registrar un ingreso de `1,000.00` desde "+ Ingreso" |
| Resultado esperado | El balance del mes muestra `$700.00`; "Gastos" muestra `$300.00` e "Ingresos" `$1,000.00` |
| Nota | La aserción va sobre el balance y no sobre el ingreso: que el ingreso aparezca solo prueba que se guardó; que el balance sea la resta prueba que ambos features se están hablando sobre el mismo periodo. |

### TC-071 — Balance negativo
**Prioridad:** P2 · **Automatizado** · `.maestro/07-balance-con-ingreso.yaml`

| | |
|---|---|
| Pasos | Registrar un gasto sin ningún ingreso en el mes |
| Resultado esperado | El balance muestra `-$300.00` en rojo, con su signo. No se topa en cero ni se muestra en valor absoluto |
| Nota | Gastar más de lo que entró es justo el dato que la pantalla existe para dar. |

### TC-072 — Rechazo de ingreso no positivo
**Prioridad:** P1 · **Automatizado** · `src/features/ingresos/api/ingresos.local.test.ts`

| | |
|---|---|
| Pasos | Intentar registrar un ingreso de `0` y otro de `-1` |
| Resultado esperado | Ambos se rechazan con `MoneyError` y no quedan guardados |
| Nota | La validación vive en el backend, no solo en la pantalla: el día que un recurrente genere ingresos solo, la regla tiene que seguir de pie. |

### TC-073 — Clasificación del ingreso por mes local
**Prioridad:** P1 · **Automatizado** · `src/features/ingresos/totales.test.ts`

| | |
|---|---|
| Pasos | Registrar un ingreso el 30 de septiembre a las 23:50 en `-07:00` |
| Resultado esperado | Cuenta para septiembre, no para octubre |
| Nota | BUG-002 aplicado a ingresos: el periodo se decide en hora local, nunca en UTC. |

### TC-074 — Los ingresos no sobreviven al cierre de sesión
**Prioridad:** P1 · **Automatizado** · `src/features/auth/api/auth.remote.test.ts`

| | |
|---|---|
| Pasos | Registrar un ingreso, cerrar sesión y entrar con otra cuenta |
| Resultado esperado | La copia local de ingresos queda vacía |
| Nota | BUG-013 se cerró cuando gastos era la única tabla del usuario. Cada tabla nueva reabre el agujero por su cuenta. |

---

## Suite: Presupuestos

### TC-080 — Aviso al cruzar el 80% y el 100%
**Prioridad:** P1 · **Automatizado** · `.maestro/08-presupuesto-umbral.yaml`

| | |
|---|---|
| Precondición | Límite de `500.00` en Comida, mes sin gastos |
| Pasos | 1. Gastar `390.00` (78%)<br>2. Gastar `20.00` más (82%)<br>3. Gastar `90.00` más (100%) |
| Resultado esperado | Sin aviso en el paso 1; "Vas al 80% de Comida" en el 2; "Te pasaste del presupuesto de Comida" en el 3 |
| Nota | No se usa `400.00` exacto en el paso 1: `400/500` **es** el 80%, y el umbral se cruza al alcanzarlo, no al pasarlo. Ese caso lo fija `progreso.test.ts`. |

### TC-081 — El aviso no se repite
**Prioridad:** P1 · **Automatizado** · `.maestro/08-presupuesto-umbral.yaml` y `progreso.test.ts`

| | |
|---|---|
| Pasos | Con el umbral ya cruzado, registrar otro gasto de la misma categoría |
| Resultado esperado | No aparece ningún aviso |
| Nota | `umbralCruzado` compara el estado de antes contra el de después en vez de mirar solo el acumulado. Preguntando "¿ya pasé el 80%?" el aviso saldría en cada gasto posterior al primero, y a la tercera vez se deja de leer. |

### TC-082 — El override del mes manda sobre el general
**Prioridad:** P2 · **Automatizado** · `src/features/presupuestos/progreso.test.ts`

| | |
|---|---|
| Pasos | Con `500.00` general en Comida y `1,500.00` para 2026-12, evaluar un gasto de diciembre |
| Resultado esperado | El límite aplicable es `1,500.00` |
| Nota | El caso normal —500 al mes, siempre— es una sola fila, no doce al año por categoría. |

### TC-083 — Un límite por categoría y periodo
**Prioridad:** P1 · **Automatizado** · `src/features/presupuestos/api/presupuestos.local.test.ts`

| | |
|---|---|
| Pasos | Fijar `500.00` en Comida y luego `700.00` en Comida |
| Resultado esperado | Queda un solo presupuesto, de `700.00`, con el mismo id que el primero |
| Nota | Lo que el usuario hace es "el límite de Comida ahora es 700", no "agrega otro límite". Sin el upsert, la pantalla mostraría el que SQLite devolviera primero. Conservar el id importa para cuando esto sincronice: el servidor debe ver la misma fila cambiando, no un alta nueva por edición. |

### TC-084 — La barra se topa al 100% aunque el gasto no
**Prioridad:** P2 · Manual

| | |
|---|---|
| Pasos | Rebasar el límite de una categoría en un 40% |
| Resultado esperado | El relleno de la barra llega al 100% y no se sale de la tarjeta; el texto muestra el monto real rebasado, en rojo |

---

## Suite: Recurrentes

### TC-090 — El cobro se materializa al vencer
**Prioridad:** P1 · **Automatizado** · `.maestro/09-recurrente-sin-duplicar.yaml`

| | |
|---|---|
| Pasos | Dar de alta un recurrente mensual de `1,000.00` que arranca hoy |
| Resultado esperado | El gasto aparece en la lista sin reiniciar la app, y el total del mes lo incluye |

### TC-091 — Reabrir la app no duplica el cobro
**Prioridad:** P1 · **Automatizado** · `.maestro/09-recurrente-sin-duplicar.yaml` y `generador.test.ts`

| | |
|---|---|
| Pasos | Con el cobro ya generado, cerrar y reabrir la app tres veces **sin** limpiar estado |
| Resultado esperado | El total sigue siendo `$1,000.00`; nunca `$2,000.00` ni más |
| Nota | `generadas_hasta` avanza cobro por cobro, no al final del lote. El flujo E2E no lleva `clearState`: reiniciar limpiando el estado probaría lo contrario de lo que se quiere probar. |

### TC-092 — Reapertura tardía: varios periodos de una vez
**Prioridad:** P1 · **Automatizado** · `src/features/recurrentes/calendario.test.ts`

| | |
|---|---|
| Pasos | Con un recurrente mensual iniciado el 1 de julio y la app cerrada hasta el 20 de septiembre, abrirla |
| Resultado esperado | Entran tres cobros —1 jul, 1 ago, 1 sep— cada uno con **su** fecha, no los tres con la de hoy |
| Nota | Un cobro de agosto pertenece al corte de agosto. Fecharlos todos hoy rompería el total de los meses anteriores. |

### TC-093 — "El 31 de cada mes" sobrevive a febrero
**Prioridad:** P1 · **Automatizado** · `src/features/recurrentes/calendario.test.ts`

| | |
|---|---|
| Pasos | Recurrente mensual iniciado el 31 de enero; revisar las cuatro ocurrencias siguientes |
| Resultado esperado | 28 feb, 31 mar, 30 abr, 31 may |
| Nota | Es el caso que obliga a calcular cada ocurrencia desde la fecha de inicio y no desde la anterior. Encadenando, el 28 de febrero se vuelve la nueva base y "el 31" se convierte en "el 28" para siempre. |

### TC-094 — Pausar no es borrar
**Prioridad:** P2 · **Automatizado** · `src/features/recurrentes/api/recurrentes.local.test.ts`

| | |
|---|---|
| Pasos | Apagar un recurrente ya generado y volver a encenderlo |
| Resultado esperado | Conserva su marca de generación y no regenera los cobros del periodo en que estuvo apagado |

### TC-095 — Recordatorio dos días antes
**Prioridad:** P2 · Manual (programación automatizada en `avisos.test.ts`)

| | |
|---|---|
| Pasos | Con un recurrente activo, adelantar la fecha del dispositivo hasta dos días antes del cobro |
| Resultado esperado | Llega una notificación local con el nombre, el monto y el día del cobro |
| Nota | El cálculo del momento sí está automatizado; lo que solo se puede verificar en dispositivo es que el sistema operativo la entregue. Los avisos se cancelan y reprograman enteros en cada arranque: sincronizar la lista contra la del sistema cuesta más código que rehacerla. |
