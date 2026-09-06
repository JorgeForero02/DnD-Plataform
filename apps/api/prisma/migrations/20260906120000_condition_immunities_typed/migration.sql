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
-- inventada pierde esa entrada y conserva todo lo demás: el DM la vuelve a poner desde el editor,
-- que ahora solo ofrece claves válidas. Borrar la criatura para salvar una etiqueta sería el peor
-- de los dos daños.
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
        WHEN 'charmed' THEN 'charmed'
        WHEN 'encantado' THEN 'charmed'
        WHEN 'deafened' THEN 'deafened'
        WHEN 'ensordecido' THEN 'deafened'
        WHEN 'frightened' THEN 'frightened'
        WHEN 'asustado' THEN 'frightened'
        WHEN 'grappled' THEN 'grappled'
        WHEN 'agarrado' THEN 'grappled'
        WHEN 'incapacitated' THEN 'incapacitated'
        WHEN 'incapacitado' THEN 'incapacitated'
        WHEN 'invisible' THEN 'invisible'
        WHEN 'paralyzed' THEN 'paralyzed'
        WHEN 'paralizado' THEN 'paralyzed'
        WHEN 'petrified' THEN 'petrified'
        WHEN 'petrificado' THEN 'petrified'
        WHEN 'poisoned' THEN 'poisoned'
        WHEN 'envenenado' THEN 'poisoned'
        WHEN 'prone' THEN 'prone'
        WHEN 'derribado' THEN 'prone'
        WHEN 'restrained' THEN 'restrained'
        WHEN 'apresado' THEN 'restrained'
        WHEN 'stunned' THEN 'stunned'
        WHEN 'aturdido' THEN 'stunned'
        WHEN 'unconscious' THEN 'unconscious'
        WHEN 'inconsciente' THEN 'unconscious'
        WHEN 'exhaustion' THEN 'exhaustion'
        WHEN 'agotamiento' THEN 'exhaustion'
        ELSE NULL
      END
    ) AS m(mapeado)
    WHERE mapeado IS NOT NULL
  ),
  '{}'::text[]
)
WHERE array_length("conditionImmunities", 1) IS NOT NULL;
