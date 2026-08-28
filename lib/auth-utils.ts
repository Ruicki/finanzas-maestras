
import { SignJWT, jwtVerify } from 'jose';

function getKey() {
    const secretKey = process.env.JWT_SECRET;
    if (!secretKey) {
        throw new Error('JWT_SECRET environment variable is required');
    }
    return new TextEncoder().encode(secretKey);
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
