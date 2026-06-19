'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { toNum } from './serializers';
import { logger } from '@/lib/logger';

// ─── ACCOUNTS ──────────────────────────────────────────────────────────────

export async function createAccount(
    name: string,
    type: string,
    balance: number,
    profileId: number,
    lockDate?: Date,
) {
    if (balance < 0) throw new Error('El saldo no puede ser negativo');
    const account = await prisma.account.create({
        data: { name, type, balance, profileId, lockDate },
    });
    revalidatePath('/budget');
    return { ...account, balance: toNum(account.balance) };
}

export async function updateAccount(
    id: number,
    data: { name?: string; type?: string; balance?: number; lockDate?: Date },
) {
    if (data.balance !== undefined && data.balance < 0)
        throw new Error('El saldo no puede ser negativo');
    await prisma.account.update({
        where: { id },
        data: {
            name: data.name,
            type: data.type,
            balance: data.balance,
            lockDate: data.lockDate,
        },
    });
    revalidatePath('/budget');
}

export async function adjustAccountBalance(
    accountId: number,
    newBalance: number,
    _reason: string,
) {
    await prisma.account.update({
        where: { id: accountId },
        data: { balance: newBalance },
    });
    revalidatePath('/budget');
}

export async function deleteAccount(id: number): Promise<void> {
    const account = await prisma.account.findUnique({ where: { id } });
    if (account?.name === 'Efectivo' && account.isDefault) {
        throw new Error('No se puede eliminar la cuenta principal de Efectivo.');
    }

    await prisma.$transaction(async (tx) => {
        await tx.expense.updateMany({ where: { accountId: id }, data: { accountId: null } });
        await tx.additionalIncome.updateMany({ where: { accountId: id }, data: { accountId: null } });
        await tx.salary.updateMany({ where: { accountId: id }, data: { accountId: null } });
        await tx.transfer.deleteMany({
            where: { OR: [{ sourceAccountId: id }, { destinationAccountId: id }] },
        });
        await tx.account.delete({ where: { id } });
    });

    revalidatePath('/budget');
}

export async function getAccountTransactions(accountId: number) {
    const [expenses, incomes, transfersFrom, transfersTo, salaries] =
        await prisma.$transaction([
            prisma.expense.findMany({
                where: { accountId },
                orderBy: { createdAt: 'desc' },
                take: 50,
            }),
            prisma.additionalIncome.findMany({
                where: { accountId },
                orderBy: { createdAt: 'desc' },
                take: 50,
            }),
            prisma.transfer.findMany({
                where: { sourceAccountId: accountId },
                orderBy: { date: 'desc' },
                take: 50,
                include: { destinationAccount: true },
            }),
            prisma.transfer.findMany({
                where: { destinationAccountId: accountId },
                orderBy: { date: 'desc' },
                take: 50,
                include: { sourceAccount: true },
            }),
            prisma.salary.findMany({
                where: { accountId },
                orderBy: { createdAt: 'desc' },
                take: 50,
            }),
        ]);

    const transactions = [
        ...expenses.map((e) => ({
            id: e.id,
            amount: toNum(e.amount),
            description: e.name || 'Gasto',
            type: 'EXPENSE' as const,
            date: e.createdAt,
        })),
        ...incomes.map((i) => ({
            id: i.id,
            amount: toNum(i.amount),
            description: i.name || 'Ingreso',
            type: 'INCOME' as const,
            date: i.createdAt,
        })),
        ...transfersFrom.map((t) => ({
            id: t.id,
            amount: toNum(t.amount),
            description: `Transferencia a ${t.destinationAccount.name}`,
            type: 'TRANSFER_OUT' as const,
            date: t.date,
            relatedAccountName: t.destinationAccount.name,
        })),
        ...transfersTo.map((t) => ({
            id: t.id,
            amount: toNum(t.amount),
            description: `Transferencia de ${t.sourceAccount.name}`,
            type: 'TRANSFER_IN' as const,
            date: t.date,
            relatedAccountName: t.sourceAccount.name,
        })),
        ...salaries.map((s) => ({
            id: s.id,
            amount: toNum(s.netVal),
            grossVal: toNum(s.grossVal),
            taxes: toNum(s.taxes),
            socialSec: toNum(s.socialSec),
            eduIns: toNum(s.eduIns),
            incomeTax: toNum(s.incomeTax),
            bonus: toNum(s.bonus),
            absentDays: s.absentDays,
            company: s.company,
            name: 'Salario',
            description: `Salario${s.company ? ` - ${s.company}` : ''}`,
            type: 'SALARY' as const,
            date: s.createdAt,
        })),
    ];

    return transactions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
}

// ─── TRANSFERS ─────────────────────────────────────────────────────────────

export async function createTransfer(
    sourceAccountId: number,
    destinationAccountId: number,
    amount: number,
    description?: string,
) {
    if (sourceAccountId === destinationAccountId)
        throw new Error('No puedes transferir a la misma cuenta');
    if (amount <= 0)
        throw new Error('El monto debe ser mayor a cero');

    const sourceAccount = await prisma.account.findUnique({
        where: { id: sourceAccountId },
    });
    if (!sourceAccount || Number(sourceAccount.balance) < amount) {
        throw new Error('Fondos insuficientes en la cuenta origen');
    }

    if (sourceAccount.lockDate && new Date(sourceAccount.lockDate) > new Date()) {
        throw new Error(
            `Cuenta bloqueada hasta ${sourceAccount.lockDate.toLocaleDateString()}`,
        );
    }

    try {
        await prisma.$transaction(async (tx) => {
            await tx.account.update({
                where: { id: sourceAccountId },
                data: { balance: { decrement: amount } },
            });
            await tx.account.update({
                where: { id: destinationAccountId },
                data: { balance: { increment: amount } },
            });
            await tx.transfer.create({
                data: { amount, sourceAccountId, destinationAccountId, description, date: new Date() },
            });
        });

        logger.info(`Transfer created: ${amount} from account ${sourceAccountId} to ${destinationAccountId}`);
        revalidatePath('/budget');
    } catch (error) {
        logger.error('Error creating transfer:', error);
        throw error;
    }
}
