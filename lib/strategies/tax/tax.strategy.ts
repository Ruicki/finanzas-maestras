import { TaxBreakdown } from '@/types/finance';

export interface ITaxStrategy {
    calculateTaxes(grossSalary: number, frequency: 'monthly' | 'biweekly'): TaxBreakdown;
}
