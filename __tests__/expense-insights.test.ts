import { topGastosIndividuales, tendenciaDeGasto } from '../lib/expense-insights';

// Abril de 2026: mes 3 en base 0.
const MES = 3;
const AÑO = 2026;
const enAbril = (dia: number) => new Date(Date.UTC(AÑO, MES, dia, 12)).toISOString();
const enMarzo = (dia: number) => new Date(Date.UTC(AÑO, MES - 1, dia, 12)).toISOString();
const enFebrero = (dia: number) => new Date(Date.UTC(AÑO, MES - 2, dia, 12)).toISOString();

describe('topGastosIndividuales', () => {
    it('ordena de mayor a menor monto', () => {
        const gastos = [
            { amount: 20, createdAt: enAbril(1) },
            { amount: 90, createdAt: enAbril(2) },
            { amount: 45, createdAt: enAbril(3) },
        ];
        expect(topGastosIndividuales(gastos).map(g => g.amount)).toEqual([90, 45, 20]);
    });

    it('excluye proyecciones', () => {
        const gastos = [
            { amount: 500, createdAt: enAbril(1), isProjected: true },
            { amount: 30, createdAt: enAbril(2) },
        ];
        expect(topGastosIndividuales(gastos)).toEqual([{ amount: 30, createdAt: enAbril(2) }]);
    });

    it('recorta a n elementos', () => {
        const gastos = Array.from({ length: 10 }, (_, i) => ({ amount: i + 1, createdAt: enAbril(1) }));
        expect(topGastosIndividuales(gastos, 3)).toHaveLength(3);
    });
});

describe('tendenciaDeGasto', () => {
    it('suma el total real de cada uno de los últimos 3 meses', () => {
        const gastos = [
            { amount: 100, createdAt: enFebrero(5) },
            { amount: 50, createdAt: enFebrero(10) },
            { amount: 200, createdAt: enMarzo(1) },
            { amount: 80, createdAt: enAbril(1) },
            { amount: 20, createdAt: enAbril(2) },
        ];
        const tendencia = tendenciaDeGasto(gastos, MES, AÑO, 3);
        expect(tendencia.map(m => m.total)).toEqual([150, 200, 100]);
        expect(tendencia.map(m => m.etiqueta)).toEqual(['Feb', 'Mar', 'Abr']);
    });

    it('excluye proyecciones del total', () => {
        const gastos = [
            { amount: 30, createdAt: enAbril(1) },
            { amount: 900, createdAt: enAbril(2), isProjected: true },
        ];
        const tendencia = tendenciaDeGasto(gastos, MES, AÑO, 1);
        expect(tendencia).toEqual([{ clave: '2026-04', etiqueta: 'Abr', total: 30 }]);
    });

    it('cruza el límite de año hacia atrás sin romperse', () => {
        // Enero (mes 0): los 2 meses anteriores son noviembre y diciembre del año pasado.
        const tendencia = tendenciaDeGasto([], 0, 2026, 3);
        expect(tendencia.map(m => m.clave)).toEqual(['2025-11', '2025-12', '2026-01']);
    });

    it('da ceros sin gastos', () => {
        const tendencia = tendenciaDeGasto([], MES, AÑO, 3);
        expect(tendencia.every(m => m.total === 0)).toBe(true);
    });
});
