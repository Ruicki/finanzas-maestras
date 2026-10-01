import { tipoDeGasto, yaSeCobroEsteMes, montoMensualEquivalente, gastoFijoYVariableDelMes } from '../lib/financial-rules';

/**
 * El bug que motiva este archivo: el gasto fijo mensual (regla 50/30/20 y
 * Fondo de Emergencia) se calculaba solo con lo ya registrado ESE mes. Una
 * suscripción mensual (Internet, Claude, etc.) no genera una copia real
 * hasta su día de cobro —el cron la crea, no esta vista—, así que los
 * primeros días de cada mes el gasto fijo caía a casi $0 aunque la
 * suscripción siguiera activa y se fuera a cobrar igual.
 */

// Abril de 2026: mes 3 en base 0.
const HOY = new Date(Date.UTC(2026, 3, 5, 12)); // 5 de abril

describe('tipoDeGasto', () => {
    it('usa el type de la categoría cuando existe', () => {
        expect(tipoDeGasto({ amount: 10, categoryRel: { type: 'FIXED' } })).toBe('FIXED');
    });

    it('adivina FIXED por palabra clave si no hay categoría', () => {
        expect(tipoDeGasto({ amount: 10, name: 'Internet de casa' })).toBe('FIXED');
    });

    it('cae a VARIABLE por defecto', () => {
        expect(tipoDeGasto({ amount: 10, name: 'Cine' })).toBe('VARIABLE');
    });
});

describe('yaSeCobroEsteMes', () => {
    it('false sin lastPaidAt', () => {
        expect(yaSeCobroEsteMes({ amount: 10 }, HOY)).toBe(false);
    });

    it('true si lastPaidAt cae en el mismo mes de negocio', () => {
        const pagado = { amount: 10, lastPaidAt: new Date(Date.UTC(2026, 3, 1, 12)) };
        expect(yaSeCobroEsteMes(pagado, HOY)).toBe(true);
    });

    it('false si lastPaidAt es de un mes anterior', () => {
        const pagadoMarzo = { amount: 10, lastPaidAt: new Date(Date.UTC(2026, 2, 28, 12)) };
        expect(yaSeCobroEsteMes(pagadoMarzo, HOY)).toBe(false);
    });
});

describe('montoMensualEquivalente', () => {
    it('devuelve el monto completo para MONTHLY (o sin recurrenceType)', () => {
        expect(montoMensualEquivalente({ amount: 20 })).toBe(20);
        expect(montoMensualEquivalente({ amount: 20, recurrenceType: 'MONTHLY' })).toBe(20);
    });

    it('prorratea ANNUAL a /12', () => {
        expect(montoMensualEquivalente({ amount: 1200, recurrenceType: 'ANNUAL' })).toBe(100);
    });

    it('prorratea SEMIANNUAL a /6 y QUARTERLY a /3', () => {
        expect(montoMensualEquivalente({ amount: 600, recurrenceType: 'SEMIANNUAL' })).toBe(100);
        expect(montoMensualEquivalente({ amount: 300, recurrenceType: 'QUARTERLY' })).toBe(100);
    });
});

describe('gastoFijoYVariableDelMes', () => {
    it('cuenta una suscripción mensual pendiente de cobro como gasto fijo', () => {
        // El caso real reportado: "Claude" ($20/mes, FIXED) creada hace meses,
        // sin cobrar todavía este ciclo (el cron no ha llegado a su día).
        const claude = {
            amount: 20, isRecurring: true, recurrenceType: 'MONTHLY',
            categoryRel: { type: 'FIXED' }, lastPaidAt: null,
        };
        const { needs } = gastoFijoYVariableDelMes([], [claude], HOY);
        expect(needs).toBe(20);
    });

    it('no duplica una suscripción ya cobrada este ciclo', () => {
        // El cron ya generó la copia real (en expensesDelMes); la plantilla
        // recurrente no debe sumarse también, o se contaría dos veces.
        const internetPlantilla = {
            amount: 50, isRecurring: true, recurrenceType: 'MONTHLY',
            categoryRel: { type: 'FIXED' }, lastPaidAt: HOY,
        };
        const copiaReal = {
            amount: 50, isRecurring: false, categoryRel: { type: 'FIXED' },
        };
        const { needs } = gastoFijoYVariableDelMes([copiaReal], [internetPlantilla], HOY);
        expect(needs).toBe(50);
    });

    it('prorratea una suscripción anual pendiente', () => {
        const seguroAnual = {
            amount: 1200, isRecurring: true, recurrenceType: 'ANNUAL',
            categoryRel: { type: 'FIXED' }, lastPaidAt: null,
        };
        const { needs } = gastoFijoYVariableDelMes([], [seguroAnual], HOY);
        expect(needs).toBe(100);
    });

    it('separa fijo (needs) de variable (wants), y no cuenta SAVING', () => {
        const gastos = [
            { amount: 30, categoryRel: { type: 'FIXED' } },
            { amount: 25, categoryRel: { type: 'VARIABLE' } },
            { amount: 15, categoryRel: { type: 'LUXURY' } },
            { amount: 100, categoryRel: { type: 'SAVING' } },
        ];
        const { needs, wants } = gastoFijoYVariableDelMes(gastos, [], HOY);
        expect(needs).toBe(30);
        expect(wants).toBe(40);
    });

    it('da cero sin gastos ni suscripciones', () => {
        expect(gastoFijoYVariableDelMes([], [], HOY)).toEqual({ needs: 0, wants: 0 });
    });
});
