-- Plan 03, D-OP-12 (2026-09-05): los sucesos tienen concesiones nominales.
--
-- `GameEventsService.canSee` evaluaba `canView` con `grantedUserIds: []` SIEMPRE, asi que un
-- suceso `SPECIFIC_PLAYERS` no lo veia nadie salvo el DM — ni siquiera el jugador al que se le
-- acababa de conceder la ficha. `entities.service.ts` guardaba `DM_ONLY` en su lugar, con un
-- comentario que lo llamaba parche honesto a la espera de esta columna.
--
-- Columna `TEXT[]` y no tabla de union: el filtrado ocurre en memoria tras el `findMany`, asi que
-- una tabla obligaria a un `include` para nada. Lo que se pierde —integridad referencial— es
-- inofensivo: `canView` solo pregunta si el espectador esta en la lista.
--
-- NOT NULL a proposito: una lista de concesiones vacia y una lista ausente serian lo mismo, y
-- Prisma declara los campos de lista como no nulos. Dejarla nullable seria deriva silenciosa.
ALTER TABLE "GameEvent"
  ADD COLUMN "grantedUserIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
