'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { toNum } from './serializers';
import { logger } from '@/lib/logger';
import { requireOwnership } from '@/lib/auth-utils';
import { decrementAccountBalance } from '@/lib/ledger';

// ─── ACCOUNTS ──────────────────────────────────────────────────────────────

export async function createAccount(
    name: string,
    type: string,
    balance: number,
    profileId: number,
    lockDate?: Date,
    purpose: string = 'SPENDING',
    symbol?: string,
    isDefault: boolean = false,
) {
    await requireOwnership(profileId);
    if (balance < 0) throw new Error('El saldo no puede ser negativo');
    const account = await prisma.account.create({
        data: { name, type, balance, profileId, lockDate, purpose, symbol: symbol || null, isDefault },
    });
    revalidatePath('/');
    return { ...account, balance: toNum(account.balance) };
}

export async function updateAccount(
    id: number,
    data: { name?: string; type?: string; balance?: number; lockDate?: Date | null; purpose?: string; symbol?: string | null },
) {
    if (data.balance !== undefined && data.balance < 0)
        throw new Error('El saldo no puede ser negativo');
    const account = await prisma.account.findUnique({ where: { id } });
    if (!account) throw new Error('Cuenta no encontrada');
    await requireOwnership(account.profileId);
    if (account.isDefault && data.name !== undefined && data.name !== account.name) {
        throw new Error('El nombre de la cuenta principal de Efectivo no se puede cambiar.');
    }
    await prisma.account.update({
        where: { id },
        data: {
            name: data.name,
            type: data.type,
            balance: data.balance,
            lockDate: data.lockDate,
            purpose: data.purpose,
            symbol: data.symbol,
        },
    });
    revalidatePath('/');
}

export async function adjustAccountBalance(
    accountId: number,
    newBalance: number,
    reason: string,
) {
    if (newBalance < 0) throw new Error('El saldo no puede ser negativo');

    await prisma.$transaction(async (tx) => {
        const account = await tx.account.findUnique({ where: { id: accountId } });
        if (!account) throw new Error('Cuenta no encontrada');
        await requireOwnership(account.profileId);

        const oldBalance = Number(account.balance);

        await tx.account.update({
            where: { id: accountId },
            data: { balance: newBalance },
        });

        await tx.auditLog.create({
            data: {
                action: 'BALANCE_ADJUSTMENT',
                details: reason || 'Sin razón especificada',
                targetId: accountId,
                profileId: account.profileId,
                oldBalance,
                newBalance,
            },
        });
    });

    revalidatePath('/');
}

export async function deleteAccount(id: number): Promise<void> {
    const account = await prisma.account.findUnique({ where: { id } });
    if (!account) throw new Error('Cuenta no encontrada');
    await requireOwnership(account.profileId);
    if (account.isDefault) {
        throw new Error('No se puede eliminar la cuenta principal de Efectivo.');
    }

    // Las metas referencian sourceAccountId/destinationAccountId como simples
    // números (sin foreign key en el schema), así que si no se bloquea aquí,
    // borrar la cuenta las deja apuntando a un id inexistente sin ningún aviso.
    const linkedGoals = await prisma.goal.findMany({
        where: { OR: [{ sourceAccountId: id }, { destinationAccountId: id }] },
        select: { name: true },
    });
    if (linkedGoals.length > 0) {
        throw new Error(
            `No se puede eliminar esta cuenta: está vinculada a la(s) meta(s) "${linkedGoals.map((g) => g.name).join(', ')}". Elimina o reasigna esas metas primero.`,
        );
    }

    // Los gastos ya confirmados de esta cuenta SI movieron dinero. Si se les
    // pone accountId en null, deleteExpense deja de tener cuenta a la que
    // devolver el monto y borrarlos mas tarde pierde ese dinero en silencio.
    // Se bloquea igual que con las metas: que el usuario los reasigne primero.
    const paidExpenses = await prisma.expense.findMany({
        where: { accountId: id, isProjected: false },
        select: { name: true },
        take: 6,
    });
    if (paidExpenses.length > 0) {
        const nombres = paidExpenses.slice(0, 5).map((e) => e.name).join(', ');
        const resto = paidExpenses.length > 5 ? ' y otros' : '';
        throw new Error(
            `No se puede eliminar esta cuenta: tiene gastos ya pagados (${nombres}${resto}). Reasignalos a otra cuenta o borralos primero, para no perder el registro de ese dinero.`,
        );
    }

    await prisma.$transaction(async (tx) => {
        // Solo quedan gastos proyectados, que nunca movieron dinero real.
        await tx.expense.updateMany({ where: { accountId: id }, data: { accountId: null } });
        await tx.additionalIncome.updateMany({ where: { accountId: id }, data: { accountId: null } });
        await tx.salary.updateMany({ where: { accountId: id }, data: { accountId: null } });
        await tx.transfer.deleteMany({
            where: { OR: [{ sourceAccountId: id }, { destinationAccountId: id }] },
        });
        await tx.account.delete({ where: { id } });

        await tx.auditLog.create({
            data: {
                action: 'ACCOUNT_DELETE',
                details: `Cuenta eliminada: ${account.name} (${account.type})`,
                targetId: id,
                profileId: account.profileId,
                oldBalance: account.balance,
                newBalance: 0,
            },
        });
    });

    revalidatePath('/');
}

