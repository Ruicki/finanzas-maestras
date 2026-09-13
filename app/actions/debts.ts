'use server'

import { prisma } from "@/lib/prisma";
import { Account } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { toNum, toNumOrNull } from './budget/serializers';
import { requireOwnership } from '@/lib/auth-utils';
import { decrementAccountBalance, decrementLoanBalance } from '@/lib/ledger';

export type CreateLoanInput = {
    name: string;
    lender: string;
    type: string;
    totalAmount: number;
    currentBalance: number;
    interestRate?: number;
    termMonths?: number;
    monthlyPayment?: number;
    paymentDay?: number;
    isAutomatic: boolean;
    profileId: number;
    startDate?: Date;
}

export async function createLoan(data: CreateLoanInput) {
    await requireOwnership(data.profileId);
    const loan = await prisma.loan.create({
        data: {
            name: data.name,
            lender: data.lender,
            type: data.type,
            totalAmount: data.totalAmount,
            currentBalance: data.currentBalance,
            interestRate: data.interestRate || 0,
            termMonths: data.termMonths || 0,
            monthlyPayment: data.monthlyPayment || 0,
            paymentDay: data.paymentDay || 15,
            isAutomatic: data.isAutomatic || false,
            profileId: data.profileId,
            startDate: data.startDate || new Date()
        }
    });

    revalidatePath('/');
    return {
        ...loan,
        totalAmount: toNum(loan.totalAmount),
        currentBalance: toNum(loan.currentBalance),
        interestRate: toNumOrNull(loan.interestRate),
        monthlyPayment: toNumOrNull(loan.monthlyPayment),
    };
}

export async function updateLoan(id: number, data: Partial<CreateLoanInput>) {
    const existing = await prisma.loan.findUnique({ where: { id } });
    if (!existing) throw new Error('Préstamo no encontrado');
    await requireOwnership(existing.profileId);

    await prisma.loan.update({
        where: { id },
        data: {
            name: data.name,
            lender: data.lender,
            type: data.type,
            totalAmount: data.totalAmount,
            currentBalance: data.currentBalance,
            interestRate: data.interestRate,
            termMonths: data.termMonths,
            monthlyPayment: data.monthlyPayment,
            paymentDay: data.paymentDay,
            isAutomatic: data.isAutomatic,
        }
    });
    revalidatePath('/');
}

export async function deleteLoan(id: number) {
    const loan = await prisma.loan.findUnique({ where: { id } });
    if (!loan) throw new Error('Préstamo no encontrado');
    await requireOwnership(loan.profileId);
    await prisma.loan.delete({ where: { id } });
    revalidatePath('/');
}

export async function payLoan(loanId: number, amount: number, sourceAccountId?: number | null) {
    if (amount <= 0) throw new Error("El monto debe ser positivo");

    const loan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw new Error("Préstamo no encontrado");
    await requireOwnership(loan.profileId);

    if (amount > Number(loan.currentBalance)) {
        throw new Error(`El pago excede la deuda actual ($${Number(loan.currentBalance).toFixed(2)})`);
    }

    let account: Account | null = null;
    if (sourceAccountId) {
        account = await prisma.account.findUnique({ where: { id: sourceAccountId } });
        if (!account) throw new Error("Cuenta no encontrada");
        if (account.profileId !== loan.profileId) throw new Error("La cuenta no pertenece a este perfil");
        if (account.lockDate && new Date(account.lockDate) > new Date()) {
            throw new Error(`Cuenta bloqueada hasta ${account.lockDate.toLocaleDateString()}`);
        }
        if (Number(account.balance) < amount) throw new Error("Fondos insuficientes en la cuenta de origen");
    }

    await prisma.$transaction(async (tx) => {
        // 1. Deducir de la cuenta de origen (SI EXISTE) — UPDATE condicionado para
        // cerrar la carrera de dos pagos concurrentes sobre el mismo saldo.
        if (sourceAccountId && account) {
            await decrementAccountBalance(tx, sourceAccountId, amount, account.name);
        }

        // 2. Reducir el saldo del préstamo, igual de condicionado
        await decrementLoanBalance(tx, loanId, amount);
        const updatedLoan = await tx.loan.findUniqueOrThrow({ where: { id: loanId } });

        // 3. Registrar Gasto (SOLO SI HAY CUENTA, ya que Expense requiere accountId usualmente o queremos trazarlo)
        // Para simplificar, si no hay cuenta, NO creamos gasto (es un pago externo/ajuste)
        if (sourceAccountId) {
            // Buscar o Crear Categoría "Deudas"
            let debtCategory = await tx.category.findFirst({
                where: { profileId: loan.profileId, name: "Deudas" }
            });

            if (!debtCategory) {
                debtCategory = await tx.category.create({
                    data: {
                        name: "Deudas",
                        icon: "Ban",
                        color: "text-red-500",
                        type: "FIXED",
                        profileId: loan.profileId
                    }
                });
            }

            await tx.expense.create({
                data: {
                    name: `Pago Préstamo: ${loan.name}`,
                    amount: amount,
                    category: "Deudas",
                    categoryId: debtCategory.id,
                    isRecurring: false,
                    isOneTime: true,
                    paymentMethod: "TRANSFER",
                    profileId: loan.profileId,
                    accountId: sourceAccountId
                }
            });
        }

        // 5. AUTO-DELETE: Si el saldo llega a 0 (o menos), eliminar el préstamo
        if (Number(updatedLoan.currentBalance) <= 0.01) {
            await tx.loan.delete({ where: { id: loanId } });
        }
    });

    revalidatePath('/');
}

