'use server'

import { prisma } from '@/lib/prisma';
import { Goal } from '@prisma/client';
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
    frequency?: string | null;
    contributionAmount?: number | null;
    priority?: string;
    category?: string;
    notes?: string | null;
    isPaused?: boolean;
    sourceAccountId?: number | null;
    destinationAccountId?: number | null;
}

function serializeGoal<T extends Goal>(goal: T) {
    return {
        ...goal,
        targetAmount: toNum(goal.targetAmount),
        currentAmount: toNum(goal.currentAmount),
        contributionAmount: toNumOrNull(goal.contributionAmount),
    };
}

export async function createGoal(data: CreateGoalInput) {
    await requireOwnership(data.profileId);
    const initialAmount = data.currentAmount ?? 0;

    if (data.sourceAccountId && data.destinationAccountId && data.sourceAccountId === data.destinationAccountId) {
        throw new Error('La cuenta de origen y destino no pueden ser la misma');
    }

    const goal = await prisma.$transaction(async (tx) => {
        // Toda cuenta referenciada por la meta (origen o destino) debe pertenecer
        // al mismo perfil: sin esto, un id de cuenta ajeno permitiria mover dinero
        // real de otro usuario al confirmar/retirar/reclamar esta meta.
        if (data.sourceAccountId) {
            const sourceAccount = await tx.account.findUnique({ where: { id: data.sourceAccountId } });
            if (!sourceAccount) throw new Error('Cuenta origen no encontrada');
            if (sourceAccount.profileId !== data.profileId) throw new Error('La cuenta origen no pertenece a este perfil');
        }
        if (data.destinationAccountId) {
            const destAccount = await tx.account.findUnique({ where: { id: data.destinationAccountId } });
            if (!destAccount) throw new Error('Cuenta destino no encontrada');
            if (destAccount.profileId !== data.profileId) throw new Error('La cuenta destino no pertenece a este perfil');
        }

        // Toda meta debe estar respaldada por una cuenta real (para que el dinero
        // ahorrado se vea reflejado en Cuentas, no solo como un numero dentro de la
        // meta). Si no se eligio una cuenta existente, se crea una dedicada.
        let destinationAccountId = data.destinationAccountId;
        if (!destinationAccountId) {
            const savingsAccount = await tx.account.create({
                data: {
                    name: `Ahorro: ${data.name}`,
                    type: 'SAVINGS',
                    purpose: 'SAVINGS',
                    balance: initialAmount,
                    profileId: data.profileId,
                },
            });
            destinationAccountId = savingsAccount.id;
        }

        return tx.goal.create({
            data: {
                name: data.name,
                targetAmount: data.targetAmount,
                currentAmount: initialAmount,
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
                destinationAccountId,
            },
        });
    });

    revalidatePath('/');
    return serializeGoal(goal);
}

export async function updateGoal(id: number, data: Partial<CreateGoalInput>) {
    const existing = await prisma.goal.findUnique({ where: { id } });
    if (!existing) throw new Error('Meta no encontrada');
    await requireOwnership(existing.profileId);

    const newSourceId = data.sourceAccountId !== undefined ? data.sourceAccountId : existing.sourceAccountId;
    const newDestId = data.destinationAccountId !== undefined ? data.destinationAccountId : existing.destinationAccountId;
    if (newSourceId && newDestId && newSourceId === newDestId) {
        throw new Error('La cuenta de origen y destino no pueden ser la misma');
    }
    if (data.sourceAccountId !== undefined && data.sourceAccountId !== null) {
        const sourceAccount = await prisma.account.findUnique({ where: { id: data.sourceAccountId } });
        if (!sourceAccount) throw new Error('Cuenta origen no encontrada');
        if (sourceAccount.profileId !== existing.profileId) throw new Error('La cuenta origen no pertenece a este perfil');
    }
    if (data.destinationAccountId !== undefined && data.destinationAccountId !== null) {
        const destAccount = await prisma.account.findUnique({ where: { id: data.destinationAccountId } });
        if (!destAccount) throw new Error('Cuenta destino no encontrada');
        if (destAccount.profileId !== existing.profileId) throw new Error('La cuenta destino no pertenece a este perfil');
    }

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
    revalidatePath('/');
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
    revalidatePath('/');
}

export async function deleteGoal(id: number): Promise<void> {
    const goal = await prisma.goal.findUnique({ where: { id } });
    if (!goal) throw new Error('Meta no encontrada');
    await requireOwnership(goal.profileId);
    if (Number(goal.currentAmount) > 0) {
        throw new Error('No se puede eliminar una meta con dinero. Usa deleteGoalWithReclaim para reclamar los fondos primero.');
    }
    await prisma.goal.delete({ where: { id } });
    revalidatePath('/');
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
            const targetAccount = await tx.account.findUnique({ where: { id: targetAccountId } });
            if (!targetAccount) throw new Error('Cuenta destino no encontrada.');
            if (targetAccount.profileId !== goal.profileId) throw new Error('La cuenta destino no pertenece a este perfil.');

            if (goal.destinationAccountId) {
                const savingsAccount = await tx.account.findUnique({ where: { id: goal.destinationAccountId } });
                if (!savingsAccount) throw new Error('Cuenta de ahorro no encontrada.');
                if (savingsAccount.profileId !== goal.profileId) throw new Error('La cuenta de ahorro no pertenece a este perfil.');

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
    revalidatePath('/');
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
            if (sourceAccount.profileId !== goal.profileId) throw new Error('La cuenta origen no pertenece a este perfil.');
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
                const destAccount = await tx.account.findUnique({ where: { id: destAccountId } });
                if (!destAccount) throw new Error('Cuenta de ahorro no encontrada.');
                if (destAccount.profileId !== goal.profileId) throw new Error('La cuenta de ahorro no pertenece a este perfil.');

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

            const destAccount = await tx.account.findUnique({ where: { id: destAccountId } });
            if (!destAccount) throw new Error('Cuenta destino no encontrada.');
            if (destAccount.profileId !== goal.profileId) throw new Error('La cuenta destino no pertenece a este perfil.');
            if (destAccount.lockDate && new Date(destAccount.lockDate) > new Date()) {
                throw new Error(`Cuenta bloqueada hasta ${destAccount.lockDate.toLocaleDateString()}`);
            }

            if (goal.destinationAccountId) {
                const savingsAccount = await tx.account.findUnique({ where: { id: goal.destinationAccountId } });
                if (!savingsAccount) throw new Error('Cuenta de ahorro no encontrada.');
                if (savingsAccount.profileId !== goal.profileId) throw new Error('La cuenta de ahorro no pertenece a este perfil.');
                if (Number(savingsAccount.balance) < amount) throw new Error('Fondos insuficientes en la cuenta de ahorro.');
                if (savingsAccount.lockDate && new Date(savingsAccount.lockDate) > new Date()) {
                    throw new Error(`Cuenta de ahorro bloqueada hasta ${savingsAccount.lockDate.toLocaleDateString()}`);
                }

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

    revalidatePath('/');
    return serializeGoal(updatedGoal);
}

export async function getGoalTransactions(goalId: number) {
    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new Error('Meta no encontrada');
    await requireOwnership(goal.profileId);

    const transactions = await prisma.goalTransaction.findMany({
        where: { goalId },
        orderBy: { createdAt: 'desc' },
    });
    return transactions.map(t => ({
        ...t,
        amount: toNum(t.amount),
    }));
}
