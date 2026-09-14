/**
 * Las cuentas de los presupuestos por categoría.
 *
 * Estaban escritas **dos veces** dentro de la pestaña: una en el resumen de
 * arriba y otra, a mano, dentro del bucle que pinta cada tarjeta. Dos copias de
 * la misma regla es como se acaba con un total que no cuadra con la suma de las
 * tarjetas que tiene debajo, sin que nadie sepa cuál de las dos miente.
 */

export interface PresupuestoDelMes {
    year: number;
    month: number; // 1-12
    limit: number | string;
}

export interface CategoriaPresupuestable {
    id: number;
    monthlyLimit?: number | string | null;
    isRollover?: boolean | null;
    budgets?: PresupuestoDelMes[] | null;
}

export interface GastoDelPeriodo {
    categoryId?: number | null;
    isProjected?: boolean | null;
    amount: number | string;
    createdAt: Date | string;
}

/**
 * El límite de una categoría para un mes concreto.
 *
 * Si ese mes tiene presupuesto propio, manda ese; si no, se usa el límite
 * general de la categoría.
 */
export function limiteDelMes(
    categoria: CategoriaPresupuestable,
    year: number,
    month1: number,
): number {
    const delMes = categoria.budgets?.find((b) => b.year === year && b.month === month1);
    return delMes ? Number(delMes.limit) : Number(categoria.monthlyLimit) || 0;
}

/** El mes anterior a uno dado, con el año corregido si cruza enero. */
export function mesAnterior(month0: number, year: number): { month0: number; year: number } {
    return month0 === 0 ? { month0: 11, year: year - 1 } : { month0: month0 - 1, year };
}

function gastadoEn(
    gastos: GastoDelPeriodo[],
    categoriaId: number,
    month0: number,
    year: number,
): number {
    return gastos
        .filter((g) => {
            // Los proyectados son un plan, no dinero que haya salido: contarlos
            // haría creer que el presupuesto está más gastado de lo que está.
            if (g.categoryId !== categoriaId || g.isProjected) return false;
            const fecha = new Date(g.createdAt);
            return fecha.getMonth() === month0 && fecha.getFullYear() === year;
        })
        .reduce((suma, g) => suma + Number(g.amount), 0);
}

/**
 * Lo que sobró del mes pasado y se arrastra a este.
 *
 * Solo para las categorías con el arrastre activado: antes se sumaba el
 * sobrante a **todas**, tuviera el usuario la opción puesta o no.
 */
export function sobranteDelMesAnterior(
    categoria: CategoriaPresupuestable,
    gastos: GastoDelPeriodo[],
    month0: number,
    year: number,
): number {
    if (!categoria.isRollover) return 0;

    const anterior = mesAnterior(month0, year);
    const limitePrevio = limiteDelMes(categoria, anterior.year, anterior.month0 + 1);
    if (limitePrevio <= 0) return 0;

    const gastadoPrevio = gastadoEn(gastos, categoria.id, anterior.month0, anterior.year);
    return Math.max(0, limitePrevio - gastadoPrevio);
}

export interface EstadoCategoria<T extends CategoriaPresupuestable> {
    categoria: T;
    /** Gastado este mes, sin contar lo proyectado. */
    gastado: number;
    /** Lo que se arrastra del mes pasado. */
    arrastre: number;
    /** Límite del mes más el arrastre: contra esto se compara lo gastado. */
    efectivo: number;
}

/** El estado de cada categoría este mes, con la misma regla para todas. */
export function estadoDeCategorias<T extends CategoriaPresupuestable>(
    categorias: T[],
    gastosDelMes: GastoDelPeriodo[],
    gastosDeTodoElHistorial: GastoDelPeriodo[],
    month0: number,
    year: number,
): EstadoCategoria<T>[] {
    return categorias.map((categoria) => {
        const gastado = gastadoEn(gastosDelMes, categoria.id, month0, year);
        const arrastre = sobranteDelMesAnterior(categoria, gastosDeTodoElHistorial, month0, year);
        const limite = limiteDelMes(categoria, year, month0 + 1);
        return { categoria, gastado, arrastre, efectivo: limite + arrastre };
    });
}

/** Los cuatro números de la fila de resumen. */
export function resumenDePresupuesto<T extends CategoriaPresupuestable>(
    estados: EstadoCategoria<T>[],
): { gastado: number; asignado: number; arrastre: number; excedidas: number } {
    return {
        gastado: estados.reduce((s, e) => s + e.gastado, 0),
        asignado: estados.reduce((s, e) => s + e.efectivo, 0),
        arrastre: estados.reduce((s, e) => s + e.arrastre, 0),
        // Sin límite no se puede exceder nada: una categoría en 0 no es una alerta.
        excedidas: estados.filter((e) => e.efectivo > 0 && e.gastado > e.efectivo).length,
    };
}

/** Lo que cuestan al año las suscripciones, con las anuales sin multiplicar. */
export function costeAnualDeSuscripciones(
    suscripciones: { amount: number | string; recurrenceType?: string | null }[],
): number {
    return suscripciones.reduce((suma, s) => {
        const importe = Number(s.amount);
        return suma + (s.recurrenceType === 'ANNUAL' ? importe : importe * 12);
    }, 0);
}
