'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { toNum } from './serializers';
import { logger } from '@/lib/logger';
import { requireOwnership } from '@/lib/auth-utils';

// ─── EXPENSES ──────────────────────────────────────────────────────────────

export interface CreateExpenseInput {
    name: string;
    amount: number;
    category: string;
    profileId: number;
    dueDate?: number;
    graceDays?: number;
    isRecurring?: boolean;
    isOneTime?: boolean;
    recurrenceType?: string;
    paymentMethod?: string;
    linkedCardId?: number | null;
    accountId?: number | null;
    categoryId?: number;
    date?: Date | string;
}

export async function createExpense(data: CreateExpenseInput) {
    await requireOwnership(data.profileId);
    if (data.accountId) {
        const account = await prisma.account.findUnique({ where: { id: data.accountId } });
        if (!account) throw new Error('Cuenta no encontrada');
        if (account.profileId !== data.profileId) throw new Error('La cuenta no pertenece a este perfil');
        if (account.lockDate && new Date(account.lockDate) > new Date()) {
            throw new Error(`Cuenta bloqueada hasta ${account.lockDate.toLocaleDateString()}`);
        }
        if (Number(account.balance) < data.amount) {
            throw new Error(`Fondos insuficientes en la cuenta "${account.name}" (disponible: $${Number(account.balance).toFixed(2)})`);
        }
    }
    if (data.linkedCardId) {
        const card = await prisma.creditCard.findUnique({ where: { id: data.linkedCardId } });
        if (!card) throw new Error('Tarjeta no encontrada');
        if (card.profileId !== data.profileId) throw new Error('La tarjeta no pertenece a este perfil');
    }

    try {
        const expense = await prisma.$transaction(async (tx) => {
            const created = await tx.expense.create({
                data: {
                    name: data.name,
                    amount: data.amount,
                    category: data.category,
                    profileId: data.profileId,
                    dueDate: data.dueDate,
                    graceDays: data.graceDays,
                    isRecurring: data.isRecurring ?? true,
                    isOneTime: data.isOneTime ?? false,
                    recurrenceType: data.recurrenceType ?? 'MONTHLY',
                    paymentMethod: data.paymentMethod,
                    linkedCardId: data.linkedCardId,
                    accountId: data.accountId,
                    categoryId: data.categoryId,
                    createdAt: data.date ? new Date(data.date) : undefined,
                },
            });

            if (data.linkedCardId) {
                await tx.creditCard.update({
                    where: { id: data.linkedCardId },
                    data: { balance: { increment: data.amount } },
                });
            }

            if (data.accountId) {
                await tx.account.update({
                    where: { id: data.accountId },
                    data: { balance: { decrement: data.amount } },
                });
            }

            return created;
        });

        revalidatePath('/budget');
        return { ...expense, amount: toNum(expense.amount) };
    } catch (error) {
        logger.error('Error creating expense:', error);
        throw error;
    }
}

