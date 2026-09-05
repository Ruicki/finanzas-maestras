'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { toNum, serializeCreditCard } from './serializers';
import { logger } from '@/lib/logger';
import { requireOwnership } from '@/lib/auth-utils';

// ─── CREDIT CARDS ──────────────────────────────────────────────────────────

export interface CreateCreditCardInput {
    name: string;
    limit: number;
    cutoffDay: number;
    paymentDay: number;
    profileId: number;
    interestRate?: number;
    insuranceRate?: number;
    minPaymentPercentage?: number;
    itbmsRate?: number;
    minPaymentFloor?: number;
    annualFee?: number;
    annualFeeMonth?: number;
    bank?: string;
    initialBalance?: number;
}

export async function createCreditCard(data: CreateCreditCardInput) {
    await requireOwnership(data.profileId);
    const card = await prisma.creditCard.create({
        data: {
            name: data.name,
            limit: data.limit,
            cutoffDay: data.cutoffDay,
            paymentDay: data.paymentDay,
            profileId: data.profileId,
            interestRate: data.interestRate,
            insuranceRate: data.insuranceRate,
            itbmsRate: data.itbmsRate,
            minPaymentFloor: data.minPaymentFloor,
            annualFee: data.annualFee,
            annualFeeMonth: data.annualFeeMonth,
            bank: data.bank,
            balance: data.initialBalance ?? 0,
        },
    });
    revalidatePath('/budget');
    return serializeCreditCard(card);
}

export async function updateCreditCardDetails(
    id: number,
    data: Partial<CreateCreditCardInput>,
) {
    const existing = await prisma.creditCard.findUnique({ where: { id } });
    if (!existing) throw new Error('Tarjeta no encontrada');
    await requireOwnership(existing.profileId);

    const card = await prisma.creditCard.update({
        where: { id },
        data: {
            name: data.name,
            limit: data.limit,
            cutoffDay: data.cutoffDay,
            paymentDay: data.paymentDay,
            interestRate: data.interestRate,
            insuranceRate: data.insuranceRate,
            minPaymentPercentage: data.minPaymentPercentage,
            itbmsRate: data.itbmsRate,
            minPaymentFloor: data.minPaymentFloor,
            annualFee: data.annualFee,
            annualFeeMonth: data.annualFeeMonth,
            bank: data.bank,
        },
    });
    revalidatePath('/budget');
    return serializeCreditCard(card);
}

export async function updateCreditCardBalance(id: number, balance: number) {
    const existing = await prisma.creditCard.findUnique({ where: { id } });
    if (!existing) throw new Error('Tarjeta no encontrada');
    await requireOwnership(existing.profileId);

    const card = await prisma.creditCard.update({
        where: { id },
        data: { balance },
    });
    revalidatePath('/budget');
    return serializeCreditCard(card);
}

export async function deleteCreditCard(id: number) {
    const card = await prisma.creditCard.findUnique({ where: { id } });
    if (!card) throw new Error('Tarjeta no encontrada');
    await requireOwnership(card.profileId);
    await prisma.creditCard.delete({ where: { id } });
    revalidatePath('/budget');
}

export async function recalculateCardBalance(cardId: number) {
    const card = await prisma.creditCard.findUnique({ where: { id: cardId } });
    if (!card) throw new Error('Tarjeta no encontrada');

    // Sum of all expenses linked to this card (purchases + charges)
    const linkedExpenses = await prisma.expense.aggregate({
        _sum: { amount: true },
        where: { linkedCardId: cardId },
    });

    // Sum of all payments made to this card (expenses with "Pago: {cardName}" prefix)
    const payments = await prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
            profileId: card.profileId,
            name: { startsWith: `Pago: ${card.name}` },
            linkedCardId: null,
            category: 'Pagos Tarjeta',
        },
    });

    const totalLinked = toNum(linkedExpenses._sum.amount);
    const totalPayments = toNum(payments._sum.amount);
    const correctBalance = totalLinked - totalPayments;
    const roundedBalance = Math.round(correctBalance * 100) / 100;
    const oldBalance = toNum(card.balance);

    await prisma.creditCard.update({
        where: { id: cardId },
        data: { balance: roundedBalance },
    });

    logger.info(`Recalculated card ${cardId}: ${oldBalance} → ${roundedBalance} (linked: ${totalLinked}, payments: ${totalPayments})`);
    revalidatePath('/budget');

    return {
        oldBalance,
        newBalance: roundedBalance,
        totalLinked,
        totalPayments,
        difference: roundedBalance - oldBalance,
    };
}

export async function payCreditCard(cardId: number, amount: number, accountId: number) {
    if (amount <= 0) throw new Error('Monto debe ser positivo');

    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new Error('Cuenta no encontrada');
    await requireOwnership(account.profileId);
    if (account.lockDate && new Date(account.lockDate) > new Date()) {
        throw new Error(`Cuenta bloqueada hasta ${account.lockDate.toLocaleDateString()}`);
    }
    if (Number(account.balance) < amount) throw new Error('Fondos insuficientes');

    const card = await prisma.creditCard.findUnique({ where: { id: cardId } });
    if (!card) throw new Error('Tarjeta no encontrada');
    if (amount > Number(card.balance)) throw new Error(`El pago excede el saldo de la tarjeta ($${Number(card.balance).toFixed(2)})`);

    try {
        await prisma.$transaction(async (tx) => {
            await tx.account.update({
                where: { id: accountId },
                data: { balance: { decrement: amount } },
            });

            await tx.creditCard.update({
                where: { id: cardId },
                data: { balance: { decrement: amount } },
            });

            const card = await tx.creditCard.findUnique({ where: { id: cardId } });

            let cat = await tx.category.findFirst({
                where: { profileId: account.profileId, name: 'Pagos Tarjeta' },
            });
            if (!cat) {
                cat = await tx.category.create({
                    data: {
                        name: 'Pagos Tarjeta',
                        icon: 'CreditCard',
                        profileId: account.profileId,
                        type: 'FIXED',
                        color: 'zinc',
                    },
                });
            }

            await tx.expense.create({
                data: {
                    name: `Pago: ${card?.name || 'Tarjeta'}`,
                    amount,
                    category: 'Pagos Tarjeta',
                    categoryId: cat.id,
                    profileId: account.profileId,
                    accountId,
                    isOneTime: true,
                    isRecurring: false,
                    paymentMethod: 'TRANSFER',
                },
            });
        });

        logger.info(`Credit card payment: $${amount} to card ${cardId} from account ${accountId}`);
        revalidatePath('/budget');
    } catch (error) {
        logger.error('Error paying credit card:', error);
        throw error;
    }
}
