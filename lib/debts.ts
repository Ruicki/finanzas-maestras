import { calculateLoanPayoffDate, calculateMinimumPayment } from '@/lib/financial-engine';

/**
 * Las cuentas de la pestaña de Deudas, separadas de su pintura.
 *
 * Estaban dentro del componente, mezcladas con 400 líneas de JSX, y son
 * justamente la parte que conviene poder comprobar: de aquí sale la fecha que
 * la app le enseña a alguien como "el día que sales de deudas".
 */

export interface PrestamoParaCalculo {
    type: string;
    currentBalance: number | string;
    interestRate: number | string | null;
    monthlyPayment: number | string | null;
}

export interface TarjetaParaCalculo {
    balance: number | string;
    interestRate: number | string | null;
    insuranceRate?: number | string | null;
    minPaymentPercentage?: number | string | null;
    itbmsRate?: number | string | null;
    minPaymentFloor?: number | string | null;
}

/**
 * ¿Es un préstamo de banco o de un conocido?
 *
 * El campo `type` no se usaba para nada en la interfaz —siempre valía
 * 'PERSONAL'—, así que se reutiliza como el discriminador real BANK/FRIEND.
 * Para los préstamos creados antes de ese cambio se cae a la heurística
 * anterior, interés > 0, para no reclasificar deuda que ya estaba registrada.
 */
export function esPrestamoBancario(prestamo: { type: string; interestRate: number | string | null }): boolean {
    if (prestamo.type === 'FRIEND') return false;
    if (prestamo.type === 'BANK') return true;
    return Number(prestamo.interestRate) > 0;
}

/**
 * La fecha en la que se termina de pagar lo último que queda.
 *
 * Mira préstamos **y** tarjetas. Antes solo miraba préstamos, así que alguien
 * sin préstamos pero con deuda real en tarjetas veía el mes actual como fecha
 * de libertad mientras la deuda total decía lo contrario.
 *
 * Cuidado con `ahora`: gobierna el caso sin deuda y el punto de partida, pero
 * **no** las fechas de cada deuda. Esas las calcula `calculateLoanPayoffDate`,
 * que se ancla al reloj real por dentro, así que dos llamadas seguidas difieren
 * en milisegundos y el resultado no es reproducible al milisegundo.
 */
export function calcularFechaDeLibertad(
    prestamos: PrestamoParaCalculo[],
    tarjetas: TarjetaParaCalculo[],
    ahora: Date = new Date(),
): Date {
    const deudaTotal =
        prestamos.reduce((acc, p) => acc + Number(p.currentBalance), 0) +
        tarjetas.reduce((acc, t) => acc + Number(t.balance), 0);

    if (deudaTotal === 0) return ahora;

    let maxima = ahora;

    for (const prestamo of prestamos) {
        const fecha = calculateLoanPayoffDate(
            Number(prestamo.currentBalance),
            Number(prestamo.interestRate) || 0,
            Number(prestamo.monthlyPayment) || 0,
        );
        if (fecha && fecha > maxima) maxima = fecha;
    }

    for (const tarjeta of tarjetas) {
        const saldo = Number(tarjeta.balance);
        if (saldo <= 0) continue;

        const tasaMensual = Number(tarjeta.interestRate) || 0;
        const cuota = calculateMinimumPayment(
            saldo,
            tasaMensual,
            Number(tarjeta.insuranceRate) || 0,
            Number(tarjeta.minPaymentPercentage) || 3.0,
            Number(tarjeta.itbmsRate) || 0.07,
            Number(tarjeta.minPaymentFloor) || 0,
        );
        // calculateLoanPayoffDate espera una tasa ANUAL; la de la tarjeta es
        // mensual. Sin el x12 la fecha sale demasiado optimista.
        const fecha = calculateLoanPayoffDate(saldo, tasaMensual * 12, cuota);
        if (fecha && fecha > maxima) maxima = fecha;
    }

    return maxima;
}

/** Lo que se debe en total, entre tarjetas y préstamos. */
export function calcularDeudaTotal(
    prestamos: { currentBalance: number | string }[],
    tarjetas: { balance: number | string }[],
): { tarjetas: number; prestamos: number; total: number } {
    const deudaTarjetas = tarjetas.reduce((acc, t) => acc + Number(t.balance), 0);
    const deudaPrestamos = prestamos.reduce((acc, p) => acc + Number(p.currentBalance), 0);
    return {
        tarjetas: deudaTarjetas,
        prestamos: deudaPrestamos,
        total: deudaTarjetas + deudaPrestamos,
    };
}

/**
 * La cuenta de la que conviene pagar por defecto.
 *
 * Ni de ahorro ni bloqueada: antes se tomaba `accounts[0]` a ciegas, con lo que
 * un abono rapido podia vaciar una cuenta de ahorro bloqueada solo por ser la
 * primera de la lista. Si no hay ninguna que cumpla, devuelve la primera, para
 * que el aviso de "necesitas una cuenta" siga siendo el unico caso sin salida.
 */
export function cuentaPreferidaParaPagar<T extends { purpose?: string | null; lockDate?: Date | string | null }>(
    cuentas: T[],
    ahora: Date = new Date(),
): T | undefined {
    return (
        cuentas.find(
            (c) => c.purpose !== 'SAVINGS' && (!c.lockDate || new Date(c.lockDate) <= ahora),
        ) ?? cuentas[0]
    );
}

/**
 * Cuánto sugerir en el botón de "abono rápido" de un préstamo personal.
 *
 * Antes era un monto fijo de $20 para cualquier préstamo: insignificante en
 * uno grande, y en uno casi liquidado podía **superar el saldo pendiente** —
 * `payLoan` rechaza un pago mayor a la deuda, así que el botón simplemente
 * dejaba de funcionar en la recta final, justo cuando más se usa.
 *
 * Ahora es al menos el 5% del saldo pendiente. Y si con eso quedaría un
 * remanente tan chico que nadie va a molestarse en abonar aparte, sugiere
 * liquidar el saldo completo de una vez en vez de dejar una migaja.
 *
 * Nunca devuelve más que `saldoActual`, pase lo que pase: es justo la
 * garantía que faltaba.
 */
export function montoDeAbonoRapido(
    saldoActual: number,
    opciones: { porcentaje?: number; pisoMinimo?: number; remanenteMinimo?: number } = {},
): number {
    const { porcentaje = 0.05, pisoMinimo = 5, remanenteMinimo = 10 } = opciones;
    if (saldoActual <= 0) return 0;

    const aMoneda = (n: number) => Math.round(n * 100) / 100;

    const candidato = Math.max(saldoActual * porcentaje, Math.min(pisoMinimo, saldoActual));
    const dejariaUnaMigaja = saldoActual - candidato < remanenteMinimo;
    const monto = dejariaUnaMigaja ? saldoActual : candidato;

    return Math.min(aMoneda(monto), aMoneda(saldoActual));
}
