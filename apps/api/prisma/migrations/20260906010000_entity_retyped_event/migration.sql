-- Plan 07, ficha I16 (2026-09-06): reclasificar una ficha deja rastro.
--
-- Cambiar el tipo en el editor convertia un PNJ con statblock, enlaces y comentarios en
-- «Documento» de un clic y SIN que quedara constancia. El registro es la auditoria de esta
-- aplicacion: un cambio de naturaleza que no aparece en el no se puede deshacer, porque nadie
-- sabe que paso.
--
-- `ALTER TYPE ... ADD VALUE` va SOLO en su migracion: PostgreSQL no deja usar un valor nuevo de
-- un enum en la misma transaccion que lo crea.
ALTER TYPE "GameEventType" ADD VALUE 'ENTITY_RETYPED';
