# Plan 08 · Inspiración y Ayudar (I8)

**Objetivo en una frase:** construir las dos intervenciones que **sí existen en el SRD**, y no
construir la que la maqueta se inventó.

**Tamaño:** dos commits. **Toca `packages/shared`**, así que **no corre en paralelo** con los planes
03 y 05.

---

## Lo que la investigación dejó cerrado

La maqueta pinta tres botones: «Ventaja por flanqueo +3», «Ayuda de Mira +1d4» y «Usar inspiración».
**Dos de los tres rótulos son falsos**, y la regla del autor es que **las reglas de D&D son verdad
absoluta**:

| Maqueta | Lo que dice el SRD | Veredicto |
|---|---|---|
| «Ventaja por flanqueo **+3**» | El flanqueo es **regla opcional del DMG**, no del SRD, y da **ventaja**, no un número. El +2 es de 3.ª y de Pathfinder | **No entra** |
| «Ayuda de Mira **+1d4**» | **Ayudar** es una acción del SRD y da **ventaja**. El +1d4 es `Bless` (conjuro); el d6 es Inspiración Bárdica (rasgo) | **Entra, como ventaja** |
| «Usar inspiración» | Correcto: *«you can expend it when you make an attack roll, saving throw, or ability check… gives you advantage on that roll»* | **Entra** |

**Y el flanqueo, además, necesitaría saber quién está adyacente a quién** — o sea, el tablero, que el
autor se reserva. Si algún día entra, será **interruptor por campaña** y dando **ventaja**.

## 8.1 · Inspiración

**Qué es, exacto.** La concede el DM por interpretar bien. **Es binaria**: la tienes o no la tienes,
**no se acumula**. Se gasta para **ventaja** en una tirada de ataque, salvación o prueba. Y **se
puede regalar** a otro jugador.

**Modelo:** `Character.inspired Boolean @default(false)`. **Un booleano, no un contador** — el SRD lo
dice y guardar un número invitaría a acumular.

**Servidor:**
- **Conceder / retirar**: solo el DM.
- **Gastar**: el dueño del personaje, y **solo si la tiene**. Gastar sin tenerla es un 409, no un
  silencio.
- **Regalar**: el dueño, a otro personaje de la campaña. Es SRD y es barato: `inspired = false` en
  uno, `true` en otro, **en la misma transacción**.
- **Cada uno de los tres deja su suceso** en el registro: conceder, gastar y regalar son tres hechos
  distintos que la mesa quiere ver.

**Cómo llega a la tirada:** por **la tubería de sugerencias de 2.5.5**, que ya existe y **propone sin
imponer**. Gastar inspiración **no tira**: marca esa tirada como con ventaja. El servidor sigue
decidiendo el número.

## 8.2 · Ayudar

**Qué es, exacto.** Es una **acción**. En ataque: *«you can aid a friendly creature in attacking a
creature within 5 feet of you… the first attack roll is made with advantage»*. Tres límites que hay
que respetar o estamos inventando:

1. **Una sola tirada**, aunque el ayudado tenga varios ataques.
2. **El enemigo tiene que estar a 5 pies de quien ayuda** — no del ayudado.
3. **Caduca al principio del siguiente turno de quien ayudó.**

**Cómo se implementa sin tablero.** El punto 2 necesita distancias, y **no las tenemos**. Salida
honesta: **el ayudante declara a quién ayuda** y el sistema **no comprueba la distancia**, y lo dice
en pantalla: *«la cercanía la juzgas tú»*. Es el mismo criterio que ya usa el proyecto para lo que el
servidor no puede saber, y **no miente**.

**Los puntos 1 y 3 sí se implementan de verdad**, y ahí está el valor: es **una condición con
vencimiento**, y ese sistema **ya existe desde 2C.4** — las condiciones caducan solas y se marcan al
vencer en vez de desaparecer. La ayuda es una condición efímera más:
- Se pone sobre el ayudado, con quien ayuda como origen.
- **Se consume con la primera tirada de ataque** contra ese objetivo.
- **Vence al principio del turno siguiente del ayudante**, aunque no se use.

