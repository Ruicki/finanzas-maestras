# Seguimiento Maestro de Tareas — Finanzas Maestras

> Estado verificado contra el código, no de memoria: cada casilla marcada se
> comprobó buscando el archivo o la función concreta en el repositorio.

## Fase 1: Seguridad Crítica e Infraestructura

- [x] 1.1 Crear `lib/env.ts` con `getJwtSecretKey()` y validación Fail-Fast.
- [x] 1.2 Actualizar `lib/auth-utils.ts` removiendo `'secret-key-change-me-in-prod'`.
- [x] 1.3 Middleware en la raíz con protección RBAC para `/admin`.
      → **Hecho, y la premisa original era errónea.** La tarea pedía renombrar
      `proxy.ts` a `middleware.ts` por ser "el nombre que espera Next.js". Es al
      revés: Next.js 16 deprecó `middleware` en favor de `proxy`
      (`next/dist/build/index.js`: *"The `middleware` file convention is
      deprecated. Please use `proxy` instead"*, con codemod
      `middleware-to-proxy`), y tener los dos archivos a la vez es un error de
      compilación. `proxy.ts` es el nombre correcto y se queda.
      La parte real de la tarea —RBAC— ya está: `proxy.ts:44` redirige a `/`
      cualquier ruta `/admin` sin `payload.role === 'ADMIN'`.
- [x] 1.4 Proteger `getGlobalStats` en `app/actions/budget/profiles.ts` (requerir rol `ADMIN`).
- [x] 1.5 Mitigar IDOR en `app/actions/budget/expenses.ts` (`createExpense`, `updateExpense`).
- [x] 1.6 Mitigar IDOR en `app/actions/budget/credit-cards.ts` (`payCreditCard`).

## Fase 2: Lógica Financiera y Motor de Cálculo

- [x] 2.1 Corregir cálculo de `getBestPurchaseDay` en `lib/financial-engine.ts`.
- [x] 2.2 Corregir clasificación de `days === 0` en `getDaysToCutoff`.
- [x] 2.3 Implementar utilidades de redondeo financiero estricto a 2 decimales.

## Fase 3: Ciclo de Vida y Server Components

- [x] 3.1 Eliminar mutaciones de base de datos dentro del render de `app/page.tsx`.
      → El render ya no escribe. Antes llamaba a `ensureProfileIntegrity` y
      **volvía a pedir el perfil entero**: dos consultas completas y una posible
      escritura en cada carga, para reparar algo que solo le falta a los perfiles
      anteriores a 3.2. Ahora lo que queda es una comprobación sobre datos ya
      cargados (`necesitaSiembraInicial`), sin consulta; si de verdad falta algo,
      el dashboard pide la reparación una vez, ya montado.
      → `ensureProfileIntegrity` además se tragaba sus errores: podía no reparar
      nada y nadie se enteraba. Ahora los propaga y el usuario ve el fallo.
- [x] 3.2 Asegurar que el onboarding (cuenta 'Efectivo' y categorías) se ejecute en `register`.
      → Cuenta y categorías se siembran en el mismo `create` del perfil
      (`lib/perfil-nuevo.ts`), anidado, así que es una sola escritura atómica y
      no existe el perfil a medio montar. Aplicado a las tres vías de alta que
      hay —registro, alta por administrador y seed—; antes un perfil creado por
      un administrador llegaba vacío. `resetProfileData` vuelve a sembrar en su
      propia transacción, en vez de dejar el perfil sin categorías con las que
      registrar un gasto.

## Fase 4: Validación de Entradas con Zod

- [x] 4.1 Instalar dependencia `zod`.
- [x] 4.2 Crear esquemas de validación en `lib/validators/`.
- [x] 4.3 Integrar `safeParse` en las Server Actions.
- [x] 4.4 Aplicar política de complejidad de contraseñas en `register`.

## Fase 5: Base de Datos y Rendimiento

- [x] 5.1 Agregar índices `@@index` en claves foráneas (16 declarados).
- [x] 5.2 Migraciones restablecidas.
      → **Resuelto, y era la causa de una caída real en producción.** El esquema
      y la base viajaban por caminos separados: `prisma/migrations/` se borró en
      `e6a4865`, y el script `"release"` que prometía aplicarlas **Vercel no lo
      ejecuta nunca**, mientras `postinstall: prisma generate` sí corre. Así que
      el cliente siempre esperaba el esquema nuevo, existiera o no la columna.
      Al fusionar el PR #32 eso tumbó la aplicación entera.
      → Ahora: baseline `0_init` del esquema completo, migración
      `20260914120000_add_color_theme`, y `scripts/migrate-deploy.mjs` enganchado
      al `build`, que es lo que Vercel sí ejecuta. Si una migración falla, falla
      el despliegue: es preferible no desplegar a desplegar código que la base no
      soporta.
      → **La adopción es automática.** `prisma migrate deploy` se niega con
      `P3005` sobre una base que tiene tablas pero no historial —justo el estado
      de esta—, así que el script detecta ese código, marca la baseline como
      aplicada y reintenta. Verificado contra un Postgres real en los tres casos:
      base vacía, base con historial, y base con tablas sin historial.
      → Retirado el script `release`, que prometía lo que no hacía.
      → **Efecto en local:** `npm run build` ahora necesita base de datos. Para
      construir sin ella, `npx next build` directamente.

## Fase 6: Refactorización y Principio SRP en UI

- [x] 6.1 Modularizar `DebtsTab.tsx`. 779 → 474 líneas. Fuera:
      `DebtFreedomHeader`, `DebtWizard`, `LoanPaymentModal` y, en `lib/debts.ts`,
      las cuentas (fecha de libertad, deuda total, cuenta preferida para pagar)
      con 13 pruebas.
- [x] 6.2 Modularizar `BudgetsTab.tsx`. 466 → 186 líneas. Fuera:
      `SubscriptionsPanel` y `lib/budgets.ts`.
      → Lo que justificaba el cambio: la regla del arrastre del mes anterior
      estaba escrita **dos veces**, una para el resumen y otra dentro del bucle
      de las tarjetas. Dos copias de la misma regla es como el total acaba sin
      cuadrar con lo que tiene debajo. Ahora hay una, con 18 pruebas.
