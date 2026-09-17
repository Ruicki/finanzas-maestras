import { parseDateOnly, formatDateOnly, businessMonthKey, clampDayToMonth, addMonthsClamped } from '../lib/dates';

describe('parseDateOnly / formatDateOnly (round trip de <input type="date">)', () => {
    it('un string YYYY-MM-DD siempre vuelve al mismo dia, sin importar la timezone de quien lo lea', () => {
        const d = parseDateOnly('2026-07-21');
        // Ancla a mediodia UTC: ni una timezone muy adelantada (UTC+12) ni muy
        // atrasada (UTC-11) lo corren de dia.
        expect(formatDateOnly(d)).toBe('2026-07-21');
        expect(d.toISOString()).toBe('2026-07-21T12:00:00.000Z');
    });

    it('formatDateOnly usa la timezone de negocio (Panama), no la del runtime ni UTC', () => {
        // 15 sept 2026, 11:30pm en Panama (UTC-5) = 16 sept 2026, 04:30am UTC.
        // Un .toISOString().split('T')[0] crudo (el bug original) devolveria "16".
        const lateNightInPanama = new Date('2026-09-16T04:30:00.000Z');
        expect(formatDateOnly(lateNightInPanama)).toBe('2026-09-15');
    });

    it('caso real: salario pagado ayer, registrado en la noche, no debe aparecer como "hoy"', () => {
        // Cindy paga el sueldo el dia 15. Si se registra esa misma noche
        // (23:30 hora Panama = 04:30 UTC del dia 16), el string por defecto del
        // formulario debe seguir siendo "2026-09-15", no "2026-09-16".
        const now = new Date('2026-09-16T04:30:00.000Z');
        const defaultFormValue = formatDateOnly(now);
        expect(defaultFormValue).toBe('2026-09-15');

        // Y si ella elige explicitamente "ayer" (15) en el <input type="date">,
        // el Date que se guarda debe corresponder al 15, no correrse al 14 ni al 16.
        const stored = parseDateOnly('2026-09-15');
        expect(formatDateOnly(stored)).toBe('2026-09-15');
    });
});

describe('businessMonthKey', () => {
    it('agrupa por mes segun la timezone de negocio, no UTC', () => {
        // 31 ene 11pm Panama = 1 feb 04:00 UTC. Debe seguir siendo enero.
        const lateJan = new Date('2026-02-01T04:00:00.000Z');
        expect(businessMonthKey(lateJan)).toBe('2026-01');
    });
});

describe('clampDayToMonth', () => {
    it('recorta dias que no existen en el mes destino (31 en un mes de 30, 29/30/31 en febrero)', () => {
        expect(clampDayToMonth(31, 2026, 3)).toBe(30); // abril (mes index 3) tiene 30 dias
        expect(clampDayToMonth(31, 2026, 1)).toBe(28); // febrero 2026 (no bisiesto)
        expect(clampDayToMonth(31, 2028, 1)).toBe(29); // febrero 2028 (bisiesto)
        expect(clampDayToMonth(15, 2026, 3)).toBe(15); // sin cambios si el dia existe
    });
});

describe('addMonthsClamped', () => {
    it('no se desborda al mes siguiente cuando el dia de origen no existe en el mes destino', () => {
        // 31 ene + 1 mes -> con setMonth crudo esto rueda a marzo. Debe quedar en el ultimo dia de febrero.
        const jan31 = new Date(2026, 0, 31);
        const result = addMonthsClamped(jan31, 1);
        expect(result.getFullYear()).toBe(2026);
        expect(result.getMonth()).toBe(1); // febrero
        expect(result.getDate()).toBe(28);
    });

    it('mantiene el mismo dia cuando si existe en el mes destino', () => {
        const jan15 = new Date(2026, 0, 15);
        const result = addMonthsClamped(jan15, 2);
        expect(result.getFullYear()).toBe(2026);
        expect(result.getMonth()).toBe(2); // marzo
        expect(result.getDate()).toBe(15);
    });

    it('cruza el limite de año correctamente', () => {
        const nov30 = new Date(2026, 10, 30);
        const result = addMonthsClamped(nov30, 3);
        expect(result.getFullYear()).toBe(2027);
        expect(result.getMonth()).toBe(1); // febrero 2027
        expect(result.getDate()).toBe(28);
    });
});
