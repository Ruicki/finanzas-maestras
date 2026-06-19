'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { toNum } from './serializers';

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
}

export async function updateExpense(id: number, data: Partial<CreateExpenseInput>) {
    const oldExpense = await prisma.expense.findUnique({ where: { id } });
    if (!oldExpense) throw new Error('Gasto no encontrado');

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
                paymentMethod: data.paymentMethod,
                linkedCardId: newCardId,
                accountId: newAccountId,
                categoryId: data.categoryId,
                createdAt: data.date ? new Date(data.date) : undefined,
            },
        });
    });

    revalidatePath('/budget');
}

export async function deleteExpense(id: number): Promise<void> {
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
}
