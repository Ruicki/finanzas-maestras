import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { reportError } from '@/lib/logger';

/**
 * Lo que la pantalla de alta rápida necesita para los selectores: cuentas
 * (con su saldo, para no dejar elegir una sin fondos a simple vista) y
 * categorías de gasto. Solo del perfil autenticado — nunca de otro.
 */
export async function GET() {
    try {
        const { userId } = await requireAuth();

        const [accounts, categories] = await Promise.all([
            prisma.account.findMany({
                where: { profileId: userId },
                orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
                select: { id: true, name: true, balance: true, symbol: true, isDefault: true },
            }),
            prisma.category.findMany({
                where: { profileId: userId, type: 'EXPENSE' },
                orderBy: { name: 'asc' },
                select: { id: true, name: true, icon: true, color: true },
            }),
        ]);

        return NextResponse.json({
            accounts: accounts.map((a) => ({ ...a, balance: Number(a.balance) })),
            categories,
        });
    } catch (error) {
        if (error instanceof Error && (error.message === 'No autenticado' || error.message === 'Sesión inválida')) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        reportError(error, { accion: 'contexto movil' });
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
