# Pendientes cerrados — archivados el 2026-09-07 (tanda B)

**Congelado. Nada de aqui se edita.** Son las tres fichas que `docs/06-pendientes.md` cerro en la
tanda B del 2026-09-07 — tres arreglos de API, ninguno de pantalla. Se conservan por si algo se
reabre y hace falta saber como se cerro la vez anterior.

Continua a
[`pendientes-cerrados-2026-09-07-tanda-corta.md`](./pendientes-cerrados-2026-09-07-tanda-corta.md).

**La regla, sin criterio de nadie:** lo tachado sale, lo abierto se queda, y cada ficha se mueve
**entera** — nunca se resume. Los identificadores **no se reciclan**.

**Lo que esta tanda enseño, y por eso se guarda: una ficha puede equivocarse en el TAMANO, no solo
en el detalle.** P2-10 estaba escrita como «dos pruebas lentas» y la medicion dijo veintitres
suites y 204 pruebas. La ficha no mentia — describia bien las dos que alguien habia visto caer—,
pero nadie habia medido la clase entera, y arreglar las dos nombradas habria dejado veintiuna
suites igual de fragiles con la ficha tachada. **Se mide antes de arreglar, aunque la ficha ya diga
que ha medido.**

---

### ~~P2-1 · La clave de una condición es un contrato de seguridad, y hoy lo sostiene la costumbre~~ (2026-09-07) — CERRADA

> **Cerrada el 2026-09-07 con la opción (c)**, la recomendada; (a) y (b) siguen descartadas con su motivo y no se reabren. La red vive en `apps/api/src/character-state/conditions/claves-que-el-motor-lee.spec.ts` y **mira las tres formas** —comparación literal, pertenencia a un conjunto y consulta a la base—, que era el corazón del encargo: una que solo mirara `=== "..."` habría perdido los siete `Set` y con ellos la única lectura de `helped`. Cazada por mutación cinco veces, cada una nombrando la clave: un `if` nuevo, la misma clave dentro de un `Set`, un `Set` en `modo-contra-objetivo.ts` —el fichero que las dos cuentas anteriores de esta ficha perdieron—, una consulta a la base, y **la propia red estrechada contra sí misma**, que el caso anti-estrechamiento caza dos veces. Sus dos límites están escritos en el fichero: defiende seis ficheros conocidos en vez de descubrir nuevos, y se la burla leyendo la clave desde una variable — que no es el fallo realista.

**Medido por tercera vez, abriendo los seis ficheros que de verdad leen una condición por su
clave — las dos vueltas anteriores contaron tres ficheros y se quedaron cortas las dos veces:
«cinco» la primera, «once en tres ficheros» la segunda, ninguna de las dos completa.**

- `suggested-roll-mode.ts` — **seis**: `condition.key === "exhaustion"` (línea 136),
  `VENTAJA_EN_ATAQUE.has(condition.key)` (línea 152, el `Set` que lleva `"invisible"` **y**
  `CLAVE_AYUDA` dentro), `DESVENTAJA_EN_ATAQUE.has(condition.key)` (línea 153, cinco claves del
  SRD), `DESVENTAJA_EN_PRUEBAS.has(condition.key)` (línea 158, dos claves),
  `CONDICIONES_DE_FALLO_AUTOMATICO.has(condition.key)` (línea 166, cuatro claves) y
  `condition.key === "restrained"` otra vez, en la rama de salvación (línea 170).
- `effective-speed.ts` — **tres**: `CONDICIONES_A_CERO.has(condition.key)` (línea 70, seis
  claves), `condition.key === "prone"` (línea 74) y `condition.key === "exhaustion"` (línea 81).
- `character-sheet.service.ts` — **dos**: la consulta por `key: CLAVE_AYUDA` en `ayudaViva`
  (línea 825) y la consulta por `key: CLAVE_FURIA_ACTIVA` en `bonoDeFuria` (línea 1803, `raging`).
- **`modo-contra-objetivo.ts` — dos, que faltaban en las dos cuentas anteriores**:
  `VENTAJA_CONTRA.has(condicion.key)` (línea 67, seis claves) y
  `DESVENTAJA_CONTRA.has(condicion.key)` (línea 69, `invisible`). No es código muerto: lo usa
  `character-sheet.service.ts:1946` (`modoContraObjetivo`, el modo de tirada de quien ATACA a
  alguien con esa condición — pregunta distinta de «¿cómo tiro yo?», por eso vive en su propio
  fichero).