export async function updateExpense(id: number, data: Partial<CreateExpenseInput>) {
    const oldExpense = await prisma.expense.findUnique({ where: { id } });
    if (!oldExpense) throw new Error('Gasto no encontrado');
    await requireOwnership(oldExpense.profileId);

    if (data.accountId !== undefined && data.accountId !== null) {
        const account = await prisma.account.findUnique({ where: { id: data.accountId } });
        if (!account) throw new Error('Cuenta no encontrada');
        if (account.profileId !== oldExpense.profileId) throw new Error('La cuenta no pertenece a este perfil');
    }
    if (data.linkedCardId !== undefined && data.linkedCardId !== null) {
        const card = await prisma.creditCard.findUnique({ where: { id: data.linkedCardId } });
        if (!card) throw new Error('Tarjeta no encontrada');
        if (card.profileId !== oldExpense.profileId) throw new Error('La tarjeta no pertenece a este perfil');
    }

    const newAmount = data.amount !== undefined ? data.amount : Number(oldExpense.amount);
    const newAccountId = data.accountId !== undefined ? data.accountId : oldExpense.accountId;
    const newCardId = data.linkedCardId !== undefined ? data.linkedCardId : oldExpense.linkedCardId;

    if (newAccountId) {
        const targetAccount = await prisma.account.findUnique({ where: { id: newAccountId } });
        if (!targetAccount) throw new Error('Cuenta no encontrada');
        // Si es la misma cuenta que ya tenía, primero se revierte el monto viejo
        // (igual que hace la transacción de abajo) antes de aplicar el nuevo.
        const projectedBalance =
            Number(targetAccount.balance) +
            (oldExpense.accountId === newAccountId ? Number(oldExpense.amount) : 0) -
            newAmount;
        if (projectedBalance < 0) {
            throw new Error(`Fondos insuficientes en la cuenta "${targetAccount.name}" (disponible: $${Number(targetAccount.balance).toFixed(2)})`);
        }
    }

    try {
        await prisma.$transaction(async (tx) => {
            // Revertir impacto anterior
            if (oldExpense.accountId) {
                await tx.account.update({
                    where: { id: oldExpense.accountId },
                    data: { balance: { increment: oldExpense.amount } },
                });
            }
            if (oldExpense.linkedCardId) {
                await tx.creditCard.update({
                    where: { id: oldExpense.linkedCardId },
                    data: { balance: { decrement: oldExpense.amount } },
                });
            }

            if (newAccountId) {
                await tx.account.update({
                    where: { id: newAccountId },
                    data: { balance: { decrement: newAmount } },
                });
            }
            if (newCardId) {
                await tx.creditCard.update({
                    where: { id: newCardId },
                    data: { balance: { increment: newAmount } },
                });
            }

            await tx.expense.update({
                where: { id },
                data: {
                    name: data.name,
                    amount: newAmount,
                    category: data.category,
                    dueDate: data.dueDate,
                    graceDays: data.graceDays,
                    isRecurring: data.isRecurring,
                    isOneTime: data.isOneTime,
                    recurrenceType: data.recurrenceType,
                    paymentMethod: data.paymentMethod,
                    linkedCardId: newCardId,
                    accountId: newAccountId,
                    categoryId: data.categoryId,
                    createdAt: data.date ? new Date(data.date) : undefined,
                },
            });
        });

        revalidatePath('/budget');
    } catch (error) {
        logger.error(`Error updating expense ${id}:`, error);
        throw error;
    }
}

export async function deleteExpense(id: number): Promise<void> {
    try {
        await prisma.$transaction(async (tx) => {
            const expense = await tx.expense.findUnique({ where: { id } });
            if (!expense) throw new Error('Gasto no encontrado');
            await requireOwnership(expense.profileId);

            if (expense.accountId) {
                await tx.account.update({
                    where: { id: expense.accountId },
                    data: { balance: { increment: expense.amount } },
                });
            }
            if (expense.linkedCardId) {
                await tx.creditCard.update({
                    where: { id: expense.linkedCardId },
                    data: { balance: { decrement: expense.amount } },
                });
            }

            await tx.expense.delete({ where: { id } });
        });

        revalidatePath('/budget');
    } catch (error) {
        logger.error(`Error deleting expense ${id}:`, error);
        throw error;
    }
}

// ─── RECURRING EXPENSES PROCESSING ──────────────────────────────────────────

export interface ProcessRecurringResult {
    processed: number;
    created: number;
    errors: string[];
}

function isPaidThisCycle(lastPaidAt: Date | null, today: Date): boolean {
    if (!lastPaidAt) return false;
    return lastPaidAt.getMonth() === today.getMonth() && lastPaidAt.getFullYear() === today.getFullYear();
}

/**
 * Processes all recurring expenses that are due today.
 * This function should be called daily via a cron job or manually.
 *
 * Logic:
 * - Finds all expenses where isRecurring = true AND isOneTime = false
 * - For each expense with a dueDate, checks if today is the due date
 *   (dueDate se recorta al ultimo dia del mes si el mes es mas corto, ej. 31 en febrero)
 * - Si el usuario ya lo marco "Pagado" este mes (lastPaidAt), NO se cobra de nuevo:
 *   se asume que ya lo pago manualmente y el cron no debe duplicar el cargo.
 * - Si se procesa automaticamente, se marca lastPaidAt = hoy para que el estado
 *   Pagado/Pendiente en la UI quede sincronizado con el cobro real.
 */
