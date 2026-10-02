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

---

## Suite: Reportes

### TC-100 — El reporte suma lo mismo que la lista
**Prioridad:** P1 · **Automatizado** · `.maestro/10-reportes.yaml`

| | |
|---|---|
| Pasos | Registrar `120.00` y `80.00` en Comida, abrir Reportes |
| Resultado esperado | El centro del anillo muestra `$200.00`, igual que el total del mes en la lista, y Comida se lleva el `100%` |
| Nota | Que la gráfica se dibuje no prueba nada; que sume igual que la otra pantalla, sí. |

### TC-101 — Una sola categoría dibuja un anillo, no un vacío
**Prioridad:** P1 · **Automatizado** · `src/features/reportes/donut.test.ts`

| | |
|---|---|
| Pasos | Con gastos en una sola categoría, abrir Reportes |
| Resultado esperado | Se ve el anillo completo de ese color |
| Nota | Un arco de 360° tiene el mismo punto de inicio y de fin, y SVG no sabe qué camino tomar: no pinta nada. El caso se resuelve con dos semicírculos. |

### TC-102 — La categoría mayoritaria se ve mayoritaria
**Prioridad:** P1 · **Automatizado** · `src/features/reportes/donut.test.ts`

| | |
|---|---|
| Pasos | Con un reparto 75/25, revisar el arco de la categoría mayor |
| Resultado esperado | Ocupa tres cuartos del anillo |
| Nota | Sin la bandera `largeArc`, SVG dibuja el camino corto y la categoría mayoritaria aparece como la minoritaria. Es el error más caro posible en esta gráfica, y por eso tiene prueba propia. |

### TC-103 — Un mes vacío se dibuja, no se salta
**Prioridad:** P2 · **Automatizado** · `src/features/reportes/agregados.test.ts`

| | |
|---|---|
| Pasos | Con gastos en julio y septiembre pero no en agosto, abrir el comparativo |
| Resultado esperado | Agosto aparece con barra en cero |
| Nota | Una gráfica que salta de julio a septiembre miente sobre la tendencia. El mes vacío es información. |

### TC-104 — Rendimiento con volumen
**Prioridad:** P2 · Manual

| | |
|---|---|
| Pasos | Con 500+ gastos registrados, abrir Reportes |
| Resultado esperado | La pantalla carga en menos de 1s |
| Nota | La migración v5 indexa `gastos.occurred_at`, que es por donde ordenan tanto la lista como las agregaciones del reporte. |

---

## Suite: Cuentas

### TC-110 — La migración no pierde un solo movimiento
**Prioridad:** P1 · **Automatizado** · `src/shared/lib/db/migraciones.sqlite.test.ts`

| | |
|---|---|
| Precondición | Base en `user_version = 1` con 8 gastos de montos irregulares |
| Pasos | Aplicar todas las migraciones hasta la v6 |
| Resultado esperado | `count(*)` y `sum(amount_cents)` idénticos antes y después; los 8 quedan en la cuenta General; la suma agrupada por cuenta es exactamente el total previo |
| Nota | Es el criterio de salida de la Fase 5 y no hay forma de verificarlo sin ejecutar el SQL. La suite corre las migraciones contra el SQLite que trae Node (`node:sqlite`), que es otro binario pero el mismo dialecto. Por eso el CI pasó de Node 20 a 22. |

### TC-111 — La migración es reversible
**Prioridad:** P1 · **Automatizado** · `src/shared/lib/db/migraciones.sqlite.test.ts`

| | |
|---|---|
| Pasos | Aplicar la v6 y revertirla: `cuenta_id` a null, borrar General, bajar `user_version` |
| Resultado esperado | El total y el conteo vuelven a ser los de antes; no queda ninguna cuenta |
| Nota | El id de General es literal y no generado al vuelo justo por esto: con un id aleatorio, el `down` tendría que adivinar cuál de las cuentas la creó la migración. |

### TC-112 — Saldo por cuenta y consolidado
**Prioridad:** P1 · **Automatizado** · `.maestro/11-cuentas.yaml` y `saldos.test.ts`

| | |
|---|---|
| Pasos | Crear una segunda cuenta con `2,000.00` de saldo inicial y cargarle un gasto de `500.00` |
| Resultado esperado | El consolidado pasa de `$2,000.00` a `$1,500.00`; el saldo de General no cambia |

### TC-113 — Un movimiento sin cuenta se cuenta en General
**Prioridad:** P1 · **Automatizado** · `src/features/cuentas/saldos.test.ts`

| | |
|---|---|
| Pasos | Con un gasto sin `cuentaId` —como los que vuelven de Supabase—, calcular los saldos |
| Resultado esperado | Suma en General |
| Nota | Dejarlo fuera de todos los saldos haría que la suma de las cuentas no cuadrara con el total, que es justo el invariante que esta fase promete. |

### TC-114 — Sincronizar no borra la cuenta del movimiento
**Prioridad:** P1 · **Automatizado** · `src/shared/lib/reconcile.test.ts`

| | |
|---|---|
| Pasos | Editar un gasto en otro dispositivo y sincronizar |
| Resultado esperado | Gana la versión remota, pero el gasto conserva su cuenta local |
| Nota | `cuenta_id` existe en SQLite pero no en el esquema de Supabase, así que lo que vuelve del servidor llega sin cuenta. El servidor no tiene una opinión distinta sobre la cuenta: no tiene ninguna. Sin este rescate, el saldo de una cuenta cambiaría solo tras cada sincronización. |

