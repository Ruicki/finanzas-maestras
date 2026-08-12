-- CreateTable
CREATE TABLE "Account" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "balance" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "profileId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Account_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Salary" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "grossVal" REAL NOT NULL,
    "netVal" REAL NOT NULL,
    "taxes" REAL NOT NULL,
    "socialSec" REAL NOT NULL,
    "eduIns" REAL NOT NULL,
    "incomeTax" REAL NOT NULL,
    "bonus" REAL NOT NULL,
    "absentDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "company" TEXT,
    "profileId" INTEGER,
    "accountId" INTEGER,
    CONSTRAINT "Salary_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Salary_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Salary" ("absentDays", "bonus", "company", "createdAt", "eduIns", "grossVal", "id", "incomeTax", "netVal", "profileId", "socialSec", "taxes") SELECT "absentDays", "bonus", "company", "createdAt", "eduIns", "grossVal", "id", "incomeTax", "netVal", "profileId", "socialSec", "taxes" FROM "Salary";
DROP TABLE "Salary";
ALTER TABLE "new_Salary" RENAME TO "Salary";
CREATE TABLE "new_Expense" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "category" TEXT NOT NULL,
    "dueDate" INTEGER,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "isOneTime" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethod" TEXT,
    "linkedCardId" INTEGER,
    "profileId" INTEGER NOT NULL,
    "accountId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Expense_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Expense_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Expense" ("amount", "category", "createdAt", "dueDate", "id", "isOneTime", "isRecurring", "linkedCardId", "name", "paymentMethod", "profileId") SELECT "amount", "category", "createdAt", "dueDate", "id", "isOneTime", "isRecurring", "linkedCardId", "name", "paymentMethod", "profileId" FROM "Expense";
DROP TABLE "Expense";
ALTER TABLE "new_Expense" RENAME TO "Expense";
CREATE TABLE "new_AdditionalIncome" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "frequency" TEXT,
    "durationMonths" INTEGER,
    "profileId" INTEGER NOT NULL,
    "accountId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdditionalIncome_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AdditionalIncome_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AdditionalIncome" ("amount", "createdAt", "durationMonths", "frequency", "id", "name", "profileId", "type") SELECT "amount", "createdAt", "durationMonths", "frequency", "id", "name", "profileId", "type" FROM "AdditionalIncome";
DROP TABLE "AdditionalIncome";
ALTER TABLE "new_AdditionalIncome" RENAME TO "AdditionalIncome";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
