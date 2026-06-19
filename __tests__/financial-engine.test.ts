import {
    calculateSalary,
    calculateCreditHealth,
    calculateMinimumPayment,
    calculateProjectedInterest,
    calculateMonthlyCharges,
    getDaysToCutoff,
    getDaysToPayment,
    calculateNextPaymentSplit,
    calculateLoanPayoffDate,
    calculatePayoffImpact,
    getBestPurchaseDay,
} from '../lib/financial-engine';
import { PanamaTaxStrategy } from '../lib/strategies/tax/panama.tax.strategy';

// ─── calculateSalary ────────────────────────────────────────────────

describe('calculateSalary', () => {
    const taxStrategy = new PanamaTaxStrategy();

    it('calculates taxes below first bracket ($833/month)', () => {
        const result = calculateSalary(833, 0, 'monthly', 0, taxStrategy);
        expect(result.grossVal).toBe(833);
        expect(result.incomeTax).toBe(0);
        expect(result.socialSec).toBeCloseTo(833 * 0.0975, 2);
        expect(result.eduIns).toBeCloseTo(833 * 0.0125, 2);
    });

    it('calculates taxes in second bracket ($1,500/month)', () => {
        const result = calculateSalary(1500, 0, 'monthly', 0, taxStrategy);
        expect(result.incomeTax).toBeCloseTo(87.5, 2);
    });

    it('applies absent days deduction', () => {
        const result = calculateSalary(1500, 0, 'monthly', 2, taxStrategy);
        expect(result.grossAfterAbsence).toBe(1400);
        expect(result.incomeTax).toBeCloseTo(72.5, 2);
    });

    it('handles bonuses correctly', () => {
        const result = calculateSalary(1500, 500, 'monthly', 0, taxStrategy);
        expect(result.bonus).toBe(500);
    });
});

// ─── calculateCreditHealth ──────────────────────────────────────────

describe('calculateCreditHealth', () => {
    it('returns Excellent for utilization <= 10%', () => {
        expect(calculateCreditHealth(5).status).toBe('Excellent');
        expect(calculateCreditHealth(10).status).toBe('Excellent');
    });

    it('returns Good for utilization 11-30%', () => {
        expect(calculateCreditHealth(15).status).toBe('Good');
        expect(calculateCreditHealth(30).status).toBe('Good');
    });

    it('returns Fair for utilization 31-75%', () => {
        expect(calculateCreditHealth(50).status).toBe('Fair');
        expect(calculateCreditHealth(75).status).toBe('Fair');
    });

    it('returns Critical for utilization > 75%', () => {
        expect(calculateCreditHealth(80).status).toBe('Critical');
        expect(calculateCreditHealth(100).status).toBe('Critical');
    });
});

// ─── calculateProjectedInterest ─────────────────────────────────────

describe('calculateProjectedInterest', () => {
    it('calculates interest correctly for CMF rate (6.25%)', () => {
        // $500 * 6.25% = $31.25
        expect(calculateProjectedInterest(500, 6.25)).toBeCloseTo(31.25, 2);
    });

    it('returns 0 for zero balance', () => {
        expect(calculateProjectedInterest(0, 6.25)).toBe(0);
    });

    it('returns 0 for zero rate', () => {
        expect(calculateProjectedInterest(500, 0)).toBe(0);
    });

    it('handles negative balance gracefully', () => {
        expect(calculateProjectedInterest(-100, 6.25)).toBe(0);
    });
});

// ─── calculateMinimumPayment ────────────────────────────────────────

describe('calculateMinimumPayment', () => {
    it('calculates minimum payment: interest + insurance + 3% capital', () => {
        // Balance: $1000, Rate: 6.25%, Insurance: 0.25%, MinPayment%: 3%
        // Interest: 1000 * 6.25% = 62.50
        // Insurance: 1000 * 0.25% = 2.50
        // Capital: 1000 * 3% = 30.00
        // Total: 95.00
        const result = calculateMinimumPayment(1000, 6.25, 0.25, 3.0);
        expect(result).toBeCloseTo(95.00, 2);
    });

    it('returns 0 for zero balance', () => {
        expect(calculateMinimumPayment(0, 6.25)).toBe(0);
    });

    it('returns 0 for negative balance', () => {
        expect(calculateMinimumPayment(-500, 6.25)).toBe(0);
    });

    it('uses default insurance rate (0.25%) when not provided', () => {
        const result = calculateMinimumPayment(1000, 6.25);
        // Interest: 62.50, Insurance: 2.50 (default), Capital: 30.00
        expect(result).toBeCloseTo(95.00, 2);
    });

    it('uses default minPaymentPercentage (3%) when not provided', () => {
        const result = calculateMinimumPayment(1000, 6.25, 0.25);
        expect(result).toBeCloseTo(95.00, 2);
    });

    it('CMF real scenario: $500 balance, 6.25% rate', () => {
        // Interest: 500 * 6.25% = 31.25
        // Insurance: 500 * 0.25% = 1.25
        // Capital: 500 * 3% = 15.00
        // Total: 47.50
        const result = calculateMinimumPayment(500, 6.25, 0.25, 3.0);
        expect(result).toBeCloseTo(47.50, 2);
    });
});

// ─── calculateMonthlyCharges ────────────────────────────────────────

