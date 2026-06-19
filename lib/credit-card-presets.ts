export interface BankPreset {
    label: string;
    interestRate: number;      // Tasa mensual nominal %
    insuranceRate: number;     // Desgravamen mensual %
    annualFee: number;         // Membresía anual típica
    lateFee: number;           // Cargo por mora
}

export const BANK_PRESETS: Record<string, BankPreset> = {
    CMF: {
        label: 'CMF',
        interestRate: 6.25,
        insuranceRate: 0.325,
        annualFee: 0,
        lateFee: 25,
    },
    BAC: {
        label: 'BAC Credomatic',
        interestRate: 2.09,
        insuranceRate: 0.25,
        annualFee: 40,
        lateFee: 40,
    },
    BANISTMO: {
        label: 'Banistmo',
        interestRate: 1.75,
        insuranceRate: 0.20,
        annualFee: 0,
        lateFee: 35,
    },
    BANCO_GENERAL: {
        label: 'Banco General',
        interestRate: 1.83,
        insuranceRate: 0.195,
        annualFee: 0,
        lateFee: 30,
    },
    OTRO: {
        label: 'Otro banco',
        interestRate: 2.0,
        insuranceRate: 0.25,
        annualFee: 0,
        lateFee: 25,
    },
};

export const BANK_OPTIONS = Object.entries(BANK_PRESETS).map(([key, preset]) => ({
    value: key,
    label: preset.label,
}));
