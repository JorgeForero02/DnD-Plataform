-- Commit 1 del lote D-CF-14 (2026-09-11) — `RestKind` (`SHORT`/`LONG`) se creó en
-- `20260902141641_character_sheet_state_and_world` y nunca llegó a usarse como tipo de ningún
-- campo de ningún modelo: ni descanso corto ni largo se guardan hoy con este enum. Un guardián
-- genérico en `apps/api/src/prisma/no-dead-enum.spec.ts` lo detectó (todo `enum X` de
-- `schema.prisma` debe ser el tipo de algún campo) y se quita de raíz en vez de dejarlo muerto en
-- el cliente de Prisma.
DROP TYPE "RestKind";
