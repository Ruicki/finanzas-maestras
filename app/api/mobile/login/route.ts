import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signSession } from '@/lib/auth-utils';
import { checkRateLimit } from '@/lib/rate-limit';
import { validate, loginSchema } from '@/lib/validators/schemas';
import { reportError } from '@/lib/logger';

/**
 * Login para la app móvil del widget. Mismas credenciales que el login web,
 * pero el navegador no interviene — no hay cookie jar en un widget nativo —
 * así que el JWT se devuelve en el body para que la app lo guarde en
 * SecureStore y lo mande como `Authorization: Bearer <token>` en cada
 * llamada siguiente.
 */
export async function POST(request: Request) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const validation = validate(loginSchema, body);
    if (!validation.success) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { email, password } = validation.data;

    const rateLimit = await checkRateLimit(`login:${email}`);
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: `Demasiados intentos. Intenta de nuevo en ${Math.ceil(rateLimit.retryAfterMs / 60000)} minutos` },
            { status: 429 },
        );
    }

    try {
        const profile = await prisma.profile.findUnique({ where: { email } });
        if (!profile || !profile.password) {
            return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
        }

        const isValid = await bcrypt.compare(password, profile.password);
        if (!isValid) {
            return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
        }

        const token = await signSession({ userId: profile.id.toString(), role: profile.role });

        return NextResponse.json({
            token,
            profile: { id: profile.id, name: profile.name, email: profile.email },
        });
    } catch (error) {
        reportError(error, { accion: 'login movil' });
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
