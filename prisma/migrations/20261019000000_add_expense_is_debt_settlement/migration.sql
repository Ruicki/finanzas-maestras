-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "isDebtSettlement" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: los gastos que payLoan/pagar-tarjeta ya generaron antes de esta
-- migracion no tienen forma de distinguirse de un gasto personal que el
-- usuario haya puesto en una categoria con el mismo nombre ("Deudas" /
-- "Pagos Tarjeta") -- ese es justo el bug que esta migracion corrige. Como
-- aproximacion, se marcan como isDebtSettlement los que ademas coinciden con
-- el nombre exacto que generan esos dos sitios ("Pago Prestamo: %" / "Pago: %"),
-- que es la unica senal historica disponible. Un gasto personal que por
-- coincidencia tenga ese mismo patron de nombre en esa categoria quedaria
-- marcado de mas -- revisable a mano despues si hace falta, pero mucho mas
-- preciso que excluir toda la categoria como se hacia hasta ahora.
UPDATE "Expense"
SET "isDebtSettlement" = true
WHERE "name" LIKE 'Pago Préstamo: %'
  AND (
    "category" IN ('Deudas', 'Pagos Tarjeta')
    OR "categoryId" IN (SELECT "id" FROM "Category" WHERE "name" IN ('Deudas', 'Pagos Tarjeta'))
  );

UPDATE "Expense"
SET "isDebtSettlement" = true
WHERE "name" LIKE 'Pago: %'
  AND (
    "category" IN ('Deudas', 'Pagos Tarjeta')
    OR "categoryId" IN (SELECT "id" FROM "Category" WHERE "name" IN ('Deudas', 'Pagos Tarjeta'))
  );
