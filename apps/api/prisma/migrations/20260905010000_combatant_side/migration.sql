-- Plan 02 (2026-09-05): el bando de un combatiente vive en el ENCUENTRO, no en `Character`.
-- «Enemigo» no es una propiedad de una criatura: es una relacion en un momento. Un
-- `Character.faction` habria que mantenerlo sincronizado con la ficcion y se pudre el dia que el
-- mercader se vuelve enemigo.
--
-- `NEUTRAL` por defecto, y NO `ENEMY`: las filas que ya existen se crearon sin bando, y un valor
-- por defecto que AFIRME algo las convertiria en una afirmacion que nadie hizo. `NEUTRAL`
-- significa literalmente «no se ha dicho».
CREATE TYPE "CombatantSide" AS ENUM ('ALLY', 'ENEMY', 'NEUTRAL');

ALTER TABLE "Combatant" ADD COLUMN "side" "CombatantSide" NOT NULL DEFAULT 'NEUTRAL';
