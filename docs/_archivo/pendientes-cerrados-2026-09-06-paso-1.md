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


---

## ~~`RollRequestsService.list` corta en 50 sin filtrar por encuentro~~ — **CERRADA el 2026-09-06** (paso 1, tarea 17)

**Cerrada por las dos mitades, que es lo que hacía falta.** En el servidor,
`apps/api/src/roll-requests/roll-requests.service.ts` acepta `encounterId` y filtra por él —**sin
subir el `take`**, que solo movería el problema más lejos—; en la pantalla,
`apps/web/src/features/encounters/TiraDeIniciativa.tsx` lo **manda** en vez de filtrar en el
cliente, que es lo que no podía recuperar lo que el servidor ya había recortado.

Probado contra Postgres (`apps/api/test/peticion-de-tirada.e2e-spec.ts`): con la petición del
combate escrita primero y sesenta sueltas después, **sin filtro no está en la lista** —el fallo,
que sigue ahí— y **con filtro sí**. Mutación: quitar el filtro devuelve 50 donde la prueba espera 1.

<details><summary>Lo que decía la ficha (2026-09-06)</summary>

`apps/api/src/roll-requests/roll-requests.service.ts:97-107`: la lista pendiente de una campaña
sale con `take: 50` ordenada por `createdAt desc`, sin ningún filtro por `encounterId`. Una
campaña activa que acumule más de 50 peticiones pendientes de OTRO tipo —percepciones, salvaciones
pedidas por el DM durante la sesión— antes de que alguien abra un combate empujaría fuera del
corte las peticiones de iniciativa del encuentro nuevo, y la sala de espera
(`TiraDeIniciativa.tsx`) leería «todos han tirado su iniciativa» sin que nadie hubiera tirado
nada: el `[]` que devuelve la página de 50 es indistinguible de «cero pendientes de verdad».

**Es del servidor y de otra tarea, no se toca aquí.** La medida más simple sería que `list`
aceptara (u ordenara primero) por `encounterId` cuando la pantalla lo necesita, en vez de fiarse
de que 50 filas por `createdAt` siempre contengan las de un combate recién abierto.

</details>


---

## ~~P1 · Un PNJ revelado entrega las características de un statblock `DM_ONLY`~~ — **CERRADA el 2026-09-06** (paso 1, tarea 18)

**Cerrada por la salida (a) que eligió el autor —ocultar— con su excepción nombrada: los PG
actuales sí se ven** (D-A-2, `docs/decisiones.md`). El motivo es de mesa: saber que un enemigo está
malherido se ve en la ficción y es información legítima; su hoja no lo es.

`apps/api/src/characters/character-sheet.service.ts` marca el caso —el PNJ se ve, su plantilla no—
y devuelve la fila **sin las seis características**. La frase que acompaña la respuesta se corrigió
con ella: decía «los números de este PNJ no son públicos» mientras mandaba los PG, y ahora dice «de
este PNJ solo se ven sus puntos de golpe actuales».

**Las dos mitades están probadas y las dos mutaciones medidas** en
`apps/api/test/pnj-en-la-mesa.e2e-spec.ts`: devolver la fila entera pone roja la del ocultado (el 18
aparece entre los valores), y esconder los PG pone roja la de los PG (73 → `null`). Pasarse de celo
era tan malo como la fuga.

<details><summary>Lo que decía la ficha (2026-09-04)</summary>

**Encontrado auditando la documentación, y no lo buscaba nadie: salió de un fallo de prueba.** El
recorrido `pnj-en-la-mesa` comprueba que *«los números de un statblock `DM_ONLY` no llegan al
jugador por la hoja del PNJ»*, y comprueba **la CA y la nota del libro**. No comprueba el resto, y
el resto sí llega.

**Lo que ve el jugador**, sobre el cuerpo serializado de su propia petición —esto es de una corrida
real, no una deducción—:

```
GET .../characters/:id/sheet   (como JUGADOR, sobre un PNJ que el DM subió a PLAYERS)
  "str":18,"dex":8,"con":18,"int":6,"wis":12,"cha":5      ← las del statblock DM_ONLY
  "currentHp":85                                          ← los PG exactos que salen de su dado de golpe
  "sheet":null, "hp":{"max":null}
  "reason":"Los números de este PNJ no son públicos: su ficha es del DM."
```

**La misma respuesta dice que sus números no son públicos y trae seis de ellos.** Con las seis
características se reconstruyen los seis modificadores de salvación y los dieciocho de habilidad
—todo menos el bonificador de competencia— y la iniciativa. Queda escondido lo que `hojaDeStatblock`
sí retiene: CA, PG máximos, competencia, la traza y la nota del libro.

**Cómo pasa, y por qué no es un descuido:** `npcs.service.ts:69` **copia** las características del
statblock a las columnas de la fila de `Character` al instanciar, que es la decisión D-2D-2 —«un
PNJ en la mesa es una fila de `Character`»— y `getSheet` devuelve esa fila entera a quien pasa
`canSee`. Las dos piezas son correctas por separado.

**Y por eso incumple una regla vinculante de interfaz**: *si el texto explica una regla del
servidor y discrepan, miente el texto*. Aquí discrepan.

**No se arregla sin el autor**, porque las dos salidas son decisiones suyas y no equivalentes:

1. **Ocultar las columnas** de un personaje con `statblockRef` a quien no sea el DM o su dueño.
   Es coherente con la frase, y **cambia lo que hoy se envía**: hay que decidir qué sigue viendo un
   jugador de un PNJ revelado (¿los PG actuales, para saber si está malherido?).
2. **Cambiar la frase** y aceptar que revelar un PNJ revela sus características. Es más barato y
   deja el bulto donde está: entonces la garantía real es «no verás su CA ni su traza», no «no
   verás sus números».

**Cierra cuando** una de las dos esté tomada y escrita. La prueba que lo destaparía existe a
medias: `pnj-en-la-mesa.e2e-spec.ts` recorre **cada valor** del cuerpo desde el 2026-09-04, así que
añadir `expect(valores).not.toContain(18)` es una línea — hoy se pondría roja.

</details>