describe('calculateMonthlyCharges', () => {
    it('calculates interest + insurance breakdown', () => {
        // $1000, 6.25%, 0.25%
        const result = calculateMonthlyCharges(1000, 6.25, 0.25);
        expect(result.interest).toBeCloseTo(62.50, 2);
        expect(result.insurance).toBeCloseTo(2.50, 2);
        expect(result.total).toBeCloseTo(65.00, 2);
    });

    it('returns zeros for zero balance', () => {
        const result = calculateMonthlyCharges(0, 6.25, 0.25);
        expect(result.interest).toBe(0);
        expect(result.insurance).toBe(0);
        expect(result.total).toBe(0);
    });
});

// ─── getDaysToCutoff ────────────────────────────────────────────────

describe('getDaysToCutoff', () => {
    it('returns a valid result structure', () => {
        const result = getDaysToCutoff(15);
        expect(result).toHaveProperty('days');
        expect(result).toHaveProperty('date');
        expect(result).toHaveProperty('status');
        expect(['normal', 'warning', 'urgent', 'passed']).toContain(result.status);
    });

    it('returns non-negative days', () => {
        const result = getDaysToCutoff(15);
        expect(result.days).toBeGreaterThanOrEqual(0);
    });

    it('status is normal when days > 7', () => {
        // We can't control the current date, but we can verify the logic
        const result = getDaysToCutoff(15);
        if (result.days > 7) {
            expect(result.status).toBe('normal');
        }
    });

    it('status is warning when days 4-7', () => {
        const result = getDaysToCutoff(15);
        if (result.days > 3 && result.days <= 7) {
            expect(result.status).toBe('warning');
        }
    });

    it('status is urgent when days 1-3', () => {
        const result = getDaysToCutoff(15);
        if (result.days > 0 && result.days <= 3) {
            expect(result.status).toBe('urgent');
        }
    });
});

// ─── getDaysToPayment ───────────────────────────────────────────────

describe('getDaysToPayment', () => {
    it('returns a valid result with days and date', () => {
        const result = getDaysToPayment(15);
        expect(result).toHaveProperty('days');
        expect(result).toHaveProperty('date');
        expect(result.days).toBeGreaterThanOrEqual(0);
        expect(result.date).toBeInstanceOf(Date);
    });
});

// ─── getBestPurchaseDay ─────────────────────────────────────────────

describe('getBestPurchaseDay', () => {
    it('returns a date after the cutoff day', () => {
        const result = getBestPurchaseDay(15);
        expect(result.date.getDate()).toBe(16);
    });

    it('returns daysRemaining as a number', () => {
        const result = getBestPurchaseDay(15);
        expect(typeof result.daysRemaining).toBe('number');
    });
});

// ─── calculateNextPaymentSplit (Loan) ───────────────────────────────

describe('calculateNextPaymentSplit', () => {
    it('splits payment correctly between principal and interest', () => {
        // $10,000 loan, 12% annual, $200/month payment
        // Monthly rate: 12% / 12 = 1%
        // Interest: 10000 * 0.01 = 100
        // Principal: 200 - 100 = 100
        const result = calculateNextPaymentSplit(10000, 12, 200);
        expect(result.interest).toBeCloseTo(100, 2);
        expect(result.principal).toBeCloseTo(100, 2);
        expect(result.isNegativeAmortization).toBe(false);
    });

    it('detects negative amortization when payment < interest', () => {
        // $100,000 loan, 12% annual, $500/month payment
        // Interest: 100000 * 0.01 = 1000
        // Payment is less than interest
        const result = calculateNextPaymentSplit(100000, 12, 500);
        expect(result.isNegativeAmortization).toBe(true);
        expect(result.principal).toBe(0);
    });

    it('returns zeros for zero balance', () => {
        const result = calculateNextPaymentSplit(0, 12, 200);
        expect(result.principal).toBe(0);
        expect(result.interest).toBe(0);
    });
});

// ─── calculateLoanPayoffDate ────────────────────────────────────────

describe('calculateLoanPayoffDate', () => {
    it('returns a date in the future for a valid loan', () => {
        const result = calculateLoanPayoffDate(10000, 12, 200);
        expect(result).toBeInstanceOf(Date);
        expect(result!.getTime()).toBeGreaterThan(Date.now());
    });

    it('returns today for zero balance', () => {
        const result = calculateLoanPayoffDate(0, 12, 200);
        expect(result).toBeInstanceOf(Date);
    });

    it('returns null when payment is zero', () => {
        const result = calculateLoanPayoffDate(10000, 12, 0);
        expect(result).toBeNull();
    });

    it('handles zero interest rate', () => {
        // $1000, 0% interest, $100/month = 10 months
        const result = calculateLoanPayoffDate(1000, 0, 100);
        expect(result).toBeInstanceOf(Date);
        const months = Math.ceil(1000 / 100);
        const expected = new Date();
        expected.setMonth(expected.getMonth() + months);
        expect(result!.getMonth()).toBe(expected.getMonth());
    });

    it('returns null for forever debt (payment < interest)', () => {
        const result = calculateLoanPayoffDate(100000, 12, 500);
        expect(result).toBeNull();
    });
});

// ─── calculatePayoffImpact ──────────────────────────────────────────

describe('calculatePayoffImpact', () => {
    it('calculates months and interest saved with extra payment', () => {
        const result = calculatePayoffImpact(10000, 12, 200, 100);
        expect(result).not.toBeNull();
        expect(result!.monthsSaved).toBeGreaterThanOrEqual(0);
        expect(result!.interestSaved).toBeGreaterThanOrEqual(0);
        expect(result!.newDate).toBeInstanceOf(Date);
    });

    it('returns null when no payoff possible', () => {
        const result = calculatePayoffImpact(100000, 12, 500, 100);
        expect(result).toBeNull();
    });
});
