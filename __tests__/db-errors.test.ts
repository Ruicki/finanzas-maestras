import { diagnosticarErrorDB, esErrorDeBaseDeDatos } from '../lib/db-errors';

/**
 * Estas pruebas existen por una caída real: la app mostraba "Algo salió mal" y
 * un identificador, y averiguar qué pasaba llevó horas. Lo que se comprueba aquí
 * es que diga la verdad —y que no diga de más: el mensaje de Prisma puede llevar
 * dentro la cadena de conexión con la contraseña.
 */

/** Un error de consulta de Prisma, con la forma que tiene de verdad. */
function errorPrisma(code: string, meta?: Record<string, unknown>) {
    const e = new Error(
        `Invalid \`prisma.profile.findUnique()\` invocation:\n` +
        `datasource db: postgresql://neondb_owner:CONTRASEÑA_SECRETA@ep-algo.neon.tech/neondb`,
    );
    e.name = 'PrismaClientKnownRequestError';
    return Object.assign(e, { code, meta, clientVersion: '5.10.0' });
}

describe('esErrorDeBaseDeDatos', () => {
    it('reconoce los errores de Prisma', () => {
        expect(esErrorDeBaseDeDatos(errorPrisma('P2022', { column: 'Profile.colorTheme' }))).toBe(true);
        expect(esErrorDeBaseDeDatos(Object.assign(new Error('x'), { clientVersion: '5.10.0' }))).toBe(true);
    });

    it('NO se queda con los fallos que no son de base de datos', () => {
        // Importa: enseñar "no se pudo conectar a la base de datos" cuando lo
        // que pasó es que alguien tocó datos ajenos sería mentir, y ademas
        // escondería un fallo de autorización real.
        expect(esErrorDeBaseDeDatos(new Error('Acceso denegado: solo administradores'))).toBe(false);
        expect(esErrorDeBaseDeDatos(new Error('No autenticado'))).toBe(false);
        expect(esErrorDeBaseDeDatos(null)).toBe(false);
        expect(esErrorDeBaseDeDatos('texto suelto')).toBe(false);
    });
});

describe('diagnosticarErrorDB', () => {
    it('nombra la columna que falta, que es el dato que arregla el problema', () => {
        // Este es el caso que tumbó producción: se desplegó un cambio de esquema
        // sin aplicarlo a la base.
        const d = diagnosticarErrorDB(errorPrisma('P2022', { column: 'Profile.colorTheme' }));
        expect(d.clase).toBe('columna-ausente');
        expect(d.explicacion).toContain('Profile.colorTheme');
        expect(d.accion).toMatch(/migración/i);
    });

    it('aguanta que Prisma no diga qué columna era', () => {
        const d = diagnosticarErrorDB(errorPrisma('P2022'));
        expect(d.clase).toBe('columna-ausente');
        expect(d.explicacion).toBeTruthy();
    });

    it('distingue no poder conectar de que falten las credenciales', () => {
        expect(diagnosticarErrorDB(errorPrisma('P1001')).clase).toBe('sin-conexion');
        expect(diagnosticarErrorDB(errorPrisma('P1000')).clase).toBe('credenciales');
        expect(diagnosticarErrorDB(errorPrisma('P1003')).clase).toBe('base-inexistente');
        expect(diagnosticarErrorDB(errorPrisma('P2021')).clase).toBe('tabla-ausente');
        expect(diagnosticarErrorDB(errorPrisma('P2024')).clase).toBe('saturada');
    });

    it('reconoce que falta la variable de entorno, que no trae código', () => {
        const d = diagnosticarErrorDB(new Error('error: Environment variable not found: POSTGRES_PRISMA_URL.'));
        expect(d.clase).toBe('sin-configurar');
        expect(d.accion).toContain('POSTGRES_PRISMA_URL');
    });

    it('no se queda callado ante un error que no conoce', () => {
        const d = diagnosticarErrorDB(errorPrisma('P9999'));
        expect(d.clase).toBe('desconocido');
        expect(d.titulo).toBeTruthy();
    });
});

describe('lo que NUNCA debe salir en pantalla', () => {
    const casos = [
        errorPrisma('P2022', { column: 'Profile.colorTheme' }),
        errorPrisma('P1001'),
        new Error('error: Environment variable not found: POSTGRES_PRISMA_URL.'),
    ];

    it('no filtra la cadena de conexión ni la contraseña', () => {
        for (const caso of casos) {
            const texto = JSON.stringify(diagnosticarErrorDB(caso));
            expect(texto).not.toContain('postgresql://');
            expect(texto).not.toContain('CONTRASEÑA_SECRETA');
            expect(texto).not.toContain('neondb_owner');
            expect(texto).not.toContain('neon.tech');
        }
    });

    it('descarta un nombre de columna que no parezca un identificador', () => {
        // Si el valor viniera manipulado, mejor no enseñar nada que enseñarlo.
        const d = diagnosticarErrorDB(errorPrisma('P2022', {
            column: 'postgresql://user:pass@host/db',
        }));
        expect(d.explicacion).not.toContain('postgresql://');
        expect(d.explicacion).not.toContain('pass');
    });
});
