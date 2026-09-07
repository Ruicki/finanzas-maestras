function getEnv(key: string, minLength?: number): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Variable de entorno requerida no definida: ${key}`);
    }
    if (minLength && value.length < minLength) {
        throw new Error(`${key} debe tener al menos ${minLength} caracteres (actual: ${value.length})`);
    }
    return value;
}

export const env = {
    get JWT_SECRET() {
        return getEnv('JWT_SECRET', 32);
    },
    get DATABASE_URL() {
        return getEnv('POSTGRES_PRISMA_URL');
    },
} as const;
