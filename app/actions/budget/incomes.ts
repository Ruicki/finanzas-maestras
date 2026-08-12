'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { toNum } from './serializers';

// ─── INCOMES ───────────────────────────────────────────────────────────────

export interface CreateIncomeInput {
    name: string;
    amount: number;
    type: string;
    frequency?: string;
    durationMonths?: number;
    profileId: number;
    accountId?: number;
    icon?: string;
    date?: Date;
}

export async function createIncome(data: CreateIncomeInput) {
    return await prisma.$transaction(async (tx) => {
        const income = await tx.additionalIncome.create({
            data: {
                name: data.name,
                amount: data.amount,
                type: data.type,
                frequency: data.frequency,
                durationMonths: data.durationMonths,
                profileId: data.profileId,
                accountId: data.accountId,
                icon: data.icon,
                date: data.date || new Date(),
            },
        });

        if (data.accountId) {
            await tx.account.update({
                where: { id: data.accountId },
                data: { balance: { increment: data.amount } },
            });
        }

        return { ...income, amount: toNum(income.amount) };
    });
}

export async function updateIncome(id: number, data: Partial<CreateIncomeInput>) {
    const oldIncome = await prisma.additionalIncome.findUnique({ where: { id } });
    if (!oldIncome) throw new Error('Ingreso no encontrado');

    await prisma.$transaction(async (tx) => {
        // Revertir impacto anterior
        if (oldIncome.accountId) {
            await tx.account.update({
                where: { id: oldIncome.accountId },
                data: { balance: { decrement: oldIncome.amount } },
            });
        }

        const newAmount = data.amount !== undefined ? data.amount : Number(oldIncome.amount);
        const newAccountId =
            data.accountId !== undefined ? data.accountId : oldIncome.accountId;

        if (newAccountId) {
            await tx.account.update({
                where: { id: newAccountId },
                data: { balance: { increment: newAmount } },
            });
        }

        await tx.additionalIncome.update({
            where: { id },
            data: {
                name: data.name,
                amount: newAmount,
                type: data.type,
                frequency: data.frequency,
                accountId: newAccountId,
                icon: data.icon,
                date: data.date,
            },
        });
    });

    revalidatePath('/budget');
}

export async function deleteIncome(id: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
        const income = await tx.additionalIncome.findUnique({ where: { id } });

        if (income) {
            if (income.accountId) {
                await tx.account.update({
                    where: { id: income.accountId },
                    data: { balance: { decrement: income.amount } },
                });
            }
            await tx.additionalIncome.delete({ where: { id } });
        }
    });

    revalidatePath('/budget');
}
