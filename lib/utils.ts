import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

export const formatCurrency = formatMoney;

/**
 * Parsea un string de fecha tipo "2026-07-21" y retorna un Date a las 12:00 UTC
 * para evitar que el timezone local (ej. UTC-5) lo convierta en el día anterior.
 */
export function parseDateNoon(dateStr: string): Date {
    return new Date(dateStr + 'T12:00:00Z');
}