- **`character-state/common/agotamiento.ts` — uno, que también faltaba**: `condiciones.find((c) =>
  c.key === "exhaustion")` (línea 48, `nivelDeAgotamiento`). Lo consumen
  `character-state/common/max-hp.ts:69` y `character-sheet.service.ts:1004`: no es código muerto
  tampoco.
- **`character-state/rest/rest.service.ts` — uno más**: la consulta por `characterId_key: { …,
  key: "exhaustion" }` en `bajarAgotamiento` (línea 316).

**Quince lecturas en seis ficheros del motor**, no once en tres. La **puerta**
(`ConditionsService.apply` / `.remove`, `character-state/conditions/conditions.service.ts`) es
**tres comparaciones, no una**: `input.key === CLAVE_AYUDA` para rechazar escribir `helped` por
esta ruta (línea 169), y `esClaveReservada(...)` llamada dos veces —al aplicar (línea 178) y al
retirar (línea 454). Quince lecturas más tres de la puerta hacen **dieciocho sitios distintos**.

**El argumento del dos-de-dos sigue en pie, y sigue siendo el que importa.** De las claves leídas
en el motor —`exhaustion`, `restrained`, `blinded`, `frightened`, `poisoned`, `prone`, `invisible`,
`paralyzed`, `petrified`, `stunned`, `unconscious`, `grappled`— **todas** son del SRD y llegaron
reservadas de oficio con la lista de quince condiciones; **las dos que no lo son —`helped` y
`raging`— son exactamente las dos que hubo que acordarse de añadir a mano** a `esClaveReservada`,
y las dos se añadieron **después** de que el agujero ya estuviera abierto en producción: `raging`
es, letra por letra, la reincidencia del mismo fallo que `helped` cerró once tareas antes. No hay
ningún caso en el que la costumbre haya funcionado a la primera.

**Tres opciones, descartadas las dos primeras — no se decide hoy:**

- **(a) Procedencia en la fila** (escrita por una actividad frente a puesta a mano). Descartada:
  el DM aplicando `poisoned` a mano **sí** tiene que seguir contando como una condición que el
  motor interpreta el día que algo lea `poisoned`, así que la procedencia no puede ser el único
  criterio.
- **(b) Espacio de nombres `sys:`** que la puerta genérica rechazara de oficio. Retirada por quien
  la propuso a la vista de la ficha siguiente: el tráfico del paso 3 va sobre todo por otra
  puerta, así que esta sería una valla en un camino que casi nadie usa.
- **(c) La recomendada: una prueba que barra los seis ficheros del motor** buscando lecturas de
  `condition.key` (o del nombre local que use cada fichero — `condicion.key`, `c.key`) y exija que
  cada clave leída esté en `esClaveReservada` — el mismo tipo de red que ya existe para los
  glifos prohibidos y para el enum de Prisma contra `GAME_EVENT_TYPES`. **Se dimensiona con la
  lista de arriba entera, no con una parte de ella**: una prueba que solo buscara comparaciones
  `=== "..."` literales dejaría fuera los **siete** `Set.has(...)` de la lista —
  `VENTAJA_EN_ATAQUE`, `DESVENTAJA_EN_ATAQUE`, `DESVENTAJA_EN_PRUEBAS`,
  `CONDICIONES_DE_FALLO_AUTOMATICO` y `CONDICIONES_A_CERO`, más `VENTAJA_CONTRA` y
  `DESVENTAJA_CONTRA` de `modo-contra-objetivo.ts`, que las dos cuentas anteriores de esta misma
  ficha tampoco vieron—, y con ellos se le escaparía la única lectura de `helped` que vive dentro
  de un `Set` (`VENTAJA_EN_ATAQUE`). Es, literalmente, el mismo patrón por el que este proyecto ya
  se olvidó de reservar `helped` y `raging` una vez cada uno: mirar solo una forma de comparar y
  no la otra. Su pega real: se burla leyendo la clave desde una variable (`const k = "..."`,
  comparar contra `k`), que no es lo que hace quien añade un `if` de buena fe — el fallo realista
  es olvidarse, no evadir. **Para estrecharla**, el motor tendría que leer la clave **solo de
  constantes declaradas en `shared`** y la prueba comprobar importaciones en vez de literales, que
  es lo que `CLAVE_FURIA_ACTIVA` ya hace hoy sin que nada lo obligue.

