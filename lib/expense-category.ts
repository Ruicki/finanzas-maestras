/**
 * La categoría de un gasto, en un solo sitio.
 *
 * `Expense` la guarda dos veces: `categoryId` —la relación, que es la verdad— y
 * `category` —texto—. El texto quedó de cuando no había relación, y sigue ahí
 * porque hay gastos viejos que solo tienen eso y porque borrar una categoría
 * deja `categoryId` en null sin perder el nombre de lo que fue.
 *
 * El problema de tener las dos es que se separan: renombrar una categoría no
 * tocaba el texto de los gastos ya escritos, así que el mismo gasto decía una
 * cosa por la relación y otra por la columna, y cada pantalla creía a una u
 * otra. Ahora el servidor escribe `category` a partir de `categoryId` y lo
 * mantiene al renombrar, pero el orden de preferencia importa igual: **la
 * relación primero, el texto solo como respaldo**.
 *
 * No leas `expense.category` directamente en una pantalla nueva: usa esto.
 */

export interface GastoConCategoria {
    category?: string | null;
    categoryId?: number | null;
    categoryRel?: { name?: string | null } | null;
    isDebtSettlement?: boolean | null;
}

export const SIN_CATEGORIA = 'Sin categoría';

/** El nombre que hay que enseñar para este gasto. */
export function nombreCategoria(gasto: GastoConCategoria): string {
    const nombre = gasto.categoryRel?.name ?? gasto.category;
    return nombre?.trim() ? nombre : SIN_CATEGORIA;
}

/** ¿Este gasto pertenece a la categoría dada? */
export function esDeCategoria(
    gasto: GastoConCategoria,
    categoria: { id: number; name: string },
): boolean {
    // Con relación, manda la relación: si además comparásemos el texto, un gasto
    // cuyo nombre viejo coincida con el de otra categoría se contaría en los dos
    // presupuestos a la vez.
    if (gasto.categoryId != null) return gasto.categoryId === categoria.id;
    return nombreCategoria(gasto) === categoria.name;
}

/**
 * ¿Es un pago de deuda o de tarjeta que generó la propia app (payLoan /
 * pagar tarjeta), y que por eso no debe contar como gasto del mes?
 *
 * Esos gastos ya se reflejan en el saldo de la tarjeta o del préstamo, así que
 * contarlos otra vez como gasto del mes duplicaría el dinero.
 *
 * Antes se identificaban por el NOMBRE de la categoría ("Deudas"/"Pagos
 * Tarjeta"), find-or-create por texto exacto en payLoan/pagar-tarjeta. Si el
 * usuario ya tenía su propia categoría con ese mismo nombre para gastos
 * personales (ej. "le debo a un amigo"), la app la reutilizaba sin avisar —
 * y esos gastos personales desaparecían de Gastos y del total del mes como
 * si fueran el pago automático de una deuda. `isDebtSettlement` lo pone
 * únicamente el código que genera el pago real; el nombre de la categoría ya
 * no decide nada aquí.
 */
export function esPagoDeDeuda(gasto: GastoConCategoria): boolean {
    return gasto.isDebtSettlement === true;
}
