-- RedefineTables
PRAGMA foreign_keys=OFF;
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Expense_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Expense" ("amount", "category", "createdAt", "dueDate", "id", "isRecurring", "name", "profileId") SELECT "amount", "category", "createdAt", "dueDate", "id", "isRecurring", "name", "profileId" FROM "Expense";
DROP TABLE "Expense";
ALTER TABLE "new_Expense" RENAME TO "Expense";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
