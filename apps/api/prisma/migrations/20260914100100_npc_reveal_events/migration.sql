-- PNJ del mundo y la mesa (2026-09-14, spec §3.2): «Garrik entra en escena» / se oculta.
-- Revertir: un valor de enum no se quita sin reescribir el tipo; se deja.
ALTER TYPE "GameEventType" ADD VALUE 'NPC_REVEALED';
ALTER TYPE "GameEventType" ADD VALUE 'NPC_HIDDEN';
