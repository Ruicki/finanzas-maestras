import { ITaxStrategy } from './tax.strategy';
import { TaxBreakdown } from '@/types/finance';
import { Decimal, toMoney } from '@/lib/decimal';

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
        const monthlyGrossD = new Decimal(monthlyGross);
        const socialSec = monthlyGrossD.times(this.SOCIAL_SEC_RATE);
        const eduIns = monthlyGrossD.times(this.EDU_INS_RATE);

        // Income Tax (ISR) is based on annualized salary
        const baseMonthlyForISR = frequency === 'biweekly' ? monthlyGrossD.times(2) : monthlyGrossD;
        const annualSalary = baseMonthlyForISR.times(12);
        let annualTax = new Decimal(0);

        if (annualSalary.greaterThan(this.BRACKET_1_LIMIT) && annualSalary.lessThanOrEqualTo(this.BRACKET_2_LIMIT)) {
            annualTax = annualSalary.minus(this.BRACKET_1_LIMIT).times(this.RATE_15);
        } else if (annualSalary.greaterThan(this.BRACKET_2_LIMIT)) {
            annualTax = new Decimal(this.BRACKET_2_BASE_TAX).plus(annualSalary.minus(this.BRACKET_2_LIMIT).times(this.RATE_25));
        }

        const monthlyIncomeTax = annualTax.dividedBy(12);
        const finalIncomeTax = frequency === 'biweekly' ? monthlyIncomeTax.dividedBy(2) : monthlyIncomeTax;

        return {
            socialSec: toMoney(socialSec),
            eduIns: toMoney(eduIns),
            incomeTax: toMoney(finalIncomeTax),
            totalTaxes: toMoney(socialSec.plus(eduIns).plus(finalIncomeTax))
        };
    }
}
