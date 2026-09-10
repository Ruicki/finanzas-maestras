import { Decimal, DecimalValue, toMoney } from './decimal';

export interface FinancialCreditCard {
    limit: number;
    balance: number;
    cutoffDay: number;
    paymentDay: number;
    interestRate?: number | null;   // Tasa mensual nominal %
    insuranceRate?: number | null;  // Desgravamen mensual %
}

export function roundToCents(val: number): number {
    return toMoney(val);
}

/**
 * Calculates the best day to buy with a credit card to maximize time before payment.
 * Strategy: The best day is the day IMMEDIATELY after the cutoff day.
 */
export function getBestPurchaseDay(cutoffDay: number): { date: Date; daysRemaining: number } {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let bestDayDate: Date;

    if (currentDay > cutoffDay) {
        bestDayDate = new Date(currentYear, currentMonth + 1, cutoffDay + 1);
    } else {
        bestDayDate = new Date(currentYear, currentMonth, cutoffDay + 1);
    }

    const diffTime = bestDayDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return { date: bestDayDate, daysRemaining };
}

export function calculateCreditHealth(utilization: number): { status: 'Excellent' | 'Good' | 'Fair' | 'Critical'; color: string } {
    if (utilization <= 10) return { status: 'Excellent', color: 'text-emerald-400' };
    if (utilization <= 30) return { status: 'Good', color: 'text-green-400' };
    if (utilization <= 75) return { status: 'Fair', color: 'text-yellow-400' };
    return { status: 'Critical', color: 'text-red-500' };
}

function projectedInterestDecimal(balance: DecimalValue, monthlyRate: number): DecimalValue {
    if (!monthlyRate || balance.lessThanOrEqualTo(0)) return new Decimal(0);
    return balance.times(monthlyRate).dividedBy(100);
}

export function calculateMinimumPayment(
    balance: number,
    monthlyRate: number,
    insuranceRate: number = 0.25,
    percentage: number = 3.0,
    itbmsRate: number = 0.07,
    minFloor: number = 0,
): number {
    if (balance <= 0) return 0;
    const balanceD = new Decimal(balance);
    const interest = projectedInterestDecimal(balanceD, monthlyRate);
    const insurance = balanceD.times(insuranceRate).dividedBy(100);
    const capital = balanceD.times(percentage).dividedBy(100);
    const itbms = interest.times(itbmsRate);
    let total = interest.plus(insurance).plus(capital).plus(itbms);
    if (minFloor > 0 && total.lessThan(minFloor)) total = new Decimal(minFloor);
    return toMoney(total);
}

export function calculateProjectedInterest(balance: number, monthlyRate: number): number {
    return toMoney(projectedInterestDecimal(new Decimal(balance), monthlyRate));
}

export function calculateMonthlyCharges(balance: number, monthlyRate: number, insuranceRate: number = 0.25): {
    interest: number;
    insurance: number;
    total: number;
} {
    if (balance <= 0) return { interest: 0, insurance: 0, total: 0 };
    const balanceD = new Decimal(balance);
    const interest = projectedInterestDecimal(balanceD, monthlyRate);
    const insurance = balanceD.times(insuranceRate).dividedBy(100);
    return {
        interest: toMoney(interest),
        insurance: toMoney(insurance),
        total: toMoney(interest.plus(insurance)),
    };
}

export function getDaysToCutoff(cutoffDay: number): { days: number; date: Date; status: 'normal' | 'warning' | 'urgent' | 'passed' } {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let nextCutoffDate: Date;
    let days: number;

    if (currentDay <= cutoffDay) {
        nextCutoffDate = new Date(currentYear, currentMonth, cutoffDay);
        days = cutoffDay - currentDay;
    } else {
        nextCutoffDate = new Date(currentYear, currentMonth + 1, cutoffDay);
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        days = (daysInMonth - currentDay) + cutoffDay;
    }

    let status: 'normal' | 'warning' | 'urgent' | 'passed';
    if (days > 7) status = 'normal';
    else if (days > 3) status = 'warning';
    else if (days >= 0) status = 'urgent';
    else status = 'passed';

    return { days, date: nextCutoffDate, status };
}

export function getDaysToPayment(paymentDay: number): { days: number; date: Date } {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let nextPaymentDate: Date;

    if (currentDay <= paymentDay) {
        nextPaymentDate = new Date(currentYear, currentMonth, paymentDay);
    } else {
        nextPaymentDate = new Date(currentYear, currentMonth + 1, paymentDay);
    }

    const diffTime = nextPaymentDate.getTime() - today.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return { days, date: nextPaymentDate };
}


// --- LOAN LOGIC ---

/**
 * Calculates the breakdown of the next monthly payment (Principal vs Interest).
 */
