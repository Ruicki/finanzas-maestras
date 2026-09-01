/**
 * Re-exporta todas las acciones del módulo budget para mantener
 * compatibilidad con los imports existentes que usan '@/app/actions/budget'.
 *
 * Los imports nuevos pueden apuntar directamente al sub-módulo:
 *   import { createAccount } from '@/app/actions/budget/accounts'
 */

export * from './profiles';
export * from './accounts';
export * from './expenses';
export * from './incomes';
export * from './goals';
export * from './credit-cards';
export * from './budget-categories';
export * from './budgets';