- [x] 6.3 Desacoplar modales restantes en `GoalsTab.tsx`. 717 → 274 líneas.
      Fuera: `GoalCard`, `GoalFormModal`, `GoalHistoryModal`,
      `GoalReclaimModal` y el catálogo de categorías.
      → Verificado en navegador real contra `/preview-temas`, que renderiza el
      dashboard con datos falsos: las 7 pestañas pintan, el asistente de
      préstamo cambia entre Banco y Amigo, el formulario de meta abre y el panel
      de suscripciones muestra bien el equivalente mensual de una anual. Cero
      errores de consola.

## Fase 7: Testing y Rate Limiting Distribuido

- [x] 7.1 Configurar rate limiting persistente por IP (`lib/rate-limit.ts`).
- [x] 7.2 Crear suite de pruebas para el motor financiero (4 suites, 74 casos).

## Fase 8: Integridad del dinero y presentación

> Añadida tras una revisión motivada por un reporte de "un monto que se pierde".

- [x] 8.1 Usar el guard `decrementCreditCardBalance` también al borrar y editar
      gastos. Antes descontaban en crudo y el saldo de la tarjeta podía quedar
      en negativo si el cargo ya estaba pagado.
- [x] 8.2 Bloquear el borrado de una cuenta que tenga gastos ya pagados, en vez
      de dejarlos huérfanos sin cuenta a la que devolver el dinero.
- [x] 8.3 Mostrar `destAmount` en las transferencias entrantes con tipo de cambio.
- [x] 8.4 Apuntar las 47 llamadas a `revalidatePath` a `/`, la ruta real del
      dashboard, en vez de a `/budget`, que no existe.
- [x] 8.5 Corregir el desbordamiento de elementos en pantallas estrechas y pasar
      las 21 alturas de viewport de `vh` a `dvh`.

## Fase 9: Primer uso

- [x] 9.1 Arreglar el recorte de la ventana de bienvenida en móvil (tope de alto,
      cuerpo desplazable y botones fijos abajo).
- [x] 9.2 Que los botones de la bienvenida abran el asistente de destino, en vez
      de dejar al usuario en una pestaña vacía.
- [x] 9.3 Que el texto de la bienvenida no afirme lo que no puede garantizar.
- [x] 9.4 Reiniciar `onboardingSeenAt` al resetear el perfil.
- [x] 9.5 Crear `prisma/seed.ts` y `npm run seed:nuevo` para repetir el primer uso.
- [x] 9.6 Unificar las pantallas vacías de las 7 pestañas con `EmptyState`.
- [x] 9.7 Recorrido de bienvenida en 3 pasos, saltable, con "Ver la introducción
      otra vez" en Ajustes.
- [x] 9.8 Guardar el tema de color en el perfil en vez de en `localStorage`.
      → Desbloqueado a mano: la columna `Profile.colorTheme` se creó con un
      `ALTER TABLE` directo en Neon antes de desplegar el código, que es el
      orden obligatorio —al revés tumba la aplicación entera, porque toda
      lectura de perfil pediría un campo inexistente—. `localStorage` deja de
      ser la verdad y queda como caché por dispositivo para evitar el parpadeo
      antes de que el servidor pueda opinar.

## Fase 10: Huecos de producto detectados

> No son deuda técnica: son cosas que faltan para que la app se sostenga sola.
> Ordenadas por lo que más daño hace hoy.

- [ ] 10.1 **Multi-moneda a medias.** `Account.currency` y los tres campos de
      conversión de `Transfer` existen, pero no hay moneda de perfil ni conversión
      en los totales: el encabezado suma importes de monedas distintas como si
      fueran la misma.
- [ ] 10.2 **Sin cascadas en la base de datos.** Solo 2 reglas `onDelete` en todo
      el esquema; los borrados se hacen a mano y ya han fallado por olvido.
      → **Desbloqueado** por 5.2: ya hay migraciones con las que cambiar el esquema.
- [x] 10.3 **Doble verdad en la categoría del gasto.** Resuelto sin migración:
      `category` deja de ser una segunda opinión y pasa a ser espejo de
      `categoryId`. El servidor lo deriva de la relación al crear y al editar
      (`app/actions/budget/expenses.ts`), y `updateCategory` lo arrastra al
      renombrar, en la misma transacción. Las lecturas van por
      `lib/expense-category.ts`, donde la relación manda y el texto es solo
      respaldo para los gastos que no la tienen.
      → De paso cerró dos fallos: `categoryId` llegaba del cliente **sin
      comprobar que la categoría fuera del perfil**, y `BudgetCard` emparejaba
      por relación *o* texto, así que un gasto con nombre viejo se contaba en
      dos presupuestos a la vez.
      → Retirar la columna sigue pendiente de 5.2 (migraciones). Está marcada
      como obsoleta en `prisma/schema.prisma`.
- [x] 10.4bis **Exportación incompleta.** El botón funcionaba, pero sacaba solo
      salarios, ingresos y gastos: quedaban fuera transferencias, metas,
      préstamos y saldos. Ahora son dos archivos, movimientos y situación
      actual, con los datos pedidos al servidor al pulsar
      (`app/actions/export.ts`) y BOM para que Excel no rompa los acentos.
- [x] 10.4 **Recuperación de contraseña con código de un solo uso.** El camino
      medio existía —`/claim` ya canjeaba un código por correo y contraseña
      nuevos—, pero faltaban las dos puntas: el botón de emitir código solo
      aparecía para perfiles **sin correo**, así que a quien ya tenía cuenta no
      se le podía emitir ninguno, y el login no explicaba qué pasaba después de
      "contacta al administrador".
      → Ahora el administrador emite el código para cualquier perfil, y la
      contraseña nueva la elige la persona: con el `resetPassword` que había, la
      contraseña la acababa sabiendo el administrador.
      → Los códigos caducan a las 48 h (`lib/access-code.ts`). Sin caducidad
      eran una llave permanente guardada en claro. La fecha va dentro del propio
      código en vez de en una columna, porque añadir columnas depende de 5.2;
      no se puede falsear, ya que el código se busca por igualdad exacta contra
      la fila. Los códigos antiguos, sin caducidad, se tratan como caducados.
      → El límite de intentos ya cubría este caso: `checkRateLimit` aplica un
      tope grueso por IP+acción precisamente para que no se evada rotando el
      correo.
