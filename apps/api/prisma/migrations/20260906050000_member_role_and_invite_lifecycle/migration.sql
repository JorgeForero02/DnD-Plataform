-- Plan 11 (2026-09-06): administrar la mesa.
--
-- D2: cambiar el papel de un miembro deja rastro, porque es un cambio de PERMISOS.
-- A3/D3b: una invitacion puede caducar y puede revocarse.
--
-- Las dos columnas son NULABLES a proposito: los enlaces ya repartidos siguen valiendo igual que
-- ayer. Poner una caducidad a todos de golpe habria invalidado invitaciones que alguien tiene en
-- un chat, sin avisar a nadie.
--
-- `revokedAt` NO es `usedAt`: un enlace gastado y uno revocado son dos hechos distintos y el
-- listado tiene que poder distinguirlos.
ALTER TABLE "Invite" ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "Invite" ADD COLUMN "revokedAt" TIMESTAMP(3);
