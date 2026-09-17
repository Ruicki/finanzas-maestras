import { ProfileWithData } from '@/types';

// Datos ficticios para /preview-temas: permiten ver las 7 pestañas y los 5
// temas de color sin base de datos ni sesión. No se usan en ninguna pantalla
// real de la app.
export function buildMockProfile(): ProfileWithData {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const day = (d: number) => new Date(Date.UTC(y, m, d, 12, 0, 0));

    const categories = [
        { id: 1, name: 'Comida', icon: 'UtensilsCrossed', color: 'text-orange-500', type: 'VARIABLE', monthlyLimit: 500, isRollover: false, rolloverBalance: 0 },
        { id: 2, name: 'Transporte', icon: 'Car', color: 'text-blue-500', type: 'FIXED', monthlyLimit: 150, isRollover: false, rolloverBalance: 0 },
        { id: 3, name: 'Suscripciones', icon: 'Repeat', color: 'text-purple-500', type: 'LUXURY', monthlyLimit: 60, isRollover: false, rolloverBalance: 0 },
        { id: 4, name: 'Vivienda', icon: 'Home', color: 'text-emerald-500', type: 'FIXED', monthlyLimit: 700, isRollover: false, rolloverBalance: 0 },
        { id: 5, name: 'Ocio', icon: 'Gamepad2', color: 'text-pink-500', type: 'LUXURY', monthlyLimit: 120, isRollover: true, rolloverBalance: 0 },
        { id: 6, name: 'Salud', icon: 'HeartPulse', color: 'text-red-500', type: 'VARIABLE', monthlyLimit: 90, isRollover: false, rolloverBalance: 0 },
    ].map((c) => ({ ...c, profileId: 1, createdAt: day(1), budgets: [] }));

    const expense = (
        id: number, name: string, amount: number, categoryId: number, d: number,
        extra: Record<string, unknown> = {},
    ) => ({
        id, name, amount,
        category: categories.find((c) => c.id === categoryId)!.name,
        categoryId,
        categoryRel: categories.find((c) => c.id === categoryId)!,
        dueDate: null, graceDays: null,
        isRecurring: false, isOneTime: true, recurrenceType: null,
        paymentMethod: 'ACCOUNT', linkedCardId: null,
        profileId: 1, accountId: 2, createdAt: day(d),
        lastPaidAt: null, isProjected: false, confirmedAt: day(d),
        ...extra,
    });

    const expenses = [
        expense(1, 'Super Xtra', 86.4, 1, 2),
        expense(2, 'Gasolina', 32, 2, 3),
        expense(3, 'Almuerzo trabajo', 54.2, 1, 5),
        expense(4, 'Uber al aeropuerto', 18.5, 2, 6),
        expense(5, 'Farmacia', 27.9, 6, 8),
        expense(6, 'Cine', 24, 5, 9),
        expense(7, 'Netflix', 14.99, 3, 1, {
            isRecurring: true, isOneTime: false, recurrenceType: 'MONTHLY', dueDate: 1, graceDays: 3, lastPaidAt: day(1),
        }),
        expense(8, 'Spotify', 11.99, 3, 5, {
            isRecurring: true, isOneTime: false, recurrenceType: 'MONTHLY', dueDate: 5, graceDays: 2, lastPaidAt: null,
        }),
        expense(9, 'Gimnasio', 35, 6, 10, {
            isRecurring: true, isOneTime: false, recurrenceType: 'MONTHLY', dueDate: 10, graceDays: 5, lastPaidAt: null,
        }),
        expense(10, 'Alquiler', 650, 4, 28, { isProjected: true, confirmedAt: null }),
        expense(11, 'Seguro del auto', 240, 2, 15, {
            isRecurring: true, isOneTime: false, recurrenceType: 'ANNUAL', dueDate: 15, graceDays: 10, lastPaidAt: null,
        }),
    ];

    const accounts = [
        { id: 1, name: 'Efectivo', type: 'CASH', purpose: 'SPENDING', balance: 420, currency: 'USD', symbol: '$', isDefault: true, lockDate: null },
        { id: 2, name: 'Banco General', type: 'BANK', purpose: 'SPENDING', balance: 6180.5, currency: 'USD', symbol: '$', isDefault: false, lockDate: null },
        { id: 3, name: 'Yappy', type: 'WALLET', purpose: 'SPENDING', balance: 240.75, currency: 'USD', symbol: '$', isDefault: false, lockDate: null },
        { id: 4, name: 'Ahorro Emergencia', type: 'SAVINGS', purpose: 'SAVINGS', balance: 2400, currency: 'USD', symbol: '$', isDefault: false, lockDate: null },
    ].map((a) => ({ ...a, profileId: 1, createdAt: day(1) }));

    const creditCards = [
        {
            id: 1, name: 'Visa Clásica', bank: 'Banco General', limit: 3000, balance: 1240,
            cutoffDay: 20, paymentDay: 5, interestRate: 2.1, annualFee: 60, annualFeeMonth: 3,
            minPaymentPercentage: 3, insuranceRate: 0.25, itbmsRate: 0.07, minPaymentFloor: 20, lateFee: 25,
        },
        {
            id: 2, name: 'Mastercard Gold', bank: 'Banistmo', limit: 5000, balance: 480,
            cutoffDay: 15, paymentDay: 30, interestRate: 1.8, annualFee: null, annualFeeMonth: null,
            minPaymentPercentage: 2.5, insuranceRate: 0.25, itbmsRate: 0.07, minPaymentFloor: 20, lateFee: 25,
        },
    ].map((c) => ({ ...c, profileId: 1, createdAt: day(1) }));

    const loans = [
        {
            id: 1, name: 'Préstamo personal', lender: 'Banco General', type: 'BANK',
            totalAmount: 6000, currentBalance: 3800, interestRate: 9.5, termMonths: 36,
            monthlyPayment: 210, paymentDay: 15, isAutomatic: true, lastInterestAppliedAt: null,
        },
        {
            id: 2, name: 'Préstamo a Carlos', lender: 'Carlos', type: 'FRIEND',
            totalAmount: 500, currentBalance: 300, interestRate: 0, termMonths: null,
            monthlyPayment: 100, paymentDay: 1, isAutomatic: false, lastInterestAppliedAt: null,
        },
    ].map((l) => ({ ...l, profileId: 1, createdAt: day(1), startDate: day(1) }));

    const goals = [
        {
            id: 1, name: 'Fondo de emergencia', targetAmount: 5000, currentAmount: 2400,
            deadline: new Date(Date.UTC(y + 1, 5, 30, 12)), type: 'FIXED', frequency: 'MONTHLY',
            contributionAmount: 250, priority: 'HIGH', category: 'Seguridad', notes: null,
            isPaused: false, sourceAccountId: 2, destinationAccountId: 4,
        },
        {
            id: 2, name: 'Viaje a Bocas del Toro', targetAmount: 1200, currentAmount: 680,
            deadline: new Date(Date.UTC(y, m + 4, 15, 12)), type: 'VARIABLE', frequency: 'MONTHLY',
            contributionAmount: 150, priority: 'MEDIUM', category: 'Ocio', notes: 'Julio',
            isPaused: false, sourceAccountId: 2, destinationAccountId: null,
        },
        {
            id: 3, name: 'Laptop nueva', targetAmount: 1800, currentAmount: 300,
            deadline: null, type: 'VARIABLE', frequency: null,
            contributionAmount: null, priority: 'LOW', category: 'Trabajo', notes: null,
            isPaused: true, sourceAccountId: null, destinationAccountId: null,
        },
    ].map((g) => ({ ...g, profileId: 1, createdAt: day(1), transactions: [] }));

    const salaries = [
        {
            id: 1, grossVal: 1900, netVal: 1600, taxes: 300, socialSec: 180.5,
            eduIns: 24.7, incomeTax: 94.8, bonus: 0, absentDays: 0, company: 'Tecnología SA',
            profileId: 1, accountId: 2, isManualCalculation: false, createdAt: day(15),
        },
    ];

    const incomes = [
        { id: 1, name: 'Freelance diseño', amount: 350, type: 'ONE_TIME', frequency: null, durationMonths: null, accountId: 2, date: day(7), icon: 'Laptop' },
        { id: 2, name: 'Alquiler cuarto', amount: 200, type: 'RECURRING', frequency: 'MONTHLY', durationMonths: null, accountId: 2, date: null, icon: 'Home' },
    ].map((i) => ({ ...i, profileId: 1, createdAt: day(1) }));

    return {
        id: 1,
        name: 'Rick',
        email: 'demo@finanzasmaestras.app',
        password: null,
        accessCode: null,
        role: 'USER',
        customDeductions: null,
        onboardingSeenAt: day(1),
        createdAt: day(1),
        accounts,
        expenses,
        categories,
        creditCards,
        loans,
        goals,
        salaries,
        incomes,
    } as unknown as ProfileWithData;
}
