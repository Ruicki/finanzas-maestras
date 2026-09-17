'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { serializeCreditCard } from './serializers';
import {logger, reportError } from '@/lib/logger';
import { requireOwnership } from '@/lib/auth-utils';
import { decrementAccountBalance, decrementCreditCardBalance } from '@/lib/ledger';

// ─── CREDIT CARDS ──────────────────────────────────────────────────────────

export interface CreateCreditCardInput {
    name: string;
    limit: number;
    cutoffDay: number;
    paymentDay: number;
    profileId: number;
    interestRate?: number | null;
    insuranceRate?: number | null;
    minPaymentPercentage?: number | null;
    itbmsRate?: number | null;
    minPaymentFloor?: number | null;
    annualFee?: number | null;
    annualFeeMonth?: number | null;
    bank?: string | null;
    initialBalance?: number;
    lateFee?: number | null;
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
            minPaymentPercentage: data.minPaymentPercentage,
            itbmsRate: data.itbmsRate,
            minPaymentFloor: data.minPaymentFloor,
            annualFee: data.annualFee,
            annualFeeMonth: data.annualFeeMonth,
            bank: data.bank,
            balance: data.initialBalance ?? 0,
            lateFee: data.lateFee,
        },
    });
    revalidatePath('/');
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
            lateFee: data.lateFee,
        },
    });
    revalidatePath('/');
    return serializeCreditCard(card);
}

export async function deleteCreditCard(id: number) {
    const card = await prisma.creditCard.findUnique({ where: { id } });
    if (!card) throw new Error('Tarjeta no encontrada');
    await requireOwnership(card.profileId);

    // linkedCardId no es una foreign key real en el schema, así que borrar la
    // tarjeta sin esto no falla — pero deja gastos apuntando a un id
    // inexistente, y la próxima vez que se editen/confirmen (que sí hacen
    // tx.creditCard.update({ where: { id: linkedCardId } })) revientan con
    // "Record not found". Mismo patrón que deleteAccount para accountId.
    await prisma.$transaction(async (tx) => {
        await tx.expense.updateMany({ where: { linkedCardId: id }, data: { linkedCardId: null } });
        await tx.creditCard.delete({ where: { id } });
    });

    revalidatePath('/');
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
    if (card.profileId !== account.profileId) throw new Error('La tarjeta y la cuenta deben pertenecer al mismo perfil');
    if (amount > Number(card.balance)) throw new Error(`El pago excede el saldo de la tarjeta ($${Number(card.balance).toFixed(2)})`);

    try {
        await prisma.$transaction(async (tx) => {
            // UPDATE condicionado (no leer-luego-escribir): cierra la carrera de dos
            // pagos concurrentes que leen el mismo saldo antes de que ninguno confirme.
            await decrementAccountBalance(tx, accountId, amount, account.name);
            await decrementCreditCardBalance(tx, cardId, amount);

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
        revalidatePath('/');
    } catch (error) {
        reportError(error, { accion: 'pagar tarjeta de credito', targetId: cardId });
        throw error;
    }
}
