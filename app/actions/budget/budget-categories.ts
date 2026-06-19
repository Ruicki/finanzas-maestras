'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// ─── BUDGET CATEGORIES ─────────────────────────────────────────────────────

export async function updateCategoryLimit(categoryId: number, limit: number) {
    try {
        await prisma.category.update({
            where: { id: categoryId },
            data: { monthlyLimit: limit },
        });
        revalidatePath('/budget');
        return { success: true };
    } catch (error) {
        console.error('Error updating limit:', error);
        return { success: false, error: 'Failed to update limit' };
    }
}

export async function toggleCategoryRollover(categoryId: number, isRollover: boolean) {
    try {
        await prisma.category.update({
            where: { id: categoryId },
            data: { isRollover },
        });
        revalidatePath('/budget');
        return { success: true };
    } catch (error) {
        console.error('Error toggling rollover:', error);
        return { success: false, error: 'Failed to toggle rollover' };
    }
}

export async function updateCategoryRolloverBalance(categoryId: number, balance: number) {
    try {
        await prisma.category.update({
            where: { id: categoryId },
            data: { rolloverBalance: balance },
        });
        revalidatePath('/budget');
        return { success: true };
    } catch (error) {
        console.error('Error updating rollover balance:', error);
        return { success: false, error: 'Failed to update rollover balance' };
    }
}
