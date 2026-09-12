import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { env } from './env';

const SESSION_COOKIE = 'auth_session';
const IMPERSONATE_COOKIE = 'impersonate_id';

let cachedKey: ReturnType<typeof TextEncoder.prototype.encode> | null = null;
function getKey() {
    if (!cachedKey) cachedKey = new TextEncoder().encode(env.JWT_SECRET);
    return cachedKey;
}

export async function signSession(payload: { userId: string, role?: string }) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(getKey());
}

export async function verifySession(token: string) {
    try {
        const { payload } = await jwtVerify(token, getKey(), {
            algorithms: ['HS256'],
        });
        return payload;
    } catch {
        return null;
    }
}

export async function getSession(): Promise<number | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const payload = await verifySession(token);
    if (!payload || !payload.userId) return null;

    return parseInt(payload.userId as string);
}

export async function getImpersonatedId(): Promise<number | null> {
    const cookieStore = await cookies();
    const val = cookieStore.get(IMPERSONATE_COOKIE)?.value;
    if (!val) return null;

    // El cookie de impersonación no está firmado: httpOnly evita que JS lo lea,
    // pero no evita que el propio usuario lo edite a mano (devtools). Por eso
    // solo se honra si la sesión real y verificada (JWT) es de un ADMIN — así
    // un usuario normal no puede forjar este valor para suplantar a otro perfil.
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const payload = await verifySession(token);
    if (!payload || payload.role !== 'ADMIN') return null;

    return parseInt(val);
}

export async function requireAuth(): Promise<{ userId: number; role?: string }> {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) throw new Error('No autenticado');

    const payload = await verifySession(token);
    if (!payload || !payload.userId) throw new Error('Sesión inválida');

    return {
        userId: parseInt(payload.userId as string),
        role: payload.role as string | undefined,
    };
}

export async function requireOwnership(resourceProfileId: number): Promise<void> {
    const { userId, role } = await requireAuth();
    if (role === 'ADMIN') return;
    if (userId !== resourceProfileId) {
        throw new Error('No autorizado para acceder a este recurso');
    }
}
