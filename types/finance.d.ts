export interface SalaryData {
  grossVal: number;
  bonus: number;
  taxes:     number;
  netVal:    number;
  socialSec: number;
  eduIns:    number;
  incomeTax: number;
  company?: string;
  absentDays: number;
  profileId?: number;
  accountId?: number;
}

export interface TaxBreakdown {
  socialSec: number;
  eduIns: number;
  incomeTax: number;
  totalTaxes: number;
}

export interface FinancialTransaction {
  accountId: number;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  description?: string;
  referenceId?: number;
}

// Utility Types
export type CreateSalaryDto = Omit<SalaryData, "id">;
export type SalaryCalculationResult = TaxBreakdown & { netVal: number, grossAfterAbsence: number };
