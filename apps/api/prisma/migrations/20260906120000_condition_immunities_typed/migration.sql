-- Paso 1, tarea 2 (2026-09-06) — `conditionImmunities` deja de ser prosa.
--
-- El campo era texto libre mientras sus dos vecinas (`damageImmunities`, `damageVulnerabilities`)
-- ya estaban tipadas, así que **nadie podía consumirlo**: un "veneno" escrito a mano no cruza con
-- la clave `poisoned` que usa el motor. El esquema de `@dnd/shared` pasa a exigir una de las
-- quince del SRD, y esta migración pone al día lo que ya estuviera guardado.
--
-- **La columna es `text[]`, no `jsonb`** — comprobado contra la base el 2026-09-06, y por eso
-- esto no se parece a lo que proponía el plan.
--
-- **Lo que no se reconoce se deja fuera, y la fila NO se borra.** Un statblock con una inmunidad
-- inventada pierde esa entrada y conserva todo lo demás; borrar la criatura para salvar una
-- etiqueta sería el peor de los dos daños. **La pérdida es irreversible**: revertir el commit no
-- devuelve la etiqueta.
--
-- Aquí ponía que «el DM la vuelve a poner desde el editor», y **era falso**: el editor de
-- criaturas no tiene ningún control para las inmunidades a condición (lo encontró la revisión).
-- Por eso el mapa de abajo se amplió con las formas femeninas y con `veneno`, que son justo las
-- que escribiría a mano quien no las puede volver a escribir.
--
-- `array_agg(DISTINCT …)` reordena alfabéticamente y reescribe **toda** fila no vacía, también
-- las que ya estaban limpias. Es idempotente —los valores canónicos se mapean a sí mismos— y nada
-- del código depende del orden, pero no es un no-op.
--
-- Medido antes de escribirla: en la base de desarrollo hay 1 statblock propio y su lista está
-- **vacía**, así que aquí no se mapea nada. Se escribe igual porque producción es otra base y
-- nadie puede mirar dentro desde aquí.

UPDATE "CampaignStatblock"
SET "conditionImmunities" = COALESCE(
  (
    SELECT array_agg(DISTINCT mapeado)
    FROM unnest("conditionImmunities") AS crudo,
    LATERAL (
      SELECT CASE lower(btrim(crudo))
        WHEN 'blinded' THEN 'blinded'
        WHEN 'cegado' THEN 'blinded'
        WHEN 'cegada' THEN 'blinded'
        WHEN 'charmed' THEN 'charmed'
        WHEN 'encantado' THEN 'charmed'
        WHEN 'encantada' THEN 'charmed'
        WHEN 'deafened' THEN 'deafened'
        WHEN 'ensordecido' THEN 'deafened'
        WHEN 'ensordecida' THEN 'deafened'
        WHEN 'sordo' THEN 'deafened'
        WHEN 'sorda' THEN 'deafened'
        WHEN 'frightened' THEN 'frightened'
        WHEN 'asustado' THEN 'frightened'
        WHEN 'asustada' THEN 'frightened'
        WHEN 'aterrorizado' THEN 'frightened'
        WHEN 'aterrorizada' THEN 'frightened'
        WHEN 'grappled' THEN 'grappled'
        WHEN 'agarrado' THEN 'grappled'
        WHEN 'agarrada' THEN 'grappled'
        WHEN 'apresado por agarre' THEN 'grappled'
        WHEN 'incapacitated' THEN 'incapacitated'
        WHEN 'incapacitado' THEN 'incapacitated'
        WHEN 'incapacitada' THEN 'incapacitated'
        WHEN 'invisible' THEN 'invisible'
        WHEN 'paralyzed' THEN 'paralyzed'
        WHEN 'paralizado' THEN 'paralyzed'
        WHEN 'paralizada' THEN 'paralyzed'
        WHEN 'petrified' THEN 'petrified'
        WHEN 'petrificado' THEN 'petrified'
        WHEN 'petrificada' THEN 'petrified'
        WHEN 'poisoned' THEN 'poisoned'
        WHEN 'envenenado' THEN 'poisoned'
        WHEN 'envenenada' THEN 'poisoned'
        WHEN 'veneno' THEN 'poisoned'
        WHEN 'prone' THEN 'prone'
        WHEN 'derribado' THEN 'prone'
        WHEN 'derribada' THEN 'prone'
        WHEN 'tumbado' THEN 'prone'
        WHEN 'tumbada' THEN 'prone'
        WHEN 'restrained' THEN 'restrained'
        WHEN 'apresado' THEN 'restrained'
        WHEN 'apresada' THEN 'restrained'
        WHEN 'stunned' THEN 'stunned'
        WHEN 'aturdido' THEN 'stunned'
        WHEN 'aturdida' THEN 'stunned'
        WHEN 'unconscious' THEN 'unconscious'
        WHEN 'inconsciente' THEN 'unconscious'
        WHEN 'exhaustion' THEN 'exhaustion'
        WHEN 'exhausted' THEN 'exhaustion'
        WHEN 'agotamiento' THEN 'exhaustion'
        WHEN 'agotado' THEN 'exhaustion'
        WHEN 'agotada' THEN 'exhaustion'
        ELSE NULL
      END
    ) AS m(mapeado)
    WHERE mapeado IS NOT NULL
  ),
  '{}'::text[]
)
WHERE array_length("conditionImmunities", 1) IS NOT NULL;
