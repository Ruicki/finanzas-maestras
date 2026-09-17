-- El tema de color guardado en la cuenta (PR #32).
--
-- Esta columna se añadio al esquema y se desplego, pero el ALTER TABLE que le
-- correspondia no llego a la base que usa el despliegue. Como Prisma selecciona
-- todos los campos escalares del modelo en cada lectura, TODA lectura de perfil
-- empezo a fallar y la aplicacion entera dejo de cargar.
--
-- IF NOT EXISTS porque no se sabe con certeza en que bases quedo creada: en las
-- que ya la tengan, esto no hace nada.
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "colorTheme" TEXT;
