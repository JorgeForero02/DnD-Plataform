-- Encargo B1 (2026-09-07) — una fila de tabla del DM puede entregar objetos y monedas.
--
-- `entrega` es opcional a propósito: la misma tabla sirve para rumores y encuentros, que no
-- entregan nada, y esas filas no cambian en absoluto. La forma la valida `entregaSchema`
-- (`packages/shared/src/dm-table.schema.ts`), nunca una consulta contra esta columna: es un
-- `Json` que se lee entero al tirar la tabla y no se filtra jamás por su contenido.
ALTER TABLE "DmTableEntry" ADD COLUMN "entrega" JSONB;
