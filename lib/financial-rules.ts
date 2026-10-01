import { nombreCategoria, type GastoConCategoria } from './expense-category';
import { businessToday, businessMonthKey } from './dates';

/**
 * El gasto fijo mensual (regla 50/30/20 y Fondo de Emergencia en
 * FinancialRules.tsx) colapsaba a casi $0 los primeros días de cada mes:
 * se calculaba solo con lo ya registrado ESE mes, y una suscripción mensual
 * (Internet, Claude, etc.) no genera una copia real hasta su día de cobro —
 * el cron `processRecurringExpenses` la crea, no esta vista. Antes de ese
 * día, el gasto fijo real existía pero no había ninguna fila que lo
 * representara.
 *
 * La corrección: recibir también las plantillas recurrentes SIN filtrar por
 * mes (`recurringExpenses`, ver BudgetsTab.tsx) y sumar las que aún no se
 * cobraron este ciclo como un estimado de lo que falta por cobrar.
 */

export interface GastoDeRegla extends GastoConCategoria {
    name?: string;
    amount: number | string;
    categoryRel?: { name?: string | null; type?: string | null } | null;
    isRecurring?: boolean | null;
    recurrenceType?: string | null;
    lastPaidAt?: Date | string | null;
}

export type TipoDeGasto = 'FIXED' | 'VARIABLE' | 'LUXURY' | 'SAVING';

const PALABRAS_FIJO = ['alquiler', 'arriendo', 'servicio', 'servicios', 'internet', 'teléfono', 'teléfono celular', 'seguro', 'educación', 'colegio', 'matrícula', 'hipoteca', 'préstamo', 'loan'];
const PALABRAS_AHORRO = ['ahorro', 'inversión', 'inversion', 'fondo', 'meta'];

/** FIXED/VARIABLE/LUXURY/SAVING de un gasto: la relación manda; si no hay, se adivina por nombre. */
export function tipoDeGasto(gasto: GastoDeRegla): TipoDeGasto {
    if (gasto.categoryRel?.type) return gasto.categoryRel.type as TipoDeGasto;
    const texto = `${nombreCategoria(gasto)} ${gasto.name || ''}`.toLowerCase();
    if (PALABRAS_FIJO.some(k => texto.includes(k))) return 'FIXED';
    if (PALABRAS_AHORRO.some(k => texto.includes(k))) return 'SAVING';
    return 'VARIABLE';
}

/** ¿Ya se cobró esta suscripción en el ciclo (mes de negocio) de `hoy`? */
export function yaSeCobroEsteMes(gasto: GastoDeRegla, hoy: Date): boolean {
    if (!gasto.lastPaidAt) return false;
    return businessMonthKey(gasto.lastPaidAt) === businessMonthKey(hoy);
}

/**
 * Una suscripción trimestral/semestral/anual no es un gasto fijo mensual por
 * su monto completo — se prorratea a su equivalente mensual.
 */
export function montoMensualEquivalente(gasto: GastoDeRegla): number {
    const monto = Number(gasto.amount);
    switch (gasto.recurrenceType) {
        case 'ANNUAL': return monto / 12;
        case 'SEMIANNUAL': return monto / 6;
        case 'QUARTERLY': return monto / 3;
        default: return monto;
    }
}

/**
 * Gasto fijo (`needs`) y variable (`wants`) del mes, incluyendo las
 * suscripciones pendientes de cobrar este ciclo (prorrateadas si no son
 * mensuales) y sin duplicar las que el cron ya cobró (esas ya están en
 * `expensesDelMes` como la copia real que genera `processRecurringExpenses`).
 */
export function gastoFijoYVariableDelMes(
    expensesDelMes: GastoDeRegla[],
    recurringExpenses: GastoDeRegla[],
    hoy: Date = businessToday(),
): { needs: number; wants: number } {
    const pendientes = recurringExpenses.filter(g => !yaSeCobroEsteMes(g, hoy));

    const sumar = (gastos: GastoDeRegla[], monto: (g: GastoDeRegla) => number) =>
        gastos.reduce((suma, g) => suma + monto(g), 0);

    // `expensesDelMes` excluye las plantillas recurrentes (`isRecurring`): ya
    // están cubiertas por `pendientes`, y contarlas también aquí las
    // duplicaría en su mes de creación (donde sí aparecen en la vista
    // mensual — ver gastosVisiblesEnElMes en lib/dashboard-expenses.ts).
    const needs = sumar(expensesDelMes.filter(g => tipoDeGasto(g) === 'FIXED' && !g.isRecurring), g => Number(g.amount))
        + sumar(pendientes.filter(g => tipoDeGasto(g) === 'FIXED'), montoMensualEquivalente);

    const wants = sumar(expensesDelMes.filter(g => ['VARIABLE', 'LUXURY'].includes(tipoDeGasto(g)) && !g.isRecurring), g => Number(g.amount))
        + sumar(pendientes.filter(g => ['VARIABLE', 'LUXURY'].includes(tipoDeGasto(g))), montoMensualEquivalente);

    return { needs, wants };
}
