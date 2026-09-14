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
- [ ] 5.2 Ejecutar `npx prisma migrate dev` o actualizar cliente.
      → **Bloqueado y con una trampa.** La carpeta `prisma/migrations/` se borró
      del repositorio en el commit `e6a4865`, pero `package.json` conserva
      `"release": "prisma migrate deploy && next start"`, que ya no tiene ninguna
      migración que aplicar. Cualquier cambio de esquema depende hoy de
      `prisma db push` ejecutado a mano. Ver Fase 9.

## Fase 6: Refactorización y Principio SRP en UI

- [ ] 6.1 Modularizar `DebtsTab.tsx` en subcomponentes atómicos.
- [ ] 6.2 Modularizar `BudgetsTab.tsx` en subcomponentes atómicos.
- [ ] 6.3 Desacoplar modales restantes en `GoalsTab.tsx`.

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
- [ ] 10.4 **Sin recuperación de contraseña.** El login remite al administrador.
- [x] 10.5 **Registro de errores en producción.** `lib/logger.ts` expone
      `reportError(error, contexto)`, único punto de reporte: JSON de una línea
      en producción —buscable por `accion` y `profileId` en los registros de
      Vercel— y formato con color en desarrollo. Migradas las 9 acciones de
      servidor; los `console.error` que quedan son de cliente, donde winston no
      debe cargarse.
