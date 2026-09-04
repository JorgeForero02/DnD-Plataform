-- La clave del grupo se guarda en la fila del combatiente.
--
-- No se recalcula desde `Character.statblockRef` porque el DM puede **sacar a uno de su grupo**
-- corrigiendo su iniciativa (SRD 5.1, «Initiative»: los empates los decide el GM), y eso es un
-- hecho del encuentro, no del personaje: el goblin sigue siendo un goblin.
--
-- Sin DEFAULT permanente a proposito. La tabla se creo en `20260904040055` y esta vacia en todas
-- partes —la funcionalidad no ha salido de desarrollo—, asi que no hay filas que rellenar; el
-- DEFAULT existe solo el tiempo de anadir la columna NOT NULL.
ALTER TABLE "Combatant" ADD COLUMN "groupKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Combatant" ALTER COLUMN "groupKey" DROP DEFAULT;
