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

    it('una plantilla recurrente nunca se muestra como gasto, en ningún mes', () => {
        // La plantilla (isRecurring: true) es solo una definición de cobro:
        // no mueve dinero al crearse (ver createExpense), así que tampoco debe
        // contarse como "un gasto" ni en su mes de creación ni en ningún otro —
        // eso es trabajo exclusivo de la copia real que genera cada ciclo el
        // cron o markSubscriptionPaid.
        const plantillaAnual = {
            isProjected: false, isRecurring: true, recurrenceType: 'ANNUAL',
            createdAt: enAbril(1), amount: 240,
        };
        const plantillaMensual = {
            isProjected: false, isRecurring: true, recurrenceType: 'MONTHLY',
            createdAt: enAbril(1), amount: 15,
        };
        expect(gastosVisiblesEnElMes([plantillaAnual, plantillaMensual], MES, AÑO)).toEqual([]);
        expect(gastosVisiblesEnElMes([plantillaAnual, plantillaMensual], MES + 1, AÑO)).toEqual([]);
    });

    it('la copia real de una suscripción (isRecurring: false) sí se muestra en su mes', () => {
        // Lo que genera processRecurringExpenses o markSubscriptionPaid cada
        // ciclo: misma forma que un gasto normal, solo que nace de una
        // plantilla recurrente.
        const copiaDelCiclo = {
            isProjected: false, isRecurring: false, recurrenceType: null,
            createdAt: enAbril(13), amount: 15,
        };
        expect(gastosVisiblesEnElMes([copiaDelCiclo], MES, AÑO)).toContain(copiaDelCiclo);
    });

    it('nunca muestra un pago de deuda real (isDebtSettlement), sea del mes que sea', () => {
        // esPagoDeDeuda se comprueba antes que isProjected: ya se refleja en el
        // saldo de la tarjeta o del préstamo, contarlo aquí también duplicaría.
        const pago = {
            isProjected: true, createdAt: enAbril(5), amount: 300,
            categoryId: 1, category: 'Pagos Tarjeta', isDebtSettlement: true,
        };
        expect(gastosVisiblesEnElMes([pago], MES, AÑO)).not.toContain(pago);
    });

    it('SÍ muestra un gasto personal aunque su categoría se llame igual que la de pagos de deuda', () => {
        // El bug real que esto corrige: un usuario con su propia categoría
        // "Pagos Tarjeta"/"Deudas" para gastos personales no debe perder ese
        // gasto de Gastos — solo isDebtSettlement (que pone únicamente
        // payLoan/pagar-tarjeta) decide, nunca el nombre de la categoría.
        const gastoPersonal = {
            isProjected: false, createdAt: enAbril(17), amount: 28,
            categoryId: 1, category: 'Deudas',
        };
        expect(gastosVisiblesEnElMes([gastoPersonal], MES, AÑO)).toContain(gastoPersonal);
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
