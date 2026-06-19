# Plan de Implementación: Finanzas Maestras — Fase 9 y Roadmap

## Resumen

Implementación incremental de mejoras de seguridad (Fase 9), cobertura de tests, configuración de infraestructura y DevOps. Las tareas están ordenadas por criticidad: primero las vulnerabilidades críticas, luego las mejoras de alto impacto, y finalmente la infraestructura y el roadmap futuro.

## Tareas

- [ ] 1. Remediación de credenciales expuestas y limpieza del repositorio
  - Rotar todas las credenciales expuestas: `DATABASE_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING` en Neon DB y cualquier otro secreto presente en el historial de git
  - Ejecutar BFG Repo Cleaner o `git filter-branch` para eliminar el archivo `.env` del historial completo de git
  - Verificar que `.env` esté en `.gitignore` y nunca sea commiteado
  - _Requisitos: 1.1, 1.4_

- [ ] 2. Validación obligatoria de JWT_SECRET al arranque
  - [ ] 2.1 Crear o actualizar `lib/env.ts` con la función `validateEnv()` que valide todas las variables de entorno obligatorias al arranque
    - Lanzar error fatal si `JWT_SECRET` no está definido o tiene menos de 32 caracteres
    - Lanzar error descriptivo indicando qué variable falta si alguna obligatoria no está definida
    - Incluir: `DATABASE_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `JWT_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
    - _Requisitos: 2.1, 2.2, 2.3, 2.4, 20.2, 20.3_
  - [ ] 2.2 Eliminar el fallback hardcodeado de `JWT_SECRET` en `lib/auth.ts` y reemplazarlo con la llamada a `validateEnv()`
    - _Requisitos: 2.4_
  - [ ]* 2.3 Escribir tests unitarios para `validateEnv()`
    - Caso: `JWT_SECRET` ausente lanza error
    - Caso: `JWT_SECRET` de 31 chars lanza error
    - Caso: variables obligatorias faltantes lanzan error descriptivo
    - _Requisitos: 2.2, 2.3_
  - [ ]* 2.4 Escribir test de propiedad para validación de longitud de JWT_SECRET
    - **Propiedad 1: Validación de longitud de JWT_SECRET**
    - **Valida: Requisito 2.3**


- [ ] 3. Verificación de ownership en Server Actions
  - [ ] 3.1 Implementar la función `getAuthContext()` en `lib/auth.ts` que retorne el `AuthContext` del usuario autenticado desde la cookie JWT
    - Retornar `null` si no hay cookie de sesión válida
    - _Requisitos: 3.1, 15.1_
  - [ ] 3.2 Agregar verificación de ownership en `app/actions/expenses.ts`
    - Verificar que el `profileId` del gasto coincide con el usuario en sesión antes de cualquier operación
    - Retornar error 403 si no coincide
    - _Requisitos: 3.1, 3.2, 3.4_
  - [ ] 3.3 Agregar verificación de ownership en `app/actions/accounts.ts`, `app/actions/goals.ts`, `app/actions/categories.ts`, `app/actions/cards.ts`, `app/actions/loans.ts`, `app/actions/income.ts`, `app/actions/salary.ts`
    - Aplicar el mismo patrón de verificación de ownership en cada action
    - _Requisitos: 3.1, 3.2_
  - [ ] 3.4 Agregar verificación de rol ADMIN en `app/actions/admin.ts` para todas las acciones exclusivas de administrador
    - Retornar error 403 si el rol del usuario en sesión es USER
    - Verificar ownership o rol ADMIN en `deleteProfile`
    - _Requisitos: 3.3, 3.5_
  - [ ]* 3.5 Escribir tests de propiedad para verificación de ownership y protección de acciones ADMIN
    - **Propiedad 2: Verificación de ownership en Server Actions**
    - **Valida: Requisitos 3.1, 3.2, 3.3, 3.4**
    - **Propiedad 3: Protección de acciones exclusivas de ADMIN**
    - **Valida: Requisito 3.5**
  - [ ]* 3.6 Escribir test de propiedad para rechazo de solicitudes no autenticadas
    - **Propiedad 15: Rechazo de solicitudes no autenticadas**
    - **Valida: Requisito 12.1**

