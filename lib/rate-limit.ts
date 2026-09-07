const attempts = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function getClientIp(): string {
    try {
        const { headers } = require('next/headers');
        const h = headers();
        return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
    } catch {
        return 'unknown';
    }
}

export function checkRateLimit(key: string): { allowed: boolean; retryAfterMs: number } {
    const ip = getClientIp();
    const fullKey = `${ip}:${key}`;
    const now = Date.now();
    const entry = attempts.get(fullKey);

    if (!entry || now > entry.resetAt) {
        attempts.set(fullKey, { count: 1, resetAt: now + WINDOW_MS });
        return { allowed: true, retryAfterMs: 0 };
    }

    if (entry.count >= MAX_ATTEMPTS) {
        return { allowed: false, retryAfterMs: entry.resetAt - now };
    }

    entry.count++;
    return { allowed: true, retryAfterMs: 0 };
}
