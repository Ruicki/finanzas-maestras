# Backlog — Cosas a agregar o mejorar

> Lista de ideas dictadas por el usuario, organizadas por apartado de la app.
> No es un registro de lo ya hecho (eso vive en `tasks.md`) — es lo que falta
> por decidir y construir. Se ataca un item a la vez: se mueve a `tasks.md`
> como una Fase nueva cuando se empieza a construir, y aquí se marca o se
> borra.

## Cuentas

## Ingresos

## Gastos

9. **[Prioridad 9 — HECHO, ver Fase 20 en `tasks.md`] Suscripciones — rediseño del modelo de cobro.** Hoy `createExpense`
   descuenta cuenta/tarjeta en el momento de crear CUALQUIER gasto, incluida una
   suscripción (plantilla `isRecurring:true`) — no distingue "crear la plantilla" de
   "cobrar un ciclo". Eso es la causa más probable de los datos repetidos en Análisis
   (item 2 abajo): el mes en que se registra la suscripción, esa creación ya cuenta
   como un gasto visible (`gastosVisiblesEnElMes`), y luego el cobro del ciclo (cron
   `autoCharge` o `markSubscriptionPaid` manual) agrega una SEGUNDA fila por el mismo
   concepto. Rediseño pedido por el usuario:
   - Distinguir dos naturalezas de gasto recurrente, aunque compartan el mismo
     mecanismo técnico: (a) una suscripción propiamente dicha — servicio fijo que se
     renueva (Netflix, Claude, etc.) — y (b) un monto recurrente que se paga sin
     falta cada ciclo en fecha fija pero no es "una suscripción" conceptualmente
     (ej. un pasaje de transporte de $30 cargado el día 15 de cada mes a una
     tarjeta, categorizado como Transporte).
   - Crear la plantilla de una suscripción NO debe mover dinero ni generar un gasto
     visible todavía — solo el cobro de un ciclo real (el día de facturación) debe
     hacerlo. Hoy sí mueve dinero en `createExpense` sin mirar `isRecurring`.
   - El gasto del ciclo debe generarse en la fecha de facturación (`dueDate`), no en
     la fecha en que el usuario registró la suscripción. Ejemplo real: factura de
     Claude es el día 13, pero el usuario la registró el día 10 — el gasto no debe
     aparecer hasta el 13.
   - Aclarar/corregir la semántica de `graceDays` ("días de gracia"): son los días
     que el usuario tiene PARA PAGAR después de la fecha de facturación, no un
     motivo para cobrar antes de tiempo. Ejemplo real: plan de datos factura el día
     24 pero se puede pagar hasta el día 9 del mes siguiente — el gasto debe
     generarse como "pendiente" el día 24 y quedar pagable (botón "Marcar pagado")
     en cualquier momento de esa ventana (24 al 9), nunca cobrarse solo.
   - Sin días de gracia (ej. Claude, factura el 13 sin ventana): el gasto se genera
     el día 13 como "pendiente por pagar"; solo pasa a "pagado" (y se descuenta de
     la cuenta) cuando el usuario lo marca a mano — nunca automático.
   - Para las suscripciones de cobro automático de verdad, dejar únicamente el
     toggle "confío"/auto-cobro ya existente (`autoCharge`), para que no se dupliquen
     como pasaba antes.

## Metas

## Deudas

## Presupuesto

6. **[Prioridad 6 — HECHO, ver Fase 23 en `tasks.md`] Resumen Ejecutivo — reestructurar.** Mantener el desglose de
   Ingresos / Gasto Fijo / Gasto Variable, pero: (a) corregir que "Disponible"
   aparezca en $0 — en `FinancialRules.tsx` es `income - needs - wants`, así que si
   sale 0 es porque `needs`/`wants` están inflados (ver la causa raíz del item 9:
   duplicados por el bug de creación de suscripciones) o porque el ingreso del mes
   es 0 (ver item de Fondo de Emergencia); (b) el "Score Financiero" (0-100) no se
   explica de forma entendible para todos los usuarios — hoy solo hay una frase
   pequeña abajo, falta un desglose claro de qué factores lo suben o bajan.
7. **[Prioridad 7 — HECHO, ver Fase 23 en `tasks.md`] Regla 50/30/20 → selector de regla financiera.** Hoy
   `FinancialRules.tsx` solo calcula 50/30/20, sin alternativa. Agregar un selector
   para que el usuario elija qué regla financiera usar (50/30/20 y otras reglas
   conocidas a definir/investigar), en vez de una única regla fija para todos.
8. **[Prioridad 8 — HECHO, ver Fase 23 en `tasks.md`] Endeudamiento — explicar el cálculo.** La tarjeta de
   Endeudamiento solo muestra el % y "MÁX 36%", sin explicar de qué sale ese
   porcentaje (es `pagos de deuda mensuales / ingreso`) ni qué cuenta como "pago de
   deuda". Agregar una explicación visible en la UI.
9. **[Prioridad 9b — HECHO, ver Fase 23 en `tasks.md`] Fondo de Emergencia — sigue sin reflejar bien la realidad.**
   Aunque haya ahorro real, no queda claro de qué cuentas/saldos toma el dato para
   graficarse. Ligado a la investigación abierta de "sigue en 0 meses": el caso más
   probable es ingreso $0 del mes (ver el early-return de `FinancialRules.tsx` que
   fuerza "Sin ingresos registrados" / 0.0 meses cuando `income === 0`, aun si hay
   mucho efectivo líquido) — pendiente de que el usuario confirme si ve ese mensaje
   exacto en Presupuesto → Regla 50/30/20.

## Análisis

1. **[Prioridad 1 — HECHO, ver Fase 21 en `tasks.md`] Gastos Más Altos del Mes — hacerlos clickeables.** Hoy es una
   lista plana sin interacción. Permitir hacer click/seleccionar cada gasto para
   desglosar su detalle (de qué está compuesto), no solo mostrarlo como fila.
2. **[Prioridad 2 — HECHO, ver Fase 22 en `tasks.md`] Balance Neto — reemplazar por algo más explicativo.** La tarjeta
   actual ("Balance Neto") es confusa, no se entiende bien qué representa.
   Reemplazar por una comparación más clara: fuente(s) de ingreso vs. los gastos más
   grandes, analizando si lo que entra alcanza para cubrir esos gastos grandes.
3. **[Prioridad 3 — HECHO, resuelto por la Fase 20] Gastos Más Altos del Mes — corregir datos duplicados.** Aparecen
   gastos repetidos por el bug del sistema de suscripciones (ver detalle y causa
   raíz en el item 9 de Gastos) — no es un bug del cálculo de `topGastosIndividuales`
   en sí, sino de los datos que recibe.
4. **[Prioridad 4 — HECHO, ver Fase 22 en `tasks.md`] Tendencia de Gasto — cambiar ventana de 3 a 6 meses.**
   `tendenciaDeGasto` en `lib/expense-insights.ts` recibe `cantidadMeses` como
   parámetro (default 3) — cambiar el valor usado en `InsightsTab.tsx` a 6.

## General / transversal

5. **[Prioridad 5] Fusionar Análisis y Presupuesto en un solo apartado.** Hoy son
   dos pestañas separadas que se perciben redundantes. Unificarlas bajo un nombre
   nuevo que cubra ambos (a decidir — ninguno de los dos nombres actuales sirve
   para el conjunto).
