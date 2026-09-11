// ─── Helpers de serialización (Decimal → number) ───────────────────────────
// Este archivo NO es un Server Action — son utilidades puras de conversión.

import { Decimal } from '@prisma/client/runtime/library';
import { CreditCard } from '@prisma/client';

type Numeric = Decimal | number | string | null | undefined;

export const toNum = (val: Numeric): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'object' && 'toNumber' in val) {
        return val.toNumber();
    }
    return Number(val);
};

export const toNumOrNull = (val: Numeric): number | null => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'object' && 'toNumber' in val) {
        return val.toNumber();
    }
    return Number(val);
};

export function serializeCreditCard<T extends CreditCard>(card: T) {
    return {
        ...card,
        limit: toNum(card.limit),
        balance: toNum(card.balance),
        interestRate: toNumOrNull(card.interestRate),
        annualFee: toNumOrNull(card.annualFee),
        minPaymentPercentage: toNumOrNull(card.minPaymentPercentage),
        insuranceRate: toNumOrNull(card.insuranceRate),
        itbmsRate: toNumOrNull(card.itbmsRate),
        minPaymentFloor: toNumOrNull(card.minPaymentFloor),
        lateFee: toNumOrNull(card.lateFee),
    };
}
