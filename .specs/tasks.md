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
