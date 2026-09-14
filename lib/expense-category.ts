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
 * Categorías que crea la app sola al pagar una tarjeta o un préstamo.
 *
 * Esos gastos ya se reflejan en el saldo de la tarjeta o del préstamo, así que
 * contarlos otra vez como gasto del mes duplicaría el dinero.
 *
 * Se identifican por nombre, que es frágil: si alguien renombra su categoría
 * "Deudas", estos movimientos vuelven a contar. Distinguirlas de verdad pide una
 * marca en `Category`, y eso es una migración (ver B7 en `.specs/tasks.md`).
 * Mientras tanto, al menos la regla vive en un sitio y no repartida en cuatro.
 */
export const CATEGORIAS_AUTOMATICAS = ['Deudas', 'Pagos Tarjeta'];

/** ¿Es un pago de deuda o de tarjeta, que no debe contar como gasto del mes? */
export function esPagoDeDeuda(gasto: GastoConCategoria): boolean {
    return CATEGORIAS_AUTOMATICAS.includes(nombreCategoria(gasto));
}
