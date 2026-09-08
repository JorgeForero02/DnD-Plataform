# Lo que la poda desbloqueó — plan de la noche del 2026-09-07

> **Para quien lo ejecute:** tres tareas, en este orden. Cada una con los cuatro pasos completos y
> su mutación de **una pieza cada vez**. Un commit por tarea, `pnpm verify` en verde antes de cada
> uno, mensaje en inglés (Conventional Commits).

**Goal:** cerrar las tres fichas cuyo bloqueo desapareció con el paso 2, medido el 2026-09-07.

**Por qué existe este plan.** Ninguna de las tres es nueva: las tres llevaban semanas en
`docs/06-pendientes.md` con una cláusula *«Cierra cuando…»* que **hoy ya se cumple** y nadie lo
había notado, porque una condición de cierre no se revisa sola. Ése fue el hallazgo de la poda del
2026-09-07: el tablero no estaba caducado, estaba **desactualizado respecto a lo que se construyó
anoche**.

**Lo que NO entra, y no se re-litiga:** `P2-4`, `P2-5`, `P2-9` y `A11-lanzado` son del paso 3 y se
diseñan con su spec delante (decisión del autor, 2026-09-07). Si tropiezas con ellas, ni las toques
ni las reabras.

## Global Constraints

- **SRD 5.1 (2014)**, nunca 2024. La copia de Foundry vive **fuera del repositorio** y su código no
  se ejecuta jamás.
- **La autorización se comprueba en el servidor.** Esconder un botón no es control de acceso — pero
  **dejar un botón que el servidor rechaza es un defecto declarado** (`04-convenciones.md`), así que
  cuando una tarea cierre una puerta en la API, la pantalla deja de ofrecerla **en el mismo commit**.
- **Ningún valor de enumeración llega a la pantalla.** La forma legible se escribe una vez por
  dominio y se importa.
- **Lo que solo se ve maquetado se mide en el navegador.** `jsdom` no maqueta.
- **Una sola tanda de Playwright**, al final, y se cierra lo que abra. **Ojo: el puerto 3000 lo
  ocupa LabDonovan**, otro proyecto del autor, y `playwright.config.ts:57` trae
  `reuseExistingServer: !CI` — o sea que sin precaución los recorridos corren contra el servidor
  equivocado sin avisar. Usa `WORKTREE_SLOT=1` (API 3100, web 5273, base `dnd_wt1`). **`pnpm db:slot`
  está roto en esta máquina** (`Command "prisma" not found`): la base se crea a mano con
  `prisma migrate deploy`.
- **No se despliega.** Lo lanza el autor.
- **Ni una palabra sobre copias de seguridad de la base.**

---

## Tarea 1 · La puerta B se cierra: `grant` pasa a ser del DM

**Ficha:** `P1 · Quedan dos puertas por las que un jugador se concede una mecánica`, Puerta B.

**Files:**
- Modificar: `apps/api/src/character-state/...` — el servicio de modificadores temporales (`grant`)
- Modificar: `apps/web/src/features/character-sheet/HojaCalculada.tsx:357` y
  `apps/web/src/features/character-sheet/ModificadoresTemporales.tsx`
- Test: la unitaria del servicio y la de componente de la tarjeta

**El porqué, para que no se implemente al revés.** Hoy `TemporaryModifiersService.grant` pide solo
`requireOwnerOrDM`, así que **un jugador puede darse `+10` al ataque, sin caducidad y con el motivo
que quiera**, y eso entra en la derivación de la hoja. El autor lo concedió por escrito con un caso
de uso real —*«beberse una poción que ya llevas encima no debería ser una petición al DM»*—, y **ese
caso dejó de necesitar esta puerta el 2026-09-06**: consumir un objeto ya aplica sus efectos solo
(`apps/api/src/inventory/inventory.service.ts:536`, que crea el `temporaryModifier` por dentro).

**Decisión del autor, 2026-09-07:** `grant` pasa a ser del DM. Descartada la variante de «caducidad
obligatoria para el jugador», con su motivo: un `+10` que dura todo el combate sigue siendo un `+10`
en el combate.

- [ ] **Paso 1 · La prueba que falla.** Un jugador dueño de su personaje llama a `grant` y recibe
      403. Córrela y **mírala fallar** — hoy devuelve 201. Pega la salida.
