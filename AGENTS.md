# Reglas de Negocio - Finanzas Maestras

> ESTE ARCHIVO ES DE LECTURA OBLIGATORIA. Toda modificación al código debe respetar estas reglas.
> Si una funcionalidad existe, solo se puede MEJORAR, nunca ELIMINAR o DEGRADAR.

## Regla General

**NUNCA eliminar funcionalidades que ya funcionan.** Si algo está implementado y funciona, solo se permite:
- Mejorar su rendimiento
- Corregir bugs
- Agregar nuevas opciones
- Refactorizar sin cambiar comportamiento

---

## Cuentas

### Cuenta Efectivo (CASH)
- **REGLA INVARIABLE:** Siempre debe existir exactamente UNA cuenta tipo CASH llamada "Efectivo".
- La auto-reparación en `app/page.tsx:28-37` crea la cuenta si no existe.
- No se puede eliminar desde la UI (botón oculto en `AccountsTab.tsx:72`).
- El nombre es fijo: "Efectivo" (no editable en el formulario).
- La opción de crear cuentas CASH desde el wizard fue eliminada intencionalmente.
- Saldo puede ser 0 o positivo, nunca negativo.

### Tipos de Cuenta
- BANK: Cuentas bancarias (Corriente, Ahorro)
- CASH: Efectivo físico (solo 1 por instancia, auto-creada)
- WALLET: Billeteras digitales (PayPal, Yappy, Binance, etc.)
- SAVINGS: Ahorros bloqueados para metas

### Propósito de Cuenta
- SPENDING: Uso diario (disponible para gastos e ingresos)
- SAVINGS: Ahorro (excluida de cálculo de "Disponible")
- Las cuentas SAVINGS no aparecen en selectores de gastos/ingresos

### Symbol (WALLET)
- Campo `symbol` en Account es para cuentas WALLET (BTC, ETH, USDT, etc.)
- Se muestra en todos los selectores de cuentas cuando existe
- Se persiste en createAccount y updateAccount

---

## Ingresos

### Tipos de Ingreso
- SALARY: Salarios con cálculo automático (absentDays, bonus, deductions)
- DEPOSIT: Depósitos puntuales (sin frecuencia)
- **NO existe frecuencia en depósitos.** La frecuencia fue revertida intencionalmente.

### Campos del Ingreso
- `type`: SALARY o DEPOSIT
- `amount`: Monto
- `date`: Fecha del ingreso
- `description`: Campo obligatorio restaurado (no se puede eliminar)
- `absentDays`: Solo para SALARY
- `bonus`: Solo para SALARY
- `frequency`: Solo se usa internamente, NO se muestra al usuario en depósitos

### Cálculo de Ingresos del Mes
- Incluye: salarios del mes + depósitos del mes
- Se filtra por mes y año seleccionado
- Los salarios se calculan con absentDays

---

## Gastos

### Método de Pago
- CASH: Pago en efectivo (descuenta de cuenta seleccionada)
- CREDIT: Pago con tarjeta de crédito

### Categorías
- Se inicializan automáticamente al crear perfil
- No se pueden eliminar categorías predeterminadas
- Se pueden crear categorías personalizadas

---

## Suscripciones

### Modelo de Datos
- Las suscripciones son gastos recurrentes con `isRecurring: true`
- Campo `frequency`: WEEKLY, BIWEEKLY, MONTHLY, ANNUAL
- Campo `lastPaidAt`: Marca de tiempo del último pago registrado

### Estado Pagado/Pendiente
- **NO existe botón "Pagar" que cree gastos duplicados**
- Solo existe "Marcar pagado/Pendiente" que actualiza `lastPaidAt`
- Las suscripciones YA SON el registro del gasto
- Badge: Pagado (verde) / Pendiente (gris)

### Recurrencia Anual
- Las suscripciones ANNUAL aparecen TODOS los años en su mes de facturación
- No solo en el año de creación
- Ejemplo: Suscripción creada en Marzo 2024 → aparece en Marzo 2025, 2026, etc.

### Recurrencia Mensual
- Aparece en todos los meses del rango seleccionado

---

## Metas de Ahorro

### GoalCard (Componente Extraído)
- **REGLA:** GoalCard está definido FUERA de GoalsTab como componente de módulo
- Esto evita re-mount en cada pulsación del input (causa raíz del bug de foco)
- Estado local (amount, accountId) vive dentro de cada GoalCard
- Nunca mover GoalCard de vuelta al interior de GoalsTab

