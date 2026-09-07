# Requerimientos Globales del Sistema — Plan Maestro de Remediación

## 1. Contexto y Objetivos
Este documento define los requisitos funcionales, no funcionales y de seguridad para solventar la deuda técnica, fallos arquitectónicos y vulnerabilidades de **Finanzas Maestras**.

---

## 2. Desglose de Requerimientos por Fase

### FASE 1: Seguridad Crítica e Infraestructura (Edge & Auth)
* **REQ-1.1 (Middleware Activo):** Renombrar `proxy.ts` a `middleware.ts` en la raíz. Debe ejecutarse en Edge Runtime para validar tokens JWT en cookies.
* **REQ-1.2 (RBAC en Rutas Admin):** El middleware debe verificar que el usuario tenga rol `ADMIN` para acceder a `/admin`. Los usuarios con rol `USER` o invitados deben ser redirigidos a `/`.
* **REQ-1.3 (Fail-Fast en Secretos):** `JWT_SECRET` debe ser obligatorio y tener longitud >= 32 caracteres. Prohibir cualquier fallback en el código fuente (`'secret-key-change-me-in-prod'`).
* **REQ-1.4 (Protección de Métricas Globales):** La Server Action `getGlobalStats` debe verificar que el usuario en sesión sea `ADMIN`.
* **REQ-1.5 (Mitigación IDOR en Gastos y Tarjetas):** En `createExpense`, `updateExpense` y `payCreditCard`, verificar que las cuentas (`accountId`) y tarjetas (`linkedCardId`, `cardId`) pertenezcan al `profileId` autenticado antes de debitar o acreditar fondos.

### FASE 2: Lógica Financiera y Motor de Cálculo (`lib/financial-engine.ts`)
* **REQ-2.1 (Cálculo del Mejor Día de Compra):** En `getBestPurchaseDay`, corregir las ramas condicionales idénticas. Si el día actual superó la fecha de corte, el mejor día es `cutoffDay + 1` del **mes siguiente**, manejando transición de año (diciembre a enero).
* **REQ-2.2 (Estado del Día de Corte):** En `getDaysToCutoff`, si `days === 0`, el estado debe reflejar "Día de corte hoy" con advertencia prioritaria, no `'passed'`.
* **REQ-2.3 (Aritmética Monetaria Segura):** Implementar funciones de redondeo financiero estricto a 2 decimales para evitar desvíos por punto flotante binario en cálculos de intereses y amortizaciones.

### FASE 3: Ciclo de Vida y Server Components (`app/page.tsx`)
* **REQ-3.1 (Eliminación de Efectos Secundarios en Render):** Eliminar la llamada a mutaciones de base de datos (`createAccount`, `initializeDefaultCategories`) dentro de la función de renderizado GET del Server Component `Home`.
* **REQ-3.2 (Onboarding Transaccional):** Garantizar que la cuenta "Efectivo" y las categorías predeterminadas se creen dentro de una transacción atómica durante el registro (`register`) del usuario.

### FASE 4: Validación de Entradas con Zod y Tipado
* **REQ-4.1 (Esquemas Zod en Server Actions):** Instalar `zod` y validar todas las entradas de usuarios (montos > 0, longitudes de texto, enums de periodicidad y tipos de cuenta) antes de llamar a Prisma.
* **REQ-4.2 (Política de Contraseñas):** Exigir contraseñas de al menos 8 caracteres, con mayúsculas, minúsculas y números en `register` y cambio de clave.

### FASE 5: Optimización de Base de Datos (`prisma/schema.prisma`)
* **REQ-5.1 (Indexación Relacional):** Agregar directivas `@@index([profileId])`, `@@index([accountId])`, `@@index([categoryId])` y `@@index([createdAt])` en los modelos principales para evitar *Full Table Scans* en PostgreSQL.
* **REQ-5.2 (Capa de Acceso a Datos Coherente):** Unificar las consultas repetidas de saldos y transacciones bajo repositorios de dominio.

### FASE 6: Refactorización y Principio de Responsabilidad Única (SRP) en UI
* **REQ-6.1 (Descomposición de Tabs Monolíticas):** Desacoplar `DebtsTab.tsx`, `BudgetsTab.tsx` y `GoalsTab.tsx` en componentes atómicos de menos de 200 líneas (tarjetas, modales, calculadoras).

### FASE 7: Rate Limiting Distribuido y Testing
* **REQ-7.1 (Rate Limiting Distribuido):** Integrar control de fuerza bruta por IP compatible con entornos serverless.
* **REQ-7.2 (Suite de Pruebas):** Implementar tests unitarios y de integración para Server Actions, cálculo de amortización y validadores Zod.
