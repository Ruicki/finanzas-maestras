'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { logAction } from '../audit';
import { toNum, toNumOrNull, serializeCreditCard } from './serializers';

// ─── PROFILES ──────────────────────────────────────────────────────────────

export async function getProfiles() {
    const profiles = await prisma.profile.findMany({
        include: {
            expenses: true,
            goals: true,
            accounts: true,
            creditCards: true,
            incomes: true,
            salaries: true,
            loans: true,
            categories: { include: { budgets: true } },
        },
        orderBy: { createdAt: 'asc' },
    });

    return profiles.map((p) => ({
        ...p,
        expenses: p.expenses.map((e) => ({ ...e, amount: toNum(e.amount) })),
        goals: p.goals.map((g) => ({
            ...g,
            targetAmount: toNum(g.targetAmount),
            currentAmount: toNum(g.currentAmount),
            contributionAmount: toNumOrNull(g.contributionAmount),
        })),
        accounts: p.accounts.map((a) => ({ ...a, balance: toNum(a.balance) })),
        incomes: p.incomes.map((i) => ({ ...i, amount: toNum(i.amount) })),
        salaries: p.salaries.map((s) => ({
            ...s,
            grossVal: toNum(s.grossVal),
            netVal: toNum(s.netVal),
            taxes: toNum(s.taxes),
            socialSec: toNum(s.socialSec),
            eduIns: toNum(s.eduIns),
            incomeTax: toNum(s.incomeTax),
            bonus: toNum(s.bonus),
        })),
        creditCards: p.creditCards.map((c) => serializeCreditCard(c)),
        loans: p.loans.map((l) => ({
            ...l,
            totalAmount: toNum(l.totalAmount),
            currentBalance: toNum(l.currentBalance),
            interestRate: toNumOrNull(l.interestRate),
            monthlyPayment: toNumOrNull(l.monthlyPayment),
        })),
        categories: p.categories.map((c) => ({
            ...c,
            monthlyLimit: toNumOrNull(c.monthlyLimit),
            rolloverBalance: toNum(c.rolloverBalance),
            budgets: c.budgets.map((b) => ({ ...b, limit: toNum(b.limit) })),
        })),
    }));
}

export async function getProfileById(id: number) {
    const profile = await prisma.profile.findUnique({
        where: { id },
        include: {
            expenses: { include: { categoryRel: true } },
            goals: true,
            accounts: true,
            incomes: true,
            salaries: true,
            creditCards: true,
            loans: true,
            categories: { include: { budgets: true } },
        },
    });

    if (!profile) return null;

    return {
        ...profile,
        expenses: profile.expenses.map((e) => ({ ...e, amount: toNum(e.amount) })),
        goals: profile.goals.map((g) => ({
            ...g,
            targetAmount: toNum(g.targetAmount),
            currentAmount: toNum(g.currentAmount),
            contributionAmount: toNumOrNull(g.contributionAmount),
        })),
        accounts: profile.accounts.map((a) => ({ ...a, balance: toNum(a.balance) })),
        incomes: profile.incomes.map((i) => ({ ...i, amount: toNum(i.amount) })),
        salaries: profile.salaries.map((s) => ({
            ...s,
            grossVal: toNum(s.grossVal),
            netVal: toNum(s.netVal),
            taxes: toNum(s.taxes),
            socialSec: toNum(s.socialSec),
            eduIns: toNum(s.eduIns),
            incomeTax: toNum(s.incomeTax),
            bonus: toNum(s.bonus),
        })),
        creditCards: profile.creditCards.map((c) => serializeCreditCard(c)),
        loans: profile.loans.map((l) => ({
            ...l,
            totalAmount: toNum(l.totalAmount),
            currentBalance: toNum(l.currentBalance),
            interestRate: toNumOrNull(l.interestRate),
            monthlyPayment: toNumOrNull(l.monthlyPayment),
        })),
        categories: profile.categories.map((c) => ({
            ...c,
            monthlyLimit: toNumOrNull(c.monthlyLimit),
            rolloverBalance: toNum(c.rolloverBalance),
            budgets: c.budgets.map((b) => ({ ...b, limit: toNum(b.limit) })),
        })),
    };
}

