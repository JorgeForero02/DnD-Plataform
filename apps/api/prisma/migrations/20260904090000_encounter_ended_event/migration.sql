-- Tarea 2.5.6: terminar un encuentro deja su propio suceso. Entrar en combate es un momento y
-- salir también; sin esto la línea de tiempo tiene principio y ningún final.
ALTER TYPE "GameEventType" ADD VALUE 'ENCOUNTER_ENDED';