- [x] 10.5 **Registro de errores en producción.** `lib/logger.ts` expone
      `reportError(error, contexto)`, único punto de reporte: JSON de una línea
      en producción —buscable por `accion` y `profileId` en los registros de
      Vercel— y formato con color en desarrollo. Migradas las 9 acciones de
      servidor; los `console.error` que quedan son de cliente, donde winston no
      debe cargarse.

## Fase 11: Que la app sepa explicar sus propios fallos

> Añadida tras una caída en producción que costó horas de diagnóstico, no porque
> el fallo fuera sutil, sino porque la app no decía nada: un 500 daba un número
> que solo se resuelve entrando en los registros de Vercel.

- [x] 11.1 `lib/db-errors.ts` traduce un error de Prisma a un mensaje que se
      puede leer: columna ausente (con su nombre), tabla ausente, sin conexión,
      credenciales, base inexistente, saturada, variable sin definir.
      → **Nunca devuelve el mensaje original:** puede llevar dentro la cadena de
      conexión con la contraseña. Hay pruebas que lo comprueban.
      → `esErrorDeBaseDeDatos()` distingue esto de un fallo de autorización, que
      debe seguir subiendo en vez de disfrazarse de problema de base de datos.
- [x] 11.2 `app/page.tsx` muestra ese diagnóstico en vez de la pantalla genérica,
      y reporta el error completo a los registros.
- [x] 11.3 Salida de emergencia. Con sesión válida, `proxy.ts` devuelve `/login`
      a `/`; si `/` está rota, el usuario queda encerrado sin poder cerrar
      sesión. `/login?salir=1` borra las cookies y deja pasar.
      → De paso, si falta `JWT_SECRET` el middleware ya no redirige `/login` a sí
      misma, que provocaba un bucle en vez de un mensaje.

## Fase 12: Gastos proyectados — bug reportado por el usuario

> "Si se proyecta [un gasto] después no hay forma de eliminarlo ni de
> volverlo un gasto." Investigado a fondo antes de tocar código: se
> descartaron cinco hipótesis (serialización, condiciones JSX de los botones,
> guard de doble clic, validación de `confirmExpense`, guard de
> `deleteExpense`) antes de confirmar la causa real.

