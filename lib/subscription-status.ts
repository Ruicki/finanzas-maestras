/**
 * Estado de pago de una suscripcion/gasto recurrente, considerando la fecha de
 * cobro (dueDate) y una prorroga opcional (graceDays) antes de considerarse
 * vencido. Ej: factura de datos emitida el dia 22 con 16 dias de gracia -> se
 * puede pagar hasta el 7-8 del mes siguiente sin considerarse atrasada.
 *
 * Suscripciones sin graceDays (ej. Netflix, debito directo) se comportan como
 * antes: pendiente hasta el dia de cobro, vencido inmediatamente despues.
 */
export type SubscriptionStatus = 'PAID' | 'PENDING' | 'OVERDUE';

function atMidnight(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Calcula la ocurrencia del dia de cobro (dueDay) mas reciente que ya paso
 * (o es hoy), recortando al ultimo dia del mes si dueDay no existe en el mes
 * (ej. 31 en febrero -> 28/29).
 */
export function getMostRecentDueDate(dueDay: number, today: Date = new Date()): Date {
    const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const effectiveDayThisMonth = Math.min(dueDay, daysInCurrentMonth);

    if (today.getDate() >= effectiveDayThisMonth) {
        return new Date(today.getFullYear(), today.getMonth(), effectiveDayThisMonth);
    }

    const prevMonthAnchor = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const daysInPrevMonth = new Date(prevMonthAnchor.getFullYear(), prevMonthAnchor.getMonth() + 1, 0).getDate();
    const effectiveDayPrevMonth = Math.min(dueDay, daysInPrevMonth);
    return new Date(prevMonthAnchor.getFullYear(), prevMonthAnchor.getMonth(), effectiveDayPrevMonth);
}

export function getSubscriptionStatus(
    dueDay: number,
    graceDays: number | null | undefined,
    lastPaidAt: Date | string | null | undefined,
    today: Date = new Date(),
): SubscriptionStatus {
    const lastDue = getMostRecentDueDate(dueDay, today);

    if (lastPaidAt) {
        const paidDate = new Date(lastPaidAt);
        if (paidDate.getTime() >= lastDue.getTime()) return 'PAID';
    }

    const deadline = new Date(lastDue);
    deadline.setDate(deadline.getDate() + (graceDays || 0));

    return atMidnight(today).getTime() > deadline.getTime() ? 'OVERDUE' : 'PENDING';
}
