-- Plan 11, ficha D3b (2026-09-06): el listado de invitaciones dice QUIEN la uso.
--
-- `usedAt` decia cuando y no quien, y un listado que no puede decir «esta se la di a Marta y entro
-- Marta» no sirve para administrar una mesa.
--
-- Sin clave foranea a proposito: es un dato historico del enlace, no una arista del modelo, y
-- borrar una cuenta no tiene que borrar la invitacion que uso.
ALTER TABLE "Invite" ADD COLUMN "usedById" TEXT;
