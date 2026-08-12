'use server';

import { getSession } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "./audit";

/**
 * Exports the entire database to a JSON object.
 * Restricted to ADMIN only.
 */
export async function exportDatabase() {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const profile = await prisma.profile.findUnique({ where: { id: session } });
    if (profile?.role !== 'ADMIN') throw new Error("Forbidden");

    // Fetch all data in parallel
    const [profiles, salaries, incomes, expenses, accounts, cards, loans, goals, logs] = await Promise.all([
        prisma.profile.findMany(),
        prisma.salary.findMany(),
        prisma.additionalIncome.findMany(),
        prisma.expense.findMany(),
        prisma.account.findMany(),
        prisma.creditCard.findMany(),
        prisma.loan.findMany(),
        prisma.goal.findMany(),
        prisma.auditLog.findMany()
    ]);

    const data = {
        timestamp: new Date().toISOString(),
        version: "1.0",
        stats: {
            profiles: profiles.length,
            records: salaries.length + expenses.length + accounts.length
        },
        data: {
            profiles,
            salaries,
            incomes,
            expenses,
            accounts,
            creditCards: cards,
            loans,
            goals,
            auditLogs: logs
        }
    };

    await logAction('SYSTEM_BACKUP', 'Compilación completa de base de datos exportada', session);

    return JSON.stringify(data, null, 2);
}

/**
 * Toggles global maintenance mode.
 * (For now, this implies updating a config in DB or just a mock if Config model doesn't exist)
 * NOTE: Since we don't have a 'Config' model yet, we will create one or use a file.
 * Implementation pending Config model. For now, returns mock success.
 */
export async function toggleMaintenanceMode(enabled: boolean) {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");
    // TODO: Implement actual storage
    await logAction('SYSTEM_MAINTENANCE', `Modo mantenimiento ${enabled ? 'ACTIVADO' : 'DESACTIVADO'}`, session);
    return { success: true, mode: enabled };
}
