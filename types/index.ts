import { Profile, Expense, Goal, AdditionalIncome, Salary, CreditCard, Loan, Account, Category } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

type SafeSerialized<T> = {
    [P in keyof T]: T[P] extends Decimal ? number :
    T[P] extends Decimal | null ? number | null :
    T[P]
};

export type SerializedCategoryBudget = {
    id: number;
    categoryId: number;
    year: number;
    month: number;
    limit: number;
    createdAt: Date;
};

export type ProfileWithData = SafeSerialized<Profile> & {
    expenses: (SafeSerialized<Expense> & { categoryRel?: SafeSerialized<Category> | null })[];
    goals: SafeSerialized<Goal>[];
    incomes: SafeSerialized<AdditionalIncome>[];
    salaries: SafeSerialized<Salary>[];
    creditCards: SafeSerialized<CreditCard>[];
    loans: SafeSerialized<Loan>[];
    accounts: SafeSerialized<Account>[];
    categories: (SafeSerialized<Category> & {
        budgets?: SerializedCategoryBudget[];
        monthlyLimit?: number | null;
        rolloverBalance?: number;
    })[];
};
