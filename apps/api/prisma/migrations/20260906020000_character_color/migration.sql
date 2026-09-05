-- Plan 05, decision D3 (2026-09-06): cada personaje tiene SU color.
--
-- Hasta hoy el color de voz del hilo era una huella del `actorUserId` sobre CUATRO tonos: con
-- cinco personas dos comparten color y nadie podia arreglarlo. Y el retrato del elenco era cobre
-- para todos, porque el campo no existia.
--
-- Nulable y SIN valor por defecto: `null` significa «no lo he elegido, dame el de por defecto», y
-- ese defecto lo calcula la pantalla como huella del id del personaje. Un valor escrito significa
-- «lo elegi yo» y no se pisa nunca.
ALTER TABLE "Character" ADD COLUMN "color" TEXT;
