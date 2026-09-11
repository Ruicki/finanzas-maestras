import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

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

// ─── Fallback en memoria ────────────────────────────────────────────────────
// Se usa solo si no hay credenciales de Upstash configuradas (ej. desarrollo local).
// En Vercel serverless, cada instancia tiene su propio Map, así que este modo
// NO comparte el conteo entre instancias — por eso se prefiere Redis en producción.

const attempts = new Map<string, { count: number; resetAt: number }>();

function bumpInMemory(key: string, max: number): { allowed: boolean; retryAfterMs: number } {
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

// ─── Backend distribuido (Upstash Redis) ───────────────────────────────────
// Se activa automáticamente si UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
// están presentes (los nombres estándar que usa la integración de Vercel).

let redisLimiters: { perIp: Ratelimit; perIdentifier: Ratelimit } | null | undefined;

function getRedisLimiters(): { perIp: Ratelimit; perIdentifier: Ratelimit } | null {
    if (redisLimiters !== undefined) return redisLimiters;

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        redisLimiters = null;
        return redisLimiters;
    }

    const redis = new Redis({ url, token });
    redisLimiters = {
        perIp: new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(MAX_ATTEMPTS_PER_IP, '15 m'),
            prefix: 'ratelimit:ip',
        }),
        perIdentifier: new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(MAX_ATTEMPTS_PER_IDENTIFIER, '15 m'),
            prefix: 'ratelimit:id',
        }),
    };
    return redisLimiters;
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

    const limiters = getRedisLimiters();

    if (limiters) {
        const perIp = await limiters.perIp.limit(`${ip}:${action}`);
        if (!perIp.success) {
            return { allowed: false, retryAfterMs: Math.max(0, perIp.reset - Date.now()) };
        }

        const perIdentifier = await limiters.perIdentifier.limit(`${ip}:${key}`);
        return {
            allowed: perIdentifier.success,
            retryAfterMs: perIdentifier.success ? 0 : Math.max(0, perIdentifier.reset - Date.now()),
        };
    }

    const perIp = bumpInMemory(`${ip}:${action}`, MAX_ATTEMPTS_PER_IP);
    if (!perIp.allowed) return perIp;

    return bumpInMemory(`${ip}:${key}`, MAX_ATTEMPTS_PER_IDENTIFIER);
}
