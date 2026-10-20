-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "creditCardSettledId" INTEGER,
ADD COLUMN     "loanId" INTEGER;

-- CreateIndex
CREATE INDEX "Expense_loanId_idx" ON "Expense"("loanId");

-- CreateIndex
CREATE INDEX "Expense_creditCardSettledId_idx" ON "Expense"("creditCardSettledId");

-- Backfill best-effort: enlazar los pagos de deuda ya existentes (marcados
-- isDebtSettlement = true por la migracion anterior) con su prestamo/tarjeta,
-- usando el nombre que genera payLoan/pagar-tarjeta ("Pago Prestamo: <nombre
-- del prestamo>" / "Pago: <nombre de la tarjeta>") contra el nombre ACTUAL del
-- prestamo/tarjeta. No es infalible (un prestamo renombrado despues del pago
-- no va a machear), pero es la unica senal disponible para datos historicos.
UPDATE "Expense" e
SET "loanId" = l.id
FROM "Loan" l
WHERE e."isDebtSettlement" = true
  AND e."loanId" IS NULL
  AND e."profileId" = l."profileId"
  AND e."name" = 'Pago Préstamo: ' || l."name";

UPDATE "Expense" e
SET "creditCardSettledId" = c.id
FROM "CreditCard" c
WHERE e."isDebtSettlement" = true
  AND e."creditCardSettledId" IS NULL
  AND e."profileId" = c."profileId"
  AND e."name" = 'Pago: ' || c."name";