**Y aparece en la tirada** por la misma tubería de sugerencias: «Ventaja: te ayuda Mira».

---

## Pruebas

**Inspiración:** conceder solo DM ✅/❌ · gastar sin tenerla → **409** · gastarla → `false` y **la
siguiente tirada sugiere ventaja** · regalarla mueve el booleano **en una transacción** · los tres
sucesos salen en el registro **traducidos**.

**Ayudar:** la ayuda **se consume con el primer ataque** y **no con el segundo** · **vence** al
llegar el turno del ayudante aunque no se use · **se marca al vencer**, no desaparece (D-2C-2) · la
pantalla **dice que la cercanía no se comprueba**.

**e2e:** el camino entero contra Postgres — el DM concede, el jugador gasta, la tirada sale con
ventaja y el registro lo cuenta.

**Mutación (obligatoria):** quita el vencimiento de la ayuda y comprueba que su prueba se pone roja.
Una ayuda que no caduca es una ventaja permanente, que es el fallo que de verdad rompe una partida.

## Guía de revisión

- [ ] **El flanqueo NO se ha construido**, y el commit dice por qué (opcional, del DMG, y necesita
      adyacencia).
- [ ] Ningún rótulo dice «+3» ni «+1d4». **Ayudar da ventaja.**
- [ ] La inspiración es **booleana** y no se puede acumular ni con dos peticiones seguidas.
- [ ] Gastar sin tenerla es **409**, no un silencio que parece que funcionó.
- [ ] Regalar es **una transacción**: no puede quedar en los dos ni en ninguno.
- [ ] La ayuda **caduca sola** y **se marca al vencer**.
- [ ] La pantalla dice **lo que el servidor no comprueba** (la cercanía).
- [ ] Nada de esto tira dados en el cliente: el servidor decide el número.
- [ ] Los sucesos del registro **no enseñan claves de enumeración**.

## Trampas

- **Inspiración y Inspiración Bárdica son cosas distintas.** La del SRD es del DM y da ventaja; la
  del bardo es un dado que se suma. No las mezcles en un mismo botón.
- **«Ayudar» también sirve para pruebas de característica**, no solo ataques. Si solo haces la mitad
  de ataque, dilo en pantalla y en la ficha; no dejes que parezca que cubre las dos.
- **La ventaja no se acumula**: dos fuentes de ventaja siguen siendo ventaja. Si tu tubería suma, ya
  está mal.
- **La caducidad se mide en el reloj de la campaña**, que existe desde 2C y va en **segundos**; no
  inventes otro reloj.

## Commits

```
feat(api,shared): inspiration is a binary the DM grants and the player spends
feat(api,web): the Help action grants advantage, and expires when the SRD says
```

## Definición de terminado

`pnpm verify` verde, e2e corrido, la mutación probada, y la ficha I8 anotada en el maestro **con la
mención explícita de que el flanqueo se dejó fuera a propósito** — o alguien lo leerá como un olvido.


---

## Avance — lo escribe quien ejecuta este plan

> **Obligatorio, y se escribe MIENTRAS se trabaja, no al final.** Si la sesión se queda sin contexto
> o muere, **esto y el prompt de arranque son lo único que sabe la siguiente**. Una línea por paso,
> con su commit. Nada de memoria: `fichero:línea` o no cuenta.

