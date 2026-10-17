import { esPagoDeDeuda, type GastoConCategoria } from './expense-category';
import { businessMonthKey } from './dates';

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
 * Compara en la timezone de negocio (Panamá) vía `businessMonthKey`, no en
 * UTC crudo ni en la timezone local del proceso que ejecuta el código —
 * comparar en UTC corre el día (y a veces el mes) hacia atrás para cualquier
 * fecha cerca de medianoche en una timezone al oeste de Greenwich.
 */
function estaEnElMes(fecha: Date | string, month0: number, year: number): boolean {
    if (!fecha) return false;
    const objetivo = `${year}-${String(month0 + 1).padStart(2, '0')}`;
    return businessMonthKey(fecha) === objetivo;
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
 * **La plantilla de una suscripción/gasto recurrente (`isRecurring: true`)
 * nunca aparece aquí, en ningún mes.** Es solo una definición ("esto se cobra
 * tal día de cada ciclo"), no mueve dinero al crearse (ver `createExpense` en
 * `app/actions/budget/expenses.ts`) y por eso tampoco es, por sí misma, un
 * gasto real. Lo que sí es una transacción real es la copia que genera cada
 * ciclo el cron `processRecurringExpenses` (débito automático) o
 * `markSubscriptionPaid` (pago manual) — esas llegan con `isRecurring: false`
 * y sí se ven, en su propio mes de creación. (Antes un anual recurrente se
 * mostraba igual cada año en su mes de cobro aunque no hubiera ningún cobro
 * real ese año, y cualquier recurrente se mostraba también en su mes de
 * creación — ambos casos duplicaban con la copia real cuando esta sí
 * llegaba a generarse.)
 */
export function gastosVisiblesEnElMes<T extends GastoDelDashboard>(
    gastos: T[],
    month0: number,
    year: number,
): T[] {
    return gastos.filter((gasto) => {
        if (esPagoDeDeuda(gasto)) return false;
        if (gasto.isProjected) return true;
        if (gasto.isRecurring) return false;
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
