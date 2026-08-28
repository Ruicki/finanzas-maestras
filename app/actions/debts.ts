'use server'

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { toNum, toNumOrNull } from './budget/serializers';
import { requireOwnership } from '@/lib/auth-utils';

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

    revalidatePath('/budget');
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
    revalidatePath('/budget');
}

export async function deleteLoan(id: number) {
    const loan = await prisma.loan.findUnique({ where: { id } });
    if (!loan) throw new Error('Préstamo no encontrado');
    await requireOwnership(loan.profileId);
    await prisma.loan.delete({ where: { id } });
    revalidatePath('/budget');
}

export async function payLoan(loanId: number, amount: number, sourceAccountId?: number | null) {
    if (amount <= 0) throw new Error("El monto debe ser positivo");

    const loan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw new Error("Préstamo no encontrado");
    await requireOwnership(loan.profileId);

    if (amount > Number(loan.currentBalance)) {
        throw new Error(`El pago excede la deuda actual ($${Number(loan.currentBalance).toFixed(2)})`);
    }

    let account;
    if (sourceAccountId) {
        account = await prisma.account.findUnique({ where: { id: sourceAccountId } });
        if (!account) throw new Error("Cuenta no encontrada");
        if (Number(account.balance) < amount) throw new Error("Fondos insuficientes en la cuenta de origen");
    }

    await prisma.$transaction(async (tx) => {
        // 1. Deducir de la cuenta de origen (SI EXISTE)
        if (sourceAccountId) {
            await tx.account.update({
                where: { id: sourceAccountId },
                data: { balance: { decrement: amount } }
            });
        }

        // 2. Reducir el saldo del préstamo
        const updatedLoan = await tx.loan.update({
            where: { id: loanId },
            data: { currentBalance: { decrement: amount } }
        });

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

    revalidatePath('/budget');
}
