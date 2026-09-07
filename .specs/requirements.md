# Requerimientos - Corrección Input de Gestión de Fondos (GoalsTab)

## 1. Contexto del Proyecto
Finanzas-Maestras es una aplicación web de gestión financiera personal (Next.js / React / Tailwind / Prisma) que permite administrar presupuestos, cuentas y metas de ahorro.

## 2. Problema Detectado
En la pestaña de metas (`GoalsTab.tsx`), el input para depositar o retirar fondos dentro de la tarjeta de meta (`GoalCard`) presenta fallos críticos:
1. **Pérdida de foco y reseteo por pulsación:** `GoalCard` está declarada como una función interna dentro del componente `GoalsTab`. Cada vez que el usuario escribe un carácter, el estado `transactionAmount` se actualiza en el componente padre, provocando un re-render que recrea la identidad de `GoalCard`. React desmonta y remonta el DOM de la tarjeta, perdiendo el foco tras cada tecla.
2. **Inconsistencia con el resto del sistema:** En los demás formularios y pestañas se utiliza el componente `SmartMoneyInput` (formato monetario RTL con 2 decimales automáticos), mientras que aquí se utiliza un `<input type="text">` genérico sin formato.
3. **Colisión de estado entre tarjetas:** `transactionAmount` y `selectedAccountId` se manejan en el componente padre para todas las metas, en lugar de estar aislados o administrados apropiadamente por tarjeta.

## 3. Requerimientos Funcionales
- **RF-01 (Mantenimiento de Foco):** El usuario debe poder escribir de forma fluida sin perder el foco ni experimentar saltos de cursor o desmontajes de interfaz.
- **RF-02 (Estandarización Monetaria):** El input de fondos debe utilizar `SmartMoneyInput` para mantener la misma experiencia de usuario (RTL, 2 decimales, sanitización de caracteres no numéricos) que los demás inputs de cantidades del sistema.
- **RF-03 (Aislamiento de Componente):** Extraer `GoalCard` fuera del cuerpo de `GoalsTab` cumpliendo el Principio de Responsabilidad Única (SRP), pasando las props necesarias de forma tipada.
- **RF-04 (Validaciones de Transacción):** Mantener las validaciones existentes (depósito válido, retiro que no supere el saldo actual de la meta, selección de cuenta).