| Estado | Cuándo | Qué |
|---|---|---|
| ✅ hecho | 2026-09-06 | **8.1 · Inspiración, entera.** Fila `inspiration` (`max: 1`, `DM_ONLY`) sembrada en `apps/api/src/characters/characters.service.ts:29` vía `ResourcesService.seedInspirationFor` (`resources.service.ts:349`). `give()` en `resources.service.ts:260`, ruta en `resources.controller.ts:51`. Suceso `RESOURCE_GIVEN` + migración `20260906030000_resource_given_event/`. `spendInspiration` en `createRollSchema`, `rollAttackSchema`, `resolveAttackSchema` y `answerRollRequestSchema`; lo resuelve `apps/api/src/rolls/rolls.service.ts:92`. Web: `apps/web/src/features/rolls/panel/GastarInspiracion.tsx`, montado en el panel de la mesa, la hoja, el ataque y las tiradas pendientes; regalar en `character-sheet/RegalarInspiracion.tsx`. **Commit `1758c21`** |
| ✅ hecho | 2026-09-06 | **8.2 · Ayudar, entera.** `CLAVE_AYUDA` y `helpSchema` en `packages/shared/src/character-state.schema.ts:106`; `ConditionsService.help` en `apps/api/src/character-state/conditions/conditions.service.ts:117` y `HelpController` al final de `conditions.controller.ts`. La ventaja entra por `apps/api/src/character-state/roll-mode/suggested-roll-mode.ts:84`. El consumo, en `apps/api/src/characters/character-sheet.service.ts:711` (`ayudaViva`/`consumirAyuda`), llamado desde las **dos** puertas de ataque. Web: `apps/web/src/features/sessions/elenco/AyudarA.tsx`, montado en la tarjeta propia. **Commit `ad128ca`** |
| ✅ | 2026-09-06 | **EL PLAN 08 ESTÁ CERRADO.** Las dos mitades, con sus mutaciones y sus dos e2e (`apps/api/test/inspiracion.e2e-spec.ts`, 8 verdes; `apps/api/test/ayudar.e2e-spec.ts`, 6 verdes). El flanqueo **no se construye**, y está dicho en el commit y en `docs/05-datos.md`. |

**Leyenda:** ⬜ sin empezar · 🟨 en marcha · ✅ hecho · ⛔ bloqueado (di por qué y qué descartaste).

**Lo que decidí por los cuatro pasos** (qué no cuadraba · qué elegí · por qué es duradero · la
fuente si la hubo):

- **EL PLAN PEDÍA `Character.inspired Boolean` Y NO SE HA HECHO.** No cuadraba con lo que ya hay:
  `CharacterResource` es *«un contador con máximo que un descanso repone»* y `schema.prisma:604` la
  nombra desde 2A.8 como «recursos consumibles: **inspiracion**, furia, ki…» — era el primer ejemplo
  con el que esa tabla se escribió, y hasta la spec de 2A la usa como caso de prueba
  (`resources.service.spec.ts:69`, `key: "inspiration"`, `DM_ONLY`). Una columna nueva habría sido
  **una segunda verdad sobre el mismo hecho**, con dos sitios que pueden discrepar. El argumento del
  plan para el booleano —«guardar un número invitaría a acumular»— lo resuelve `max: 1`, que es la
  misma regla escrita donde se cumple. **La investigación decía «ninguno de los tres existe» y en
  esto se equivocaba**: el almacenamiento existía y estaba documentado.
- **Se siembra al CREAR el personaje, no en `seedResourcesFor`.** Ese método siembra lo que implica
  la clase y por eso corre al terminar la ficha; la inspiración no viene de la clase. Sembrarla allí
  la dejaba fuera justo del personaje recién creado — **lo cazó el e2e**, no la lectura.
- **Dos agujeros que solo se vieron al sembrarla, y se arreglan para TODOS los recursos:**
  · **Gastar lo que no hay devolvía 200.** El recorte inferior se tragaba el exceso: pedir un espacio
  de conjuro con cero respondía **igual** que gastarlo. Ahora **409**, con su prueba, y la prueba
  vieja que afirmaba «se queda en 0» está reescrita **diciendo que el cambio es deliberado**.
  · **Reponer no pasaba por el candado de `grantedBy`.** Vivía solo en `upsert`. Con la inspiración
  sembrada, el «+1» de la propia hoja se la habría concedido al jugador. **Mutación probada**: sin
  el candado, `inspiracion.e2e-spec.ts` da 201 donde espera 403.
- **`spendInspiration` viaja EN la petición de la tirada, no en un botón aparte.** Gastar y tirar por
  separado deja dos formas de romperlo: gastarla y que la tirada falle —perdida sin tirar— o tirar y
  que el gasto falle —ventaja gratis—. Va en las **cuatro** puertas donde el SRD la permite: tirada
  libre, hoja, ataque y respuesta a una petición del DM. **En el daño no**, y el esquema lo rechaza:
  el SRD nombra ataque, salvación y prueba, y el daño no lleva d20.
