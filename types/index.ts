import { Profile, Expense, Goal, AdditionalIncome, Salary, CreditCard, Loan, Account, Category } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Helper recursivo para convertir Decimal a number
type Serialized<T> = {
    [P in keyof T]: T[P] extends Decimal ? number : T[P] extends Decimal | null ? number | null : T[P] extends object ? Serialized<T[P]> : T[P];
};

// Como las relaciones no son objetos simples en los tipos base de Prisma (son tipos, no instancias), 
// el helper recursivo podría ser muy agresivo o fallar con Dates.
// Vamos a ser más específicos para evitar problemas con Date.

type SafeSerialized<T> = {
    [P in keyof T]: T[P] extends Decimal ? number :
    T[P] extends Decimal | null ? number | null :
    T[P]
};

export type ProfileWithData = SafeSerialized<Profile> & {
    expenses: (SafeSerialized<Expense> & { categoryRel?: SafeSerialized<Category> | null })[];
    goals: SafeSerialized<Goal>[];
    incomes: SafeSerialized<AdditionalIncome>[];
    salaries: SafeSerialized<Salary>[];
    creditCards: SafeSerialized<CreditCard>[];
    loans: SafeSerialized<Loan>[];
    accounts: SafeSerialized<Account>[];
    categories: SafeSerialized<Category>[];
};
