export interface BankPreset {
    label: string;
    interestRate: number;      // Tasa mensual nominal %
    insuranceRate: number;     // Desgravamen mensual %
    annualFee: number;         // Membresía anual típica
    lateFee: number;           // Cargo por mora
    minPaymentPercentage: number; // Capital mínimo % del saldo
    minPaymentFloor: number;   // Mínimo fijo en USD (0 = sin mínimo)
    itbmsRate: number;         // ITBMS sobre intereses (0.07 = 7%)
}

export const BANK_PRESETS: Record<string, BankPreset> = {
    CMF: {
        label: 'CMF',
        interestRate: 2.25,
        insuranceRate: 0.325,
        annualFee: 0,
        lateFee: 25,
        minPaymentPercentage: 3.0,
        minPaymentFloor: 0,
        itbmsRate: 0.07,
    },
    BAC: {
        label: 'BAC Credomatic',
        interestRate: 2.09,
        insuranceRate: 0.25,
        annualFee: 40,
        lateFee: 40,
        minPaymentPercentage: 2.0,
        minPaymentFloor: 25,
        itbmsRate: 0.07,
    },
    BANISTMO: {
        label: 'Banistmo',
        interestRate: 1.75,
        insuranceRate: 0.20,
        annualFee: 0,
        lateFee: 35,
        minPaymentPercentage: 2.5,
        minPaymentFloor: 25,
        itbmsRate: 0.07,
    },
    BANCO_GENERAL: {
        label: 'Banco General',
        interestRate: 1.83,
        insuranceRate: 0.195,
        annualFee: 0,
        lateFee: 30,
        minPaymentPercentage: 2.0,
        minPaymentFloor: 25,
        itbmsRate: 0.07,
    },
    OTRO: {
        label: 'Otro banco',
        interestRate: 2.0,
        insuranceRate: 0.25,
        annualFee: 0,
        lateFee: 25,
        minPaymentPercentage: 3.0,
        minPaymentFloor: 25,
        itbmsRate: 0.07,
    },
};

export const BANK_OPTIONS = Object.entries(BANK_PRESETS).map(([key, preset]) => ({
    value: key,
    label: preset.label,
}));