export function calculateNextPaymentSplit(balance: number, annualRate: number, monthlyPayment: number) {
    if (balance <= 0) return { principal: 0, interest: 0 };

    // Monthly Interest Rate = Annual / 12 / 100
    const monthlyRate = new Decimal(annualRate).dividedBy(100).dividedBy(12);
    const interestPayment = new Decimal(balance).times(monthlyRate);
    const monthlyPaymentD = new Decimal(monthlyPayment);

    // Principal is whatever is left of the payment
    const principalPayment = Decimal.max(monthlyPaymentD.minus(interestPayment), 0);

    // If interest is higher than payment, debt grows (bad!)
    // If payment > balance + interest, we cap it.

    return {
        interest: toMoney(interestPayment),
        principal: toMoney(principalPayment),
        isNegativeAmortization: interestPayment.greaterThan(monthlyPaymentD)
    };
}

/**
 * Estimates the "Freedom Date" (when balance hits 0) assuming constant payments.
 */
export function calculateLoanPayoffDate(balance: number, annualRate: number, monthlyPayment: number): Date | null {
    if (balance <= 0) return new Date();
    if (monthlyPayment <= 0) return null; // Never

    const monthlyRate = new Decimal(annualRate).dividedBy(100).dividedBy(12);
    const balanceD = new Decimal(balance);
    const monthlyPaymentD = new Decimal(monthlyPayment);

    if (monthlyRate.isZero()) {
        // Simple division
        const months = Math.ceil(balanceD.dividedBy(monthlyPaymentD).toNumber());
        const date = new Date();
        date.setMonth(date.getMonth() + months);
        return date;
    }

    // Amortization Formula: n = -log(1 - (r*PV) / PMT) / log(1 + r)
    // If (r*PV) / PMT >= 1, it never pays off (Infinite)

    const numeratorInner = new Decimal(1).minus(monthlyRate.times(balanceD).dividedBy(monthlyPaymentD));
    if (numeratorInner.lessThanOrEqualTo(0)) return null; // Forever debt

    const nMonths = numeratorInner.ln().negated().dividedBy(new Decimal(1).plus(monthlyRate).ln());

    const date = new Date();
    date.setMonth(date.getMonth() + Math.ceil(nMonths.toNumber()));
    return date;
}

/**
 * Calculates how much interest and time you save with an extra payment.
 */
export function calculatePayoffImpact(balance: number, annualRate: number, monthlyPayment: number, extraPayment: number) {
    const regularPayoff = calculateLoanPayoffDate(balance, annualRate, monthlyPayment);
    const boostedPayoff = calculateLoanPayoffDate(balance, annualRate, monthlyPayment + extraPayment);

    if (!regularPayoff || !boostedPayoff) return null;

    const today = new Date();
    const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30;

    // Calculate regular interest
    // Simplification: Total Paid = NumPayments * MonthlyPayment
    // Total Interest = Total Paid - Principal

    const timeSavedMonths = new Decimal(regularPayoff.getTime() - boostedPayoff.getTime()).dividedBy(MS_PER_MONTH);
    const regularMonths = new Decimal(regularPayoff.getTime() - today.getTime()).dividedBy(MS_PER_MONTH);
    const boostedMonths = new Decimal(boostedPayoff.getTime() - today.getTime()).dividedBy(MS_PER_MONTH);

    const totalPaidRegular = regularMonths.times(monthlyPayment);
    const totalPaidBoosted = boostedMonths.times(monthlyPayment + extraPayment);

    const interestRegular = Decimal.max(0, totalPaidRegular.minus(balance));
    const interestBoosted = Decimal.max(0, totalPaidBoosted.minus(balance));

    const interestSaved = Decimal.max(0, interestRegular.minus(interestBoosted));

    return {
        newDate: boostedPayoff,
        monthsSaved: Math.round(timeSavedMonths.toNumber()),
        interestSaved: toMoney(interestSaved)
    };
}

// --- SALARY LOGIC (STRATEGY PATTERN INJECTED) ---

import { ITaxStrategy } from './strategies/tax/tax.strategy';
import { SalaryCalculationResult } from '../types/finance';

export function calculateSalary(
    grossVal: number,
    bonus: number,
    frequency: 'monthly' | 'biweekly',
    absentDays: number,
    taxStrategy: ITaxStrategy
): SalaryCalculationResult & { grossVal: number, bonus: number } {

    const grossValD = new Decimal(grossVal);
    const daysInPeriod = frequency === 'biweekly' ? 15 : 30;
    const dailyRate = grossValD.dividedBy(daysInPeriod);

    const absenceDeduction = dailyRate.times(absentDays);
    const grossAfterAbsenceD = Decimal.max(0, grossValD.minus(absenceDeduction));

    // We pass the "After Absence" adjusted monthly gross to the tax strategy for a fair calculation
    const monthlyGrossAfterAbsence = frequency === 'biweekly' ? grossAfterAbsenceD.times(2) : grossAfterAbsenceD;

    // Use Strategy to get tax breakdown
    const taxBreakdown = taxStrategy.calculateTaxes(monthlyGrossAfterAbsence.toNumber(), frequency);

    // Final calculations
    const totalDeductions = taxBreakdown.totalTaxes;
    const netVal = grossAfterAbsenceD.plus(bonus).minus(totalDeductions);

    return {
        ...taxBreakdown,
        netVal: toMoney(netVal),
        grossAfterAbsence: toMoney(grossAfterAbsenceD),
        grossVal,
        bonus
    };
}