**No se decide esta noche**: el arreglo de fondo depende de cuántos casos traiga el conversor del
paso 3 — ver la ficha siguiente y `docs/superpowers/specs/2026-09-05-paso-3-catalogo-design.md`.

---

### ~~P2-8 · `buildResponse` dentro de la transacción de `changeHp` sigue leyendo por el pool~~ (2026-09-07) — CERRADA

> **Cerrada el 2026-09-07.** `buildResponse` acepta el mismo cliente opcional y se lo reenvía a `equipoEquipado` y a `viewerFor`; se lo pasan los **cuatro** llamadores que ya corren dentro de una transacción — uno más de los tres que se habían contado, y el que faltaba era justamente el de `changeHpEnTransaccion`, que es el que esta ficha nombra. Su prueba se mide sobre un `changeHp` que **termina**: la de P2-0b no podía, porque se mide sobre uno que se rechaza antes de llegar aquí. Tres mutaciones, una por pieza.

**Abierto, menor, encontrado al cerrar P2-0b.** Con `tx`, `changeHp` ya autoriza y **deriva la
hoja** contra ese cliente. Lo que queda fuera es el final del camino feliz: `changeHpEnTransaccion`
termina llamando a `this.buildResponse(userId, actualizado)`
(`apps/api/src/characters/character-sheet.service.ts`), y `buildResponse` no acepta `tx` — de ahí
cuelgan otra vez `equipoEquipado` y `viewerFor`, que ahora **sí** saben aceptarlo pero no reciben
nada. Es el mismo defecto que P2-0b, un tramo más abajo: una conexión más con la transacción ajena
todavía abierta, esta vez para redactar la respuesta.

Se dejó fuera a propósito porque la prueba de P2-0b se mide sobre un `changeHp` que se rechaza
antes de llegar aquí, y ampliarla a este tramo habría sido arreglar dos cosas con una prueba. El
arreglo es el mismo de siempre: un `tx?` en `buildResponse` y reenviarlo desde los tres llamadores
que ya están dentro de una transacción.

---

### ~~P2-10 · Dos pruebas se pasan del tiempo por defecto cuando la suite entera corre junta~~ (2026-09-07) — CERRADA, y su diagnóstico era corto

> **Cerrada el 2026-09-07, y lo primero es que esta ficha se equivocaba en el tamaño.** Decía «dos pruebas»; medido de verdad, **no son dos: son veintitrés suites y 204 pruebas**, y casi todas caen por `Exceeded timeout of 5000 ms for a hook` —el `beforeAll` que monta la aplicación y registra a la mesa—, no por la prueba que la ficha nombraba. La suite sola pasa entera; con las unitarias de la web corriendo al lado, que es lo que pasa en cuanto alguien trabaja mientras corre, se cae en bloque. El tope por defecto de Jest está pensado para una unitaria y esta capa no lo es.
>
> El arreglo se declara donde se puede explicar: `apps/api/test/tiempo-de-espera.ts` fija 30 s para la capa entera con su medición al lado, `auth.service.spec.ts` fija el suyo porque **todas** sus pruebas hashean con `argon2`, y la carrera de quince vueltas de `iniciativa-forzada` —5,4 s ella sola, la más lenta de la suite— sube a 90 s: era la única que seguía cayendo con las dos primeras puestas. Misma contención, después: **todo verde**. Ni se bajó el paralelismo ni se abarató `argon2` — es una defensa, no un ajuste.

**Abierto, ninguna es un defecto del código.** Medido tres veces durante la tanda del 2026-09-07,
en las dos direcciones:

- `apps/api/test/peticion-de-tirada.e2e-spec.ts`, «con 60 peticiones sueltas…»: **1,4 s** corriendo
  su fichero solo, y **más de 5 000 ms** —el tope por defecto de Jest— con **toda** la suite de e2e
  de API a la vez (los conteos, en [08-pruebas.md](./08-pruebas.md)). Repitiendo por separado, pasa.
- `apps/api/src/auth/auth.service.spec.ts`, `changePassword()`: cae dos veces con `pnpm verify`
  entero (las unitarias de la web corriendo en paralelo en la misma máquina) y pasa siempre sola.
  Es `argon2`, que es caro a propósito.

El coste no es el fallo, es el diagnóstico: un rojo así **parece** un defecto del cambio que acabas
de hacer y cuesta una vuelta entera descartarlo. El arreglo, si se quiere, es un `test.setTimeout`
explícito en las dos —el mismo que `paso-1-goteras.spec.ts` ya declara y explica— y no bajar el
paralelismo.
