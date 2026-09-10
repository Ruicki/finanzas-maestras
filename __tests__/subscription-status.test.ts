import { getMostRecentDueDate, getSubscriptionStatus } from '../lib/subscription-status';

describe('getMostRecentDueDate', () => {
    it('returns this month\'s due date when today is on or after it', () => {
        const today = new Date(2026, 1, 25); // 25 feb 2026
        expect(getMostRecentDueDate(22, today)).toEqual(new Date(2026, 1, 22));
    });

    it('returns last month\'s due date when today is before it', () => {
        const today = new Date(2026, 1, 5); // 5 feb 2026
        expect(getMostRecentDueDate(22, today)).toEqual(new Date(2026, 0, 22));
    });

    it('clamps dueDay to the last day of a short month (31 in february)', () => {
        const today = new Date(2026, 1, 28); // 28 feb 2026 (no bisiesto)
        expect(getMostRecentDueDate(31, today)).toEqual(new Date(2026, 1, 28));
    });
});

describe('getSubscriptionStatus', () => {
    it('sin graceDays: pendiente antes del dia de cobro, vencido justo despues (Netflix / debito directo)', () => {
        const dueDay = 15;
        expect(getSubscriptionStatus(dueDay, null, null, new Date(2026, 2, 15))).toBe('PENDING');
        expect(getSubscriptionStatus(dueDay, null, null, new Date(2026, 2, 16))).toBe('OVERDUE');
    });

    it('con graceDays: sigue pendiente durante la prorroga, aunque haya pasado el dia de cobro', () => {
        // Factura emitida el 22, 16 dias de gracia -> limite ~9 del mes siguiente (marzo tiene 31 dias)
        const status = getSubscriptionStatus(22, 16, null, new Date(2026, 2, 5)); // 5 marzo, cobro fue 22 feb
        expect(status).toBe('PENDING');
    });

    it('con graceDays: se marca vencido despues de que pasa la prorroga', () => {
        const status = getSubscriptionStatus(22, 16, null, new Date(2026, 2, 11)); // 22 feb + 16d = 10 marzo
        expect(status).toBe('OVERDUE');
    });

    it('marcado pagado para el ciclo actual -> PAID sin importar graceDays', () => {
        const lastPaidAt = new Date(2026, 1, 23); // pagado un dia despues del cobro del 22 feb
        expect(getSubscriptionStatus(22, 16, lastPaidAt, new Date(2026, 2, 5))).toBe('PAID');
    });

    it('pago viejo (de un ciclo anterior) no cuenta como pagado para el ciclo actual', () => {
        const lastPaidAt = new Date(2026, 0, 23); // pagado en enero
        expect(getSubscriptionStatus(22, 16, lastPaidAt, new Date(2026, 2, 5))).toBe('PENDING'); // el de feb aun no vence (dentro de gracia)
        expect(getSubscriptionStatus(22, 0, lastPaidAt, new Date(2026, 1, 23))).toBe('OVERDUE'); // el de feb, sin gracia, ya vencio
    });
});
