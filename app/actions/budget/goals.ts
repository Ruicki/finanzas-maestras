'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { toNum, toNumOrNull } from './serializers';

// ─── GOALS ─────────────────────────────────────────────────────────────────

export interface CreateGoalInput {
    name: string;
    targetAmount: number;
    currentAmount?: number;
    deadline?: Date;
    profileId: number;
    type: string;
    frequency?: string;
    contributionAmount?: number;
    priority?: string;
    sourceAccountId?: number;
}

function serializeGoal(goal: any) {
    return {
        ...goal,
        targetAmount: toNum(goal.targetAmount),
        currentAmount: toNum(goal.currentAmount),
        contributionAmount: toNumOrNull(goal.contributionAmount),
    };
}

export async function createGoal(data: CreateGoalInput) {
    const goal = await prisma.goal.create({
        data: {
            name: data.name,
            targetAmount: data.targetAmount,
            currentAmount: data.currentAmount ?? 0,
            deadline: data.deadline,
            profileId: data.profileId,
            type: data.type,
            frequency: data.frequency,
            contributionAmount: data.contributionAmount,
            priority: data.priority,
            sourceAccountId: data.sourceAccountId,
        },
    });
    revalidatePath('/budget');
    return serializeGoal(goal);
}

export async function updateGoal(id: number, data: Partial<CreateGoalInput>) {
    const goal = await prisma.goal.update({
        where: { id },
        data: {
            name: data.name,
            targetAmount: data.targetAmount,
            deadline: data.deadline,
            type: data.type,
            frequency: data.frequency,
            contributionAmount: data.contributionAmount,
            priority: data.priority,
            sourceAccountId: data.sourceAccountId,
        },
    });
    revalidatePath('/budget');
    return serializeGoal(goal);
}

export async function deleteGoal(id: number): Promise<void> {
    await prisma.goal.delete({ where: { id } });
    revalidatePath('/budget');
}

export async function deleteGoalWithReclaim(
    id: number,
    targetAccountId: number,
): Promise<void> {
    await prisma.$transaction(async (tx) => {
        const goal = await tx.goal.findUnique({ where: { id } });
        if (!goal) throw new Error('Meta no encontrada');

        if (Number(goal.currentAmount) > 0) {
            await tx.account.update({
                where: { id: targetAccountId },
                data: { balance: { increment: goal.currentAmount } },
            });
            await tx.additionalIncome.create({
                data: {
                    name: `Retiro por Cierre de Meta: ${goal.name}`,
                    amount: goal.currentAmount,
                    type: 'ONE_TIME',
                    profileId: goal.profileId,
                    accountId: targetAccountId,
                },
            });
        }

        await tx.goal.delete({ where: { id } });
    });
    revalidatePath('/budget');
}

export async function handleGoalTransaction(
    goalId: number,
    amount: number,
    type: 'DEPOSIT' | 'WITHDRAW',
    accountId?: number,
) {
    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new Error('Meta no encontrada');
    if (amount <= 0) throw new Error('El monto debe ser mayor a cero');

    const updatedGoal = await prisma.$transaction(async (tx) => {
        if (type === 'DEPOSIT') {
            const sourceAccountId = accountId || goal.sourceAccountId;
            if (!sourceAccountId) throw new Error('Se requiere una cuenta de origen.');

            const account = await tx.account.findUnique({ where: { id: sourceAccountId } });
            if (!account) throw new Error('Cuenta no encontrada.');
            if (Number(account.balance) < amount) throw new Error('Fondos insuficientes.');
            if (account.lockDate && new Date(account.lockDate) > new Date()) {
                throw new Error(`Cuenta bloqueada hasta ${account.lockDate.toLocaleDateString()}`);
            }

            await tx.account.update({
                where: { id: sourceAccountId },
                data: { balance: { decrement: amount } },
            });
            await tx.expense.create({
                data: {
                    name: `Aporte Meta: ${goal.name}`,
                    amount,
                    category: 'Ahorro',
                    profileId: goal.profileId,
                    isRecurring: false,
                    isOneTime: true,
                    accountId: sourceAccountId,
                },
            });
        } else {
            if (Number(goal.currentAmount) < amount)
                throw new Error('No puedes retirar más de lo ahorrado.');

            const destAccountId = accountId;
            if (!destAccountId) throw new Error('Debes seleccionar una cuenta de destino.');

            await tx.account.update({
                where: { id: destAccountId },
                data: { balance: { increment: amount } },
            });
            await tx.additionalIncome.create({
                data: {
                    name: `Retiro Meta: ${goal.name}`,
                    amount,
                    type: 'ONE_TIME',
                    profileId: goal.profileId,
                    accountId: destAccountId,
                },
            });
        }

        const newAmount =
            type === 'DEPOSIT'
                ? Number(goal.currentAmount) + amount
                : Number(goal.currentAmount) - amount;

        return tx.goal.update({
            where: { id: goalId },
            data: { currentAmount: newAmount },
        });
    });

    revalidatePath('/budget');
    return serializeGoal(updatedGoal);
}
