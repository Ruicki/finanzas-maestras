// ─── Helpers de serialización (Decimal → number) ───────────────────────────
// Este archivo NO es un Server Action — son utilidades puras de conversión.

export const toNum = (val: any): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'object' && val !== null && 'toNumber' in val) {
        return val.toNumber();
    }
    return Number(val);
};

export const toNumOrNull = (val: any): number | null => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'object' && val !== null && 'toNumber' in val) {
        return val.toNumber();
    }
    return Number(val);
};

export function serializeCreditCard(card: any) {
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
    };
}
