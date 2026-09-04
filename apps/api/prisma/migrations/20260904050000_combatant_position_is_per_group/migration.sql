-- La posicion de un combatiente es la de su GRUPO, no la suya: varios combatientes idénticos
-- comparten una entrada del orden de turnos.
--
-- SRD 5.1, «Initiative»: "The DM makes one roll for an entire group of identical creatures, so
-- each member of the group acts at the same time." Actuar a la vez es ocupar UNA entrada del
-- orden, asi que dos personajes y seis goblins son ocho combatientes y SIETE posiciones.
--
-- La migracion anterior (20260904040055) puso `UNIQUE (encounterId, position)`, que hace
-- imposible ese agrupamiento. Va en una migracion aparte y no reescribiendo aquella porque
-- aquella ya se aplico en dos bases de desarrollo: una migracion aplicada no se edita.
--
-- Lo que si puede garantizar la base, y es lo que de verdad importa: un personaje no aparece
-- dos veces en el mismo encuentro.
DROP INDEX "Combatant_encounterId_position_key";

CREATE UNIQUE INDEX "Combatant_encounterId_characterId_key" ON "Combatant"("encounterId", "characterId");

