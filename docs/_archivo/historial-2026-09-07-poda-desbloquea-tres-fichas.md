# Archivo — Lo que la poda desbloqueó: tres fichas que ya se podían cerrar (2026-09-07)

Movida entera desde `docs/07-historial.md` el 2026-09-13, al escribir la línea de la Tarea 9 del
pulido (`dice[]` por dado): el fichero seguía por encima de 1000 tras los dos primeros cortes de
la noche y esta era la entrada completa más antigua. Sin reescribir.

---

## Lo que la poda desbloqueó: tres fichas que ya se podían cerrar (2026-09-07)

Ninguna era nueva. Las tres llevaban semanas con una cláusula «Cierra cuando…» **que el paso 2
había cumplido la noche anterior y nadie había notado**, porque una condición de cierre no se
revisa sola.

- **Conceder un modificador temporal pasa a ser del DM.** Un jugador podía darse `+10` al ataque,
  sin caducidad, y entraba en su hoja. La puerta existía por un caso real —beberse una poción— que
  dejó de necesitarla el 2026-09-06: `consume` escribe el modificador **directo con el `tx`**, sin
  pasar por `grant`. Comprobado antes de cerrar, y con prueba que lo sostiene.
- **Ayudar cuesta la acción de quien ayuda.** Un jugador con dos personajes se daba ventaja de uno
  al otro sin límite. Prohibirlo estaba descartado —el SRD deja que dos criaturas se ayuden—; lo
  que el SRD cobra es que Ayudar es **una acción**. Hereda la doctrina del paso 2: **cuenta y
  avisa, no impide**. Fuera de combate no gasta nada, y es supuesto declarado del autor.
- **El combate propone terminarse, y un jugador a 0 PG sigue en la mesa** con sus salvaciones a la
  vista. **Dos frases de esa ficha eran falsas** —el bando ya existía, y nadie retiraba a nadie— y
  se corrigieron en vez de copiarse. No cierra nada solo: el SRD 5.1 dice que ni la muerte del
  monstruo es automática, *«most DMs have a monster die the instant it drops to 0»* — costumbre
  del DM. La propuesta **solo llega al DM**, o el jugador deduciría que no queda ningún enemigo
  incluido el que no ve.

**Revertir:** tres commits independientes. Solo el tercero toca el contrato de `@dnd/shared`
(`derrotado` y `finalPropuesto`), así que es el único que arrastra fixtures.