### TC-115 — La cuenta General no se puede eliminar
**Prioridad:** P2 · **Automatizado** · `src/features/cuentas/api/cuentas.local.test.ts`

| | |
|---|---|
| Pasos | Intentar eliminar la cuenta General |
| Resultado esperado | Sigue ahí |

---

## Suite: Exportación

### TC-120 — El flujo de exportación llega hasta la hoja de compartir
**Prioridad:** P2 · **Automatizado** · `.maestro/12-exportar.yaml`

| | |
|---|---|
| Pasos | Abrir Reportes → Exportar, revisar las opciones, cancelar, y luego generar el CSV |
| Resultado esperado | El modal ofrece periodo y los dos formatos; cancelar y generar devuelven a Reportes sin error |
| Nota | Maestro no lee el sistema de archivos del dispositivo, así que el contenido del archivo no se puede verificar desde aquí. Por eso el CSV y el HTML del PDF tienen 31 casos unitarios propios. |

### TC-121 — El CSV abre bien en una hoja de cálculo
**Prioridad:** P1 · Manual (contenido automatizado en `csv.test.ts`)

| | |
|---|---|
| Pasos | Exportar un rango de 3 meses y abrir el CSV en Excel y en Google Sheets |
| Resultado esperado | Los acentos se leen bien, las columnas no están corridas y la suma de la columna Monto da el balance del periodo |
| Nota | Tres cosas lo hacen posible, y las tres fallan en silencio si faltan: el BOM de UTF-8 (sin él Excel en Windows destroza los acentos), el escapado RFC 4180 (una coma sin escapar corre una columna) y el monto como número puro (`$1,234.56` en una celda es texto y deja de sumarse). |

### TC-122 — Los gastos salen en negativo
**Prioridad:** P1 · **Automatizado** · `src/shared/lib/exporters/csv.test.ts`

| | |
|---|---|
| Resultado esperado | La columna Monto trae los gastos en negativo y los ingresos en positivo |
| Nota | Puesta así, la columna se suma de golpe en la hoja y da el balance del periodo, que es lo primero que alguien hace con un export. |

### TC-123 — Un nombre con caracteres especiales no rompe el PDF
**Prioridad:** P1 · **Automatizado** · `src/shared/lib/exporters/pdf.test.ts`

| | |
|---|---|
| Pasos | Exportar con una categoría llamada `Ropa & Calzado` y una nota con `<` |
| Resultado esperado | El PDF sale completo, con el texto tal cual |
| Nota | Sin escapar, el documento queda mal formado y el PDF sale con la tabla partida o con texto desaparecido — sin error de por medio. |

### TC-124 — El rango incluye el último día completo
**Prioridad:** P1 · **Automatizado** · `src/features/reportes/exportar.test.ts`

| | |
|---|---|
| Pasos | Exportar septiembre con un gasto registrado el 30 a las 23:59 |
| Resultado esperado | El gasto entra en el archivo |
| Nota | Quien pide "hasta el 30" quiere el 30 completo. Comparar contra su medianoche dejaría fuera todo lo de ese día. |

### TC-125 — El PDF se ve igual sin red
**Prioridad:** P2 · Manual

| | |
|---|---|
| Pasos | Exportar en PDF con el dispositivo en modo avión |
| Resultado esperado | El documento sale con su formato completo |
| Nota | Los estilos van en línea y no hay fuentes ni hojas remotas: el motor de impresión renderiza sin red, y una hoja de estilos externa que no cargue dejaría el PDF sin formato. |

---

## Suite: Metas de ahorro

### TC-130 — Tres aportes suman su total
**Prioridad:** P1 · **Automatizado** · `.maestro/13-metas.yaml` y `metas.local.test.ts`

| | |
|---|---|
| Pasos | Crear una meta de `1,000.00` y aportar `300.00`, `300.00` y `500.00` |
| Resultado esperado | El progreso muestra `$300.00`, `$600.00` y `$1,100.00` de `$1,000.00` |
| Nota | Aportar recibe el **monto** del aporte, no el nuevo total. Con el total, el cálculo quedaría del lado de la pantalla y dos aportes rápidos partirían del mismo valor viejo. |

### TC-131 — Rebasar la meta no desborda la barra
**Prioridad:** P1 · Manual (el dato, automatizado en `metas.local.test.ts`)

| | |
|---|---|
| Pasos | Aportar más de lo que falta para el objetivo |
| Resultado esperado | La barra llega al 100% y no se sale de la tarjeta; el texto muestra el monto real (`$1,100.00 de $1,000.00`) y aparece "Meta cumplida" en verde |
| Nota | El dato no se topa —toparlo silenciaría dinero que el usuario sí apartó—; se topa la barra al dibujar. Es la misma `GBarraDeProgreso` de presupuestos con el color al revés: allá pasarse es malo, aquí es la buena noticia. |

### TC-132 — La fecha límite tiene que existir
**Prioridad:** P2 · **Automatizado** · `metas.local.test.ts` y `date.test.ts`

| | |
|---|---|
| Pasos | Crear una meta con fecha límite `2027-02-30` |
| Resultado esperado | Se rechaza con un mensaje en el formulario |
| Nota | Tiene la forma correcta y no es un día. `Date.parse` la aceptaría y la recorrería en silencio al 2 de marzo. |
