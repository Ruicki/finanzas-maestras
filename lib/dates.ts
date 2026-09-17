/**
 * Utilidades centrales de fechas. Toda la app opera en una sola timezone de
 * negocio (Panamá, UTC-5, sin horario de verano) sin importar dónde corra el
 * navegador del usuario o el servidor (Vercel corre en UTC).
 *
 * Regla: cualquier <input type="date"> (string "YYYY-MM-DD") se parsea/formatea
 * con las funciones de aquí, nunca con `new Date(str)` ni `.toISOString()`
 * directo — eso interpreta el string como medianoche UTC y corre el día hacia
 * atrás para cualquier usuario al oeste de Greenwich.
 */

export const BUSINESS_TIMEZONE = 'America/Panama';

/**
 * Parsea un string "YYYY-MM-DD" (de un <input type="date">) a un Date anclado
 * al mediodía UTC. El mediodía evita que CUALQUIER timezone razonable (server
 * o browser) lo convierta al día anterior o siguiente al leerlo de vuelta.
 */
export function parseDateOnly(dateStr: string): Date {
    return new Date(dateStr + 'T12:00:00Z');
}

/**
 * Inverso de parseDateOnly: para volver a rellenar un <input type="date">.
 * Usa la timezone de negocio explícitamente en vez de .toISOString() (UTC) o
 * el locale del navegador, así el día mostrado siempre es el que el usuario
 * eligió al guardar.
 */
export function formatDateOnly(date: Date | string | null | undefined): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIMEZONE }).format(d);
}

/**
 * "Hoy" como Date anclado a mediodía UTC del día calendario actual en la
 * timezone de negocio. Seguro de usar con getFullYear()/getMonth()/getDate()
 * en cualquier entorno (server en UTC, dev machine en cualquier TZ): todos
 * verán el mismo día calendario de Panamá.
 */
export function businessToday(): Date {
    return parseDateOnly(formatDateOnly(new Date()));
}

/**
 * Clave "YYYY-MM" de una fecha, en la timezone de negocio. Úsalo para agrupar
 * transacciones por mes en vez de comparar con getMonth()/getFullYear() en la
 * timezone local del proceso que ejecuta el código.
 */
export function businessMonthKey(date: Date | string | null | undefined): string {
    if (!date) return '';
    return formatDateOnly(date).slice(0, 7);
}

/** Días que tiene un mes (0-11) de un año dado. */
export function daysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

/** Recorta un día-del-mes (1-31) al último día válido de ese year/month. */
export function clampDayToMonth(day: number, year: number, month: number): number {
    return Math.min(day, daysInMonth(year, month));
}

/**
 * Suma `months` meses a `date`, recortando el día al último día válido del
 * mes destino en vez de desbordarse al mes siguiente (el bug clásico de
 * `date.setMonth()`: 31 ene + 1 mes -> 3 mar en vez de 28/29 feb).
 */
export function addMonthsClamped(date: Date, months: number): Date {
    const targetMonthIndex = date.getMonth() + months;
    const targetYear = date.getFullYear() + Math.floor(targetMonthIndex / 12);
    const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
    const clampedDay = clampDayToMonth(date.getDate(), targetYear, targetMonth);

    const result = new Date(date);
    result.setFullYear(targetYear, targetMonth, clampedDay);
    return result;
}
