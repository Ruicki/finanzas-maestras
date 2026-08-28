'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { toNum, toNumOrNull } from './serializers';
import { requireOwnership } from '@/lib/auth-utils';

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
    category?: string;
    notes?: string;
    isPaused?: boolean;
    sourceAccountId?: number;
    destinationAccountId?: number;
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
    await requireOwnership(data.profileId);
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
            category: data.category,
            notes: data.notes,
            isPaused: data.isPaused ?? false,
            sourceAccountId: data.sourceAccountId,
            destinationAccountId: data.destinationAccountId,
        },
    });
    revalidatePath('/budget');
    return serializeGoal(goal);
}

export async function updateGoal(id: number, data: Partial<CreateGoalInput>) {
    const existing = await prisma.goal.findUnique({ where: { id } });
    if (!existing) throw new Error('Meta no encontrada');
    await requireOwnership(existing.profileId);

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
            category: data.category,
            notes: data.notes,
            isPaused: data.isPaused,
            sourceAccountId: data.sourceAccountId,
            destinationAccountId: data.destinationAccountId,
        },
    });
    revalidatePath('/budget');
    return serializeGoal(goal);
}

export async function toggleGoalPaused(id: number): Promise<void> {
    const goal = await prisma.goal.findUnique({ where: { id } });
    if (!goal) throw new Error('Meta no encontrada');
    await requireOwnership(goal.profileId);
    await prisma.goal.update({
        where: { id },
        data: { isPaused: !goal.isPaused },
    });
    revalidatePath('/budget');
}

export async function deleteGoal(id: number): Promise<void> {
    const goal = await prisma.goal.findUnique({ where: { id } });
    if (!goal) throw new Error('Meta no encontrada');
    await requireOwnership(goal.profileId);
    if (Number(goal.currentAmount) > 0) {
        throw new Error('No se puede eliminar una meta con dinero. Usa deleteGoalWithReclaim para reclamar los fondos primero.');
    }
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
        await requireOwnership(goal.profileId);

        if (Number(goal.currentAmount) > 0) {
            if (goal.destinationAccountId) {
                await tx.account.update({
                    where: { id: goal.destinationAccountId },
                    data: { balance: { decrement: goal.currentAmount } },
                });
            }

            await tx.account.update({
                where: { id: targetAccountId },
                data: { balance: { increment: goal.currentAmount } },
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
    note?: string,
) {
    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new Error('Meta no encontrada');
    await requireOwnership(goal.profileId);
    if (amount <= 0) throw new Error('El monto debe ser mayor a cero');

    const updatedGoal = await prisma.$transaction(async (tx) => {
        if (type === 'DEPOSIT') {
            const sourceAccountId = accountId || goal.sourceAccountId;
            if (!sourceAccountId) throw new Error('Se requiere una cuenta de origen.');

            const sourceAccount = await tx.account.findUnique({ where: { id: sourceAccountId } });
            if (!sourceAccount) throw new Error('Cuenta origen no encontrada.');
            if (Number(sourceAccount.balance) < amount) throw new Error('Fondos insuficientes.');
            if (sourceAccount.lockDate && new Date(sourceAccount.lockDate) > new Date()) {
                throw new Error(`Cuenta bloqueada hasta ${sourceAccount.lockDate.toLocaleDateString()}`);
            }

            await tx.account.update({
                where: { id: sourceAccountId },
                data: { balance: { decrement: amount } },
            });

            const destAccountId = goal.destinationAccountId;
            if (destAccountId) {
                await tx.account.update({
                    where: { id: destAccountId },
                    data: { balance: { increment: amount } },
                });
            }
        } else {
            if (Number(goal.currentAmount) < amount)
                throw new Error('No puedes retirar más de lo ahorrado.');

            const destAccountId = accountId;
            if (!destAccountId) throw new Error('Debes seleccionar una cuenta de destino.');

            if (goal.destinationAccountId) {
                const savingsAccount = await tx.account.findUnique({ where: { id: goal.destinationAccountId } });
                if (!savingsAccount) throw new Error('Cuenta de ahorro no encontrada.');
                if (Number(savingsAccount.balance) < amount) throw new Error('Fondos insuficientes en la cuenta de ahorro.');

                await tx.account.update({
                    where: { id: goal.destinationAccountId },
                    data: { balance: { decrement: amount } },
                });
            }

            await tx.account.update({
                where: { id: destAccountId },
                data: { balance: { increment: amount } },
            });
        }

        // Registrar transacción
        await tx.goalTransaction.create({
            data: {
                goalId,
                type,
                amount,
                note: note || null,
                accountId: accountId || null,
            },
        });

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

export async function getGoalTransactions(goalId: number) {
    const transactions = await prisma.goalTransaction.findMany({
        where: { goalId },
        orderBy: { createdAt: 'desc' },
    });
    return transactions.map(t => ({
        ...t,
        amount: toNum(t.amount),
    }));
}
