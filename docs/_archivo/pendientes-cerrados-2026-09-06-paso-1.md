# Pendientes cerrados — archivados el 2026-09-06 (paso 1, «las goteras»)

**Congelado. Nada de aquí se edita.** Son las fichas que `docs/06-pendientes.md` cerró durante la
ejecución del plan
[`superpowers/plans/2026-09-06-paso-1-goteras.md`](../superpowers/plans/2026-09-06-paso-1-goteras.md).
Se conservan por si algo se reabre y hace falta saber cómo se cerró la vez anterior.

Continúa a
[`pendientes-cerrados-hasta-2026-09-05.md`](./pendientes-cerrados-hasta-2026-09-05.md).

**La regla, sin criterio de nadie:** lo tachado sale, lo abierto se queda, y cada ficha se mueve
**entera** — nunca se resume. Los identificadores **no se reciclan**.

**Lo que la tarea 0 de ese plan enseñó, y por eso se guarda:** las dos fichas de abajo describían
como pendiente algo que la tanda de la noche anterior ya había entregado. Las dos traían su
evidencia citada, cierta el día que se escribió. **Es el mismo patrón que ya archivó siete fichas
el 2026-09-05**, así que no es un descuido puntual: una ficha se cierra en el commit que la cierra,
o nadie la cierra.

---

## ~~P1 · El ataque comparado contra la CA existe en el servidor y ninguna pantalla lo llama~~ — **CERRADA el 2026-09-06**

**La cerró la tarea 13 del plan de la iniciativa, y esta ficha se quedó describiendo como pendiente
algo ya hecho.** Comprobado el 2026-09-06 abriendo los ficheros, no de memoria:
`apps/web/src/features/character-sheet/api.ts:563` exporta `resolveAttack` y
`apps/web/src/features/character-sheet/hooks.ts:397` lo llama; el barrido que la ficha citaba en
cero da hoy siete apariciones, incluidas las de
`apps/web/src/features/character-sheet/__tests__/TirarAtaqueBoton.test.tsx`. **El «cierra cuando» se
cumple**: el jugador elige a quién ataca desde el cuadro de ataques y el resultado dice si acierta.

<details><summary>Lo que decía la ficha (2026-09-05)</summary>

**Encontrado por el autor usando la aplicación, y es la tercera vez que aparece este patrón en un
día.** El servidor sabe resolver un ataque contra un objetivo:

- `apps/api/src/characters/character-sheet.controller.ts:137` — `@Post("sheet/attacks/:attackKey/resolve")`
- `packages/shared/src/attack.schema.ts:52` — `targetCharacterId: z.string().cuid()`
- y el motor de reglas escucha `CHARACTER_ATTACKED` (`apps/api/src/rules-engine/engine/matching.ts:40`).

**Y nadie lo llama.** Barrido del 2026-09-05 sobre `apps/web/src`: **cero** apariciones de
`resolveAttack` o `attacks/resolve`, y el único `targetCharacterId` que manda el navegador es el de
**Ayudar** (`apps/web/src/features/sessions/elenco/AyudarA.tsx:71`).

**Lo que eso significa en la mesa:** el botón de atacar **solo tira dados**. El jugador saca un 17 y
se lo dice al DM de viva voz, que decide de cabeza si acierta. La comparación contra la CA, la
traza, el crítico y el suceso que dispara las reglas **están construidos y no se usan**.

**Ojo con la ficha vieja.** «El ataque es un oráculo sobre la CA» se dio por cerrada con el plan 03,
y se cerró **la mitad del servidor**: la pantalla nunca llegó. Es el mismo cierre a medias que ya se
declaró cuatro veces —servidor hecho, nadie que lo dispare—.

**Cierra cuando** el jugador pueda elegir a quién ataca desde el cuadro de ataques y el resultado
diga si acierta.

</details>

## ~~P3b · Un cuadro de ataques vacío no dice por qué está vacío~~ — **CERRADA el 2026-09-06**

**La cerró la tarea 15 del plan de la iniciativa.** Comprobado el 2026-09-06 abriendo el fichero:
`apps/web/src/features/character-sheet/AtaquesYLanzamiento.tsx:157-170` explica el hueco con las
palabras que la ficha pedía —«No llevas ningún arma equipada… Equipa un arma en la **bolsa**»— y
enlaza a `#inventario`, que es la misma hoja y no otra pantalla. **No inventa ataques**: la nota de
`attack.spell` solo aparece si el motor ya derivó uno.

> **Y le cambia el identificador.** Esta ficha nació como `P3` y había **otra `P3`** cuarenta líneas
> más arriba —«no faltaba curar, faltaba el gesto rápido del elenco»—: dos fichas distintas con la
> misma etiqueta. Se renombra a `P3b` al cerrarla para que la referencia no sea ambigua en el
> archivo.

<details><summary>Lo que decía la ficha (2026-09-05)</summary>

**No es un fallo: es una explicación que falta**, y confundió al autor hasta hacerle pensar que
faltaba una opción de su clase.

Los ataques **no se escogen, se derivan de lo equipado** — `apps/api/src/rules/attacks.ts` lo dice en
su cabecera: *«entra qué hay equipado más lo que ya derivó el motor; sale, por cada arma, el bono de
ataque con su traza»*. Es el SRD y está bien.

Pero un personaje sin arma en la mano ve **un cuadro vacío y ningún motivo**, y de ahí se deduce
«esta pantalla no me deja elegir ataques», que es exactamente lo contrario de lo que pasa.

**Cierra cuando** el cuadro vacío diga qué falta y por dónde se arregla —«no llevas ningún arma
equipada; equipa una desde la Bolsa»—, sin inventarse ataques que el SRD no da.

</details>
