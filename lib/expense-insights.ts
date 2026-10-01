import { businessMonthKey } from './dates';

/**
 * El "Desglose de Presupuestos" de Análisis repetía, categoría por
 * categoría, exactamente lo que ya muestra Presupuesto → Categorías
 * (gastado/límite/restante) — mismo cálculo, dos pantallas. Esto reemplaza
 * esa sección con algo que no existe en ningún otro lado: los gastos
 * individuales más altos del mes (no agrupados por categoría) y cómo se
 * compara el total del mes con los dos anteriores.
 */

export interface GastoParaInsights {
    name?: string;
    amount: number | string;
    createdAt: Date | string;
    isProjected?: boolean | null;
    categoryRel?: { name?: string | null; icon?: string | null; color?: string | null } | null;
}

/** Los `n` gastos reales (no proyectados) más altos de la lista dada, de mayor a menor. */
export function topGastosIndividuales<T extends GastoParaInsights>(gastosDelMes: T[], n: number = 8): T[] {
    return [...gastosDelMes]
        .filter(g => !g.isProjected)
        .sort((a, b) => Number(b.amount) - Number(a.amount))
        .slice(0, n);
}

export interface MesDeGasto {
    /** "YYYY-MM" — clave estable para el eje del gráfico. */
    clave: string;
    /** Nombre corto del mes para mostrar, ej. "Ene", "Feb". */
    etiqueta: string;
    total: number;
}

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * Total gastado (real, sin proyecciones) en cada uno de los últimos
 * `cantidadMeses` meses, terminando en `month0`/`year` (mes en curso
 * incluido). Recibe TODOS los gastos del perfil, sin filtrar por mes — la
 * tendencia necesita ver más allá del mes seleccionado.
 */
export function tendenciaDeGasto(
    todosLosGastos: GastoParaInsights[],
    month0: number,
    year: number,
    cantidadMeses: number = 3,
): MesDeGasto[] {
    const reales = todosLosGastos.filter(g => !g.isProjected);

    const meses: MesDeGasto[] = [];
    for (let i = cantidadMeses - 1; i >= 0; i--) {
        let m = month0 - i;
        let y = year;
        while (m < 0) { m += 12; y -= 1; }
        const clave = `${y}-${String(m + 1).padStart(2, '0')}`;
        const total = reales
            .filter(g => businessMonthKey(g.createdAt) === clave)
            .reduce((suma, g) => suma + Number(g.amount), 0);
        meses.push({ clave, etiqueta: MESES_CORTOS[m], total });
    }
    return meses;
}
