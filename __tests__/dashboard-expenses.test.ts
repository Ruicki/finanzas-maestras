import { gastosVisiblesEnElMes, totalGastadoDelMes } from '../lib/dashboard-expenses';

/**
 * El bug que motiva este archivo: alguien crea una proyección con fecha de
 * otro mes, y desaparece de la pantalla —sin fila no hay botón de confirmar
 * ni de eliminar—. Lo que se prueba aquí es que una proyección se vea sin
 * importar el mes, y que el total de "gastado" nunca la cuente.
 */

// Abril de 2026: mes 3 en base 0.
const MES = 3;
const AÑO = 2026;

const enAbril = (dia: number) => new Date(Date.UTC(AÑO, MES, dia, 12)).toISOString();
const enMayo = (dia: number) => new Date(Date.UTC(AÑO, MES + 1, dia, 12)).toISOString();
const enMarzo = (dia: number) => new Date(Date.UTC(AÑO, MES - 1, dia, 12)).toISOString();

describe('gastosVisiblesEnElMes', () => {
    it('muestra una proyección aunque su fecha sea de otro mes', () => {
        // Este es el caso real: se proyecta "la renta de mayo" estando en abril.
        const proyeccion = { isProjected: true, createdAt: enMayo(1), amount: 650 };
        expect(gastosVisiblesEnElMes([proyeccion], MES, AÑO)).toContain(proyeccion);
    });

    it('muestra una proyección de un mes YA PASADO', () => {
        const proyeccion = { isProjected: true, createdAt: enMarzo(1), amount: 100 };
        expect(gastosVisiblesEnElMes([proyeccion], MES, AÑO)).toContain(proyeccion);
    });

    it('no muestra un gasto REAL de otro mes', () => {
        const gasto = { isProjected: false, createdAt: enMayo(1), amount: 40 };
        expect(gastosVisiblesEnElMes([gasto], MES, AÑO)).not.toContain(gasto);
    });

    it('muestra un gasto real del mes seleccionado', () => {
        const gasto = { isProjected: false, createdAt: enAbril(15), amount: 40 };
        expect(gastosVisiblesEnElMes([gasto], MES, AÑO)).toContain(gasto);
    });

    it('un anual recurrente solo aparece en su mes de cobro', () => {
        const seguro = {
            isProjected: false, isRecurring: true, recurrenceType: 'ANNUAL',
            createdAt: enAbril(1), amount: 240,
        };
        expect(gastosVisiblesEnElMes([seguro], MES, AÑO)).toContain(seguro);
        expect(gastosVisiblesEnElMes([seguro], MES + 1, AÑO)).not.toContain(seguro);
    });

    it('nunca muestra un pago de deuda, sea del mes que sea', () => {
        // esPagoDeDeuda se comprueba antes que isProjected: ya se refleja en el
        // saldo de la tarjeta o del préstamo, contarlo aquí también duplicaría.
        const pago = {
            isProjected: true, createdAt: enAbril(5), amount: 300,
            categoryId: 1, category: 'Pagos Tarjeta',
        };
        expect(gastosVisiblesEnElMes([pago], MES, AÑO)).not.toContain(pago);
    });
});

describe('totalGastadoDelMes', () => {
    it('no cuenta las proyecciones, aunque estén en la lista visible', () => {
        // El caso que hacía falta cerrar: dejar de filtrar las proyecciones por
        // mes (para que se vean) sin excluirlas aquí habría inflado este total
        // con proyecciones de CUALQUIER mes, no solo del actual.
        const visibles = [
            { isProjected: false, createdAt: enAbril(10), amount: 50 },
            { isProjected: true, createdAt: enMayo(1), amount: 650 },
        ];
        expect(totalGastadoDelMes(visibles)).toBe(50);
    });

    it('suma los gastos reales del mes', () => {
        const visibles = [
            { isProjected: false, createdAt: enAbril(3), amount: 20 },
            { isProjected: false, createdAt: enAbril(20), amount: 30 },
        ];
        expect(totalGastadoDelMes(visibles)).toBe(50);
    });

    it('da cero sin gastos', () => {
        expect(totalGastadoDelMes([])).toBe(0);
    });
});