- [ ] 4. Rate limiting en login, register y claim
  - [ ] 4.1 Instalar `@upstash/ratelimit` y `@upstash/redis` y crear `lib/rate-limiter.ts` con los tres limitadores configurados
    - `login`: sliding window 10 intentos / 15 minutos
    - `register`: sliding window 5 intentos / 60 minutos
    - `claim`: sliding window 5 intentos / 60 minutos
    - _Requisitos: 4.1, 4.2, 7.3_
  - [ ] 4.2 Integrar el rate limiter en `app/actions/auth.ts` para las acciones `login`, `register` y `claimProfile`
    - Retornar HTTP 429 con mensaje de tiempo de espera restante si se supera el umbral
    - Registrar evento de bloqueo en `AuditLog`
    - _Requisitos: 4.1, 4.2, 4.3, 4.4_
  - [ ]* 4.3 Escribir tests de propiedad para el comportamiento de umbral del rate limiter
    - **Propiedad 4: Comportamiento de umbral del rate limiter**
    - **Valida: Requisitos 4.1, 4.2, 7.3**
    - **Propiedad 5: Rate limiting registra en AuditLog**
    - **Valida: Requisito 4.4**

- [ ] 5. Checkpoint — Verificar seguridad crítica
  - Asegurarse de que los tests de las tareas 2, 3 y 4 pasen. Consultar al usuario si surgen dudas.


- [ ] 6. Validación Zod en todas las Server Actions
  - [ ] 6.1 Crear `lib/validators/` con esquemas Zod para cada dominio: `auth.schemas.ts`, `expense.schemas.ts`, `account.schemas.ts`, `goal.schemas.ts`, `category.schemas.ts`, `card.schemas.ts`, `loan.schemas.ts`, `income.schemas.ts`, `salary.schemas.ts`
    - Incluir validación de longitudes máximas, formatos de email, rangos numéricos y valores de enumeración
    - Eliminar el uso del tipo `any` en parámetros de Server Actions, reemplazándolo con tipos Zod inferidos
    - _Requisitos: 5.1, 5.4, 5.5_
  - [ ] 6.2 Integrar los esquemas Zod en cada Server Action correspondiente, ejecutando `safeParse` antes de cualquier operación de base de datos
    - Retornar `validationErrors` al cliente si la validación falla, sin ejecutar operaciones de DB
    - _Requisitos: 5.2, 5.3_
  - [ ]* 6.3 Escribir tests de propiedad para validación Zod
    - **Propiedad 6: Validación Zod rechaza inputs inválidos antes de la DB**
    - **Valida: Requisitos 5.2, 5.3**
    - **Propiedad 7: Cobertura de validación de tipos de campo**
    - **Valida: Requisito 5.5**

- [ ] 7. AccessCode seguro con expiración
  - [ ] 7.1 Actualizar la función de generación de `accessCode` en `lib/auth.ts` para usar `crypto.randomBytes()` y producir exactamente 12 caracteres alfanuméricos
    - _Requisitos: 7.1_
  - [ ] 7.2 Agregar el campo `accessCodeExpiresAt` al modelo `Profile` en `prisma/schema.prisma` y crear la migración correspondiente
    - Establecer expiración de 72 horas al generar un nuevo `accessCode`
    - _Requisitos: 7.4_
  - [ ] 7.3 Actualizar la Server Action `claimProfile` en `app/actions/auth.ts` para verificar que el `accessCode` no haya expirado y para invalidarlo tras un uso exitoso
    - _Requisitos: 7.2, 7.4_
  - [ ]* 7.4 Escribir tests de propiedad para AccessCode
    - **Propiedad 10: Formato y longitud de AccessCode**
    - **Valida: Requisito 7.1**
    - **Propiedad 11: AccessCode de uso único**
    - **Valida: Requisito 7.2**
    - **Propiedad 12: Expiración de AccessCode no utilizado**
    - **Valida: Requisito 7.4**

- [ ] 8. Expiración de cookie de impersonación
  - [ ] 8.1 Actualizar la lógica de creación de cookie de impersonación en `app/actions/admin.ts` para asignar `maxAge: 7200` (2 horas)
    - _Requisitos: 6.1_
  - [ ] 8.2 Registrar en `AuditLog` el inicio y fin de cada sesión de impersonación con `profileId` del admin, `profileId` del usuario impersonado y timestamp
    - _Requisitos: 6.3_
  - [ ]* 8.3 Escribir tests de propiedad para impersonación
    - **Propiedad 8: Expiración de cookie de impersonación**
    - **Valida: Requisito 6.1**
    - **Propiedad 9: Auditoría completa de sesiones de impersonación**
    - **Valida: Requisito 6.3**

