# Archivo — Las decisiones del autor sobre el cubo D (2026-09-10)

Movida entera desde `docs/07-historial.md` el 2026-09-12, al escribir la línea de la Tarea 4 del
pulido (`e2e/espacios.spec.ts`): el fichero quedaba en 1012 de 1000 y esta era la entrada completa
más antigua. Sin reescribir.

---

## Las decisiones del autor sobre el cubo D, y nueve fichas que cierran solas (2026-09-10)

**Qué.** Se le llevaron al autor las ~28 fichas que la clasificación dejó en «decide el autor»,
cada una con opciones y una recomendación medida contra el código y el SRD; **aprobó todas**, con
una corrección: *«las que digan hasta jugar me gustaría cerrar antes; no quiero cosas molestas en
una partida»*. Salen veinte filas nuevas en [decisiones.md](../decisiones.md) (`D-CF-2`–`D-CF-21`),
**nueve fichas se archivan sin código** porque el código ya las decidía —M10b (no hay
`ENTITY_UPDATED`), H8 (medido: ~6,5 ms por regla y apertura), H9, D6, D7, A3-invitaciones, M11,
retención y «el taller convive»—, y el resto queda con su decisión escrita esperando manos: una
tanda de migraciones al cerrar la fase 2, dos cosas al paso 3, seis con código en esta sesión y la
mesa a 390 px a la fase 3. Con ello `05-datos.md` gana retención, `ownerId`, `isAdmin` y la hidra
falsa, **y pierde una frase falsa desde el 2026-09-03**: decía que el dueño no ve su personaje
`DM_ONLY`, y `character-viewer.ts` se lo enseña desde entonces.

**Por qué.** Una ficha «decide el autor» que no lleva opciones ni medición se queda abierta para
siempre; las nueve que cierran solas llevaban meses esperando una decisión que ya estaba tomada en
otro fichero.

**Cómo revertir.** `git revert`: las nueve vuelven al 06 y las filas `D-CF-*` desaparecen. Las
decisiones seguirían siendo del autor; solo perderían su registro.
