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
    isRecurring?: boolean;
    isOneTime?: boolean;
    recurrenceType?: string;
    paymentMethod?: string;
    linkedCardId?: number;
    accountId?: number;
    categoryId?: number;
    date?: Date | string;
}

export async function createExpense(data: CreateExpenseInput) {
    if (data.accountId) {
        const account = await prisma.account.findUnique({ where: { id: data.accountId } });
        if (account?.lockDate && new Date(account.lockDate) > new Date()) {
            throw new Error(`Cuenta bloqueada hasta ${account.lockDate.toLocaleDateString()}`);
        }
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

            const newAmount = data.amount !== undefined ? data.amount : Number(oldExpense.amount);
            const newAccountId = data.accountId !== undefined ? data.accountId : oldExpense.accountId;
            const newCardId =
                data.linkedCardId !== undefined ? data.linkedCardId : oldExpense.linkedCardId;

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

/**
 * Processes all recurring expenses that are due today.
 * This function should be called daily via a cron job or manually.
 * 
 * Logic:
 * - Finds all expenses where isRecurring = true AND isOneTime = false
 * - For each expense with a dueDate, checks if today is the due date
 * - If due, creates a new expense entry (copy) and deducts from the linked account
 */
export async function processRecurringExpenses(): Promise<ProcessRecurringResult> {
    const today = new Date();
    const currentDay = today.getDate();
    
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

            // Check if today is the due date
            if (expense.dueDate === currentDay) {
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
