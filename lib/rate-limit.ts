const attempts = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_IDENTIFIER = 10;
const MAX_ATTEMPTS_PER_IP = 30;

async function getClientIp(): Promise<string> {
    try {
        const { headers } = await import('next/headers');
        const h = await headers();
        return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
    } catch {
        return 'unknown';
    }
}

function bump(key: string, max: number): { allowed: boolean; retryAfterMs: number } {
    const now = Date.now();
    const entry = attempts.get(key);

    if (!entry || now > entry.resetAt) {
        attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
        return { allowed: true, retryAfterMs: 0 };
    }

    if (entry.count >= max) {
        return { allowed: false, retryAfterMs: entry.resetAt - now };
    }

    entry.count++;
    return { allowed: true, retryAfterMs: 0 };
}

/**
 * `key` suele incluir un identificador provisto por el cliente (ej. "login:email@x.com").
 * Ademas del limite fino por IP+identificador, se aplica un limite grueso por IP+accion
 * para que no se pueda evadir el limite rotando el identificador (ej. probando un
 * accessCode distinto con un email nuevo en cada intento).
 */
export async function checkRateLimit(key: string): Promise<{ allowed: boolean; retryAfterMs: number }> {
    const ip = await getClientIp();
    const action = key.split(':')[0] ?? key;

    const perIp = bump(`${ip}:${action}`, MAX_ATTEMPTS_PER_IP);
    if (!perIp.allowed) return perIp;

    const perIdentifier = bump(`${ip}:${key}`, MAX_ATTEMPTS_PER_IDENTIFIER);
    return perIdentifier;
}