export async function getGlobalStats() {
    const [profilesCount, totalMoney, totalDebt, totalExpenses] = await prisma.$transaction([
        prisma.profile.count(),
        prisma.account.aggregate({ _sum: { balance: true } }),
        prisma.loan.aggregate({ _sum: { currentBalance: true } }),
        prisma.expense.aggregate({ _sum: { amount: true } }),
    ]);

    const creditCardBalances = await prisma.creditCard.aggregate({ _sum: { balance: true } });

    return {
        users: profilesCount,
        money: toNum(totalMoney._sum.balance),
        debt: toNum(totalDebt._sum.currentBalance) + toNum(creditCardBalances._sum.balance),
        expenses: toNum(totalExpenses._sum.amount),
    };
}

export async function createProfile(name: string) {
    const profile = await prisma.profile.create({ data: { name } });
    await logAction('CREATE_PROFILE', `Nombre: ${name}`, profile.id);
    revalidatePath('/budget');
}

export async function deleteProfile(id: number) {
    await prisma.$transaction(async (tx) => {
        // Nullificar FKs primero
        await tx.expense.updateMany({ where: { profileId: id }, data: { accountId: null, categoryId: null, linkedCardId: null } });
        await tx.additionalIncome.updateMany({ where: { profileId: id }, data: { accountId: null } });
        await tx.salary.updateMany({ where: { profileId: id }, data: { accountId: null } });

        await tx.expense.deleteMany({ where: { profileId: id } });
        await tx.additionalIncome.deleteMany({ where: { profileId: id } });
        await tx.salary.deleteMany({ where: { profileId: id } });
        await tx.goal.deleteMany({ where: { profileId: id } });
        await tx.creditCard.deleteMany({ where: { profileId: id } });
        await tx.category.deleteMany({ where: { profileId: id } });
        await tx.loan.deleteMany({ where: { profileId: id } });

        const userAccounts = await tx.account.findMany({
            where: { profileId: id },
            select: { id: true },
        });
        const accountIds = userAccounts.map((a) => a.id);

        if (accountIds.length > 0) {
            await tx.transfer.deleteMany({
                where: {
                    OR: [
                        { sourceAccountId: { in: accountIds } },
                        { destinationAccountId: { in: accountIds } },
                    ],
                },
            });
            await tx.account.deleteMany({ where: { id: { in: accountIds } } });
        }

        await tx.profile.delete({ where: { id } });
    });
    await logAction('DELETE_PROFILE', `Perfil ID: ${id} eliminado`, id);
    revalidatePath('/budget');
}

export async function resetProfileData(id: number) {
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Nullificar FKs antes de borrar
            await tx.expense.updateMany({ where: { profileId: id }, data: { accountId: null, categoryId: null, linkedCardId: null } });
            await tx.additionalIncome.updateMany({ where: { profileId: id }, data: { accountId: null } });
            await tx.salary.updateMany({ where: { profileId: id }, data: { accountId: null } });

            // 2. Borrar registros dependientes
            await tx.expense.deleteMany({ where: { profileId: id } });
            await tx.additionalIncome.deleteMany({ where: { profileId: id } });
            await tx.salary.deleteMany({ where: { profileId: id } });
            await tx.transfer.deleteMany({
                where: {
                    OR: [
                        { sourceAccount: { profileId: id } },
                        { destinationAccount: { profileId: id } },
                    ],
                },
            });
            await tx.goal.deleteMany({ where: { profileId: id } });
            await tx.loan.deleteMany({ where: { profileId: id } });
            await tx.creditCard.deleteMany({ where: { profileId: id } });
            await tx.account.deleteMany({ where: { profileId: id } });
            await tx.category.deleteMany({ where: { profileId: id } });
        });
        revalidatePath('/budget');
    } catch (error) {
        console.error('Error resetting profile data:', error);
        throw new Error('Error al resetear los datos del perfil');
    }
}