export async function processRecurringExpenses(): Promise<ProcessRecurringResult> {
    const today = new Date();
    const currentDay = today.getDate();
    const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    const result: ProcessRecurringResult = {
        processed: 0,
        created: 0,
        errors: [],
    };

    try {
        // Find all recurring expenses that are not one-time
        const recurringExpenses = await prisma.expense.findMany({
            where: {
                isRecurring: true,
                isOneTime: false,
                dueDate: { not: null },
            },
            include: {
                account: true,
            },
        });

        for (const expense of recurringExpenses) {
            result.processed++;

            // Check if today is the due date (recortado al ultimo dia del mes si aplica)
            const effectiveDueDay = Math.min(expense.dueDate!, daysInCurrentMonth);
            if (effectiveDueDay === currentDay) {
                // Si ya se marco como pagado manualmente este mes, no duplicar el cobro
                if (isPaidThisCycle(expense.lastPaidAt, today)) continue;

                // Check if this frequency should fire this month
                const freq = expense.recurrenceType || 'MONTHLY';
                const createdMonth = expense.createdAt.getMonth(); // 0-11
                const currentMonth = today.getMonth(); // 0-11
                const monthsSinceCreation = (today.getFullYear() - expense.createdAt.getFullYear()) * 12 + (currentMonth - createdMonth);

                let shouldProcess = false;
                if (freq === 'MONTHLY') {
                    shouldProcess = true;
                } else if (freq === 'QUARTERLY') {
                    shouldProcess = monthsSinceCreation % 3 === 0;
                } else if (freq === 'SEMIANNUAL') {
                    shouldProcess = monthsSinceCreation % 6 === 0;
                } else if (freq === 'ANNUAL') {
                    shouldProcess = monthsSinceCreation % 12 === 0;
                } else {
                    shouldProcess = true; // Default to monthly
                }

                if (!shouldProcess) continue;
                try {
                    // Check if account is locked
                    if (expense.account?.lockDate && new Date(expense.account.lockDate) > today) {
                        result.errors.push(`Cuenta bloqueada para gasto "${expense.name}"`);
                        continue;
                    }

                    // No dejar la cuenta en negativo por un cobro automático
                    if (expense.account && Number(expense.account.balance) < Number(expense.amount)) {
                        result.errors.push(`Fondos insuficientes en "${expense.account.name}" para cobrar "${expense.name}"`);
                        continue;
                    }

                    // Idempotency: check if already processed today
                    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    const todayEnd = new Date(todayStart.getTime() + 86400000);
                    const alreadyProcessed = await prisma.expense.findFirst({
                        where: {
                            profileId: expense.profileId,
                            name: expense.name,
                            amount: expense.amount,
                            isOneTime: true,
                            isRecurring: false,
                            createdAt: { gte: todayStart, lt: todayEnd },
                        },
                    });
                    if (alreadyProcessed) continue;

                    await prisma.$transaction(async (tx) => {
                        // Create new expense entry (copy of the recurring template)
                        await tx.expense.create({
                            data: {
                                name: expense.name,
                                amount: expense.amount,
                                category: expense.category,
                                profileId: expense.profileId,
                                dueDate: expense.dueDate,
                                isRecurring: false,
                                isOneTime: true,
                                paymentMethod: expense.paymentMethod,
                                linkedCardId: expense.linkedCardId,
                                accountId: expense.accountId,
                                categoryId: expense.categoryId,
                                createdAt: today,
                            },
                        });

                        // Deduct from account if linked
                        if (expense.accountId) {
                            await tx.account.update({
                                where: { id: expense.accountId },
                                data: { balance: { decrement: expense.amount } },
                            });
                        }

                        // Add to credit card balance if linked
                        if (expense.linkedCardId) {
                            await tx.creditCard.update({
                                where: { id: expense.linkedCardId },
                                data: { balance: { increment: expense.amount } },
                            });
                        }

                        // Sincronizar el estado Pagado/Pendiente de la UI con el cobro automatico
                        await tx.expense.update({
                            where: { id: expense.id },
                            data: { lastPaidAt: today },
                        });
                    });

                    result.created++;
                } catch (error) {
                    result.errors.push(`Error procesando gasto "${expense.name}": ${error}`);
                }
            }
        }

        revalidatePath('/budget');
    } catch (error) {
        result.errors.push(`Error general: ${error}`);
    }

    return result;
}

// ─── SUBSCRIPTION STATUS ─────────────────────────────────────────────────────

export async function markSubscriptionPaid(expenseId: number): Promise<void> {
    const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!expense) throw new Error('Gasto no encontrado');
    if (!expense.isRecurring) throw new Error('Este gasto no es una suscripción');
    await requireOwnership(expense.profileId);

    await prisma.expense.update({
        where: { id: expenseId },
        data: { lastPaidAt: new Date() },
    });

    revalidatePath('/budget');
}

export async function markSubscriptionUnpaid(expenseId: number): Promise<void> {
    const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!expense) throw new Error('Gasto no encontrado');
    if (!expense.isRecurring) throw new Error('Este gasto no es una suscripción');
    await requireOwnership(expense.profileId);

    await prisma.expense.update({
        where: { id: expenseId },
        data: { lastPaidAt: null },
    });

    revalidatePath('/budget');
}
