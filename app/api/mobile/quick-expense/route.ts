import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { createExpense } from '@/app/actions/budget/expenses';
import { validate, quickExpenseSchema } from '@/lib/validators/schemas';
import { reportError } from '@/lib/logger';

/**
 * Alta rápida de un gasto desde el widget/app móvil: se registra como un
 * gasto real de una sola vez (isRecurring: false, isOneTime: true), igual
 * que un gasto normal desde la web — nunca como plantilla de suscripción.
 * createExpense ya valida fondos, bloqueo de cuenta y pertenencia de
 * cuenta/categoría al perfil (anti-IDOR), así que esta ruta no repite esa
 * lógica, solo autentica y traduce el body.
 */
export async function POST(request: Request) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const validation = validate(quickExpenseSchema, body);
    if (!validation.success) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { amount, name, accountId, categoryId } = validation.data;

    try {
        const { userId } = await requireAuth();

        const expense = await createExpense({
            name: name || 'Gasto rápido',
            amount,
            category: 'Sin categoría',
            profileId: userId,
            accountId,
            categoryId,
            isRecurring: false,
            isOneTime: true,
        });

        return NextResponse.json({ expense });
    } catch (error) {
        if (error instanceof Error && (error.message === 'No autenticado' || error.message === 'Sesión inválida')) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof Error) {
            // Mensajes como "Saldo insuficiente..." o "Cuenta bloqueada..." son
            // para mostrarle al usuario tal cual, no errores de servidor.
            return NextResponse.json({ error: error.message }, { status: 422 });
        }
        reportError(error, { accion: 'alta rapida de gasto (movil)' });
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
