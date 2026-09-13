# Historial archivado — Tarea 2 del pulido: espacio reservado en `Field`, sticky con escalón y rejilla de Rasgos (2026-09-12)

**Movida entera** el 2026-09-13, al escribir la ronda de arreglo de la Task 10 del pulido (round
1 de revisión): el fichero seguía por encima de 1000 y era la entrada completa más antigua. Su
hito se queda en `07-historial.md`.

---

## Tarea 2 del pulido: espacio reservado en `Field`, sticky con escalón y rejilla de Rasgos (2026-09-12)

Qué — `Field` gana `reservaEspacio?: boolean` (anexo #8): con él, la línea de pista/error
(`data-testid="field-linea"`) se pinta siempre con `min-h-[1.125rem]`, vacía si no hay nada que
decir, para que el control no salte de alto cuando el evaluador de la expresión de dados hace
aparecer y desaparecer el error mientras se escribe; los dos `Field label="Qué se tira"`
(`apps/web/src/features/rolls/PanelDeDados.tsx` y
`apps/web/src/features/rolls/panel/PanelDeDadosDeLaMesa.tsx`) lo activan. `DetalleDeObjeto.tsx` (panel
sticky de la pestaña Objetos) pasa de `lg:top-s4` a
`lg:top-[calc(var(--tira-fija-top,0px)+var(--space-4))]` para respetar el escalón de la banda
fija (`--tira-fija-top`, 4rem en `AppShell`, 0px en `Dialog`) en vez de clavarse siempre a 1rem.
`Rasgos.tsx` (anexo #7) mete Ficha y Personalidad en una sub-rejilla de una columna a la
izquierda y `RasgosYAptitudes` sola a la derecha — antes las tres eran hermanas de una rejilla a
dos columnas y el motor de rejilla repartía dos-y-una, dejando un hueco vacío bajo la tarjeta más
corta. **Corrección (Tarea 15, 2026-09-13): esta línea decía «el DOM accesible no cambia, solo el
envoltorio» — era falsa. El orden SÍ cambia: Personalidad pasa de ser hermana suelta de Ficha y
RasgosYAptitudes a vivir dentro de la sub-rejilla junto a Ficha, así que un lector de pantalla que
recorra el DOM encuentra Personalidad inmediatamente después de Ficha y antes de
RasgosYAptitudes — antes las tres eran hermanas en un orden distinto. El contenido de cada tarjeta
no cambia, y por eso** la unitaria de las tres regiones (`Rasgos.test.tsx`) sigue en verde sin
tocarla. Dos casos nuevos en `Field.test.tsx`: con
`reservaEspacio` la línea existe vacía con `min-h-`, sin él no se pinta. Verificado por mutación:
`cp Field.tsx Field.tsx.bak`, se quitó `min-h-[1.125rem]` de las tres clases condicionales →
`con reservaEspacio, la línea de pista existe...` FAIL (`expected 'font-chrome text-chrome-xs'
to match /min-h-/`), restaurado con `cp` y borrado el `.bak`; por qué — tarea 2 del
[plan de pulido](../superpowers/specs/2026-09-12-pulido-antes-del-paso-3-design.md), anexos #6, #7
y #8 de la nota de diseño de la tarea 0; la medida en navegador de #6 (escalón del sticky) y #8
(salto de alto del Field) la escribe la Tarea 4 en `espacios.spec.ts`, no esta; revertir —
`git revert` del commit de esta tarea.