export async function getAccountTransactions(accountId: number) {
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new Error('Cuenta no encontrada');
    await requireOwnership(account.profileId);

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
            // La cuenta destino se acredito con destAmount, no con amount:
            // en una transferencia con tipo de cambio, amount esta en la
            // moneda de origen. Mostrar amount aqui enseña una cifra que
            // nunca entro a esta cuenta. destAmount es null cuando no hubo
            // conversion, y entonces ambos coinciden.
            amount: toNum(t.destAmount ?? t.amount),
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
    exchangeRate?: number,
    sourceAmount?: number,
    destAmount?: number,
) {
    if (sourceAccountId === destinationAccountId)
        throw new Error('No puedes transferir a la misma cuenta');
    if (amount <= 0)
        throw new Error('El monto debe ser mayor a cero');

    const sourceAccount = await prisma.account.findUnique({
        where: { id: sourceAccountId },
    });
    if (!sourceAccount) throw new Error('Cuenta origen no encontrada');
    await requireOwnership(sourceAccount.profileId);

    const destAccount = await prisma.account.findUnique({
        where: { id: destinationAccountId },
    });
    if (!destAccount) throw new Error('Cuenta destino no encontrada');
    if (destAccount.profileId !== sourceAccount.profileId) {
        throw new Error('Las cuentas deben pertenecer al mismo perfil');
    }

    if (Number(sourceAccount.balance) < amount) {
        throw new Error('Fondos insuficientes en la cuenta origen');
    }

    if (sourceAccount.lockDate && new Date(sourceAccount.lockDate) > new Date()) {
        throw new Error(
            `Cuenta bloqueada hasta ${sourceAccount.lockDate.toLocaleDateString()}`,
        );
    }

    const isCrossCurrency = exchangeRate != null && exchangeRate > 0;
    const effectiveDestAmount = isCrossCurrency
        ? (destAmount != null ? destAmount : amount * exchangeRate!)
        : amount;
    const effectiveSourceAmount = sourceAmount != null ? sourceAmount : amount;

    try {
        await prisma.$transaction(async (tx) => {
            // UPDATE condicionado: cierra la carrera de dos transferencias
            // concurrentes desde la misma cuenta que sobregirarían el saldo.
            await decrementAccountBalance(tx, sourceAccountId, amount, sourceAccount.name);
            const updatedSource = await tx.account.findUniqueOrThrow({ where: { id: sourceAccountId } });
            await tx.account.update({
                where: { id: destinationAccountId },
                data: { balance: { increment: effectiveDestAmount } },
            });
            const transfer = await tx.transfer.create({
                data: {
                    amount,
                    sourceAccountId,
                    destinationAccountId,
                    description,
                    date: new Date(),
                    exchangeRate: isCrossCurrency ? exchangeRate! : null,
                    sourceAmount: isCrossCurrency ? effectiveSourceAmount : null,
                    destAmount: isCrossCurrency ? effectiveDestAmount : null,
                },
            });

            await tx.auditLog.create({
                data: {
                    action: 'TRANSFER',
                    details: `Transferencia #${transfer.id}: ${amount} de cuenta ${sourceAccountId} a cuenta ${destinationAccountId}${description ? ` (${description})` : ''}`,
                    targetId: transfer.id,
                    profileId: sourceAccount.profileId,
                    oldBalance: sourceAccount.balance,
                    newBalance: updatedSource.balance,
                },
            });
        });

        logger.info(`Transfer created: ${amount} from account ${sourceAccountId} to ${destinationAccountId}`);
        revalidatePath('/');
    } catch (error) {
        logger.error('Error creating transfer:', error);
        throw error;
    }
}
