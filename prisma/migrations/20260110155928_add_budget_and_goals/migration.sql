-- CreateTable
CREATE TABLE "Profile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "category" TEXT NOT NULL,
    "dueDate" INTEGER,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "profileId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Expense_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "targetAmount" REAL NOT NULL,
    "currentAmount" REAL NOT NULL DEFAULT 0,
    "deadline" DATETIME,
    "profileId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Goal_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    CONSTRAINT "Salary_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Salary" ("bonus", "createdAt", "eduIns", "grossVal", "id", "incomeTax", "netVal", "socialSec", "taxes") SELECT "bonus", "createdAt", "eduIns", "grossVal", "id", "incomeTax", "netVal", "socialSec", "taxes" FROM "Salary";
DROP TABLE "Salary";
ALTER TABLE "new_Salary" RENAME TO "Salary";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
