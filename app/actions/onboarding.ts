'use server';

import { prisma } from '@/lib/prisma';
import { createAccount } from './budget';
import { initializeDefaultCategories } from './categories';
import { requireOwnership } from '@/lib/auth-utils';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';
import { logAction } from './audit';

export async function ensureProfileIntegrity(profileId: number): Promise<void> {
    try {
        await requireOwnership(profileId);

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
        // No relanzamos: esto corre en cada carga de "/" para el usuario logueado,
        // así que un fallo transitorio de DB no debe tumbar el dashboard entero.
        // Pero antes quedaba en silencio total (solo console.error, que en
        // producción nadie revisa) - ahora queda logueado Y visible para un
        // admin en el panel de auditoría, para poder detectar perfiles a medio
        // armar (sin cuenta Efectivo/categorías) antes de que el usuario reporte
        // que "la app se ve rara".
        logger.error(`ensureProfileIntegrity failed for profile ${profileId}:`, e);
        await logAction(
            'PROFILE_INTEGRITY_CHECK_FAILED',
            e instanceof Error ? e.message : String(e),
            profileId,
        );
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
