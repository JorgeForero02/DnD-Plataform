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
| ⬜ sin empezar | — | — |

**Leyenda:** ⬜ sin empezar · 🟨 en marcha · ✅ hecho · ⛔ bloqueado (di por qué y qué descartaste).

**Lo que decidí por los cuatro pasos** (qué no cuadraba · qué elegí · por qué es duradero · la
fuente si la hubo):

- _(nada todavía)_

**Lo siguiente exacto, si me quedo aquí:**

- _(nada todavía)_
