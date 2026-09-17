-- Baseline del esquema completo.
--
-- Escrita para poder correr sobre una base que YA EXISTE sin tocarla: cada
-- sentencia es un no-op si el objeto ya esta. No hay DROP, DELETE ni TRUNCATE,
-- asi que no puede perderse un dato.
--
-- Hace falta asi porque este repositorio vivio sin migraciones: la base de
-- produccion se fue construyendo con `prisma db push` a mano, y no hay forma de
-- saber desde el repositorio en que estado quedo. Marcarla como aplicada sin
-- ejecutarla —lo habitual al adoptar migraciones— obligaria a correr un comando
-- contra la base; asi el primer despliegue la adopta solo.
--
-- Las claves foraneas van envueltas porque Postgres no admite
-- ADD CONSTRAINT IF NOT EXISTS.

-- CreateTable
CREATE TABLE IF NOT EXISTS "AdditionalIncome" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" TEXT NOT NULL,
    "frequency" TEXT,
    "durationMonths" INTEGER,
    "profileId" INTEGER NOT NULL,
    "accountId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" TIMESTAMP(3),
    "icon" TEXT NOT NULL DEFAULT 'Wallet',

    CONSTRAINT "AdditionalIncome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Salary" (
    "id" SERIAL NOT NULL,
    "grossVal" DECIMAL(10,2) NOT NULL,
    "netVal" DECIMAL(10,2) NOT NULL,
    "taxes" DECIMAL(10,2) NOT NULL,
    "socialSec" DECIMAL(10,2) NOT NULL,
    "eduIns" DECIMAL(10,2) NOT NULL,
    "incomeTax" DECIMAL(10,2) NOT NULL,
    "bonus" DECIMAL(10,2) NOT NULL,
    "absentDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "company" TEXT,
    "profileId" INTEGER,
    "accountId" INTEGER,
    "isManualCalculation" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Salary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Profile" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "customDeductions" TEXT,
    "email" TEXT,
    "password" TEXT,
    "accessCode" TEXT,
    "onboardingSeenAt" TIMESTAMP(3),
    "colorTheme" TEXT,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Expense" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" TEXT NOT NULL,
    "categoryId" INTEGER,
    "dueDate" INTEGER,
    "graceDays" INTEGER,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "isOneTime" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceType" TEXT DEFAULT 'MONTHLY',
    "paymentMethod" TEXT,
    "linkedCardId" INTEGER,
    "profileId" INTEGER NOT NULL,
    "accountId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPaidAt" TIMESTAMP(3),
    "isProjected" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "monthlyLimit" DECIMAL(10,2),
    "profileId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRollover" BOOLEAN NOT NULL DEFAULT false,
    "rolloverBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CategoryBudget" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "limit" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Goal" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "targetAmount" DECIMAL(10,2) NOT NULL,
    "currentAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3),
    "type" TEXT NOT NULL DEFAULT 'VARIABLE',
    "frequency" TEXT,
    "contributionAmount" DECIMAL(10,2),
    "priority" TEXT DEFAULT 'MEDIUM',
    "category" TEXT,
    "notes" TEXT,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "sourceAccountId" INTEGER,
    "destinationAccountId" INTEGER,
    "profileId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GoalTransaction" (
    "id" SERIAL NOT NULL,
    "goalId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "note" TEXT,
    "accountId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CreditCard" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "limit" DECIMAL(10,2) NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cutoffDay" INTEGER NOT NULL,
    "paymentDay" INTEGER NOT NULL,
    "interestRate" DECIMAL(6,2),
    "annualFee" DECIMAL(10,2),
    "minPaymentPercentage" DECIMAL(6,2) DEFAULT 3.0,
    "insuranceRate" DECIMAL(6,2) DEFAULT 0.25,
    "itbmsRate" DECIMAL(4,2) DEFAULT 0.07,
    "minPaymentFloor" DECIMAL(10,2) DEFAULT 0,
    "profileId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "annualFeeMonth" INTEGER,
    "bank" TEXT,
    "lateFee" DECIMAL(10,2) DEFAULT 25.0,

    CONSTRAINT "CreditCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Loan" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "lender" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "currentBalance" DECIMAL(12,2) NOT NULL,
    "interestRate" DECIMAL(6,2),
    "termMonths" INTEGER,
    "monthlyPayment" DECIMAL(10,2),
    "paymentDay" INTEGER,
    "isAutomatic" BOOLEAN NOT NULL DEFAULT false,
    "lastInterestAppliedAt" TIMESTAMP(3),
    "profileId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Account" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'SPENDING',
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "symbol" TEXT,
    "profileId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "lockDate" TIMESTAMP(3),

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Transfer" (
    "id" SERIAL NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceAccountId" INTEGER NOT NULL,
    "destinationAccountId" INTEGER NOT NULL,
    "exchangeRate" DECIMAL(12,6),
    "sourceAmount" DECIMAL(12,6),
    "destAmount" DECIMAL(12,6),

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "actorId" INTEGER,
    "targetId" INTEGER,
    "profileId" INTEGER,
    "oldBalance" DECIMAL(12,2),
    "newBalance" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdditionalIncome_profileId_idx" ON "AdditionalIncome"("profileId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdditionalIncome_accountId_idx" ON "AdditionalIncome"("accountId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Salary_profileId_idx" ON "Salary"("profileId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Salary_accountId_idx" ON "Salary"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Profile_email_key" ON "Profile"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Profile_accessCode_key" ON "Profile"("accessCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Expense_profileId_idx" ON "Expense"("profileId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Expense_accountId_idx" ON "Expense"("accountId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Expense_categoryId_idx" ON "Expense"("categoryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Expense_createdAt_idx" ON "Expense"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Category_profileId_idx" ON "Category"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CategoryBudget_categoryId_year_month_key" ON "CategoryBudget"("categoryId", "year", "month");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Goal_profileId_idx" ON "Goal"("profileId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GoalTransaction_goalId_idx" ON "GoalTransaction"("goalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CreditCard_profileId_idx" ON "CreditCard"("profileId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Loan_profileId_idx" ON "Loan"("profileId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Account_profileId_idx" ON "Account"("profileId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transfer_sourceAccountId_idx" ON "Transfer"("sourceAccountId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transfer_destinationAccountId_idx" ON "Transfer"("destinationAccountId");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "AdditionalIncome" ADD CONSTRAINT "AdditionalIncome_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "AdditionalIncome" ADD CONSTRAINT "AdditionalIncome_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Salary" ADD CONSTRAINT "Salary_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Salary" ADD CONSTRAINT "Salary_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Expense" ADD CONSTRAINT "Expense_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Expense" ADD CONSTRAINT "Expense_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Category" ADD CONSTRAINT "Category_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "CategoryBudget" ADD CONSTRAINT "CategoryBudget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Goal" ADD CONSTRAINT "Goal_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "GoalTransaction" ADD CONSTRAINT "GoalTransaction_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "CreditCard" ADD CONSTRAINT "CreditCard_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Loan" ADD CONSTRAINT "Loan_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Account" ADD CONSTRAINT "Account_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_destinationAccountId_fkey" FOREIGN KEY ("destinationAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_sourceAccountId_fkey" FOREIGN KEY ("sourceAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

