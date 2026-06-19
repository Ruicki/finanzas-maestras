export interface FinancialCreditCard {
    limit: number;
    balance: number;
    cutoffDay: number;
    paymentDay: number;
    interestRate?: number | null;   // Tasa mensual nominal %
    insuranceRate?: number | null;  // Desgravamen mensual %
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

    // The logic:
    // If today <= cutoffDay, the cutoff for this month hasn't happened yet.
    // The "best day" was the day after LAST month's cutoff.
    // BUT usually users want to know the *next* best day from NOW.
    // The *absolute* best day is cutoffDay + 1.

    let bestDayDate = new Date(currentYear, currentMonth, cutoffDay + 1);

    // If cutoffDay + 1 is today or in the past, users might want the NEXT month's cutoff + 1?
    // No, if today is 16th and cutoff was 15th, today IS the best time (early in the cycle).

    // Let's rephrase: We want to tell the user the DATE of the start of the next billing cycle
    // or if we are currently in the "good zone".

    // Simplification: The "Best Buy Date" is always (Cutoff + 1).
    // We just need to find the specific Date object typical for "the next occurrence" or "current occurrence".

    if (currentDay > cutoffDay) {
        // We are currently IN the best window (start of cycle).
        // The "Best Day" was this month's cutoff + 1.
        // We can say "Today" or "Now".
        // But the function asks for a date. Let's return the start of THIS cycle.
        bestDayDate = new Date(currentYear, currentMonth, cutoffDay + 1);
    } else {
        // We are near the end of the cycle (before cutoff).
        // Buying now is bad (payment due very soon).
        // The "Best Day" is NEXT month's cutoff + 1 (or this month if strict date logic).
        // If today is 1st and cutoff is 5th. Best day is 6th.
        bestDayDate = new Date(currentYear, currentMonth, cutoffDay + 1);
    }

    // Days remaining until that date (if in future)
    const diffTime = bestDayDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
        date: bestDayDate,
        daysRemaining
    };
}

export function calculateCreditHealth(utilization: number): { status: 'Excellent' | 'Good' | 'Fair' | 'Critical'; color: string } {
    if (utilization <= 10) return { status: 'Excellent', color: 'text-emerald-400' };
    if (utilization <= 30) return { status: 'Good', color: 'text-green-400' };
    if (utilization <= 75) return { status: 'Fair', color: 'text-yellow-400' };
    return { status: 'Critical', color: 'text-red-500' };
}

export function calculateMinimumPayment(balance: number, monthlyRate: number, insuranceRate: number = 0.25, percentage: number = 3.0, floor: number = 25): number {
    if (balance <= 0) return 0;
    const interest = calculateProjectedInterest(balance, monthlyRate);
    const insurance = balance * (insuranceRate / 100);
    const capital = balance * (percentage / 100);
    const total = interest + insurance + capital;
    if (balance <= floor) return balance;
    return Math.max(Math.round(total * 100) / 100, floor);
}

export function calculateProjectedInterest(balance: number, monthlyRate: number): number {
    if (!monthlyRate || balance <= 0) return 0;
    return balance * (monthlyRate / 100);
}

export function calculateMonthlyCharges(balance: number, monthlyRate: number, insuranceRate: number = 0.25): {
    interest: number;
    insurance: number;
    total: number;
} {
    if (balance <= 0) return { interest: 0, insurance: 0, total: 0 };
    const interest = balance * (monthlyRate / 100);
    const insurance = balance * (insuranceRate / 100);
    return {
        interest,
        insurance,
        total: interest + insurance,
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
    else if (days > 0) status = 'urgent';
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
    const monthlyRate = (annualRate / 100) / 12;
    const interestPayment = balance * monthlyRate;

    // Principal is whatever is left of the payment
    const principalPayment = Math.max(monthlyPayment - interestPayment, 0);

    // If interest is higher than payment, debt grows (bad!)
    // If payment > balance + interest, we cap it.

    return {
        interest: interestPayment,
        principal: principalPayment,
        isNegativeAmortization: interestPayment > monthlyPayment
    };
}

/**
 * Estimates the "Freedom Date" (when balance hits 0) assuming constant payments.
 */
export function calculateLoanPayoffDate(balance: number, annualRate: number, monthlyPayment: number): Date | null {
    if (balance <= 0) return new Date();
    if (monthlyPayment <= 0) return null; // Never

    const monthlyRate = (annualRate / 100) / 12;

    if (monthlyRate === 0) {
        // Simple division
        const months = Math.ceil(balance / monthlyPayment);
        const date = new Date();
        date.setMonth(date.getMonth() + months);
        return date;
    }

    // Amortization Formula: n = -log(1 - (r*PV) / PMT) / log(1 + r)
    // If (r*PV) / PMT >= 1, it never pays off (Infinite)

    const numeratorInner = 1 - (monthlyRate * balance) / monthlyPayment;
    if (numeratorInner <= 0) return null; // Forever debt

    const nMonths = -Math.log(numeratorInner) / Math.log(1 + monthlyRate);

    const date = new Date();
    date.setMonth(date.getMonth() + Math.ceil(nMonths));
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

    // Calculate regular interest
    // Simplification: Total Paid = NumPayments * MonthlyPayment
    // Total Interest = Total Paid - Principal

    const timeSavedMonths = (regularPayoff.getTime() - boostedPayoff.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const regularMonths = (regularPayoff.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const boostedMonths = (boostedPayoff.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30);

    const totalPaidRegular = regularMonths * monthlyPayment;
    const totalPaidBoosted = boostedMonths * (monthlyPayment + extraPayment);

    const interestRegular = Math.max(0, totalPaidRegular - balance);
    const interestBoosted = Math.max(0, totalPaidBoosted - balance);

    const interestSaved = Math.max(0, interestRegular - interestBoosted);

    return {
        newDate: boostedPayoff,
        monthsSaved: Math.round(timeSavedMonths),
        interestSaved: interestSaved
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

    const monthlyGrossForCalc = frequency === 'biweekly' ? grossVal * 2 : grossVal;
    const daysInPeriod = frequency === 'biweekly' ? 15 : 30;
    const dailyRate = grossVal / daysInPeriod;

    const absenceDeduction = dailyRate * absentDays;
    const grossAfterAbsence = Math.max(0, grossVal - absenceDeduction);

    // We pass the "After Absence" adjusted monthly gross to the tax strategy for a fair calculation
    const monthlyGrossAfterAbsence = frequency === 'biweekly' ? grossAfterAbsence * 2 : grossAfterAbsence;

    // Use Strategy to get tax breakdown
    const taxBreakdown = taxStrategy.calculateTaxes(monthlyGrossAfterAbsence, frequency);

    // Final calculations 
    const totalDeductions = taxBreakdown.totalTaxes;
    const netVal = (grossAfterAbsence + bonus) - totalDeductions;

    return {
        ...taxBreakdown,
        netVal,
        grossAfterAbsence,
        grossVal,
        bonus
    };
}
