-- La fecha de pago que el usuario elige al registrar un salario (fix de
-- bugs de fechas: antes el historial usaba createdAt, el instante en que se
-- guarda el registro, en vez de la fecha real de cobro).
--
-- IF NOT EXISTS por la misma razon que la migracion de colorTheme: no se sabe
-- con certeza en que bases quedo creada ya a mano.
ALTER TABLE "Salary" ADD COLUMN IF NOT EXISTS "paymentDate" TIMESTAMP(3);
