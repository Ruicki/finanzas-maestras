-- CreateTable
CREATE TABLE "Salary" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "grossVal" REAL NOT NULL,
    "netVal" REAL NOT NULL,
    "taxes" REAL NOT NULL,
    "socialSec" REAL NOT NULL,
    "eduIns" REAL NOT NULL,
    "incomeTax" REAL NOT NULL,
    "bonus" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
