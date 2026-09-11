-- Commit 2 del lote D-CF-14 (2026-09-11) — `EntityLink` tiene `@@unique([fromId, toId, label])`
-- con `label String?`, y Postgres trata dos NULL como distintos: dos enlaces sin rótulo entre las
-- mismas dos fichas pasaban los dos el índice único (ver el comentario en
-- `apps/api/src/links/links.service.ts`, junto a `create()`). Prisma no puede declarar un índice
-- parcial en `schema.prisma`, así que el esquema se queda igual y esta migración es la única
-- fuente de verdad del índice de abajo.
--
-- Antes de crear el índice hay que dejar como mucho una fila por (`fromId`,`toId`) sin `label`:
-- se borran todas menos la más antigua. `id` es un cuid, que ordena por tiempo de creación, así
-- que `MIN(id)` es la primera que se creó sin tener que mirar ninguna otra columna.
DELETE FROM "EntityLink" el
USING (
  SELECT "fromId", "toId", MIN(id) AS keep_id
  FROM "EntityLink"
  WHERE label IS NULL
  GROUP BY "fromId", "toId"
  HAVING count(*) > 1
) dup
WHERE el."fromId" = dup."fromId"
  AND el."toId" = dup."toId"
  AND el.label IS NULL
  AND el.id <> dup.keep_id;

-- El índice parcial: solo se aplica a las filas sin `label`, que es exactamente el hueco que
-- dejaba abierto `@@unique([fromId, toId, label])`. Los enlaces con `label` siguen protegidos
-- por ese índice normal, sin cambios.
CREATE UNIQUE INDEX "EntityLink_fromId_toId_nolabel_key" ON "EntityLink" ("fromId", "toId")
WHERE "label" IS NULL;
