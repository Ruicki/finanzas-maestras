# Seguimiento Maestro de Tareas — Finanzas Maestras

- [ ] **Fase 1: Seguridad Crítica e Infraestructura (Prioridad Inmediata)**
  - [ ] 1.1 Crear `lib/env.ts` con `getJwtSecretKey()` y validación Fail-Fast.
  - [ ] 1.2 Actualizar `lib/auth-utils.ts` removiendo `'secret-key-change-me-in-prod'`.
  - [ ] 1.3 Crear `middleware.ts` en la raíz con protección RBAC para `/admin` y eliminar `proxy.ts`.
  - [ ] 1.4 Proteger `getGlobalStats` en `app/actions/budget/profiles.ts` (requerir rol `ADMIN`).
  - [ ] 1.5 Mitigar IDOR en `app/actions/budget/expenses.ts` (`createExpense`, `updateExpense`).
  - [ ] 1.6 Mitigar IDOR en `app/actions/budget/credit-cards.ts` (`payCreditCard`).

- [ ] **Fase 2: Lógica Financiera y Motor de Cálculo (Prioridad Alta)**
  - [ ] 2.1 Corregir cálculo de `getBestPurchaseDay` en `lib/financial-engine.ts`.
  - [ ] 2.2 Corregir clasificación de `days === 0` en `getDaysToCutoff`.
  - [ ] 2.3 Implementar utilidades de redondeo financiero estricto a 2 decimales.

- [ ] **Fase 3: Ciclo de Vida y Server Components (Prioridad Alta)**
  - [ ] 3.1 Eliminar mutaciones de base de datos dentro del render de `app/page.tsx`.
  - [ ] 3.2 Asegurar que el onboarding (creación de cuenta 'Efectivo' y categorías) se ejecute en `app/actions/auth.ts` (`register`).

- [ ] **Fase 4: Validación de Entradas con Zod (Prioridad Media)**
  - [ ] 4.1 Instalar dependencia `zod`.
  - [ ] 4.2 Crear esquemas de validación en `lib/validators/`.
  - [ ] 4.3 Integrar `safeParse` en todas las Server Actions.
  - [ ] 4.4 Aplicar política de complejidad de contraseñas en `register`.

- [ ] **Fase 5: Base de Datos y Rendimiento (Prioridad Media)**
  - [ ] 5.1 Agregar índices `@@index` en claves foráneas en `prisma/schema.prisma`.
  - [ ] 5.2 Ejecutar `npx prisma migrate dev` o actualizar cliente.

- [ ] **Fase 6: Refactorización y Principio SRP en UI (Prioridad Normal)**
  - [ ] 6.1 Modularizar `DebtsTab.tsx` en subcomponentes atómicos.
  - [ ] 6.2 Modularizar `BudgetsTab.tsx` en subcomponentes atómicos.
  - [ ] 6.3 Desacoplar modales restantes en `GoalsTab.tsx`.

- [ ] **Fase 7: Testing y Rate Limiting Distribuido (Prioridad Normal)**
  - [ ] 7.1 Configurar rate limiting persistente por IP.
  - [ ] 7.2 Crear suite de pruebas para Server Actions y motor financiero.