- [ ] 9. Política de contraseñas
  - [ ] 9.1 Crear la función `validatePassword(password: string)` en `lib/validators/auth.schemas.ts` que verifique mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número
    - Retornar un objeto `{ valid: boolean, errors: string[] }` con mensajes descriptivos por criterio no cumplido
    - _Requisitos: 8.1, 8.2, 8.3_
  - [ ] 9.2 Aplicar `validatePassword` en las Server Actions de registro, cambio de contraseña y reset de contraseña en `app/actions/auth.ts`
    - _Requisitos: 8.4_
  - [ ]* 9.3 Escribir tests de propiedad para política de contraseñas
    - **Propiedad 13: Política de contraseñas**
    - **Valida: Requisitos 8.1, 8.2, 8.3**
    - **Propiedad 14: Consistencia de política de contraseñas**
    - **Valida: Requisito 8.4**

- [ ] 10. Cabeceras de seguridad CSP
  - Actualizar `next.config.ts` para agregar las cabeceras HTTP de seguridad en todas las respuestas:
    - `Content-Security-Policy` con directivas para `default-src`, `script-src`, `style-src`, `img-src`, `font-src`, `connect-src`, `frame-ancestors`
    - `X-Frame-Options: DENY`
    - `X-Content-Type-Options: nosniff`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - _Requisitos: 9.1, 9.2, 9.3, 9.4_

- [ ] 11. Limpieza de archivos de debug
  - Eliminar del repositorio los archivos `check_roles.ts`, `debug-net-worth.ts` y cualquier otro script de diagnóstico en la raíz del proyecto
  - Mover scripts de utilidad legítimos al directorio `/scripts` con comentario de propósito
  - Agregar patrones `check_*.ts`, `debug-*.ts` a `.gitignore`
  - _Requisitos: 10.1, 10.2, 10.3_

- [ ] 12. Checkpoint — Verificar seguridad completa (Fase 9)
  - Asegurarse de que todos los tests de las tareas 6–11 pasen. Consultar al usuario si surgen dudas.


- [ ] 13. Tests de integración para Server Actions de autenticación
  - [ ] 13.1 Crear `__tests__/integration/auth-actions.test.ts` con tests de integración para `login`, `register` y `logout`
    - Verificar flujo exitoso de login con credenciales válidas
    - Verificar rechazo de login con credenciales inválidas
    - Verificar que `logout` invalida la sesión
    - _Requisitos: 11.1_
  - [ ]* 13.2 Crear `__tests__/integration/expense-actions.test.ts` con tests de integración para CRUD de gastos
    - Verificar que un usuario no puede leer ni modificar gastos de otro usuario
    - _Requisitos: 11.2_

- [ ] 14. Tests de seguridad para autorización y ownership
  - [ ] 14.1 Crear `__tests__/security/authorization.test.ts` con tests que verifiquen rechazo de acceso no autorizado
    - Verificar que Server Actions rechazan solicitudes sin sesión válida
    - Verificar que un usuario USER no puede acceder a recursos de otro usuario
    - Verificar que un usuario USER no puede ejecutar acciones exclusivas de ADMIN
    - _Requisitos: 12.1, 12.2_
  - [ ]* 14.2 Crear `__tests__/security/rate-limiting.test.ts` con tests que verifiquen el bloqueo por rate limiting
    - _Requisitos: 12.3_
  - [ ]* 14.3 Crear `__tests__/security/security-headers.test.ts` con tests que verifiquen la presencia de todas las cabeceras de seguridad requeridas
    - _Requisitos: 9.1, 9.2, 9.3, 9.4_

- [ ] 15. Tests de propiedades (PBT) con fast-check
  - [ ] 15.1 Instalar `fast-check` como dependencia de desarrollo y configurar `fc.configureGlobal({ numRuns: 100 })` en el setup de Jest
  - [ ] 15.2 Crear `__tests__/properties/auth.property.test.ts` con los tests de propiedades 1–5 y 8–15
    - Propiedad 1: Validación de longitud de JWT_SECRET — Requisito 2.3
    - Propiedad 2: Verificación de ownership en Server Actions — Requisitos 3.1, 3.2, 3.3, 3.4
    - Propiedad 3: Protección de acciones exclusivas de ADMIN — Requisito 3.5
    - Propiedad 4: Comportamiento de umbral del rate limiter — Requisitos 4.1, 4.2, 7.3
    - Propiedad 5: Rate limiting registra en AuditLog — Requisito 4.4
    - Propiedad 8: Expiración de cookie de impersonación — Requisito 6.1
    - Propiedad 9: Auditoría completa de sesiones de impersonación — Requisito 6.3
    - Propiedad 10: Formato y longitud de AccessCode — Requisito 7.1
    - Propiedad 11: AccessCode de uso único — Requisito 7.2
    - Propiedad 12: Expiración de AccessCode no utilizado — Requisito 7.4
    - Propiedad 13: Política de contraseñas — Requisitos 8.1, 8.2, 8.3
    - Propiedad 14: Consistencia de política de contraseñas — Requisito 8.4
    - Propiedad 15: Rechazo de solicitudes no autenticadas — Requisito 12.1
    - _Requisitos: 11.1, 11.2, 12.1, 12.2, 12.3, 12.4_
  - [ ] 15.3 Crear `__tests__/properties/validation.property.test.ts` con los tests de propiedades 6 y 7
    - Propiedad 6: Validación Zod rechaza inputs inválidos antes de la DB — Requisitos 5.2, 5.3
    - Propiedad 7: Cobertura de validación de tipos de campo — Requisito 5.5
    - _Requisitos: 5.2, 5.3, 5.5_