### Input de Fondos
- Usa SmartMoneyInput (no input HTML nativo)
- Comportamiento RTL: escribes "123" → muestra "$1.23"
- Si SmartMoneyInput causa problemas de foco, extrair el componente pero NUNCA usar input nativo

### Transacciones de Meta
- DEPOSIT: Agrega fondos a la meta
- WITHDRAW: Retira fondos (requiere cuenta destino)
- Las transacciones se registran en GoalTransaction

### Eliminar Meta
- Si tiene fondos: abre modal de "Romper Alcancía" para reclamar dinero
- Si no tiene fondos: elimina directamente con confirmación
- `deleteGoalWithReclaim` transfiere fondos a cuenta seleccionada

---

## Transferencias

### Cross-Currency
- Soporta transferencias entre cuentas de diferentes tipos
- Campo `exchangeRate`: tipo de cambio entre origen y destino
- Campo `sourceAmount`: monto en moneda origen
- Campo `destAmount`: monto en moneda destino calculado

### UI de Tipo de Cambio
- Se muestra cuando origen y destino son de diferentes tipos
- Calcula automáticamente el monto destino

---

## Tarjetas de Crédito

### Balance
- El balance se actualiza por transacciones, NO por el formulario de edición
- `updateCreditCardDetails` NO sobrescribe el balance
- El balance refleja el estado actual de la tarjeta

---

## Presupuesto

### Cálculo Mensual
- Ingresos del mes vs Gastos del mes
- Incluye suscripciones recurrentes (MONTHLY y ANNUAL en su mes)
- Incluye cuotas de deudas
- Incluye cuotas de metas FIXED

### Sin Ingresos
- Si no hay ingresos: muestra widget "Sin ingresos registrados"
- Botón "Agregar Primer Ingreso" que abre el wizard

---

## Patrimonio Neto

### Tarjeta de Resumen
- Muestra: Ingresos vs Gastos vs Deudas
- El patrimonio neto refleja TODAS las cuentas (net worth)
- Incluye: cuentas bancarias + efectivo + billeteras - deudas

---

## Dashboard Insights

### Filtros
- Acepta `selectedMonth` y `selectedYear` como props
- Filtra datos por mes y año seleccionado
- No muestra datos de otros períodos

---

## UI/UX

### SmartMoneyInput
- Componente de entrada monetaria RTL
- `selectOnFocus`: controla auto-selección al foco
- Formato: escribes "1234" → "$12.34"
- Consistente en: gastos, ingresos, metas, tarjetas

### Modales
- Todos usan overlay oscuro con backdrop-blur
- Responsive: bottom sheet en móvil
- `useScrollLock` para evitar scroll del body

### Confirmaciones de Eliminación
- Usar `confirmDelete` de `@/components/shared/DeleteConfirmation`
- Nunca eliminar sin confirmación del usuario

### Fechas
- `parseDateNoon`: almacena fechas a mediodía UTC para correcta comparación local
- Timezone: Panama (es-PA)
- Formato de visualización: `es-ES`

---

## Seguridad

### Autenticación
- JWT con hardcoded fallback en `lib/auth-utils.ts` y `proxy.ts`
- `requireOwnership` en todas las acciones de escritura
- Verificación de lockDate en cuentas

### Acciones Protegidas
- createAccount, updateAccount
- createCreditCard, updateCreditCard
- createLoan, payLoan
- createGoal, updateGoal, deleteGoal
- createTransfer
- handleGoalTransaction
- getAccountTransactions

---

## Infraestructura

### Base de Datos
- Prisma ^5.10.0 con Neon PostgreSQL
- Schema: `prisma/schema.prisma`
- No usar migraciones, usar `prisma db push`
- Deploy: Vercel (auto-deploy en push a main)

### Next.js
- Versión 16.1.1
- `proxy.ts` (renombrado de middleware.ts para compatibilidad)
- Turbopack para desarrollo

### Commits
- **Los mensajes de commit SIEMPRE deben ser en ESPAÑOL**
- Formato: `tipo: descripción corta`
- Tipos: feat, fix, refactor, etc.

---

## Comunicación

- El usuario NO es técnico
- Responder en español
- Explicaciones simples y directas
- No asumir conocimiento técnico
