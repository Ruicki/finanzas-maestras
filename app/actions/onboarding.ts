'use server';

import { prisma } from '@/lib/prisma';
import { createAccount } from './budget';
import { initializeDefaultCategories } from './categories';
import { requireOwnership } from '@/lib/auth-utils';
import { revalidatePath } from 'next/cache';

export async function ensureProfileIntegrity(profileId: number): Promise<void> {
    try {
        const profile = await prisma.profile.findUnique({
            where: { id: profileId },
            include: { accounts: true, categories: true },
        });
        if (!profile) return;

        const hasCashAccount = profile.accounts.some((a) => a.name === 'Efectivo');
        if (!hasCashAccount) {
            await createAccount('Efectivo', 'CASH', 0, profileId, undefined, 'SPENDING', undefined, true);
        }

        if (profile.categories.length === 0) {
            await initializeDefaultCategories(profileId);
        }
    } catch (e) {
        console.error('ensureProfileIntegrity failed:', e);
    }
}

export async function markOnboardingSeen(profileId: number): Promise<void> {
    await requireOwnership(profileId);
    await prisma.profile.update({
        where: { id: profileId },
        data: { onboardingSeenAt: new Date() },
    });
    revalidatePath('/');
}
