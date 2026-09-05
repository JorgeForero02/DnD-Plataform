-- Plan 02 (2026-09-05): la cronica sale del Json y estrena su propia visibilidad.
--
-- Vivia dentro de `notes` (Json?) y elegir quien la veia NO HACIA NADA: el servicio publicaba el
-- suceso de cierre con la visibilidad de la SESION. Ademas `notes` lo escribe tambien el motor de
-- reglas como array de cadenas (`ADD_SESSION_NOTE`), asi que una nota de una regla borraba la
-- cronica en silencio.
--
-- Es columna y no Json porque SE FILTRA: «donde se quedo» en el listado de campanas trae la
-- cronica de la ultima sesion cerrada, filtrada por visibilidad.
ALTER TABLE "Session" ADD COLUMN "recap" TEXT;
ALTER TABLE "Session" ADD COLUMN "recapVisibility" "Visibility" NOT NULL DEFAULT 'PLAYERS';

-- Se mueve lo que ya hay. `notes ? 'recap'` es el operador de existencia de clave de Postgres, y
-- en un fichero .sql de Prisma no hay que escaparlo.
UPDATE "Session"
SET "recap" = "notes"->>'recap'
WHERE "notes" ? 'recap' AND "notes"->>'recap' IS NOT NULL;

-- NO se borra la clave de `notes`: dejarla es barato y hace la vuelta atras trivial. Se limpia en
-- otra migracion, cuando conste que nadie la lee.