- [ ] 16. Configurar cobertura mínima del 60% en módulos críticos
  - Actualizar `jest.config.ts` para habilitar `collectCoverage` y configurar `coverageThreshold` con mínimo 60% de líneas, funciones y ramas a nivel global
  - Configurar `collectCoverageFrom` para incluir `lib/**/*.ts` y `app/actions/**/*.ts`
  - _Requisitos: 11.4_

- [ ] 17. Checkpoint — Verificar cobertura de tests
  - Asegurarse de que todos los tests pasen y la cobertura global supere el 60%. Consultar al usuario si surgen dudas.


- [ ] 18. Configurar logging con Winston
  - [ ] 18.1 Actualizar `lib/logger.ts` para leer el nivel de log desde la variable de entorno `LOG_LEVEL` con fallback a `warn` en producción e `info` en desarrollo
    - _Requisitos: 19.1, 19.3_
  - [ ] 18.2 Configurar el transporte de archivo en Winston con rotación: máximo 10MB por archivo y retención de 30 días
    - Asegurarse de que nunca se registren contraseñas, tokens JWT ni datos financieros sensibles
    - _Requisitos: 19.2, 19.4_

- [ ] 19. Crear `.env.example` y validación de entorno
  - Crear el archivo `.env.example` en la raíz del proyecto con todas las variables requeridas, sus descripciones y formato esperado, sin valores reales
  - Incluir: `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `JWT_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `LOG_LEVEL`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`
  - Documentar el formato esperado y restricciones de cada variable (ej: `JWT_SECRET` mínimo 32 chars)
  - _Requisitos: 1.2, 1.3, 20.1, 20.4_

- [ ] 20. Configurar GitHub Actions para CI
  - Crear `.github/workflows/ci.yml` con los pasos: `npm ci`, `npm run lint`, `npm run type-check`, `npm test -- --coverage --ci`, `npm run build`
  - Configurar el workflow para ejecutarse en `push` y `pull_request` a las ramas `main` y `develop`
  - _Requisitos: 20.1_

- [ ] 21. Configurar staging environment en Vercel
  - Crear el archivo `vercel.json` con la configuración de entornos para producción (`main`) y staging (`develop`)
  - Documentar en `.env.example` las variables específicas de cada entorno
  - _Requisitos: 20.4_

- [ ] 22. Integrar Sentry para error tracking
  - Instalar `@sentry/nextjs` y ejecutar el wizard de configuración para generar `sentry.client.config.ts`, `sentry.server.config.ts` y `sentry.edge.config.ts`
  - Configurar `SENTRY_DSN` y `NEXT_PUBLIC_SENTRY_DSN` como variables de entorno
  - Asegurarse de que Sentry no capture datos financieros sensibles ni contraseñas en los eventos de error

- [ ] 23. Actualizar README y documentar Server Actions principales
  - Actualizar `README.md` con: instrucciones de setup local, descripción de la arquitectura, lista de variables de entorno requeridas con referencia a `.env.example`, y comandos de desarrollo, test y build
  - Agregar comentarios JSDoc a las Server Actions principales en `app/actions/auth.ts`, `app/actions/expenses.ts` y `app/actions/admin.ts` describiendo parámetros, retorno y requisitos de autorización

- [ ] 24. Checkpoint final — Verificar pipeline completo
  - Asegurarse de que el pipeline de CI pase en GitHub Actions con lint, type-check, tests y build exitosos. Consultar al usuario si surgen dudas.


- [ ]* 25. Fase 10: Sistema de notificaciones y alertas
  - [ ]* 25.1 Crear el modelo `Notification` en `prisma/schema.prisma` con tipos `BUDGET_WARNING`, `BUDGET_EXCEEDED`, `GOAL_MISSED` y campo de preferencias por usuario
    - _Requisitos: 13.1, 13.2, 13.3, 13.4_
  - [ ]* 25.2 Implementar la lógica de evaluación de límites de categorías en `lib/notifications/budget-checker.ts`
    - Generar notificación al alcanzar el 80% y al superar el 100% del límite mensual
    - _Requisitos: 13.1, 13.2_
  - [ ]* 25.3 Implementar la lógica de evaluación de metas en `lib/notifications/goal-checker.ts`
    - Generar notificación cuando una meta FIXED no recibe el aporte esperado
    - _Requisitos: 13.3_
  - [ ]* 25.4 Configurar un Vercel Cron Job para ejecutar los checkers diariamente
    - _Requisitos: 13.1, 13.3_
  - [ ]* 25.5 Integrar un proveedor de email (Resend o SendGrid) para envío de resumen semanal
    - _Requisitos: 13.5_

- [ ]* 26. Fase 11: Soporte multi-moneda
  - [ ]* 26.1 Agregar campos `currency` y `exchangeRate` a los modelos `Expense`, `AdditionalIncome` y `Transfer` en `prisma/schema.prisma` y crear la migración
    - _Requisitos: 14.1, 14.2_
  - [ ]* 26.2 Actualizar los esquemas Zod y Server Actions correspondientes para aceptar y procesar los nuevos campos
    - _Requisitos: 14.1, 14.2_
  - [ ]* 26.3 Implementar la conversión a moneda base en los cálculos de reportes y dashboard
    - Agregar campo `baseCurrency` al modelo `Profile` con valor por defecto `USD`
    - _Requisitos: 14.3, 14.4, 14.5_

- [ ]* 27. Fase 12: Reportes PDF y exportación avanzada
  - [ ]* 27.1 Implementar la exportación CSV en `app/actions/reports.ts` con filtros por rango de fechas y categoría
    - Registrar en `AuditLog` cada operación de exportación
    - _Requisitos: 15.1, 15.5_
  - [ ]* 27.2 Implementar la generación de reportes PDF con `@react-pdf/renderer` o Puppeteer
    - _Requisitos: 15.2_
  - [ ]* 27.3 Implementar el reporte mensual automático vía Vercel Cron Job
    - _Requisitos: 15.3_

- [ ]* 28. Fase 13: PWA con soporte offline
  - [ ]* 28.1 Crear `public/manifest.json` con íconos y configuración de instalación como PWA
    - _Requisitos: 16.2_
  - [ ]* 28.2 Configurar Workbox como Service Worker para cachear las páginas del dashboard
    - Implementar indicador de modo offline en la UI
    - _Requisitos: 16.1, 16.3_
  - [ ]* 28.3 Implementar sincronización automática al recuperar conexión
    - _Requisitos: 16.4_

- [ ]* 29. Fase 14: Presupuesto por período flexible
  - [ ]* 29.1 Agregar el enum `BudgetPeriod` (`WEEKLY`, `BIWEEKLY`, `MONTHLY`, `QUARTERLY`, `ANNUAL`) al esquema Prisma y el campo `period` al modelo `Category`
    - _Requisitos: 17.1_
  - [ ]* 29.2 Implementar el cálculo prorrateado de límites y el ajuste de rollover/sinking fund según el período configurado en `lib/budget/period-calculator.ts`
    - _Requisitos: 17.2, 17.3, 17.4_

- [ ]* 30. Fase 15: Integración Open Banking
  - [ ]* 30.1 Integrar con un proveedor de Open Banking compatible con bancos panameños e implementar el flujo de autorización OAuth
    - _Requisitos: 18.1_
  - [ ]* 30.2 Implementar el motor de sugerencia de categorías basado en historial de categorización en `lib/banking/category-suggester.ts`
    - _Requisitos: 18.2_
  - [ ]* 30.3 Implementar el flujo de revisión y confirmación de transacciones importadas
    - _Requisitos: 18.3_
  - [ ]* 30.4 Implementar el almacenamiento cifrado (AES-256) de tokens bancarios y la funcionalidad de revocación de acceso desde la configuración del usuario
    - _Requisitos: 18.5, 18.6_

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Las tareas 1–24 son requeridas y cubren la Fase 9 completa más la infraestructura base
- Las tareas 25–30 corresponden al roadmap futuro (Fases 10–15) y son todas opcionales
- Cada tarea referencia los requisitos específicos del documento `requirements.md` para trazabilidad
- Los checkpoints en las tareas 5, 12, 17 y 24 garantizan validación incremental antes de continuar
- Los tests de propiedades (PBT) con fast-check validan las 15 propiedades de corrección definidas en `design.md`
