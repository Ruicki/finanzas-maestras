process.env.JWT_SECRET = 'a'.repeat(32);

// `jose` publica solo ESM y no hay transform para .js de node_modules en
// este jest.config — nada en la suite había importado auth-utils.ts (y por
// lo tanto jose) hasta ahora. Se reemplaza por un JWT de juguete (base64 del
// payload, sin firma real) solo para probar la lógica propia de
// requireAuth (cookie vs. header) — la corrección criptográfica de jose no
// es lo que está bajo prueba aquí.
jest.mock('jose', () => {
    class SignJWT {
        private payload: Record<string, unknown>;
        constructor(payload: Record<string, unknown>) {
            this.payload = payload;
        }
        setProtectedHeader() { return this; }
        setIssuedAt() { return this; }
        setExpirationTime() { return this; }
        async sign() {
            return Buffer.from(JSON.stringify(this.payload)).toString('base64url');
        }
    }
    async function jwtVerify(token: string) {
        try {
            const payload = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
            if (!payload || typeof payload !== 'object') throw new Error('invalid');
            return { payload };
        } catch {
            throw new Error('token invalido');
        }
    }
    return { SignJWT, jwtVerify };
});

const cookieStore = new Map<string, string>();
let headerMap = new Map<string, string>();

jest.mock('next/headers', () => ({
    cookies: async () => ({
        get: (name: string) => (cookieStore.has(name) ? { value: cookieStore.get(name) } : undefined),
    }),
    headers: async () => ({
        get: (name: string) => headerMap.get(name.toLowerCase()) ?? null,
    }),
}));

import { signSession, requireAuth } from '../lib/auth-utils';

/**
 * El navegador autentica con la cookie httpOnly. La app móvil del widget
 * no tiene cookie jar, así que manda el mismo JWT en
 * `Authorization: Bearer <token>` — requireAuth debe aceptar las dos vías,
 * sin que la cookie tenga prioridad silenciosa sobre un header válido.
 */
describe('requireAuth', () => {
    beforeEach(() => {
        cookieStore.clear();
        headerMap = new Map();
    });

    it('autentica con la cookie de sesión (flujo web)', async () => {
        const token = await signSession({ userId: '42', role: 'USER' });
        cookieStore.set('auth_session', token);

        const result = await requireAuth();
        expect(result).toEqual({ userId: 42, role: 'USER' });
    });

    it('autentica con Authorization: Bearer cuando no hay cookie (flujo móvil)', async () => {
        const token = await signSession({ userId: '7', role: 'ADMIN' });
        headerMap.set('authorization', `Bearer ${token}`);

        const result = await requireAuth();
        expect(result).toEqual({ userId: 7, role: 'ADMIN' });
    });

    it('rechaza sin cookie y sin header', async () => {
        await expect(requireAuth()).rejects.toThrow('No autenticado');
    });

    it('rechaza un token inválido en el header', async () => {
        headerMap.set('authorization', 'Bearer esto-no-es-un-jwt');
        await expect(requireAuth()).rejects.toThrow('Sesión inválida');
    });

    it('ignora un header Authorization sin el prefijo Bearer', async () => {
        const token = await signSession({ userId: '9' });
        headerMap.set('authorization', token);
        await expect(requireAuth()).rejects.toThrow('No autenticado');
    });
});
