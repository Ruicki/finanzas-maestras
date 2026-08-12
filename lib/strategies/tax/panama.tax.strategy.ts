import { ITaxStrategy } from './tax.strategy';
import { TaxBreakdown } from '@/types/finance';

export class PanamaTaxStrategy implements ITaxStrategy {
    // Panama standard rates
    private readonly SOCIAL_SEC_RATE = 0.0975;
    private readonly EDU_INS_RATE = 0.0125;

    // Tax brackets for ISR
    private readonly BRACKET_1_LIMIT = 11000;
    private readonly BRACKET_2_LIMIT = 50000;
    private readonly BRACKET_2_BASE_TAX = 5850; // (50000 - 11000) * 0.15
    private readonly RATE_15 = 0.15;
    private readonly RATE_25 = 0.25;

    calculateTaxes(monthlyGross: number, frequency: 'monthly' | 'biweekly'): TaxBreakdown {
        const socialSec = monthlyGross * this.SOCIAL_SEC_RATE;
        const eduIns = monthlyGross * this.EDU_INS_RATE;

        // Income Tax (ISR) is based on annualized salary
        const baseMonthlyForISR = frequency === 'biweekly' ? monthlyGross * 2 : monthlyGross;
        const annualSalary = baseMonthlyForISR * 12;
        let annualTax = 0;

        if (annualSalary > this.BRACKET_1_LIMIT && annualSalary <= this.BRACKET_2_LIMIT) {
            annualTax = (annualSalary - this.BRACKET_1_LIMIT) * this.RATE_15;
        } else if (annualSalary > this.BRACKET_2_LIMIT) {
            annualTax = this.BRACKET_2_BASE_TAX + (annualSalary - this.BRACKET_2_LIMIT) * this.RATE_25;
        }

        const monthlyIncomeTax = annualTax / 12;
        const finalIncomeTax = frequency === 'biweekly' ? monthlyIncomeTax / 2 : monthlyIncomeTax;

        return {
            socialSec,
            eduIns,
            incomeTax: finalIncomeTax,
            totalTaxes: socialSec + eduIns + finalIncomeTax
        };
    }
}
