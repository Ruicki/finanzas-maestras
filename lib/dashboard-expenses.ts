import { esPagoDeDeuda, type GastoConCategoria } from './expense-category';

/**
 * Qué gastos aparecen en el encabezado y en la pestaña de Gastos, y cuánto
 * suman.
 *
 * Vivía inline dentro de `BudgetDashboard.tsx`, y de ahí salió el bug que
 * motiva este archivo: una proyección con fecha de otro mes se filtraba junto
 * con los gastos reales, así que desaparecía de la vista justo después de
 * crearla —sin fila no hay botón de confirmar ni de eliminar—. Y por el otro
 * lado, el total "Gastos" del encabezado sí las contaba, cuando el resto de
 * la app (Presupuesto, Insights, exportación) las excluye a propósito.
 */

export interface GastoDelDashboard extends GastoConCategoria {
    isProjected?: boolean | null;
    isRecurring?: boolean | null;
    recurrenceType?: string | null;
    createdAt: Date | string;
    amount: number | string;
}

/**
 * ¿Esta fecha cae en el mes dado?
 *
 * Compara el ISO en UTC, que es como se guardan las fechas (mediodía UTC), en
 * vez de dejar que `Date` reinterprete la zona horaria del navegador.
 */
function estaEnElMes(fecha: Date | string, month0: number, year: number): boolean {
    if (!fecha) return false;
    const iso = typeof fecha === 'string' ? fecha : fecha.toISOString();
    const objetivo = `${year}-${String(month0 + 1).padStart(2, '0')}`;
    return iso.startsWith(objetivo);
}

/**
 * Los gastos que se ven en un mes: en la pestaña de Gastos, y de ahí sale el
 * KPI del encabezado.
 *
 * **Las proyecciones se ven siempre, sin importar el mes seleccionado.**
 * Crear una proyección casi siempre significa ponerle fecha futura —"la renta
 * del mes que viene"—, y filtrarla por el mes actual la sacaba de la vista
 * justo después de crearla: sin fila, no había ni botón de confirmar ni de
 * eliminar. Para quien la creó, se sentía como que el gasto simplemente
 * desaparecía.
 *
 * Los anuales recurrentes solo aparecen en su mes de cobro (el de su
 * creación, cada año); el resto de los gastos reales, solo en su mes de
 * creación —el cron `processRecurringExpenses` es quien crea la copia real en
 * cada mes posterior de un recurrente mensual, no esta vista.
 */
export function gastosVisiblesEnElMes<T extends GastoDelDashboard>(
    gastos: T[],
    month0: number,
    year: number,
): T[] {
    return gastos.filter((gasto) => {
        if (esPagoDeDeuda(gasto)) return false;
        if (gasto.isProjected) return true;
        if (gasto.isRecurring && gasto.recurrenceType === 'ANNUAL') {
            const creado = new Date(gasto.createdAt);
            return creado.getMonth() === month0;
        }
        return estaEnElMes(gasto.createdAt, month0, year);
    });
}

/**
 * Lo gastado de verdad este mes, sin proyecciones.
 *
 * Mismo criterio que ya aplican `lib/budgets.ts`, `InsightsTab` y la
 * exportación: contar una proyección haría creer que salió dinero de una
 * cuenta que en realidad sigue intacta. Este KPI —el del encabezado
 * principal— era el único sitio de la app que no lo aplicaba, y al dejar de
 * filtrar las proyecciones por mes (para que se puedan ver y tocar) el fallo
 * habría empeorado: pasaría a sumar proyecciones de todos los meses.
 *
 * Recibe la lista ya filtrada por `gastosVisiblesEnElMes`, no
 * `profile.expenses` directo.
 */
export function totalGastadoDelMes(gastosVisibles: GastoDelDashboard[]): number {
    return gastosVisibles
        .filter((gasto) => !gasto.isProjected)
        .reduce((suma, gasto) => suma + Number(gasto.amount), 0);
}
