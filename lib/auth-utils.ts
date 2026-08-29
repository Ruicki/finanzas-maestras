
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'auth_session';
const IMPERSONATE_COOKIE = 'impersonate_id';

const secretKey = process.env.JWT_SECRET || 'secret-key-change-me-in-prod';
const key = new TextEncoder().encode(secretKey);

export async function signSession(payload: { userId: string, role?: string }) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(key);
}

export async function verifySession(token: string) {
    try {
        const { payload } = await jwtVerify(token, key, {
            algorithms: ['HS256'],
        });
        return payload;
    } catch (error) {
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
    return val ? parseInt(val) : null;
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
