import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { createIncome } from '@/app/actions/budget/incomes';
import { validate, quickIncomeSchema } from '@/lib/validators/schemas';
import { reportError } from '@/lib/logger';

/**
 * Alta rápida de un ingreso desde el widget/app móvil. Mismo motor que la
 * web (createIncome valida pertenencia de cuenta al perfil), solo cambia
 * quién llama.
 */
export async function POST(request: Request) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const validation = validate(quickIncomeSchema, body);
    if (!validation.success) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { amount, name, accountId } = validation.data;

    try {
        const { userId } = await requireAuth();

        const income = await createIncome({
            name: name || 'Ingreso rápido',
            amount,
            type: 'ONE_TIME',
            profileId: userId,
            accountId,
        });

        return NextResponse.json({ income });
    } catch (error) {
        if (error instanceof Error && (error.message === 'No autenticado' || error.message === 'Sesión inválida')) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, { status: 422 });
        }
        reportError(error, { accion: 'alta rapida de ingreso (movil)' });
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
