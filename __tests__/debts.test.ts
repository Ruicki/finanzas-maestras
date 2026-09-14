import {
    esPrestamoBancario,
    calcularFechaDeLibertad,
    calcularDeudaTotal,
    cuentaPreferidaParaPagar,
} from '../lib/debts';
import { calculateLoanPayoffDate, calculateMinimumPayment } from '../lib/financial-engine';

const AHORA = new Date('2026-03-15T12:00:00Z');

/**
 * `calculateLoanPayoffDate` se ancla al reloj real por dentro, asi que dos
 * llamadas seguidas difieren en milisegundos. Comparar al milisegundo daria una
 * prueba que falla sola de vez en cuando; un segundo de margen es de sobra para
 * lo que aqui se comprueba, que son diferencias de meses.
 */
function mismaFecha(a: number, b: number) {
    expect(Math.abs(a - b)).toBeLessThan(1000);
}

describe('esPrestamoBancario', () => {
    it('cree al tipo cuando está declarado', () => {
        expect(esPrestamoBancario({ type: 'BANK', interestRate: 0 })).toBe(true);
        // Un préstamo de un amigo CON interés es de un amigo igual. Adivinarlo
        // por la tasa lo clasificaba mal y le enseñaba la tarjeta equivocada.
        expect(esPrestamoBancario({ type: 'FRIEND', interestRate: 12 })).toBe(false);
    });

    it('cae a la tasa para los préstamos anteriores al campo', () => {
        expect(esPrestamoBancario({ type: 'PERSONAL', interestRate: 9 })).toBe(true);
        expect(esPrestamoBancario({ type: 'PERSONAL', interestRate: 0 })).toBe(false);
        expect(esPrestamoBancario({ type: 'PERSONAL', interestRate: null })).toBe(false);
    });
});

describe('calcularDeudaTotal', () => {
    it('suma tarjetas y préstamos por separado y junto', () => {
        const r = calcularDeudaTotal(
            [{ currentBalance: 8000 }, { currentBalance: 1200 }],
            [{ balance: 300 }, { balance: 45.5 }],
        );
        expect(r.prestamos).toBe(9200);
        expect(r.tarjetas).toBe(345.5);
        expect(r.total).toBe(9545.5);
    });

    it('da cero sin deudas', () => {
        expect(calcularDeudaTotal([], []).total).toBe(0);
    });
});

describe('calcularFechaDeLibertad', () => {
    it('es hoy cuando no se debe nada', () => {
        expect(calcularFechaDeLibertad([], [], AHORA)).toBe(AHORA);
    });

    it('tiene en cuenta las tarjetas, no solo los préstamos', () => {
        // Este era el fallo: sin préstamos pero con deuda real en tarjeta, la
        // fecha salía "hoy" mientras la deuda total decía que no eras libre.
        const fecha = calcularFechaDeLibertad(
            [],
            [{ balance: 2000, interestRate: 2, minPaymentPercentage: 3 }],
            AHORA,
        );
        expect(fecha.getTime()).toBeGreaterThan(AHORA.getTime());
    });

    it('se queda con la deuda que más tarda', () => {
        const corta = calcularFechaDeLibertad(
            [{ type: 'BANK', currentBalance: 1000, interestRate: 5, monthlyPayment: 500 }],
            [],
            AHORA,
        );
        const conAmbas = calcularFechaDeLibertad(
            [
                { type: 'BANK', currentBalance: 1000, interestRate: 5, monthlyPayment: 500 },
                { type: 'BANK', currentBalance: 20000, interestRate: 8, monthlyPayment: 300 },
            ],
            [],
            AHORA,
        );
        expect(conAmbas.getTime()).toBeGreaterThan(corta.getTime());
    });

    it('ignora las tarjetas ya pagadas', () => {
        const soloPrestamo = calcularFechaDeLibertad(
            [{ type: 'BANK', currentBalance: 5000, interestRate: 6, monthlyPayment: 200 }],
            [],
            AHORA,
        );
        const conTarjetaEnCero = calcularFechaDeLibertad(
            [{ type: 'BANK', currentBalance: 5000, interestRate: 6, monthlyPayment: 200 }],
            [{ balance: 0, interestRate: 2 }],
            AHORA,
        );
        mismaFecha(conTarjetaEnCero.getTime(), soloPrestamo.getTime());
    });

    it('convierte a anual la tasa mensual de la tarjeta', () => {
        // Las tarjetas guardan la tasa MENSUAL y calculateLoanPayoffDate espera
        // ANUAL. Pasarla sin convertir da una fecha distinta, y es un error que
        // no se nota a ojo porque la fecha sigue pareciendo razonable.
        const tarjeta = { balance: 3000, interestRate: 2, minPaymentPercentage: 2 };
        const cuota = calculateMinimumPayment(3000, 2, 0, 2, 0.07, 0);

        const esperada = calculateLoanPayoffDate(3000, 2 * 12, cuota);
        const conMensualSinConvertir = calculateLoanPayoffDate(3000, 2, cuota);

        mismaFecha(calcularFechaDeLibertad([], [tarjeta], AHORA).getTime(), esperada!.getTime());
        // Y que las dos no coinciden por casualidad: si coincidieran, la prueba
        // no estaria comprobando nada.
        expect(esperada!.getTime()).not.toBe(conMensualSinConvertir!.getTime());
    });
});

describe('cuentaPreferidaParaPagar', () => {
    const bloqueada = { id: 1, purpose: 'SPENDING', lockDate: new Date('2027-01-01') };
    const ahorro = { id: 2, purpose: 'SAVINGS', lockDate: null };
    const normal = { id: 3, purpose: 'SPENDING', lockDate: null };

    it('salta las de ahorro y las bloqueadas', () => {
        // Antes se tomaba la primera de la lista a ciegas: un abono rápido podía
        // vaciar una cuenta de ahorro bloqueada solo por su posición.
        expect(cuentaPreferidaParaPagar([bloqueada, ahorro, normal], AHORA)?.id).toBe(3);
    });

    it('acepta una cuenta cuyo bloqueo ya venció', () => {
        const vencida = { id: 4, purpose: 'SPENDING', lockDate: new Date('2020-01-01') };
        expect(cuentaPreferidaParaPagar([vencida], AHORA)?.id).toBe(4);
    });

    it('devuelve la primera si ninguna cumple, para que el aviso lo dé la pantalla', () => {
        expect(cuentaPreferidaParaPagar([ahorro, bloqueada], AHORA)?.id).toBe(2);
    });

    it('no inventa una cuenta cuando no hay ninguna', () => {
        expect(cuentaPreferidaParaPagar([], AHORA)).toBeUndefined();
    });
});