- [x] 12.1 Causa raíz: `components/BudgetDashboard.tsx` filtraba `expensesList`
      por el mes visible antes de pasarlo a `ExpensesTab`. El wizard invita a
      poner fecha futura a una proyección ("Aún no ha pasado: no descuenta el
      saldo hasta que lo confirmes"), así que una proyección con fecha de otro
      mes quedaba fuera de la lista — su fila, y con ella los botones de
      confirmar y eliminar, nunca se renderizaban. No estaban rotos: no
      existían en el DOM.
      → El fix va junto con un bug relacionado que ya estaba señalado: el KPI
      "Gastos" del encabezado (línea 164-169 antes del cambio) no excluía
      `isProjected`, al revés que Presupuesto, Insights y la exportación. Si
      las proyecciones dejan de filtrarse por mes sin arreglar esto, el KPI
      empeora: pasaría a sumar proyecciones de cualquier mes.
      → Extraído a `lib/dashboard-expenses.ts` (`gastosVisiblesEnElMes`,
      `totalGastadoDelMes`) con 9 pruebas — una regresión aquí es exactamente
      cómo se llegó a este bug.
      → Verificado en navegador real contra `/preview-temas` con una
      proyección de prueba fechada en otro mes: apareció con su botón de
      confirmar, y el KPI del encabezado no la contó ($545 = solo los gastos
      reales de septiembre, con las dos proyecciones —una del mismo mes, una
      de otro— excluidas de las dos).

## Fase 13: Código muerto — 7 funciones sin ningún llamador

> Auditoría honesta pedida por el dueño del repo tras varias sesiones de
> trabajo seguidas: "revisa y dime qué apartados están inconclusos". Entre los
> hallazgos, un grupo de funciones huérfanas confirmadas por grep exhaustivo
> (cero importadores), sin relación entre sí salvo estar muertas.

- [x] 13.1 `app/actions/budget/budget-categories.ts` — archivo entero huérfano,
      borrado. Contenía un `updateCategoryLimit` duplicado (el real vive en
      `app/actions/categories.ts`) más `toggleCategoryRollover` y
      `updateCategoryRolloverBalance` — las dos acciones que habrían activado
      `Category.isRollover`, sin ningún control en la interfaz que las llamara.
      → Se consideró construir el toggle que les daba uso (el cálculo de
      arrastre ya funciona en `lib/budgets.ts` e `InsightsTab.tsx`), pero se
      decidió no hacerlo en esta pasada: el rollover sigue sin forma de
      activarse desde la UI. Queda documentado como pendiente si se retoma.
      → `app/actions/budget/index.ts` deja de reexportar ese archivo.
- [x] 13.2 `impersonate` en `app/actions/auth.ts` — envoltorio redundante de
      `startImpersonation`, que sigue siendo la función real. Borrado.
- [x] 13.3 `updateCreditCardBalance` y `recalculateCardBalance` en
      `app/actions/budget/credit-cards.ts` — sin llamadores. Borradas junto
      con el import de `toNum`, que solo ellas usaban.
- [x] 13.4 `getCategoryBudget` y `getProfileBudgets` en
      `app/actions/budget/budgets.ts` — sin llamadores. Borradas junto con el
      import de `toNum`. `setCategoryBudget` (la única función real de este
      archivo, usada por `components/budgets/BudgetCard.tsx`) queda intacta.
      → `npx tsc --noEmit`, `npm run lint`, `npm test` (158/158) y
      `npx next build` limpios tras el borrado.

## Fase 14: Proyección de gastos recurrentes + estado del sistema de "suscripciones"

> El usuario recordó dos cosas más tras el PR #36. Investigadas a fondo con
> dos agentes en paralelo antes de tocar código.

- [x] 14.1 **Un gasto recurrente y una proyección se excluían solo en la
      interfaz**, no por una regla de negocio real: `ExpenseWizard.tsx`
      ocultaba un toggle cuando el otro estaba activo, pero ni `createExpense`
      ni `confirmExpense` lo impedían, y el cron (`processRecurringExpenses`,
      `app/actions/budget/expenses.ts:373-383`) excluye explícitamente
      `isProjected: true` de su consulta — un registro híbrido habría quedado
      congelado para siempre frente al motor de recurrencia.
      → Se le ofrecieron dos caminos al usuario: una vista de pronóstico sin
      tocar el modelo de datos, o permitir el registro híbrido de verdad
      (exige arreglar el cron y `confirmExpense`). Eligió la vista de
      pronóstico.
      → `lib/budgets.ts`: nueva función `montoPendienteEsteMes`, reutilizando
      `getSubscriptionStatus` de `lib/subscription-status.ts` — suma el monto
      de las suscripciones que aún no están `PAID` este ciclo. No crea ningún
      registro nuevo, no toca `isProjected` ni `isRecurring`, no toca el cron
      ni el wizard.
      → Nueva tarjeta "Proyección: Falta Este Mes" en
      `components/budgets/SubscriptionsPanel.tsx`, junto a Costo Mensual,
      Costo Anual y Próximo Cobro. Verificado en navegador real contra
      `/preview-temas`: Netflix pagada se excluye, Spotify vencida + Gimnasio
      pendiente + Seguro del auto vencido suman $286.99, exactamente lo que
      muestra la tarjeta ("3 suscripciones pendientes de cobrarse").
      → Pruebas nuevas en `__tests__/budgets.test.ts`.
- [ ] 14.2 **El sistema de "suscripciones" no es un modelo propio** — es solo
      la etiqueta que `BudgetsTab.tsx:47-49` le pone a cualquier `Expense` con
      `isRecurring: true`. `lib/subscription-status.ts` es una función pura de
      cálculo de estado (`PAID`/`PENDING`/`OVERDUE`), sin ninguna acción de
      servidor propia. "Cancelar" (`SubscriptionsPanel.tsx`) llama a
      `deleteExpense` — borra el registro completo, sin conservar historial.
      No existe pausar (`Goal.isPaused` sí existe en el esquema, `Expense` no
      tiene equivalente), ni detección de aumentos de precio (el monto es un
      valor fijo, sin historial).
      → El usuario pidió solo conocer el estado esta vez, no construir nada
      todavía. Queda pendiente para una pasada futura si se retoma: cancelar
      sin borrar (conservando historial), pausar, y detectar cambios de
      monto entre cobros.

## Fase 15: Corrector de saldo y tasa mensual/anual en préstamos

> El usuario mostró capturas comparando la tarjeta de un préstamo en la app
> con la app real de su banco (CMF): el saldo y la cuota no coincidían.
> Investigado a fondo antes de tocar código.

- [x] 15.1 **`currentBalance` se fija a `totalAmount` al crear un préstamo**
      (`components/dashboard/tabs/DebtsTab.tsx`, rama LOAN de `handleSave`) y
      **no existía ninguna forma de corregirlo después** — `payLoan` es la
      única vía que lo modifica, pero es un pago real e inmediato (descuenta
      cuenta de origen y registra un gasto si la hay), no sirve para "el saldo
      no coincide con lo que dice el banco".
      → Nueva función `adjustLoanBalance` en `app/actions/debts.ts`, mismo
      patrón que `adjustAccountBalance` (`app/actions/budget/accounts.ts`):
      transaccional, con `requireOwnership`, deja un registro en `AuditLog`
      (`LOAN_BALANCE_ADJUSTMENT` con saldo anterior/nuevo y la razón escrita
      por el usuario).
      → Panel de corrección en `components/debts/DebtWizard.tsx`, visible solo
      al editar un préstamo existente: campo de saldo real
      (`SmartMoneyInput`) + razón obligatoria, deja claro que no descuenta
      ninguna cuenta ni registra gasto.
- [x] 15.2 **El campo de tasa solo aceptaba tasa anual (APR)**, pero los
      bancos panameños (CMF) cotizan la tasa mensual — obligaba a hacer la
      conversión a mano y era la causa más probable de tasas mal cargadas.
      → Toggle Mensual/Anual en `DebtWizard.tsx` (sección Banco y Amigo),
      normaliza siempre a anual antes de tocar `loanForm.interestRate` — cero
      cambios en `lib/financial-engine.ts`, que sigue tratando la tasa
      guardada como anual en todos sus cálculos. Texto de ayuda con la
      equivalencia en vivo (ej. "≈ 0.79% mensual").
      → Verificado en navegador real contra `/preview-temas`: el toggle
      calcula bien la equivalencia, el panel de corrección se abre
      pre-cargado con el saldo actual, y la validación de razón obligatoria
      funciona.
      → `npx tsc --noEmit`, `npm run lint`, `npm test` (171/171) y
      `npx next build` limpios.

## Fase 16: Suscripciones que desaparecían al cambiar de mes + limpieza de Análisis

> El usuario reportó, tras el cambio de mes, que el Fondo de Emergencia ya no
> se mantenía progresivo y que las suscripciones "no se mantienen... cuando
> son uno de los pilares de gastos". Investigado a fondo: ambos síntomas son
> el mismo bug. Se presentó el diagnóstico completo (6 puntos reportados) y
> se acordó con el usuario, vía preguntas explícitas, qué construir para los
> dos que requerían una decisión de diseño.

- [x] 16.1 **Una suscripción mensual solo era visible en su mes de
      creación** — `gastosVisiblesEnElMes` (`lib/dashboard-expenses.ts`)
      filtraba la plantilla recurrente (`isRecurring: true`) por mes, igual
      que un gasto normal. El cron `processRecurringExpenses` sí la sigue
      cobrando cada mes (crea una copia real ese día), pero antes de ese día
      no había ninguna fila que representara la suscripción: desaparecía de
      "Suscripciones" y de cualquier cálculo de gasto fijo, aunque en la base
      de datos siguiera activa y se fuera a cobrar igual.
      → `components/dashboard/tabs/BudgetsTab.tsx`: la lista de
      suscripciones ahora sale de `allExpenses` (todos los meses), no de
      `expenses` (solo el mes visible) — mismo dato que ya recibía el
      componente, sin tocar `gastosVisiblesEnElMes` ni arriesgar que la
      pestaña Gastos empiece a mostrar transacciones duplicadas.
- [x] 16.2 **El Fondo de Emergencia (y la regla 50/30/20) colapsaban como
      consecuencia directa de 16.1** — `FinancialRules.tsx` calculaba el
      "gasto fijo mensual" solo con lo ya registrado ese mes; con las
      suscripciones invisibles hasta su día de cobro, el número caía a casi
      $0 los primeros días de cada mes aunque la plata real no hubiera
      cambiado en nada.
      → Nuevo `lib/financial-rules.ts` (con pruebas en
      `__tests__/financial-rules.test.ts`): `gastoFijoYVariableDelMes` suma
      las suscripciones aún no cobradas este ciclo (`lastPaidAt` fuera del
      mes de negocio actual) sin duplicar las que el cron ya cobró, y
      prorratea las no mensuales (trimestral/semestral/anual) a su
      equivalente mensual. `FinancialRules.tsx` ahora delega en esta función
      en vez de recalcular inline.
- [x] 16.3 **Filtro por tipo de gasto (Fijo/Variable/Lujo/Ahorro) en
      Gastos** — pedido directo del usuario. Reutiliza `tipoDeGasto` de
      `lib/financial-rules.ts`, independiente del filtro por categoría (una
      categoría tiene un tipo, pero varias categorías pueden compartir tipo).
- [x] 16.4 **"Desglose de Presupuestos" en Análisis repetía exactamente lo
      que ya muestra Presupuesto → Categorías** (mismo spent/límite/restante
      por categoría). Reemplazado, con confirmación explícita del usuario,
      por algo que no existe en ningún otro lado: `lib/expense-insights.ts`
      (con pruebas) aporta `topGastosIndividuales` (los gastos más altos uno
      por uno, no agrupados por categoría) y `tendenciaDeGasto` (total real
      de los últimos 3 meses). Las tarjetas "Top 3 categorías" se mantienen
      sin cambios.
      → Tooltip en "Balance Neto" explicando el cálculo (ingresos del mes
      menos gastos reales del mes) — el usuario no sabía cómo se calculaba.
      → Verificado en navegador real contra `/preview-temas`: el filtro por
      tipo reduce correctamente de 11 a 4 movimientos al elegir "Fijo"; el
      nuevo Análisis muestra los gastos más altos y la tendencia de 3 meses
      sin errores de consola.

Fuera de alcance, decidido explícitamente con el usuario: no se construye una
pestaña aparte para "gastos fijos" — una vez arreglada la visibilidad de
suscripciones (16.1), "Suscripciones" ya cubre ese caso.

## Fase 17: Suscripciones de cobro automático vs pago manual + historial de pagos de deuda

> El usuario reportó, tras el merge de la Fase 16: Internet de casa (cobra el
> día 6) aparecía como "Pagado" sin que él lo hubiera pagado, y pidió poder
> marcar una suscripción como "no debitar sola, solo cuando yo doy Pagar".
> También reportó que no existe ningún historial de pagos de deudas.

- [x] 17.1 **Causa de "Internet dice Pagado sin serlo"**: el cron
      `processRecurringExpenses` cobra automáticamente CUALQUIER gasto
      recurrente con día de cobro, sin distinguir débito directo de pago
      manual — si el usuario paga Internet aparte (no es débito automático
      real), el cron igual lo cobraba solo y marcaba `lastPaidAt`, de ahí el
      "Pagado" falso.
      → El usuario propuso reutilizar `graceDays` como señal; se le ofreció
      la alternativa de un campo explícito nuevo (sin reinterpretar un campo
      existente, sin cambiar el comportamiento de ninguna suscripción vieja
      por sorpresa) y la eligió.
      → Migración `20261001000000_add_expense_auto_charge`: nueva columna
      `Expense.autoCharge` (default `true`, conserva el comportamiento
      previo de todo lo existente). Verificada en Postgres local en dos
      escenarios (BD nueva, BD con el historial completo de migraciones ya
      aplicado) antes de tocar la BD real — mismo protocolo que las
      migraciones anteriores de esta sesión.
      → `processRecurringExpenses` (`app/actions/budget/expenses.ts`) ahora
      exige `autoCharge: true` en su `where` — una suscripción con
      `autoCharge: false` nunca la toca el cron; el usuario la marca
      "Pagado" a mano desde Suscripciones, como ya podía hacer.
      → Toggle "Cobro automático" en `ExpenseWizard.tsx`, visible solo para
      gastos recurrentes. Insignia "Pago manual" en `SubscriptionsPanel.tsx`
      cuando está apagado.
      → Verificado en navegador real contra `/preview-temas`: la insignia
      aparece en la suscripción con `autoCharge: false`, y el wizard de
      edición abre con el interruptor correctamente apagado.
- [x] 17.2 **No existía historial de pagos de deuda** — `payLoan`
      (`app/actions/debts.ts`) solo registraba un gasto en la categoría
      "Deudas" si el pago tenía cuenta de origen; un pago sin cuenta (ej.
      efectivo pagado aparte) no dejaba ningún rastro, ni en Gastos ni en
      Análisis.
      → `payLoan` ahora registra SIEMPRE el pago en "Deudas"
      (`accountId: null` si no hay cuenta de origen) — mismo patrón ya
      usado cuando sí hay cuenta, solo que incondicional. Sigue sin afectar
      ningún total (la categoría "Deudas" ya se excluye en todos los
      cálculos de gasto, vía `esPagoDeDeuda`), y el gasto sobrevive aunque
      el préstamo se borre al llegar a saldo 0 (no hay relación en cascada
      entre `Loan` y `Expense`).
      → `npx tsc --noEmit`, `npm run lint`, `npm test` (192/192),
      `npx prisma validate` y `npx next build` limpios.

Pendiente de confirmar con el usuario tras este deploy: si el Fondo de
Emergencia sigue sin verse progresivo, revisar si sus gastos fijos reales
(ej. Internet) están en una categoría cuyo tipo no sea "Fijo" — `tipoDeGasto`
(`lib/financial-rules.ts`) usa el tipo de la categoría cuando existe, por
encima de la adivinanza por palabra clave.

## Fase 18: Mover "Suscripciones" de Presupuesto a Gastos

> El usuario pidió, como función aislada (acordó explícitamente trabajar
> así de aquí en adelante, una función a la vez): "pasa la pestaña de
> suscripciones a gastos".

- [x] 18.1 **"Suscripciones" ahora es una subpestaña de Gastos**, no de
      Presupuesto — tiene más sentido ahí: una suscripción es, ante todo,
      un gasto (`Expense` con `isRecurring: true`), y el informe previo ya
      señaló lo estrecho del vínculo entre ambos.
      → `components/dashboard/tabs/ExpensesTab.tsx`: nuevas subpestañas
      "Gastos"/"Suscripciones" (mismo patrón de `BudgetsTab.tsx`),
      reutilizando el mismo `ExpenseWizard` ya montado en el archivo para
      crear/editar una suscripción — sin wizard nuevo.
      → `components/dashboard/tabs/BudgetsTab.tsx`: se quita la subpestaña
      y el render de `SubscriptionsPanel`, pero se **conserva** el cálculo
      de `subscriptions` (`allExpenses.filter(isRecurring)`) — sigue
      alimentando `recurringExpenses` en `<FinancialRules>` para el Fondo
      de Emergencia/regla 50/30/20, que no tiene nada que ver con dónde
      vive la pestaña.
      → `components/BudgetDashboard.tsx`: `ExpensesTab` ahora recibe
      `allExpenses` y `totalIncome`, que antes solo llegaban a `BudgetsTab`.
      → Verificado en navegador real contra `/preview-temas`: Gastos
      muestra "Gastos"/"Suscripciones" con las mismas 4 tarjetas, calendario
      y acciones de antes; Presupuesto solo muestra "Regla 50/30/20" y
      "Categorías", con "Gasto Fijo: $720.50" sin cambios (confirma que
      `subscriptions` sigue llegando a `FinancialRules` igual que antes).
      → `npx tsc --noEmit`, `npm run lint`, `npm test` (192/192) y
      `npx next build` limpios.
- [x] 18.2 **El botón de editar (lápiz) era invisible** —
      `opacity-0 group-hover:opacity-100` sin que ninguna tarjeta ancestro
      tuviera la clase `group`: nunca se volvía visible al pasar el mouse,
      aunque seguía ahí y era clicable (un botón fantasma). Ahora siempre
      visible, igual que "Cancelar".
      → Pedido también: quitar el estado "Vencido" del badge — se ve
      siempre como Pagado o Pendiente. `getSubscriptionStatus` no cambia
      (su caso `OVERDUE` lo sigue usando `montoPendienteEsteMes`), solo se
      deja de pintar distinto en esta tarjeta.

## Fase 19: "Marcar pagado" no movía dinero de verdad

> El usuario notó que al marcar una suscripción como pagada, la tarjeta
> mostraba "Pagado" y un monto descontado, pero el dinero no se reflejaba
> en ningún otro lado (Gastos, Análisis, Dinero Disponible).

- [x] 19.1 **`markSubscriptionPaid`/`markSubscriptionUnpaid` solo tocaban
      `lastPaidAt`** — ninguna cuenta se descontaba, ninguna tarjeta subía
      de saldo, y no se creaba ningún gasto real. El badge "Pagado" con el
      monto tachado era puramente cosmético: no existía en ningún otro
      lado de la app porque nunca existió como transacción.
      → `markSubscriptionPaid` (`app/actions/budget/expenses.ts`) ahora
      hace lo mismo que `processRecurringExpenses` cuando cobra sola una de
      débito directo: descuenta la cuenta/tarjeta vinculada (validando
      fondos y cuenta bloqueada primero, igual que `payLoan`), crea el
      gasto real (mismo criterio: `isPaidThisCycle` evita cobrar dos veces
      el mismo ciclo).
      → `markSubscriptionUnpaid` revierte: encuentra el gasto real que se
      creó (por nombre + monto + mismo mes de negocio — mismo criterio, con
      la misma limitación conocida, que ya usa el cron para no duplicar un
      cobro), devuelve el dinero a la cuenta/tarjeta, y lo borra.
      → Mensajes de confirmación actualizados ("Pago registrado: se
      descontó..." / "Pago revertido: se devolvió...") y el texto del
      toggle "Cobro automático" en `ExpenseWizard.tsx` aclarado para
      reflejar que el pago manual sí descuenta, al marcarlo.
      → `npx tsc --noEmit`, `npm run lint`, `npm test` (192/192) y
      `npx next build` limpios. **No verificado end-to-end contra una base
      de datos real** — este entorno no tiene alcance de red a la base de
      datos de producción/Neon (confirmado al diagnosticar el Fondo de
      Emergencia, Fase 17); la lógica reutiliza patrones ya probados en
      producción (`payLoan`, `processRecurringExpenses`,
      `deleteExpense`/`updateExpense`), pero conviene que el usuario pruebe
      marcar y desmarcar una suscripción real tras el deploy.

## Fase 20: Crear una suscripción ya movía dinero — causa raíz de los duplicados en Análisis

> Primer item del nuevo `.specs/backlog.md` (dictado por el usuario, orden
> de prioridad confirmado explícitamente: arreglar Suscripciones antes que
> los síntomas en Análisis). Reporte del usuario: "Gastos Más Altos" del
> mes mostraba datos repetidos por el sistema de suscripciones, y
> "Disponible" en el Resumen Ejecutivo aparecía en $0 sin explicación.
> Investigado a fondo en código (no solo transcrito) antes de tocar nada.

- [x] 20.1 **Causa raíz: `createExpense` descontaba cuenta/tarjeta al crear
      CUALQUIER gasto, sin mirar `isRecurring`.** Una plantilla de
      suscripción (ej. "Claude", factura el día 13) movía dinero real en
      el momento de registrarla —aunque el usuario la hubiera registrado
      el día 10, antes de la fecha de facturación— y además quedaba
      visible como "un gasto" en `gastosVisiblesEnElMes`
      (`lib/dashboard-expenses.ts`) en su mes de creación. Cuando el cron
      (`autoCharge`) o `markSubscriptionPaid` (pago manual) procesaban
      después el cobro real del ciclo, se creaba una SEGUNDA fila por el
      mismo concepto — de ahí los duplicados en "Gastos Más Altos del Mes"
      y la Tendencia de Gasto, e indirectamente el gasto fijo mensual
      inflado que podía forzar "Disponible" a $0 en el Resumen Ejecutivo.
      → `createExpense`, `updateExpense` y `deleteExpense`
      (`app/actions/budget/expenses.ts`) ahora distinguen explícitamente
      "crear/editar/borrar la plantilla" (nunca mueve dinero ni valida
      fondos) de "crear/editar/borrar un gasto real" (one-time, o la copia
      que genera cada ciclo el cron/`markSubscriptionPaid`, que sigue
      moviendo dinero igual que antes). La plantilla solo define el cobro;
      el cobro real de cada ciclo es el único que mueve dinero y el único
      que cuenta como "un gasto".
      → `gastosVisiblesEnElMes` (`lib/dashboard-expenses.ts`) ya nunca
      muestra una plantilla recurrente como gasto, sin importar el mes ni
      la frecuencia (se quitó también el caso especial que hacía
      reaparecer un anual recurrente cada año en su mes de cobro aunque
      ese año no hubiera ningún cobro real).
      → Mismo bug, encontrado por separado en otros dos lugares que leen
      `allExpenses` directo (sin pasar por `gastosVisiblesEnElMes`) y
      tampoco excluían las plantillas: `gastadoEn` (`lib/budgets.ts`, usado
      por el arrastre de categorías entre meses) y `tendenciaDeGasto`
      (`lib/expense-insights.ts`, la Tendencia de Gasto de Análisis — en
      datos de ejemplo contaba $544.98 en vez de $243 reales, por sumar
      cuatro plantillas de suscripción además de los gastos reales).
      Ambos corregidos con el mismo criterio: excluir `isRecurring`.
      → **Limitación conocida, inevitable sin poder migrar datos en la BD
      real (sin alcance de red a producción, ver Fase 17/19):** cualquier
      suscripción que ya exista hoy en la base de datos tomó dinero una vez
      al crearse, bajo el bug viejo. Si se borra esa suscripción vieja
      después de este fix, ya no se le devuelve ese monto a la cuenta (el
      borrado ahora asume, correctamente para una plantilla nueva, que la
      plantilla nunca tomó dinero). Si el usuario nota un saldo que no
      cuadra al borrar una suscripción vieja, es ese caso puntual — no
      afecta nada creado a partir de este fix.
      → Verificado en navegador real contra `/preview-temas` (que tiene
      Netflix, Spotify, Gimnasio y Seguro del auto como plantillas con
      fecha dentro del mes visible, el escenario exacto del bug): antes del
      fix, "Mis Gastos" y "Tendencia de Gasto" las contaban igual que un
      gasto real; después del fix, "Mis Gastos" muestra solo los 7
      movimientos reales ($243 total) y "Suscripciones" sigue mostrando
      las 4 plantillas con su estado Pagado/Pendiente normal, sin ninguna
      aparecer duplicada en Gastos ni en Análisis.
      → `npx tsc --noEmit`, `npm run lint`, `npm test` (194/194) y
      `npx next build` limpios.

Fuera de alcance de este fix, decidido explícitamente para seguir el
protocolo de un apartado a la vez: la semántica de `graceDays` y el
estado Pagado/Pendiente/Vencido (`lib/subscription-status.ts`) — revisados
durante la investigación, ya funcionan como pide el usuario (pendiente
hasta la fecha de facturación + gracia, vencido después, pagado solo al
marcarlo o al cobro automático real); no hacía falta tocarlos. El resto
del rediseño de Suscripciones que pidió el usuario (distinguir
"suscripción" de "monto recurrente variable" como dos naturalezas del
mismo mecanismo) es conceptual, no requiere cambio de código adicional.

## Fase 21: Gastos Más Altos del Mes — clickeables para ver el desglose

> Item 1 del backlog (máxima prioridad dictada por el usuario): "las
> categorías con los gastos más altos... se pueda hacer click o
> seleccionar y se desglose para ver cuáles son". Cada fila de "Gastos
> Más Altos del Mes" ya es un gasto individual (no una categoría
> agrupada) — el desglose útil es ver su detalle completo, no una
> composición de sub-gastos.

- [x] 21.1 **Cada fila de "Gastos Más Altos del Mes" (`InsightsTab.tsx`)
      ahora es clickeable** — abre un panel con Categoría, Fecha completa,
      Cuenta/Tarjeta usada y Monto, con el mismo patrón visual de
      expandir/colapsar (chevron, panel animado) que ya usa el historial
      de ingresos (`SalaryHistory.tsx`), para mantener consistencia.
      → `InsightsTab` recibe dos props nuevas, `accounts` y `creditCards`
      (ya las tenía disponibles `BudgetDashboard.tsx`, solo faltaba
      pasarlas), para resolver el nombre de la cuenta/tarjeta del gasto —
      mismo criterio de resolución (`linkedCardId` vs `accountId`) que ya
      usa `ExpensesTab.tsx`.
      → Verificado en navegador real contra `/preview-temas`: clic en
      "Super Xtra" despliega Categoría: Comida, Fecha: 2 de octubre de
      2026, Cuenta: Banco General, Monto: $86.4; el chevron rota y el
      resto de las filas se mantienen colapsadas. Sin errores de consola
      nuevos (el warning de hidratación de "Balance Neto" es preexistente,
      no relacionado con este cambio).
      → `npx tsc --noEmit`, `npm run lint`, `npm test` (194/194) y
      `npx next build` limpios.

## Fase 22: Análisis — Balance Neto confuso, duplicados, tendencia a 6 meses

> Items 2, 3 y 4 del backlog (siguiente lote dictado por el usuario; pidió no
> parar hasta terminar todo el backlog restante, dando el recuento al final).

- [x] 22.1 **Item 3: duplicados en "Gastos Más Altos del Mes" — ya resuelto por
      la Fase 20** (causa raíz: `createExpense` movía dinero al crear una
      plantilla de suscripción). Marcado como hecho en `backlog.md`, sin
      cambio de código adicional necesario.
- [x] 22.2 **Item 2: "Balance Neto" reemplazado por "Ingresos vs. Gastos
      Grandes"** (`InsightsTab.tsx`). El cálculo viejo (ingresos menos TODO
      lo gastado) no decía de dónde salía el ingreso ni contra qué se
      comparaba — confuso, como reportó el usuario. La tarjeta nueva
      desglosa Salario + Otros ingresos, los compara contra la suma de los
      gastos más grandes (la misma lista que ya se ve debajo, no todo el
      gasto del mes) y muestra qué porcentaje del ingreso consumen, con una
      barra de cobertura. De paso, se corrigió un warning de hidratación
      preexistente (un `<div>` de `@animateicons` dentro de un `<p>`) que
      vivía en esta misma tarjeta.
