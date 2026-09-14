-- PNJ del mundo y la mesa (2026-09-14, spec §3.3): «Garrik sale del combate».
-- Revertir: un valor de enum no se quita sin reescribir el tipo; se deja.
ALTER TYPE "GameEventType" ADD VALUE 'COMBATANT_LEFT';
