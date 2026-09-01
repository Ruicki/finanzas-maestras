'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { toNum } from './serializers';
import { requireOwnership } from '@/lib/auth-utils';

// ─── PRESUPUESTO POR MES (CATEGORY BUDGET) ────────────────────────────────
// Permite asignar un límite de gasto distinto a cada categoría por mes
// (incluidos meses futuros). Si una categoría no tiene presupuesto para un
// mes concreto, se usa su monthlyLimit como respaldo.

export interface CategoryBudgetInput {
    categoryId: number;
    year: number;
    month: number; // 1-12
    limit: number;
}

export async function setCategoryBudget(data: CategoryBudgetInput) {
    const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
    });
    if (!category) throw new Error('Categoría no encontrada');
    await requireOwnership(category.profileId);

    const limit = Number(data.limit) || 0;

    if (limit <= 0) {
        // Límite 0 = sin presupuesto para ese mes -> borrar entrada si existe
        await prisma.categoryBudget.deleteMany({
            where: {
                categoryId: data.categoryId,
                year: data.year,
                month: data.month,
            },
        });
    } else {
        await prisma.categoryBudget.upsert({
            where: {
                categoryId_year_month: {
                    categoryId: data.categoryId,
                    year: data.year,
                    month: data.month,
                },
            },
            update: { limit },
            create: {
                categoryId: data.categoryId,
                year: data.year,
                month: data.month,
                limit,
            },
        });
    }

    revalidatePath('/budget');
    return { success: true };
}

export async function getCategoryBudget(categoryId: number, year: number, month: number) {
    const b = await prisma.categoryBudget.findUnique({
        where: {
            categoryId_year_month: { categoryId, year, month },
        },
    });
    return b ? { ...b, limit: toNum(b.limit) } : null;
}

export async function getProfileBudgets(profileId: number) {
    await requireOwnership(profileId);
    const budgets = await prisma.categoryBudget.findMany({
        where: { category: { profileId } },
    });
    return budgets.map((b) => ({ ...b, limit: toNum(b.limit) }));
}
