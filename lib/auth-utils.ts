
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