- [ ] **Paso 2 · El arreglo.** `grant` exige DM. **Ojo con lo que NO se toca:** el camino interno por
      el que `consume` crea el modificador **no puede romperse** — es el camino legítimo que
      justifica cerrar éste. Si pasa por `grant`, necesita la misma segunda puerta que el resto del
      proyecto ya usa (`recordFromEngine` es el precedente); si escribe directo con el `tx`, no hay
      nada que hacer. **Compruébalo antes de tocar nada.**
- [ ] **Paso 3 · Verde.** Y una prueba más que lo fija: **beberse una poción sigue aplicando su
      efecto**. Sin ella, este commit puede romper la mitad buena sin que nada enrojezca.
- [ ] **Paso 4 · La pantalla, en el mismo commit.** La tarjeta «Modificadores temporales» deja de
      ofrecer el formulario a quien no es DM. **El jugador sigue viendo sus modificadores activos**
      — lo que pierde es escribirlos a mano. Hoy `HojaCalculada.tsx:357` le pasa `puedeEditar`, que
      es dueño-o-DM: tiene que pasar a ser «es DM». Prueba de componente: con rol de jugador, la
      tarjeta lista y **no** hay campos.
- [ ] **Paso 5 · Mutación**, una pieza cada vez: devolver `requireOwnerOrDM` en el servicio → roja la
      del 403; devolver `puedeEditar` en la hoja → roja la de componente. Si una sola cubre las dos,
      no está terminada.
- [ ] **Paso 6 · Commit.**

---

## Tarea 2 · Ayudar cuesta la acción de quien ayuda

**Ficha:** la misma, Puerta A.

**Files:**
- Modificar: `apps/api/src/character-state/conditions/conditions.service.ts` (`help`)
- Test: su unitaria, y una e2e si el gasto cruza servicios

**El porqué.** `ConditionsService.help` exige dueño-o-DM **del ayudante** y del ayudado solo que esté
en la campaña, y crear personajes no tiene tope. Así que **un jugador con dos personajes se da
`helped` desde uno al otro**. No es teórico: `apps/api/test/ayudar.e2e-spec.ts` crea los dos con el
mismo token y espera 201, y `AyudarA.tsx` filtra los candidatos solo por «no soy yo».

**Y la salida no es prohibirlo.** La ficha ya descartó eso con motivo: el SRD **permite** que dos
criaturas se ayuden, y que las lleve la misma persona no las convierte en una — prohibirlo sería
inventar una regla que el manual no tiene. Lo que el SRD **sí** cobra es que Ayudar es una **acción**,
y por tanto una por turno. Con eso la puerta se cierra sola.

**El bloqueo desapareció anoche:** la economía de acciones existe en `Combatant` desde el paso 2, y
`help()` **no la gasta** — comprobado el 2026-09-07, no hay ni una llamada.

**Supuesto declarado por el autor, 2026-09-07 — fuera de combate se deja pasar.** La economía vive en
`Combatant`, o sea solo dentro de un encuentro. Sin turnos no hay economía que cobrar, así que
`help` fuera de combate **no gasta nada y no falla**. La puerta se cierra donde importa, que es la
pelea. Escríbelo en el código, no solo aquí.

- [ ] **Paso 1 · La prueba que falla.** Dentro de un combate, el mismo personaje ayuda dos veces en
      su turno; la segunda tiene que ser rechazada por no quedarle acción. Hoy pasa. Mírala fallar.
- [ ] **Paso 2 · El arreglo.** `help` gasta la acción del **ayudante** por la misma puerta que el
      resto del paso 2 usa para gastar. **Gastar cuenta y avisa, pero no impide** es la doctrina del
      paso 2: comprueba cómo se resolvió allí y sigue el mismo criterio en vez de inventar otro. Si
      el paso 2 decidió avisar sin bloquear, esta tarea **hereda esa decisión** — y entonces la
      prueba mide el aviso, no el 403. Léelo antes de escribir la aserción.
- [ ] **Paso 3 · La segunda prueba, la del supuesto:** fuera de combate, ayudar dos veces sigue
      funcionando y no gasta nada.
- [ ] **Paso 4 · Verde, y mutación:** quitar el gasto → roja la primera; hacer que gaste también
      fuera de combate → roja la segunda.
- [ ] **Paso 5 · Commit.**

---

## Tarea 3 · El combate propone terminarse, y un jugador a 0 PG sigue en la mesa

**Ficha:** `P2 · Nadie propone terminar el combate, y «derrotado» ya está decidido`. **Es la grande
de las tres** y la que más se nota en la mesa.