// ─── INTERÉS AUTOMÁTICO ─────────────────────────────────────────────────────

export interface ProcessLoanInterestResult {
    processed: number;
    applied: number;
    errors: string[];
}

function isInterestAppliedThisCycle(lastInterestAppliedAt: Date | null, today: Date): boolean {
    if (!lastInterestAppliedAt) return false;
    return (
        lastInterestAppliedAt.getMonth() === today.getMonth() &&
        lastInterestAppliedAt.getFullYear() === today.getFullYear()
    );
}

/**
 * Aplica el interés mensual (interestRate se interpreta como tasa ANUAL,
 * igual que en lib/financial-engine.ts) al saldo de cada préstamo, el día
 * de pago del préstamo (mismo campo paymentDay que ya usa el cron de gastos
 * recurrentes, recortado al último día del mes si es más corto).
 *
 * No depende de si el usuario pagó ese mes o no: el interés se acumula sobre
 * el saldo pendiente igual que en un préstamo real, y los pagos (payLoan)
 * siguen restando directamente del saldo por separado.
 */
export async function processLoanInterest(): Promise<ProcessLoanInterestResult> {
    const today = new Date();
    const currentDay = today.getDate();
    const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    const result: ProcessLoanInterestResult = { processed: 0, applied: 0, errors: [] };

    try {
        const loans = await prisma.loan.findMany({
            where: {
                paymentDay: { not: null },
                interestRate: { gt: 0 },
                currentBalance: { gt: 0 },
            },
        });

        for (const loan of loans) {
            result.processed++;

            const effectiveDay = Math.min(loan.paymentDay!, daysInCurrentMonth);
            if (effectiveDay !== currentDay) continue;
            if (isInterestAppliedThisCycle(loan.lastInterestAppliedAt, today)) continue;

            try {
                const monthlyInterest = Number(loan.currentBalance) * (Number(loan.interestRate) / 100 / 12);
                if (monthlyInterest <= 0) continue;

                await prisma.$transaction(async (tx) => {
                    const updated = await tx.loan.update({
                        where: { id: loan.id },
                        data: {
                            currentBalance: { increment: monthlyInterest },
                            lastInterestAppliedAt: today,
                        },
                    });

                    await tx.auditLog.create({
                        data: {
                            action: 'LOAN_INTEREST_ACCRUED',
                            details: `Interés mensual de "${loan.name}": +$${monthlyInterest.toFixed(2)}`,
                            targetId: loan.id,
                            profileId: loan.profileId,
                            oldBalance: loan.currentBalance,
                            newBalance: updated.currentBalance,
                        },
                    });
                });

                result.applied++;
            } catch (error) {
                result.errors.push(`Error aplicando interés a "${loan.name}": ${error}`);
            }
        }

        revalidatePath('/');
    } catch (error) {
        result.errors.push(`Error general: ${error}`);
    }

    return result;
}
