
import { SignJWT, jwtVerify } from 'jose';

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

export async function requireAuth(): Promise<{ userId: number; role?: string }> {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_session')?.value;
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
    if (role === 'ADMIN') return; // Admins can access everything
    if (userId !== resourceProfileId) {
        throw new Error('No autorizado para acceder a este recurso');
    }
}
