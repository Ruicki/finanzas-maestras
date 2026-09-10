import { Prisma } from '@prisma/client';

/**
 * Decimal de precision arbitraria para calculos monetarios. Evita el error de
 * punto flotante binario de JS (ej. 0.1 + 0.2 !== 0.3) al encadenar sumas,
 * multiplicaciones y logaritmos sobre montos de dinero. Es el mismo Decimal.js
 * que ya usa Prisma internamente para las columnas @db.Decimal del schema.
 */
export const Decimal = Prisma.Decimal;
export type DecimalValue = InstanceType<typeof Decimal>;
export type DecimalInput = Prisma.Decimal.Value;

/** Redondea a 2 decimales (centavos) y devuelve un `number` para no romper los tipos existentes. */
export function toMoney(value: DecimalInput): number {
    return new Decimal(value).toDecimalPlaces(2).toNumber();
}
