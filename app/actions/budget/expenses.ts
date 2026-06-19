'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { toNum } from './serializers';
import { logger } from '@/lib/logger';

// ─── EXPENSES ──────────────────────────────────────────────────────────────

export interface CreateExpenseInput {
    name: string;
    amount: number;
    category: string;
    profileId: number;
    dueDate?: number;
    isRecurring?: boolean;
    isOneTime?: boolean;
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
        const expense = await prisma.expense.create({
            data: {
                name: data.name,
                amount: data.amount,
                category: data.category,
                profileId: data.profileId,
                dueDate: data.dueDate,
                isRecurring: data.isRecurring ?? true,
                isOneTime: data.isOneTime ?? false,
                paymentMethod: data.paymentMethod,
                linkedCardId: data.linkedCardId,
                accountId: data.accountId,
                categoryId: data.categoryId,
                createdAt: data.date ? new Date(data.date) : undefined,
            },
        });

        if (data.linkedCardId) {
            await prisma.creditCard.update({
                where: { id: data.linkedCardId },
                data: { balance: { increment: data.amount } },
            });
        }

        if (data.accountId) {
            await prisma.account.update({
                where: { id: data.accountId },
                data: { balance: { decrement: data.amount } },
            });
        }

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
        const expense = await prisma.expense.findUnique({ where: { id } });

        if (expense) {
            if (expense.accountId) {
                await prisma.account.update({
                    where: { id: expense.accountId },
                    data: { balance: { increment: expense.amount } },
                });
            }
            if (expense.linkedCardId) {
                await prisma.creditCard.update({
                    where: { id: expense.linkedCardId },
                    data: { balance: { decrement: expense.amount } },
                });
            }
        }

        await prisma.expense.delete({ where: { id } });
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
                try {
                    // Check if account is locked
                    if (expense.account?.lockDate && new Date(expense.account.lockDate) > today) {
                        result.errors.push(`Cuenta bloqueada para gasto "${expense.name}"`);
                        continue;
                    }

                    // Create new expense entry (copy of the recurring template)
                    const newExpense = await prisma.expense.create({
                        data: {
                            name: expense.name,
                            amount: expense.amount,
                            category: expense.category,
                            profileId: expense.profileId,
                            dueDate: expense.dueDate,
                            isRecurring: false, // The copy is not recurring
                            isOneTime: true, // Mark as one-time (already processed)
                            paymentMethod: expense.paymentMethod,
                            linkedCardId: expense.linkedCardId,
                            accountId: expense.accountId,
                            categoryId: expense.categoryId,
                            createdAt: today,
                        },
                    });

                    // Deduct from account if linked
                    if (expense.accountId) {
                        await prisma.account.update({
                            where: { id: expense.accountId },
                            data: { balance: { decrement: expense.amount } },
                        });
                    }

                    // Add to credit card balance if linked
                    if (expense.linkedCardId) {
                        await prisma.creditCard.update({
                            where: { id: expense.linkedCardId },
                            data: { balance: { increment: expense.amount } },
                        });
                    }

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
