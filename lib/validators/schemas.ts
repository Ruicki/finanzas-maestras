import { z } from 'zod';

export const accountSchema = z.object({
    name: z.string().min(1, 'Nombre requerido').max(100),
    type: z.enum(['BANK', 'CASH', 'WALLET', 'SAVINGS']),
    balance: z.number().min(0, 'Saldo no puede ser negativo').max(999999999),
    profileId: z.number().int().positive(),
    lockDate: z.date().optional(),
    purpose: z.enum(['SPENDING', 'SAVINGS']).default('SPENDING'),
    symbol: z.string().max(10).optional(),
});

export const expenseSchema = z.object({
    name: z.string().min(1, 'Nombre requerido').max(200),
    amount: z.number().positive('Monto debe ser positivo').max(999999999),
    category: z.string().min(1),
    profileId: z.number().int().positive(),
    dueDate: z.number().int().min(1).max(31).optional(),
    graceDays: z.number().int().min(0).max(60).optional(),
    isRecurring: z.boolean().optional(),
    isOneTime: z.boolean().optional(),
    recurrenceType: z.string().optional(),
    paymentMethod: z.string().optional(),
    linkedCardId: z.number().int().positive().optional(),
    accountId: z.number().int().positive().optional(),
    categoryId: z.number().int().positive().optional(),
    date: z.union([z.date(), z.string()]).optional(),
});

export const goalSchema = z.object({
    name: z.string().min(1, 'Nombre requerido').max(100),
    targetAmount: z.number().positive('Monto debe ser positivo').max(999999999),
    deadline: z.date().optional(),
    profileId: z.number().int().positive(),
    type: z.enum(['VARIABLE', 'FIXED']).default('VARIABLE'),
    frequency: z.string().optional(),
    contributionAmount: z.number().positive().optional(),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
    category: z.string().optional(),
    notes: z.string().max(500).optional(),
    sourceAccountId: z.number().int().positive().optional(),
    destinationAccountId: z.number().int().positive().optional(),
});

export const transferSchema = z.object({
    amount: z.number().positive('Monto debe ser positivo').max(999999999),
    sourceAccountId: z.number().int().positive(),
    destinationAccountId: z.number().int().positive(),
    description: z.string().max(200).optional(),
    exchangeRate: z.number().positive().optional(),
    sourceAmount: z.number().positive().optional(),
    destAmount: z.number().positive().optional(),
});

export const creditCardSchema = z.object({
    name: z.string().min(1, 'Nombre requerido').max(100),
    limit: z.number().positive('Límite debe ser positivo').max(999999999),
    cutoffDay: z.number().int().min(1).max(31),
    paymentDay: z.number().int().min(1).max(31),
    profileId: z.number().int().positive(),
    interestRate: z.number().min(0).max(100).optional(),
    insuranceRate: z.number().min(0).max(100).optional(),
    itbmsRate: z.number().min(0).max(100).optional(),
    minPaymentFloor: z.number().min(0).optional(),
    annualFee: z.number().min(0).optional(),
    annualFeeMonth: z.number().int().min(1).max(12).optional(),
    bank: z.string().max(100).optional(),
    initialBalance: z.number().min(0).optional(),
});

export const loanSchema = z.object({
    name: z.string().min(1, 'Nombre requerido').max(100),
    lender: z.string().min(1, 'Prestamista requerido').max(100),
    type: z.string().min(1),
    totalAmount: z.number().positive('Monto debe ser positivo').max(999999999),
    currentBalance: z.number().min(0).max(999999999),
    interestRate: z.number().min(0).max(100).optional(),
    termMonths: z.number().int().positive().optional(),
    monthlyPayment: z.number().positive().optional(),
    paymentDay: z.number().int().min(1).max(31).optional(),
    isAutomatic: z.boolean().default(false),
    profileId: z.number().int().positive(),
    startDate: z.date().optional(),
});

export const authSchema = z.object({
    email: z.string().email('Correo inválido'),
    password: z.string().min(8, 'Mínimo 8 caracteres').regex(/[A-Z]/, 'Debe contener al menos 1 mayúscula').regex(/[a-z]/, 'Debe contener al menos 1 minúscula').regex(/[0-9]/, 'Debe contener al menos 1 número'),
    name: z.string().min(1, 'Nombre requerido').max(100).optional(),
});

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
    const result = schema.safeParse(data);
    if (result.success) return { success: true, data: result.data };
    return { success: false, error: result.error.issues.map(e => e.message).join(', ') };
}
