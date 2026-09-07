-- Encargo A8 (2026-09-07) — un personaje tiene UNA subclase, no todas.
--
-- Hasta esta columna, `resolve.ts` recorría todas las subclases de la clase y aplicaba sus
-- rasgos por nivel: un bárbaro de nivel 3 tenía a la vez los rasgos de cada camino que el
-- catálogo definiera para "bárbaro". Es un fallo vivo en producción, no una mejora.
--
-- Nulable y sin clave foránea, igual que `classKey`: el catálogo del SRD vive en código
-- (`apps/api/src/rules/catalog/classes.ts`), no en una tabla. `null` = todavía no ha elegido
-- camino.
ALTER TABLE "Character" ADD COLUMN "subclassKey" TEXT;
