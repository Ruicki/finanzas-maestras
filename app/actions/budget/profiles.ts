'use server'

import { prisma } from '@/lib/prisma';
import { reportError } from '@/lib/logger';
import { revalidatePath } from 'next/cache';
import { logAction } from '../audit';
import { toNum, toNumOrNull, serializeCreditCard } from './serializers';
import { requireAuth, requireOwnership } from '@/lib/auth-utils';
import { COLOR_THEME_IDS, type ColorThemeId } from '@/lib/color-themes';

// ─── PROFILES ──────────────────────────────────────────────────────────────

// Devuelve TODOS los perfiles con su información financiera completa —
// solo para el panel de administración. Un usuario normal nunca debe poder
// leer los datos de otro perfil.
export async function getProfiles() {
    const { role } = await requireAuth();
    if (role !== 'ADMIN') throw new Error('Acceso denegado: solo administradores');

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
    await requireOwnership(id);

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
        expenses: profile.expenses.map((e) => ({
            ...e,
            amount: toNum(e.amount),
            categoryRel: e.categoryRel
                ? {
                    ...e.categoryRel,
                    monthlyLimit: toNumOrNull(e.categoryRel.monthlyLimit),
                    rolloverBalance: toNum(e.categoryRel.rolloverBalance),
                }
                : null,
        })),
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
    const auth = await requireAuth();
    if (auth.role !== 'ADMIN') throw new Error('Acceso denegado: solo administradores');

    const [profilesCount, totalMoney, totalDebt, totalExpenses] = await prisma.$transaction([
        prisma.profile.count(),
        prisma.account.aggregate({ _sum: { balance: true } }),
        prisma.loan.aggregate({ _sum: { currentBalance: true } }),
        // Los gastos proyectados aún no son dinero real: no deben inflar esta métrica.
        prisma.expense.aggregate({ _sum: { amount: true }, where: { isProjected: false } }),
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
    const { role } = await requireAuth();
    if (role !== 'ADMIN') throw new Error('Acceso denegado: solo administradores');

    const profile = await prisma.profile.create({ data: { name } });
    await logAction('CREATE_PROFILE', `Nombre: ${name}`, profile.id);
    revalidatePath('/');
}

/**
 * Guarda el tema de color elegido en el perfil, para que viaje entre
 * dispositivos en vez de quedarse en el localStorage de un solo navegador.
 *
 * El identificador llega del cliente, asi que se contrasta contra la lista real
 * de temas antes de escribir: nunca entra a la base de datos sin validar.
 */
export async function updateColorTheme(profileId: number, theme: string): Promise<void> {
    await requireOwnership(profileId);

    if (!(COLOR_THEME_IDS as string[]).includes(theme)) {
        throw new Error(`Tema de color desconocido: ${theme}`);
    }

    await prisma.profile.update({
        where: { id: profileId },
        data: { colorTheme: theme as ColorThemeId },
    });
    revalidatePath('/');
}

export async function deleteProfile(id: number) {
    const { role } = await requireAuth();
    if (role !== 'ADMIN') throw new Error('Acceso denegado: solo administradores');

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
    revalidatePath('/');
}

export async function resetProfileData(id: number) {
    await requireOwnership(id);

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

            // El perfil vuelve a estar vacio, asi que vuelve a ser un primer uso:
            // sin esto la bienvenida no reaparece y el usuario se queda con el
            // dashboard en cero y sin ninguna guia.
            await tx.profile.update({
                where: { id },
                data: { onboardingSeenAt: null },
            });
        });
        revalidatePath('/');
    } catch (error) {
        reportError(error, { accion: 'resetear datos del perfil', profileId: id });
        throw new Error('Error al resetear los datos del perfil');
    }
}