- [x] 22.3 **Item 4: "Tendencia de 3 Meses" → "Tendencia de 6 Meses"** —
      cambio de un parámetro (`tendenciaDeGasto(..., 6)`), la función ya
      aceptaba `cantidadMeses` configurable.
      → Verificado en navegador real contra `/preview-temas`: "Ingresos vs.
      Gastos Grandes" muestra +$1,907 (Salario $1,600 + Otros $550, menos
      $243 de los 6 gastos más grandes, 11% de cobertura); "Tendencia de 6
      Meses" muestra May–Oct. Cero errores de consola.
      → `npx tsc --noEmit`, `npm run lint`, `npm test` (194/194) y
      `npx next build` limpios.

## Fase 23: Presupuesto — Fondo de Emergencia, selector de reglas, score y endeudamiento explicados

> Items 6, 7, 8 y 9b del backlog — los cuatro viven en el mismo componente
> (`FinancialRules.tsx`) y están acoplados entre sí, así que se atacan juntos
> en vez de cuatro PRs separados sobre el mismo archivo. Usuario pidió no
> parar hasta terminar todo el backlog restante.

- [x] 23.1 **Item 9b, la causa raíz real de "Fondo de Emergencia sigue en 0
      meses": el componente entero vivía detrás de `if (income === 0) return
      <placeholder>`**, incluida la tarjeta de Fondo de Emergencia — que no
      depende del ingreso del mes para nada, solo del gasto fijo
      (`gastoFijoYVariableDelMes`) y del efectivo/ahorro líquido
      (`totalCash`/`totalSavings`). Cualquier mes sin un `Salary` registrado
      forzaba la tarjeta a mostrar "0.0 meses" fijo, sin importar cuánto
      ahorro real hubiera.
      → Se movió el cálculo de Fondo de Emergencia (y el gasto fijo/variable
      del que depende) a ANTES del `if`, y se extrajo a su propio componente
      (`FondoEmergenciaCard`, fuera del cuerpo de `FinancialRules` — nunca
      un componente anidado, regla de `AGENTS.md`) para que se renderice
      siempre, con o sin ingreso registrado. Cuando no hay ingreso, el resto
      de la tarjeta (50/30/20, Score, Endeudamiento — esos sí necesitan
      dividir entre el ingreso) sigue mostrando el aviso de "Sin ingresos
      registrados", pero ya aclarando que el Fondo de Emergencia no necesita
      ingreso y se calcula igual, justo debajo.
- [x] 23.2 **Item 7: selector de regla financiera** — antes `FinancialRules.tsx`
      solo conocía 50/30/20, sin alternativa. Se agregaron dos reglas más
      (70/20/10, más margen para gasto fijo alto; 60/20/20, más ahorro),
      las tres reparten el 100% en las mismas tres categorías que ya calcula
      `tipoDeGasto` (Necesidades/Deseos/Ahorro) — solo cambia el objetivo
      contra el que se compara, nunca cómo se clasifica o suma cada gasto
      (`lib/financial-rules.ts` no se tocó). Selector de pastillas dentro de
      la tarjeta de la regla; la elección se recuerda en `localStorage`
      (preferencia de este navegador, no hacía falta migrar la base de
      datos) — mismo patrón ya usado en `color-theme-provider.tsx`
      (lectura en un efecto, con el mismo `eslint-disable` documentado para
      `react-hooks/set-state-in-effect`: el valor solo se conoce en
      cliente).
- [x] 23.3 **Item 6: Score Financiero explicado** — antes solo había una
      frase genérica abajo del número. Ahora se desglosan los 3 factores
      que lo componen (Necesidades dentro del objetivo, Deseos dentro del
      objetivo, Deudas en nivel saludable), cada uno con ✓/✗ según pase o
      no, usando los mismos objetivos de la regla elegida.
- [x] 23.4 **Item 8: Endeudamiento explicado** — tooltip + texto fijo que
      aclaran de qué sale el %: pago mínimo de tarjetas (interés + seguro +
      % mínimo sobre el saldo, mismo cálculo que ya usa
      `BudgetDashboard.tsx`) más la cuota mensual de préstamos, entre el
      ingreso del mes.
      → Verificado en navegador real contra `/preview-temas`: Fondo de
      Emergencia muestra 10.9 meses reales (antes habría sido 0.0 si el
      mes no tuviera `Salary`); clic en "70/20/10" cambia el título, la
      descripción, los objetivos junto a cada rebanada (70%/20%/10%) y
      recalcula el score en vivo; tooltip de Endeudamiento muestra el
      desglose del cálculo. Cero errores de consola.
      → `npx tsc --noEmit`, `npm run lint`, `npm test` (194/194) y
      `npx next build` limpios.