- **Con desventaja declarada es 400, no un gasto silencioso.** SRD: *«you are considered to have
  neither of them»*. Gastarla ahí sería perderla para tirar normal. Rechazar protege el recurso;
  quemarlo habría sido «correcto» y hostil.
- **El «+1» de un recurso `DM_ONLY` deja de pintarse para quien no es DM.** No es control de acceso
  —eso lo impone el servidor—: es que un botón que va a dar 403 promete algo falso. Y la fila dice
  «la concede el DM» para que su ausencia no parezca un fallo.
- **`RollsService.roll` acepta `spendInspiration` opcional** (`PeticionDeTirada`). El esquema le da
  `.default(false)`, así que toda petición HTTP llega con él; obligar a los llamadores internos —la
  iniciativa, el daño, la respuesta a una petición— a escribir `spendInspiration: false` habría
  metido esa palabra en una docena de sitios donde no significa nada.

- **8.2 · «Al principio de tu siguiente turno» se expresa SIN inventar un reloj.** Un asalto son
  seis segundos del reloj de campaña (`SEGUNDOS_POR_ASALTO`, D-2C-1) y subir de asalto lo avanza
  (`encounters.service.ts:472`), así que «mi siguiente turno» es exactamente un asalto más tarde y
  se guarda como `expiresAtClock` absoluto, igual que cualquier otra condición con duración. Un
  contador de turnos propio habría sido un segundo reloj que puede discrepar del primero.
- **8.2 · La marca va en `CharacterCondition` y NO en una tabla nueva.** Tiene la misma forma —clave,
  origen, vencimiento— y una tabla propia habría duplicado el mecanismo de 2C.4 entero. Que no sea
  una de las quince del SRD se dice donde importa: en `shared`, en la tabla de efectos y en la
  prueba que barre los temporizadores.
- **8.2 · El motor SÍ la entiende, a diferencia de una clave libre.** Entra en `VENTAJA_EN_ATAQUE`
  con su cita. Sigue siendo **sugerencia**, no imposición, porque la cercanía que el SRD exige no se
  puede comprobar — pero en el ataque el servidor sí la aplica y la consume, que es lo que el SRD
  dice que pasa con la primera tirada.
- **8.2 · Se consume DESPUÉS de tirar, no antes.** Si la tirada se rechaza —expresión inválida, 409
  de inspiración—, la ayuda no se ha usado. El precio es que el borrado cae fuera de la transacción
  de la tirada: si fallara, quedaría una ayuda de más, que **se ve en la hoja y se quita**, frente a
  perder una ayuda que nadie usó, que no se puede recuperar.
- **8.2 · El suceso lleva la visibilidad del AYUDADO**, no la del ayudante: con la del ayudante,
  ayudar a un PNJ `DM_ONLY` lo habría anunciado a la mesa entera. Es la misma fuga que ya volvió dos
  veces en 2.5.2 y en 2C.
- **8.2 · El control va en TU tarjeta del elenco**, no en la del otro. La regla de la mesa —del
  autor— es que sobre el personaje de otro jugador no van mandos; ayudar es una acción tuya y a
  quién ayudas es su parámetro.
- **8.2 · Una prueba vieja hubo que acotarla, y se declara.** «Ninguna condición insinúa un
  temporizador» barría todos los efectos; `helped` **tiene** que decir que caduca, porque su
  vencimiento lo pone el servidor y no el DM. Se excluye **solo** a las de vencimiento automático y
  las quince del SRD se siguen barriendo enteras.
- **8.2 · El flanqueo no se construye, y el commit lo dice.** Opcional del DMG, da ventaja y no un
  `+3` —ese +2 es de 3.ª y de Pathfinder—, y necesita adyacencia, o sea el tablero de la fase 3.

**Lo siguiente exacto, si me quedo aquí:**

- **Nada. El plan 08 está cerrado.** Lo siguiente es el plan 09.