**Files:**
- Modificar: `apps/api/src/encounters/encounters.service.ts`
- Modificar: la pantalla del encuentro / la mesa (los combatientes derrotados)
- Test: unitaria del servicio, componente de la pantalla, y **un recorrido de navegador**

**El bloqueo desapareció:** la ficha dice *«hoy todos los combatientes son `NEUTRAL`, así que "no
queda ningún enemigo en pie" no se puede ni calcular»*. **El bando existe** —
`apps/api/prisma/schema.prisma:425-432`, `ALLY` / `ENEMY` / `NEUTRAL`. **Esa frase de la ficha ya es
falsa: corrígela al cerrarla, no la copies.**

**Las tres cosas que pide, y ninguna sobra:**

1. **Proponer, no terminar.** Doctrina impresa de las Herramientas del DM: *«El sistema propone; tú
   decides. Nada llega a la mesa hasta que lo confirmas.»* Un enemigo a 0 puede estar inconsciente,
   los enemigos huyen, y un combate se acaba parlamentando con el jefe en pie. **Un cierre automático
   sería el servidor decidiendo por el DM y NO cierra esta ficha.**
2. **Los derrotados en gris** mientras dura el combate, y al terminar dejan de salirle a los
   jugadores.
3. **Un personaje jugador a 0 PG NO desaparece.** Sigue en la mesa con sus **salvaciones contra
   muerte** a la vista. Media pieza ya existe: `deathSaveSuccesses` y `deathSaveFailures` son
   columnas, `deathSaveSchema` existe, hay ruta en
   `apps/api/src/characters/character-sheet.controller.ts:87`, y un descanso largo las borra
   (`apps/api/src/character-state/rest/rest.service.ts:90`).

**La asimetría es la REGLA, no una preferencia**, y hay que verificarla en el SRD **en inglés** antes
de implementarla —regla de este proyecto—: «Dropping to 0 Hit Points» trata distinto a los dos. Un
monstruo a 0 PG muere en el acto salvo que el DM decida dejarlo inconsciente; **un personaje jugador
cae inconsciente y empieza a tirar salvaciones contra muerte**. La cita va en el commit.

- [ ] **Paso 1 · La prueba que falla**, en el servicio: con todos los `ENEMY` a 0 PG, el encuentro
      **propone** terminar. Hoy no propone nada. Mírala fallar.
- [ ] **Paso 2 · El arreglo**, con el bando que ya existe. `NEUTRAL` no cuenta como bando en pie:
      significa «no se ha dicho», y una propuesta basada en un silencio sería una afirmación
      inventada.
- [ ] **Paso 3 · Un jugador a 0 PG sigue en la mesa**, con su prueba propia: no se le retira del
      encuentro y sus salvaciones contra muerte se leen.
- [ ] **Paso 4 · La pantalla:** derrotados en gris, y la propuesta como algo que el DM confirma.
      Prueba de componente.
- [ ] **Paso 5 · El recorrido de navegador**, que es el único que mide el gris de verdad: bajar al
      último enemigo a 0 y ver la propuesta, sin que el combate se cierre solo.
- [ ] **Paso 6 · Mutación**, una pieza cada vez: contar `NEUTRAL` como bando en pie → roja la del
      servicio; retirar al jugador a 0 PG → roja la suya; quitar el gris → rojo el navegador.
- [ ] **Paso 7 · Commit.**

---

## Al cerrar

- **Archiva** las fichas cerradas como hicieron las tres tandas anteriores
  (`docs/_archivo/pendientes-cerrados-…`), no las dejes tachadas en el 06: `check:docs` exige que lo
  tachado salga.
- **Y archiva también, sin tocarla, la ficha `P1 · El «500 intermitente» … era `supertest``**: su
  propio texto dice *«Cierra con este mismo texto: no hay arreglo pendiente»*. Lleva desde el 6 en el
  tablero ocupando sitio de P1 estando cerrada.
- Una línea por tarea en `docs/07-historial.md`, y `pnpm update:estado`.
- **La tabla de siempre**: una fila por tarea con vueltas, qué encontró cada mutación, y tiempo
  perdido y en qué.

**La regla de arreglar en vez de abrir ficha sigue en vigor**, con tope de **tres** arreglos extra y
tres motivos válidos para abrir una: hace falta una decisión del autor, toca una pantalla que no es
la tuya, o es de verdad grande. **«Abierto, menor» no vale como motivo: si es menor, arréglalo.**
