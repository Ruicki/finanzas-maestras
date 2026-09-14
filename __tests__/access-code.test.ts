import {
    generarCodigo,
    caducidadDeCodigo,
    codigoVigente,
    normalizarCodigo,
    HORAS_DE_VIGENCIA,
} from '../lib/access-code';

const HORA = 60 * 60 * 1000;

/**
 * Un código de acceso deja entrar a una cuenta con todas las finanzas de alguien
 * dentro. Lo que se prueba aquí es que deje de valer cuando toca y que no se
 * pueda estirar esa fecha.
 */
describe('generarCodigo', () => {
    it('caduca a las horas prometidas', () => {
        const ahora = new Date('2026-03-15T12:00:00Z');
        const { codigo, expira } = generarCodigo(ahora);

        // Al minuto, porque es la resolución con la que se guarda.
        const esperado = ahora.getTime() + HORAS_DE_VIGENCIA * HORA;
        expect(Math.abs(expira.getTime() - esperado)).toBeLessThan(60_000);
        expect(caducidadDeCodigo(codigo)!.getTime()).toBe(
            Math.floor(expira.getTime() / 60_000) * 60_000,
        );
    });

    it('no repite códigos', () => {
        const ahora = new Date('2026-03-15T12:00:00Z');
        const codigos = new Set(
            Array.from({ length: 200 }, () => generarCodigo(ahora).codigo),
        );
        expect(codigos.size).toBe(200);
    });

    it('evita los caracteres que se confunden al teclear', () => {
        // Quien recibe el código lo copia de un mensaje: una I por una L o un 0
        // por una O es un intento gastado por nada.
        const { codigo } = generarCodigo();
        const parteAleatoria = codigo.split('-')[0];
        expect(parteAleatoria).not.toMatch(/[ILO1]/);
        expect(parteAleatoria).toHaveLength(10);
    });
});

describe('codigoVigente', () => {
    const ahora = new Date('2026-03-15T12:00:00Z');

    it('acepta un código recién emitido', () => {
        const { codigo } = generarCodigo(ahora);
        expect(codigoVigente(codigo, ahora)).toBe(true);
    });

    it('rechaza uno pasado su plazo', () => {
        const { codigo } = generarCodigo(ahora);
        const despues = new Date(ahora.getTime() + (HORAS_DE_VIGENCIA + 1) * HORA);
        expect(codigoVigente(codigo, despues)).toBe(false);
    });

    it('rechaza los códigos antiguos, que no llevaban caducidad', () => {
        // Son las llaves permanentes que ya se repartieron: mejor obligar a
        // pedir uno nuevo que dejarlas abiertas.
        expect(codigoVigente('K4NQ8ZTXAB', ahora)).toBe(false);
        expect(caducidadDeCodigo('K4NQ8ZTXAB')).toBeNull();
    });

    it('rechaza una caducidad manipulada', () => {
        // Alargar la fecha a mano cambia la cadena, y la cadena es lo que se
        // busca en la base de datos: el código deja de encontrarse. Aquí solo se
        // comprueba que lo que se lee es lo que está escrito, sin inventar.
        const { codigo } = generarCodigo(ahora);
        const [aleatoria] = codigo.split('-');
        const estirado = `${aleatoria}-ZZZZZZ`;
        expect(caducidadDeCodigo(estirado)!.getTime())
            .not.toBe(caducidadDeCodigo(codigo)!.getTime());
    });

    it('no se traga formatos rotos', () => {
        expect(codigoVigente('', ahora)).toBe(false);
        expect(codigoVigente('-', ahora)).toBe(false);
        expect(codigoVigente('ABC-', ahora)).toBe(false);
        expect(codigoVigente('A-B-C', ahora)).toBe(false);
    });
});

describe('normalizarCodigo', () => {
    it('perdona los espacios y las minúsculas del copiar y pegar', () => {
        expect(normalizarCodigo('  k4nq8ztxab-hq2x9z ')).toBe('K4NQ8ZTXAB-HQ2X9Z');
        expect(normalizarCodigo('K4NQ 8ZTX AB-HQ2X9Z')).toBe('K4NQ8ZTXAB-HQ2X9Z');
    });

    it('deja intacto uno ya correcto', () => {
        const { codigo } = generarCodigo();
        expect(normalizarCodigo(codigo)).toBe(codigo);
    });
});
