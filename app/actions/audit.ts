'use server';

import { prisma } from '@/lib/prisma';
import { getSession, getImpersonatedId } from '@/app/actions/auth';
import { revalidatePath } from 'next/cache';

export async function logAction(action: string, details?: string, targetId?: number) {
    try {
        // En auditoría queremos saber quién es el usuario REAL, no el impersonado
        // Si hay impersonación, el actor sigue siendo el admin real
        const actorId = await getSession();

        if (!actorId) return; // Anomalía: Acción sin sesión

        await prisma.auditLog.create({
            data: {
                action,
                details,
                actorId,
                targetId
            }
        });
    } catch (error) {
        console.error("Error logging action:", error);
        // No lanzamos error para no interrumpir el flujo principal
    }
}

export async function getAuditLogs(limit = 50) {
    const session = await getSession();
    if (!session) return [];

    // Verificar Admin (esto asume que ya verificaste sesión, pero doble check es bueno)
    const actor = await prisma.profile.findUnique({ where: { id: session } });
    if (actor?.role !== 'ADMIN') return [];

    const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit
    });

    // Serializar fechas
    return logs.map(log => ({
        ...log,
        createdAt: log.createdAt.toISOString()
    }));
}
