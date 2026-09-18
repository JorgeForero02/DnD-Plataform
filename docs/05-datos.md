# Datos

PostgreSQL 16 vía Prisma. Esquema: `apps/api/prisma/schema.prisma`.
**Las migraciones no se listan aquí ni se cuentan:** la lista es `apps/api/prisma/migrations/`, que
es la única que no puede quedarse vieja. Esta línea enumeró dos cuando ya había seis; luego dijo
«seis» y también envejeció. **Un número de migraciones en prosa caduca en el siguiente commit**, así
que aquí no va ninguno.
Todos los identificadores son `cuid()`.

## Modelo

```
User ──dueño──> Campaign ──> CampaignMember (DM | PLAYER, único por campaña+usuario)
                    │
                    ├──> Invite      (token único, role, usedAt)
                    ├──> Entity      (polimórfica por `type`)
                    ├──> Session     (status: PLANNED | IN_PROGRESS | CLOSED)
                    ├──> Character   (ownerId)
                    └──> GameEvent   (log append-only; sessionId nulo = fuera de sesión)

Character ──> CharacterResource   (consumibles: inspiración, furia, ki, dados de golpe, espacios)
          ──> CharacterCondition  (clave LIBRE; las quince del SRD son las que el motor entiende)
          ──> InventoryItem       (2B; el objeto viene del SRD -clave- o de la campaña -id-)
          ──> CharacterSpell      (3A.2; qué conjuros tiene y en qué estado; spellKey es CADENA)
          (y cinco columnas de moneda: cp, sp, ep, gp, pp)

Campaign  ──> CampaignItem ──> CampaignItemVisibilityGrant   (2B; el homebrew del DM)
          ──> CampaignStatblock                              (2D; el bestiario del DM)
          ──> DmTable ──> DmTableEntry                       (2C; las tablas de la casa)
          ──> RollRequest                                    (2C; el DM pide una tirada)

Character.statblockRef  (2D; con valor -> NO es un personaje jugador sino un PNJ instanciado,
                         y sus numeros derivan del statblock, no de clase y nivel)

Campaign ──> CampaignFlag         (marcas con nombre)
         ──> CampaignSet ──> CampaignSetMember
         ──> Rule ──> RuleTrace   (el motor de eventos; `Campaign.rulesEnabled` lo apaga entero)

Notification (por usuario; `campaignId` suelto, sin clave foránea)

Entity ──> EntityLink (from → to, label; único por from+to+label, y por from+to cuando no hay rótulo — índice parcial solo en la migración, 2026-09-11)
       ──> EntityVisibilityGrant (entidad + usuario; único)
       ──> Comment (authorId, body)
```

**Una sola tabla `Entity` para siete tipos** (`NPC`, `LOCATION`, `QUEST`, `FACTION`,
`OBJECT`, `EVENT`, `DOCUMENT`), con `body Json?` y `tags String[]`. Se eligió polimorfismo
por campo en vez de siete tablas porque la relación wiki (`EntityLink`) tiene que poder unir
cualquier tipo con cualquier tipo; con siete tablas ese enlace sería una tabla de uniones
por par.

Todo lo colgado de una campaña se borra en cascada con ella (`onDelete: Cascade`), **con una
excepción declarada**: `Notification.campaignId` es una columna suelta **sin clave foránea**,
igual que `GameEvent.sessionId`, así que las notificaciones sobreviven al borrado de la
campaña. Es deliberado —un aviso ya leído no debería desaparecer porque alguien borre la
campaña— pero conviene que esté escrito y no descubrirlo con filas huérfanas. Dentro de
una campaña, borrar una `Entity` se lleva también sus `EntityLink` (**en las dos
direcciones**: tanto los que salen de ella como los que otras entidades tienen hacia ella,
porque `from` y `to` tienen ambos `onDelete: Cascade`), sus `EntityVisibilityGrant` y sus
`Comment`. **`Session` cuelga `Encounter` desde 2.5.2 —y con él `Combatant` y `RollRequest`, todo en cascada—; `Character` sí desde 2A.8 y 2A.12**:
borrar un personaje se lleva sus `CharacterResource` y sus `CharacterCondition`, las dos en
cascada — y desde 3A.2, su `CharacterSpell` también. **`GameEvent` cuelga de la campaña, no de la
sesión**, y su `sessionId` es una columna suelta sin clave foránea: borrar una sesión **no**
borra su historia, que es lo que se quiere de un log.

## El catálogo generado del SRD 5.1 (3A.1, 2026-09-14): no toca la base

**No hay tabla ni migración.** Igual que las razas y las clases de 2A, los 319 conjuros, las 234
aptitudes de clase/subclase, los rasgos de raza y las tablas de escala del SRD 5.1 viven **en
código**: `apps/api/src/rules/catalog/generado/*.json`, generados por
`scripts/convertir-catalogo.mjs` (ver [02-entorno.md](./02-entorno.md) para cómo se regenera) y
leídos **una sola vez, al arrancar**, con Zod como barrera
(`spellsCatalogSchema`/`classFeaturesCatalogSchema`/`raceFeaturesCatalogSchema`/`classScalesCatalogSchema`,
`packages/shared/src/catalog.schema.ts`). **Generado, no editado**: un JSON no admite
comentarios, así que la marca «GENERADO por scripts/convertir-catalogo.mjs — no editar» va en el
fichero hermano `spells-srd.meta.json` y en la cabecera de `rechazos.md` (los cuatro JSON de datos
no llevan cabecera — I12, ola de arreglos); un cambio se hace en el conversor y se regenera,
nunca a mano en el JSON. `pnpm catalogo:convertir -- --check` compara los seis ficheros.

**La forma de un conjuro** (`SrdSpell`): `key` (el nombre inglés de 2014 en minúsculas con
guiones, p. ej. `fireball`; `foundryIdentifier` solo cuando el `system.identifier` de Foundry
difiere — D-CF-112),
`nameEn`/`nameEs` (`nameEs` nulable), `sinTraduccion` y `traduccionPropia` (booleanos, nunca los
dos a la vez), `level` (0–9), `school` (una de las ocho escuelas), `castingTime`, `range`,
`components`, `duration`, `ritual`, `concentration`, `textEn`/`textEs` (prosa limpia, sin HTML),
`higherLevelsEn`/`higherLevelsEs` («A niveles superiores», aparte), `classes` (claves de
`SRD_CLASSES` que lo pueden lanzar, sacadas de la lista de conjuros por clase del SRD español —
E-3A1-3), `actividades` (`Actividad[]`, la misma forma que ya consume el motor de reglas —
`packages/shared/src/activity.schema.ts` — para que un conjuro se ejecute exactamente como una
actividad de la hoja), `fueraDeA` (qué tipos de actividad de Foundry tenía y no entraron —
`summon`, `transform`…) y `efectosPasivos` (cuántos `ActiveEffects` de Foundry traía sin
convertir). **Una `Actividad` de aquí no lleva ninguna fórmula evaluable de Foundry**: cada `@`
se tradujo a una forma cerrada de `Origen` (`fijo`, `modificador`, `competencia`, `escala`,
`lanzamiento`, `nivelDeEspacio`, `cdDeConjuro`, `nivelDeClase`, `ataqueDeConjuro`) al convertir, y
una prueba (`generado.spec.ts`) falla si sobrevive una `@` en el JSON.

**La forma de una aptitud de clase** (`SrdFeature`) es la misma idea con `class`/`subclass`
(opcional) y `level` (1–20) en vez de escuela y componentes, más `usos` opcional (`{ max: Origen,
resetOn }`, la misma forma que ya usa `ClassFeature.grant` a mano). **Los rasgos de raza**
(`RaceFeature`) son la forma simétrica sin `level`/`usos`, con `race`/`subrace` en vez de
`class`/`subclass`.

**Lo que NO se convirtió a `Actividad` se queda como texto** (`actividades: []`, `textEn`/`textEs`
con la prosa completa): tipos de Foundry fuera del vocabulario cerrado (`summon`, `transform`,
`enchant`, `teleport`, `forward`, `cast`, `order`) y tres huecos reales del esquema —dados que
escalan por una tabla de nivel en vez de un bonus sumado (Ataque Furtivo), un consumo variable
que es a la vez lo que se gasta y lo que se cura (Imponer las Manos), y una duración que depende
del nivel de clase (Forma Salvaje, ya fuera de A por ser `transform`)—, documentados en
[06-pendientes.md](./06-pendientes.md). **`nivelDeClase` y `ataqueDeConjuro`** sí se resolvieron
en esta tanda: dos formas nuevas de `Origen` (`packages/shared/src/origen.schema.ts`), la segunda
por enmienda de E-3A1-4 al descubrir el hueco del bono de ataque de conjuro (17 conjuros de
ataque, incluidos Descarga de fuego y Rayo abrasador).

**`enriquecerClases`/`enriquecerRazas`** (`apps/api/src/rules/catalog/generado/index.ts`) funden
este catálogo en `SRD_CLASSES`/`SRD_RACES` **al cargar el módulo**, por clave (`<clase>[/<subclase>]:<key>`
para aptitudes, `<race>[/<subrace>]:<key>` para rasgos): una `ClassFeature`/`FeatureGrant` escrita
a mano en `classes.ts`/`races.ts` que ya trae su propio `grant` **gana** — la Furia del bárbaro
(`RASGO_FURIA`) es el único caso hoy, verificado contra el SRD y comparado por el cargador con lo
que el conversor habría generado, avisando si discrepan (E-3A1-5). Todo lo demás llega **solo por
el generado**: antes de esta tanda, 230 de 234 aptitudes eran solo un nombre sin mecánica.

## Objetos, inventario y equipo (fase 2B)

**El catálogo del SRD no está en la base**: vive en código (`apps/api/src/rules/catalog/`), como
las razas y las clases. En la base solo están los objetos **propios de una campaña**
(`CampaignItem`) y **quién tiene qué** (`InventoryItem`). Los dos orígenes se traducen a la misma
forma —`ResolvedItem` de `packages/shared`— antes de llegar al motor, que **no puede saber de
dónde salió el objeto**: esa es toda la gracia.

Cinco decisiones de forma, con su motivo, porque cambiarlas después cuesta una migración con
datos:

- **Los datos de arma y de armadura son columnas, no un `Json`.** La convención lo pide (un
  `Json` no se consulta nunca por dentro) y además evita el `Entity.body` de nuevo. El único
  `Json` es `effects`, una lista **validada al escribir y al leer** por la unión discriminada de
  Zod. Desde HP-9a (2026-09-12) el `ResolvedItem` equipado lleva además `attuned`, copiado de la
  fila de `InventoryItem`, y el motor solo aplica `effects` si el objeto no exige sintonización o
  está sintonizado (`efectosActivos`). **Sin migración**: `effects` es el `Json` que ya existía y
  `attuned` la columna que ya existía; lo nuevo es que viajan juntos hasta el motor.
- **El peso en onzas (`weightOz`) y el precio en cobres (`costCp`), enteros.** Es el mismo
  principio que los pies de la especificación de distancias: la unidad íntegra abajo, la legible
  arriba. **En libras, los pesos del SRD tienen fracciones (¼ de libra); en onzas son enteros**, y
  un entero no acumula error al sumar sesenta filas de mochila. **La excepción es la moneda**, que
  pesa ⅓ de onza y por tanto no es entera ni en onzas: el peso del dinero se redondea al sumarlo
  (`COIN_WEIGHT_OZ`), y decir «en onzas todo es entero» —como decía la primera versión de esta
  frase, usando la moneda como ejemplo— era justo el contraejemplo.
- **El sitio del objeto es un enum de tres —`EQUIPPED`, `CARRIED`, `STORED`— y la sintonización
  es un booleano aparte.** El informe de huecos proponía `CARRIED | EQUIPPED | ATTUNED`, pero un
  anillo sintonizado **está** equipado: con un solo enum habría que elegir cuál de las dos
  verdades se guarda. Y el tercer sitio lo pide la mesa (el cofre de la posada).
- **Una ranura, un objeto, garantizado por la base**: índice único parcial
  `(characterId, slot)` limitado a las filas equipadas (migración
  `20260903063419_inventory_one_item_per_slot`). Una comprobación en el servicio es una carrera
  esperando a ocurrir en cuanto alguien tenga dos pestañas abiertas; el servicio traduce el
  choque a un 409 legible. **Que una mano a dos manos bloquee la otra no cabe en un índice** —
  sería guardar ocupación derivada—, así que esa mitad la decide el servicio.
- **El dinero son cinco columnas** (`cp`, `sp`, `ep`, `gp`, `pp`) y no un total normalizado: la
  mesa dice «tres monedas de plata», y un total en oro obliga a decidir qué hacer con 12,37 ya
  escritos el día que alguien quiera las cinco. Se mueve por **deltas**, como los PG, y un delta
  que dejaría la bolsa en negativo se rechaza: **no hay cambio automático**, porque cambiar plata
  por oro es una decisión de la mesa.

**Todo movimiento del inventario deja rastro en el log** (`ITEM_ADDED`, `ITEM_MOVED`,
`ITEM_REMOVED`, `ITEM_QUANTITY_CHANGED` desde el 2026-09-11 —el `PATCH` de cantidad no escribía
nada, lo vio la revisión de M2B-8—, y `MONEY_CHANGED` para la bolsa), escrito en la misma
transacción que el cambio.
Ver la sección del log más arriba.

**Borrar tiene dos comportamientos distintos, y es a propósito.** Borrar un personaje se lleva su
inventario en cascada; borrar un `CampaignItem` que alguien lleva encima **no se puede**
(`onDelete: Restrict`, y el servicio lo traduce a un 409 que dice cuántos lo tienen). Vaciar en
silencio la mochila de tres personajes por borrar una definición sería justo el tipo de pérdida
que nadie reproduce y todo el mundo recuerda.

**Visibilidad.** `CampaignItem` la tiene y nace `PLAYERS`; el DM que prepara la mazmorra lo crea
`DM_ONLY`, y entonces **no se lo puede dar a un jugador** sin subirle la visibilidad: la API
rechaza con un 400 que explica cómo arreglarlo. Las dos alternativas eran peores — mandárselo
igual es un agujero de `canView`, y pintarle una fila fantasma es una pantalla que miente. Lo
que **no** se modela es «lo tengo pero no sé qué hace»: eso es visibilidad **por campo**, que el
modelo no hace en ningún sitio, y la traza de la CA delataría el número igual.

## Lo que la tanda de migraciones del 2026-09-11 quitó (D-CF-14)

Las ocho migraciones de esa noche están en [07-historial.md](./07-historial.md) con su porqué.
Lo que **añadieron** (identified/unidentifiedName, attackRef, encumbranceVariant, los dos
`GameEventType` nuevos y el índice parcial de enlaces) se describe cada uno en su sección de este
documento. Lo que **quitaron**, y por eso ya no aparece en ninguna:

- **`enum RestKind`** (`SHORT`/`LONG`): nunca fue tipo de ningún campo. `DROP TYPE` en
  `20260911100000_drop_rest_kind`, y una prueba (`prisma/no-dead-enum.spec.ts`) impide que vuelva
  a haber un enum sin campo.
- **`Character.race` y `Character.class`**, texto libre heredado de antes del catálogo. Se borraron
  **sin medir datos** por decisión del autor (D-CF-27): la verdad son `raceKey`/`subraceKey`/
  `classKey`/`subclassKey`. `20260911…_drop_character_free_text_race_class`.

## Lo que 2C añadió a la base, en una línea cada cosa

- **`Campaign.clockSeconds`** y **`Character.lastLongRestClock`** (2C.3): el reloj, y cuándo
  terminó el último descanso largo **en ese mismo reloj**. Detalle abajo.
- **`CharacterCondition.expiresAtClock`** (2C.4): cuándo vence una condición. **No hay columna
  `expired`**: si está vencida es una resta contra el reloj, y guardarlo sería una segunda verdad
  que puede discrepar de la primera —además de obligar a un barrido periódico que, si no corre,
  deja una condición frenando a alguien después de su hora—.
- **`RollRequest`** (2C.5): una petición de tirada. **Es una tabla y no un `GameEvent`** porque
  tiene estado —nace pendiente y se responde— y el log es un registro de hechos que no se
  modifican; y porque «¿qué me han pedido?» es una consulta por columnas, no un recorrido del log.
  Guarda **una clave de valor de la hoja**, no una expresión: el modificador se lee al tirar.
- **`Character.statblockRef`** (2D.4): con valor, esa fila **no es un personaje jugador sino un
  PNJ instanciado**, y sus números derivados salen del statblock por el camino de monstruo del
  motor. `classKey`, `raceKey` y `level` no se usan; las seis características se copian porque el
  estado mutable las lee sin pasar por el motor.

  **`Character` pasa a tener dos formas, y eso es el riesgo de datos de la fase.** Toda derivación
  que asuma la primera es un fallo esperando, y por eso el motor **rechaza** una entrada que
  mezcle las dos (`comprobarEntradaDeMonstruo`) en vez de elegir una rama en silencio: un PNJ con
  `level: 3` colado por descuido derivaría su competencia del nivel y el número seguiría pareciendo
  plausible.

- **`CampaignStatblock`** (2D.3): un statblock de PNJ escrito por el DM. Espeja `Statblock` de
  `packages/shared`, que es donde vive la forma. Es **columna** lo que hace falta consultar o
  filtrar —la CA, el VD, el tamaño, la visibilidad— y **Json** lo que solo se lee entero: los
  rasgos, las acciones, las reacciones y el mapa de competencias por habilidad, validados al
  escribir por Zod. El mismo criterio que `CampaignItem.effects` de 2B.

  **Tres cosas que NO se guardan porque se derivan**, y esta es la mitad del diseño: el **tamaño
  del dado de golpe** (sale del tamaño de la criatura), el **bonificador de competencia** (sale
  del valor de desafío) y los **PG máximos** (media de los dados más Constitución por dado). Lo
  que se guarda es `hitDiceCount` y `cr`; el resto lo calcula el motor y sale en la traza.

  **Y se guarda el NIVEL de competencia por habilidad, no el bono ya sumado.** El sigilo +6 del
  goblin es `{"stealth": "expertise"}`: guardando el 6 la ficha enseñaría un número sin origen,
  que es justo lo que la traza existe para evitar.

  Nace **`DM_ONLY`** —preparar la mazmorra no puede ser filtrarla— y cuelga de la campaña en
  cascada, contado de verdad en la prueba de borrado.

- **`InventoryItem.identified` y `unidentifiedName`** (D-CF-15, 2026-09-11): «lo tengo pero no sé
  qué hace», con la forma de Foundry. Capa ortogonal a `canView`, por fila y solo del DM: para
  quien no es DM se sustituye la identidad —nombre, descripción, referencia— y se conservan los
  números, en cada camino por el que un objeto sale del servidor (listado, hoja, ataques, traza,
  sucesos del hilo, errores, tiradas). El dueño siempre ve sus filas; el catálogo puede bajar a
  `DM_ONLY` mientras todas las filas en manos de jugadores estén sin identificar. De paso,
  **`GameEvent.attackRef`** (columna, misma tanda): el crítico de un daño se casa con su ataque por
  la referencia real del objeto y no por el nombre, que ahora puede cambiar entre el ataque y el
  daño; es interna —no sale a quien no es DM— y los sucesos anteriores, sin ella, siguen casando
  por nombre.
- **`Campaign.boardRoomUrl`** (`String?`, pulido 2026-09-12, C1 bis, spec del tablero § 2 ter): la
  URL de la partida de PlanarAlly (`tablero.supportive.pro/game/<nombre>`) que la mesa enmarca.
  Texto libre validado en el contrato —`http(s)` únicamente, ≤ 500 caracteres—, porque el valor va
  a un `src` de `<iframe>` y `javascript:` no es una sala. La escribe el DM con
  `PATCH /campaigns/:id`, igual que `encumbranceVariant`; `null` la quita, ausente no la toca.
- **`Campaign.encumbranceVariant`** (D-CF-16, 2026-09-11): la sobrecarga del SRD como variante,
  apagada por defecto y solo del DM. Encendida, el motor resta 10/20 pies por encima de 5×/10×
  Fuerza de peso llevado, ignora la columna de Fuerza de la armadura (lo manda la variante) y
  sugiere desventaja solo en Fuerza, Destreza y Constitución; `GET …/inventory` devuelve el
  estado calculado en el servidor para que el panel no lo recalcule sobre filas filtradas.
- **`DmTable`** y **`DmTableEntry`** con **`Campaign.houseTablesEnabled`** (2C.6): las tablas de la
  casa, apagadas por defecto. Un **índice único parcial** —`("campaignId", trigger) WHERE trigger
  <> 'NONE'`, escrito a mano en la migración porque Prisma no sabe expresarlo— garantiza como mucho
  una tabla de críticos y una de pifias por campaña. En la base y no en un `if` del servicio: la
  comprobación en el servicio es una carrera esperando a ocurrir en cuanto alguien tenga dos
  pestañas abiertas.

## `Character.subclassKey` — un camino, no todos (encargo A8, 2026-09-07)

**`String?` nulable y sin clave foránea, igual que `classKey`**: el catálogo del SRD vive en
código (`apps/api/src/rules/catalog/classes.ts`), no en una tabla. `null` significa «todavía no
ha elegido camino», y es un estado legítimo hasta el nivel en que la clase elige —`chosenAtLevel`,
distinto por clase (clérigo 1, druida 2, guerrero 3) y leído del catálogo, nunca escrito a mano.

Era un fallo vivo en producción, no una mejora: hasta esta columna, `resolve.ts` recorría **todas**
las subclases de la clase resuelta y aplicaba sus rasgos por nivel sin mirar nunca qué había
elegido el personaje. Con el catálogo de hoy —una sola subclase por clase, comprobado con un
invariante en `catalog.spec.ts`— el efecto no era «dos caminos a la vez»: era que el rasgo del
único camino aparecía **igual con la elección puesta a `null`**, que es la ficha de cualquier
personaje recién creado de nivel igual o mayor que `chosenAtLevel`.

**Nunca revienta la hoja.** Una `subclassKey` que no pertenece a la clase actual —de otra clase,
o de un catálogo que ya cambió— es el mismo caso que `stale_choice` ya cubre para las elecciones:
un dato viejo no es un dato inválido, así que no se aplica ningún rasgo y se avisa
(`subclass_not_chosen`) en vez de lanzar. Al **escribir**, sí es distinto: `updateSheet` rechaza
con 400 una subclase que no sea de la clase actual, y **cambiar de clase borra la subclase
guardada en la misma escritura** (mismo mecanismo que ya existía para `subraceKey` al cambiar de
raza). El único camino honesto para llegar a un `subclassKey` que no encaje con la clase es un
dato anterior a esta columna, o una vía de escritura futura que no pase por este servicio — la
tolerancia de `resolveBuild` es la red de seguridad para eso, no una puerta abierta hoy.

**Efecto sobre datos vivos, para quien despliegue esto:** un personaje de nivel igual o mayor que
`chosenAtLevel` que ya exista en producción **pierde los rasgos de su camino hasta que alguien
elija uno** en la hoja (la columna nace `null` para todo el mundo). No hay migración de datos que
lo evite sin adivinar qué camino tenía cada mesa en la cabeza — es el mismo motivo por el que
`choices` tampoco se migra a mano cuando cambia una raza o una clase.

## Iniciativa y orden de turnos (2.5.2)

**`Encounter` cuelga de la `Session`**, que ya es el estado mutable de la partida. Dentro,
**`Combatant`** es una lista ordenada que apunta a un `Character` — desde 2D un PNJ en la mesa **es**
una fila de `Character`, así que no hace falta un segundo tipo de combatiente. Los seis goblins de
un mismo grupo (2D) son **seis filas de `Combatant`** que comparten `initiative` porque
compartieron la misma tirada, no una fila compartida entre los seis.

Dos restricciones que garantiza la base, no un `if` del servicio — la misma convención que
`session_one_in_progress_per_campaign` (2A.5) y `DmTable` (2C.6):

- **Como mucho un `Encounter` sin terminar por sesión**: índice único parcial
  (`encounter_one_active_per_session`, escrito a mano en la migración porque Prisma no sabe
  expresarlo), sobre `sessionId` con `WHERE status IN ('ACTIVE', 'PREPARING')`. **Recontado el
  2026-09-05** (plan `2026-09-05-iniciativa-y-bando.md`, tarea 1): el `WHERE` original solo
  miraba `ACTIVE`, y con `PREPARING` como estado nuevo eso dejaba convivir un encuentro
  preparándose con uno ya activo en la misma sesión — justo el lío que este índice existe para
  impedir. Sigue siendo e2e contra Postgres real, no unitaria, por la misma razón que las otras
  dos: una comprobación en el servicio es una carrera esperando a que el DM tenga dos pestañas
  abiertas.
- **Una posición no se repite dentro de un encuentro**: `@@unique([encounterId, position])` sobre
  `Combatant`, que Prisma sí expresa directamente en el esquema.

**`Encounter.status` tiene un tercer valor, `PREPARING`** (plan `2026-09-05-iniciativa-y-bando.md`,
tarea 1). Un encuentro nace `PREPARING` cuando alguno de los personajes que entran en él no es del
DM: falta que esos jugadores tiren su propia iniciativa antes de que el combate pueda empezar. Si
todos los que entran son del DM, nace `ACTIVE` directamente, como siempre — nadie a quien pedirle
nada. `PREPARING` **no es un estado terminal**: o pasa a `ACTIVE` cuando la última petición se
responde (`aplicarIniciativaDePeticion`, dentro de la misma transacción que cierra esa petición) o
el DM lo cancela, y cancelar **lo borra** — «no es historia, es un clic deshecho», así que un
combate que nunca empezó no deja fila ni suceso.

**`RollRequest` gana dos columnas** para poder ser también la petición de iniciativa:

- **`encounterId`** (nulo salvo que la petición sea de iniciativa): de qué encuentro salió, si
  salió de uno. Nulo a propósito en toda petición normal —una de percepción no viene de un
  combate y no debe fingir que sí—. Con él, el encuentro sabe a quién espera (sus peticiones sin
  `resolvedAt`), la pantalla del jugador sabe que ESTA se presenta a lo grande, y al responder se
  sabe dónde escribir la iniciativa. Un booleano `esIniciativa` habría mentido el día que exista
  otra petición ligada a algo que no sea un encuentro. **No es un campo del esquema público del
  `POST`** (`createRollRequestSchema`): nadie lo consume desde ahí, `EncountersService` la escribe
  directamente con `tx.rollRequest.create`, y dejarlo en el esquema público habría prometido una
  garantía que ese endpoint no da.
- **`cancelledAt`**: cerrada porque el DM forzó el arranque (`force-start`, sin esperar a los
  rezagados), **no** porque alguien la respondiera. Con `resolvedAt` puesto y `resolvedEventId`
  nulo, esto es lo que separa «lo anularon» de «lo respondí yo» — sin ella la pantalla del
  jugador le diría que tiró él cuando en realidad el DM cerró el combate sin esperarlo.

**`position` es del GRUPO, y varios combatientes la comparten.** Sale del SRD 5.1
(«Initiative»): *«The DM makes one roll for an entire group of identical creatures, so each member
of the group acts at the same time»* — actuar a la vez es ocupar una entrada del orden. Los
miembros de un grupo idéntico comparten la tirada, la `initiative` **y la `position`**.

Por eso la restricción única es `@@unique([encounterId, characterId])` —un personaje no entra dos
veces— y **no** `(encounterId, position)`, que haría imposible el agrupamiento. `groupKey` guarda a
qué grupo pertenece cada fila: se guarda en vez de derivarse de `Character.statblockRef` porque el
DM puede **sacar a uno de su grupo** corrigiendo su iniciativa, y eso es un hecho del encuentro,
no del personaje.

Con dos personajes y seis goblins hay **ocho combatientes y tres posiciones** (dos grupos de uno
más el de goblins). El spec de la fase 2.5 (§2.5.2) dice «siete» para ese ejemplo y la cifra no
sale de ninguna lectura; el modelo que describe sí es el correcto. Queda declarado en
[06-pendientes.md](./06-pendientes.md) para que el autor lo confirme o corrija el spec.

**`Encounter.round`** empieza en 1 (no hay «asalto 0») y **`Encounter.activePosition`** guarda la
posición de quien tiene el turno. Pasar de turno recorre `Combatant` ordenado por `position` y, al
volver al principio, sube `round` **y avanza `Campaign.clockSeconds` en `SEGUNDOS_POR_ASALTO` (6)**
por el mismo camino que cualquier otro avance del reloj (`GameClockService.advance`, ahora con un
parámetro `tx` opcional para compartir la transacción del turno) — así las condiciones de 2C.4, que
ya caducan solas contra ese reloj, **empiezan a caducar en combate sin que este código sepa nada de
condiciones**.

**`Combatant.side` es el bando, y vive en el encuentro a propósito (plan 02, 2026-09-05).**
`CombatantSide` tiene tres valores —`ALLY`, `ENEMY`, `NEUTRAL`— y **no está en `Character`**:
«enemigo» no es una propiedad de una criatura, es **una relación en un momento**. Un
`Character.faction` habría que mantenerlo sincronizado con la ficción y se pudre el día que el
mercader se vuelve enemigo; aquí es un dato de vida corta que muere con el encuentro.

- **Por defecto `NEUTRAL`, y no `ENEMY`.** Las filas que ya existían se crearon sin bando, y un
  valor por defecto que **afirme** algo las convertiría en una afirmación que nadie hizo. `NEUTRAL`
  significa literalmente «no se ha dicho».
- **Lo dice el DM al empezar el encuentro** (`startEncounterSchema.sides`, un mapa
  `characterId → bando`); **el servidor no lo adivina** porque no hay dato del que deducirlo — ni el
  tipo de ficha ni la visibilidad sirven: un PNJ `DM_ONLY` puede ser el aliado que aparece a mitad
  de escena.
- **Un bando para alguien que no entra al combate es un 400**, y la comprobación vive en el esquema
  de `@dnd/shared` y no en el servicio. Estuvo en el servicio y una prueba la tumbó: allí llegaba
  **después** del 409 de «ya hay un encuentro activo», así que la misma petición mal construida daba
  409 contra una sesión que ya combatía. Un código de estado que depende de si hay pelea no dice la
  verdad.
- **No necesita filtro propio.** El bando viaja con el combatiente, y un combatiente solo llega a un
  espectador si su `Character` pasó `canView`: saber de qué lado está alguien a quien ya se ve no
  revela nada.

**El orden se calcula UNA VEZ al empezar el encuentro y se guarda.** El SRD: el orden de iniciativa
no cambia de asalto a asalto. `Combatant.initiative` sigue siendo editable por el DM después (como
en Foundry, el SRD deja los empates a su criterio) sin que eso recalcule `position`.

## El reloj de la campaña (2C.3)

`Campaign.clockSeconds` es un **entero de segundos de juego**, no una fecha. Decisión del autor, y
coincide con la práctica: Foundry guarda el tiempo del mundo en segundos y los calendarios son una
capa encima que lo avanza por deltas. Lo que lo hace la elección correcta aquí es que **un asalto
son seis segundos**: la iniciativa, cuando llegue, avanzará este mismo contador de seis en seis, y
guardar minutos habría obligado a migrar ese día.

Un calendario —día, mes, estación— es una capa de presentación sobre este número y se puede añadir
sin tocar el dato. Al revés no se puede, que es el motivo de guardar el contador y no la fecha.

**Solo se avanza, nunca se fija** (`POST /clock/advance`, y la suma la hace el motor de la base con
`increment`): dos avances a la vez —el DM en dos pestañas, o una regla que dispare otro— perderían
uno de los dos si el número se compusiera en memoria. Y retroceder no es una operación que ninguna
mesa quiera de verdad, pero sí una forma de que algo caduque dos veces.

`Character.lastLongRestClock` guarda **en este mismo reloj** cuándo terminó el último descanso
largo. Va con el reloj de la campaña y no con la hora del servidor a propósito: lo que la regla
cuenta son 24 horas *de juego*. Con `Date.now()`, una sesión de cuatro horas reales que cubre tres
días de viaje habría bloqueado dos descansos que el juego permite, y una mesa que juega una vez al
mes no habría bloqueado ninguno.

## Estado de partida: la sesión con estado y el log (tarea 2A.5)

**El proyecto guardaba documentos y no guardaba partida.** `Session` no tenía estado —no
existía «sesión en curso»— y por tanto una tirada, unos PG o un descanso no tenían de dónde
colgar. Eso se arregla con tres piezas, y la forma de las tres está razonada en
[el plan de 2A, §1](./superpowers/plans/2026-09-01-fase-2A-motor-y-hoja-de-personaje.md).

**1 · La sesión gana estado, y solo el DM lo cambia.** `status` (`PLANNED`, `IN_PROGRESS`,
`CLOSED`), `startedAt` y `endedAt`, más `POST .../sessions/:id/start` y `.../close`, los dos
con `requireDM`. Arrancar una sesión ya en curso **no es un error**: devuelve la sesión, porque
el DM que pulsa dos veces quería exactamente lo que ya tiene. Reabrir una cerrada **sí** lo es
(409), y cerrar lo que no está en curso también.

**No hay botón de «guardar partida», y su ausencia es la funcionalidad:** cada cambio se
escribe cuando ocurre, así que suspender no cuesta nada.

**Como máximo una sesión en curso por campaña, garantizado por la base:**

```sql
CREATE UNIQUE INDEX "session_one_in_progress_per_campaign"
  ON "Session" ("campaignId") WHERE "status" = 'IN_PROGRESS';
```

Prisma no sabe expresar un índice único **parcial** en el esquema, así que va como SQL crudo
dentro de la migración `20260902131046_session_state_and_game_event`. **No se comprueba en el
servicio a propósito:** una comprobación en el servicio es una carrera esperando a ocurrir en
cuanto el DM tenga dos pestañas abiertas. El servicio solo traduce el choque (`P2002`) a un 409
legible. Y como el Prisma simulado de las unitarias no valida SQL, **su prueba es e2e y no
unitaria** — comprobado borrando el índice y viendo la prueba ponerse roja.

**`Session.openingEntityId` — dónde abre la escena (plan 02, 2026-09-05).** Una sesión puede
apuntar a la ficha del mundo por la que empieza. Tres reglas la gobiernan:

- **`ON DELETE SET NULL`, nunca `CASCADE`.** Borrar un lugar del mundo no puede borrar la sesión
  que pasó allí. Comprobado **borrando la entidad de verdad** en
  `apps/api/test/sessions.e2e-spec.ts`, no leyendo el esquema.
- **Nunca se guarda el nombre del lugar como texto.** Se quedaría viejo, no enlazaría y no
  respetaría la visibilidad — que es exactamente lo que esta columna existe para no repetir.
- **Lo que se devuelve pasa por `canView` con el espectador delante, y si no puede ver la ficha el
  campo llega AUSENTE.** Ni `openingEntity` ni `openingEntityId`: dejar el id sería un
  identificador que el jugador no puede resolver pero que **confirma que la sesión abre en algo
  escondido**, y devolver `null` mentiría, porque `null` significa «no abre en ningún sitio».
  Ausente y presente-pero-vacío son cosas distintas para quien pinta.

Y **apuntar a una ficha de otra campaña es 404, no 400** (`SessionsService.apertura`): un
«prohibido» ya confirma que la ficha existe. Ojo con el atajo: `SessionsService.canSee` pasa
`createdById: ""` y `grantedUserIds: []`, que para una `Session` vale —no tiene ni creador ni
concesiones— pero **para una `Entity` no**, así que la ficha de apertura se lee con sus `grants` y
su `createdById` de verdad. Con el atajo, una ficha `OWNER_DM` o `SPECIFIC_PLAYERS` se habría
escondido de quien sí tenía derecho a verla: el fallo contrario a una fuga, que ninguna prueba de
fuga caza.

**`Session.recap` y `Session.recapVisibility` — la crónica sale del Json (plan 02, 2026-09-05).**
La crónica vivía **dentro de `notes`** (`Json?`) y elegir quién la veía **no hacía nada**: el
servicio publicaba el suceso de cierre con `closed.visibility`, la de la **sesión**. Son columnas
por dos motivos, y ninguno es la limpieza:

- **Se filtra.** «Dónde se quedó» en el listado de campañas trae la crónica de la última sesión
  cerrada de cada una **filtrada por visibilidad**, y filtrar por un campo dentro de un Json es lo
  que este proyecto ya decidió no hacer.
- **`notes` tiene otro dueño.** El motor de reglas escribe ahí un **array de cadenas**
  (`ADD_SESSION_NOTE`, `apps/api/src/rules-engine/rules-engine.service.ts`, caso `ADD_SESSION_NOTE`), así que una
  nota puesta por una regla **se llevaba la crónica por delante** sin decir nada: el `Array.isArray`
  fallaba y empezaba un array nuevo. Sacarla del Json no es orden, es dejar de perder datos.

**Y la visibilidad de la crónica no es la de la sesión, a propósito**: una crónica puede publicarse
a la mesa aunque la sesión fuera preparación del DM, y al revés. Al leer, `SessionsService` quita
**las dos columnas** si el espectador no puede ver el nivel — dejar `recapVisibility` sin la crónica
diría «hay una crónica y no te la enseño».

**La migración movió lo que ya había** (`UPDATE ... SET "recap" = "notes"->>'recap' WHERE "notes" ?
'recap'`) y **no borró la clave de `notes`**: dejarla es barato y hace la vuelta atrás trivial. Se
limpia en otra migración, cuando conste que nadie la lee.

**2 · Un log append-only al lado, `GameEvent`.** Campaña, sesión (nulable), actor, tipo,
sujeto, `payload Json`, visibilidad y fecha, con tres índices por los tres caminos de consulta.

**La línea que impide que ese `Json` sea la trampa de `Entity.body`: el log nunca es la fuente
del estado.** El estado se lee de sus columnas; el log cuenta *qué lo cambió*. De ahí la regla,
escrita en [04-convenciones](./04-convenciones.md) y no dejada implícita: **todo lo que haga
falta consultar o filtrar es una columna real**, y si algún día hace falta consultar por un
campo del `payload`, ese campo **se promociona a columna**. No se consulta dentro del JSON.

**Los tipos que añadió la fase 2B**, y se nombran porque son los que conectan el inventario con
este log: `MONEY_CHANGED` (los deltas por denominación, nunca un total normalizado) y
`ITEM_ADDED` / `ITEM_MOVED` / `ITEM_REMOVED`. Los cuatro se escriben **dentro de la misma
transacción que el cambio que describen**, así que un cambio que se deshace se lleva su rastro con
él. Antes de 2B el dinero dejaba huella y los objetos no, y con una semana entre sesiones eso
significaba que nadie podía responder «¿quién cogió la gema?». **Y desde el 2026-09-11 la muerte
también es un tipo**, `CHARACTER_DIED` (J5): la hoja seguía derivándola al leer —tres fracasos,
daño masivo o agotamiento 6— y el registro no podía decir de qué murió nadie; ahora se escribe en
la transición, una sola vez, con la causa cerrada y la tirada que la decidió.

El `payload` está validado al escribir por una unión discriminada de Zod
(`packages/shared/src/game-event.schema.ts`), discriminada por `type`. Añadir un tipo de evento
es añadir un valor al enum de Prisma y un miembro a la unión: **no toca ninguna tabla**. El
riesgo de que los dos lados se separen está cubierto por una prueba que lee `schema.prisma` y
compara el enum con `GAME_EVENT_TYPES`, que es la fuente única.

**Cada evento lleva su `visibility` y se lee con `canView`**, igual que cualquier otro recurso:
un evento `DM_ONLY` no viaja al jugador. El actor hace de creador, que es lo que da sentido a
`OWNER_DM` sobre una tirada propia.

**Una consecuencia de paginar y filtrar en ese orden, dicha en voz alta:** el filtro por
`canView` va **después** de traer la página, así que una página puede devolver menos elementos
de los pedidos, o ninguno, y aun así quedar log por leer. Por eso el cursor sale de la **última
fila traída** y no de la última visible: si saliera de la visible, una página entera de eventos
`DM_ONLY` dejaría al jugador atascado. La alternativa —filtrar en SQL— exigiría reimplementar
la matriz de visibilidad en un `where`, que es justo lo que `canView` existe para que nadie
haga.

**3 · Lo que 2A.5 no traía**, y llegó el mismo día con 2A.6, 2A.7 y 2A.8: `currentHp`, `tempHp`,
los recursos consumibles y las condiciones. Están todos en el esquema **y todos tienen pantalla
desde 2A.10** (`apps/web/src/features/character-sheet/`). **El estado de sesión y el registro también la tienen desde el 2026-09-02**
(`apps/web/src/features/sessions/` y la ruta `/campaigns/:id/sesion`): hay barra de «en juego»,
mesa con elenco y registro en vivo, y botones para empezar y cerrar. Hasta ese día no los había,
y por eso **los sucesos se escribían fuera de sesión** — la ficha **D9**, ya cerrada.

> **Y aquí este párrafo decía una mentira con un «esto sí es cierto hoy» delante, hasta el
> 2026-09-08.** Decía: *«Lo que sigue **sin** pantalla, y esto sí es cierto hoy, son los avisos y
> las marcas y conjuntos… No hay `features/notifications` ni pantalla de estado del mundo»*. Las
> dos existen: `apps/web/src/features/notifications/` (la bandeja, montada en `ui/AppShell.tsx`) y
> `apps/web/src/features/world-state/`. **La frase que se blinda a sí misma —«esto sí es cierto
> hoy»— es la que más hay que comprobar**, porque le pide al lector que no lo haga. Se conserva
> citada en vez de borrarse por eso. La ficha `D9` que la acompañaba se archivó el mismo día; ver
> [`_archivo/pendientes-cerrados-2026-09-08-reconocimiento.md`](./_archivo/pendientes-cerrados-2026-09-08-reconocimiento.md).

**4 · `Character.overrides`** (2026-09-02, migración `character_manual_overrides`). Anulaciones
manuales del DM sobre valores **derivados**: `{ "ac": 18 }`. Es la válvula de escape de «se
guarda lo decidido, se calcula lo derivado» — el catálogo del SRD no cubre un objeto mágico, un
don ni una regla de la casa, y sin esto la única salida era mentirle a la ficha subiendo una
característica hasta que cuadrara el número. **Se aplica como un `override` del motor**, así que
sale en la traza con su delta y el jugador ve de dónde viene. Solo el DM la escribe: una
anulación que el dueño puede ponerse no es una anulación, es un campo libre. El tipo de suceso
`MANUAL_OVERRIDE_SET` existía desde 2A.5 **sin columna que lo produjera**; ahora la tiene.

## Tipos de daño y resistencias que reducen (tarea 2.5.1)

**`GameEvent.damageType`** (`DamageType?`, migración `20260903211303_game_event_damage_type`):
promovido de `payload` a columna porque hay que poder preguntar *«¿de qué murió Elara?»* sin
recorrer el log. **Opcional**: todo el historial ya escrito no lo tiene, y una curación o un
ajuste del DM no tienen tipo de daño. Índice `[subjectType, subjectId, damageType]`.

**`CampaignStatblock.damageModifiers`** (`Json?`, migración
`20260903211642_statblock_damage_modifiers`): la MISMA resistencia que ya guardaban
`damageResistances`/`Immunities`/`Vulnerabilities` (prosa, **se conservan**), partida en la parte
que el servidor sabe aplicar: `{ damageType, effect: "RESIST"|"IMMUNE"|"VULNERABLE", note? }[]`.
`note` es la prosa que **limita** la regla («de ataques no mágicos con armas que no sean de
plata», el caso del tumulario) — el servidor nunca la interpreta, la enseña al DM. Validado al
escribir por `damageModifiersSchema` de `@dnd/shared`. El catálogo SRD solo lo rellena para las
tres criaturas con resistencia limpia o citable (esqueleto, zombi, tumulario); las otras doce
llevan `[]`.

`apps/api/src/character-state/damage/apply-damage-modifiers.ts` es la función pura —mismo sitio
que `effective-speed.ts`— que reduce un daño bruto por esos modificadores y devuelve la traza.
Se engancha al `POST .../hp` existente: con `damageType` en el cuerpo, reduce antes de aplicar;
sin él, el comportamiento no cambia.

## `sourceCharacterId`: de quién viene un golpe puesto a mano (tarea 11 del pulido, C4 #15)

**`changeHpSchema.sourceCharacterId`** y **`HP_CHANGED.sourceCharacterId`** (`z.string().min(1)`,
opcional, sin migración: viven en el `payload Json` como `rollEventId`, no en columna — no hay
consulta declarada que necesite promoverlo). Es el mismo patrón que `ATTACK_RESOLVED.attackerId`:
un id, nunca un nombre; quien lee resuelve el nombre contra `canView` (`nombres-del-hilo.ts`,
`apps/web`), nunca el servidor.

Se manda cuando el DM pone daño a mano desde el elenco y **no** cuelga de ninguna tirada — con
`rollEventId`, el origen se recupera de ahí y este campo sobra. **`character-sheet.service.ts`
escribe `sourceCharacterId` siempre que viaje** — el esquema no exige que venga solo: si algún
cliente mandara los dos a la vez, `changeHp` los escribe los dos, y **que no acompañe a
`rollEventId` es responsabilidad de quien manda la petición**, no una regla que el servidor
imponga. `PonerDano.tsx` (el único cliente que hoy manda `sourceCharacterId`) no ofrece un
`rollEventId` — así que el caso no se da desde la interfaz —, y `lineaDeLog` (`apps/web`) resuelve
el orden si algún día sí conviven: `sourceCharacterId` manda cuando se ve; si no se ve, cae al
atacante de la tirada citada por `rollEventId`; si ninguno se puede nombrar pero se citó alguno de
los dos, «Alguien» y no silencio. El servicio valida el que llegó con
`requireVisibleCharacter` (`apps/api/src/common/character-viewer.ts`) antes de escribirlo: 404 si
el id no existe en la campaña **o** si existe pero el actor no lo ve — el mismo 404 uniforme que
ya usa `sePuedeApuntar`, para no delatar por la forma del error cuál de los dos casos era.

## `ENTITY_REVEALED` también nace de subir la visibilidad a mano (2026-09-04, ficha P1)

Hasta ahora el único sitio que emitía `ENTITY_REVEALED` era el motor de reglas (efecto
`REVEAL_ENTITY`). `EntitiesService.update` lo emite también cuando **sube** la visibilidad de
una ficha, que es como se revela un lugar casi siempre en la mesa. «Sube» se define comparando
**la audiencia como conjunto** (`laAudienciaCrecio`, en `apps/api/src/common/visibility.ts`,
junto a `canView`), no un índice: los cinco niveles **no** forman una cadena de superconjuntos
—`OWNER_DM` y `SPECIFIC_PLAYERS` son incomparables— y un índice lo dio por hecho y falló en
revisión el 2026-09-04. (Hasta el 2026-09-11 esta frase decía lo contrario.) Bajar la
visibilidad **no** es revelar y
no emite nada. El suceso hereda la visibilidad **nueva** de la entidad (no la vieja, ni un valor
fijo): un aviso de revelación no puede ser más secreto que la cosa revelada, ni más público que
ella. Se escribe dentro de la misma `PrismaService.transaction` que el `UPDATE`, así que llega al
buzón de `after-commit.ts` y se emite tras el *commit*, igual que cualquier otro evento acoplado a
un cambio.

## Archivar un personaje en vez de borrarlo (tarea 2.5.8, ficha M9)

**`Character.archivedAt`** (`DateTime?`, migración `20260904055722_character_archived`): `null` =
activo, con fecha = archivado. No es un booleano — guardar CUÁNDO se archivó es gratis aquí y
cuesta una consulta aparte en cualquier otro sitio. **Nada más cambia**: la hoja, el inventario
(`InventoryItem.characterId`) y el dinero (las cinco columnas de moneda del propio `Character`)
siguen en sus filas de siempre, así que recuperar un personaje es limpiar una columna, no
reconstruir nada.

`CharactersService.list()` suma `archivedAt: null` a la misma consulta que ya excluye a los PNJ
instanciados (`statblockRef: null`, 2D.6): un filtro más sobre la consulta existente, no una
tabla ni un segundo listado. `listArchived()` es su espejo, con `archivedAt: { not: null }`, para
que archivar sea recuperable de verdad y no un borrado con otro nombre.

`archive()`/`unarchive()` usan `requireEditable` —dueño o DM, la misma regla que ya gobierna
editar— y son idempotentes: repetir el gesto no vuelve a escribir la fecha ni a emitir el suceso.
Cada uno deja su rastro en la línea de tiempo (`CHARACTER_ARCHIVED` / `CHARACTER_RESTORED`, con
`characterName`), con la visibilidad del propio personaje, dentro de la misma
`PrismaService.transaction` que el `UPDATE`. El borrado de verdad (`DELETE`) sigue existiendo tal
cual, para el personaje creado por error — lo que cambia es cuál de los dos gestos es el fácil.

## Editar y borrar campañas; expulsar y salir (tarea 1.17a)

Tres endpoints nuevos en `apps/api/src/campaigns/campaigns.controller.ts`, los tres exigen
sesión y comprueban el rol **en el servidor** (`MembershipService`, nunca en el cliente):

- **`PATCH /campaigns/:id`** — solo el DM. Body `UpdateCampaignInput`
  (`packages/shared/src/campaign.schema.ts`, `createCampaignSchema.partial()`). Igual que
  `entities.service.ts`, el servidor solo escribe la clave que llega
  (`if (input.name !== undefined) data.name = ...`): mandar `{ description: "" }` vacía la
  descripción; omitir la clave la deja igual. Emite `campaign.updated`.
- **`DELETE /campaigns/:id`** — solo el DM. Un único
  `prisma.campaign.delete({ where: { id } })`: el esquema ya cascadea (arriba) miembros,
  invitaciones, entidades —con sus enlaces en ambas direcciones, concesiones y
  comentarios—, sesiones y personajes. No hace falta borrar nada a mano. Emite
  `campaign.deleted`. Probado con **recuentos reales de filas en todas las tablas que cuelgan de la campaña** (dieciocho al 2026-09-11; la lista viva es la del e2e de `campaigns`), no solo
  por el código de estado: cuenta antes y después y exige cero. **Cada tabla nueva que cuelgue
  de una campaña se añade a ese recuento**, porque una que falte es un huérfano que no avisa —
  la operación devuelve 200 igual. Ver [08-pruebas.md](./08-pruebas.md).
  > Hasta el 2026-09-03 esta línea decía «ocho tablas» y añadía que cuatro de ellas eran deuda
  > anotada (`gameEvent`, `campaignFlag`, `campaignSet`, `rule`). Esa deuda se cerró antes de
  > desplegar y el texto se quedó atrás: la ficha ya estaba tachada en `06-pendientes` mientras
  > aquí seguía viva.
- **`DELETE /campaigns/:id/members/:userId`** — expulsar y salirse son **el mismo endpoint**
  (`MembershipService.removeMember`, `apps/api/src/campaigns/membership.service.ts`):
  `userId === quien llama` es salirse; cualquier otro valor es expulsar y exige que quien
  llama sea DM. No hay ruta `/members/me` a propósito (en Nest, `:userId` capturaría el
  literal `me` según el orden de declaración).
  - **Expulsar un DM está prohibido** (`ForbiddenException("A DM cannot be removed")`) — una
    campaña sin DM queda huérfana.
  - **El DM no puede salirse de su propia campaña**
    (`ForbiddenException("The DM cannot leave their own campaign; delete it instead")`): para
    eso está `DELETE /campaigns/:id`.
  - Al borrar la membresía, la misma transacción (`prisma.$transaction`) borra también las
    `EntityVisibilityGrant` de esa persona en las entidades de esa campaña
    (`where: { userId, entity: { campaignId } }` — `EntityVisibilityGrant` no tiene clave
    foránea a `User`, así que el filtro anidado por `entity.campaignId` es la única forma de
    acotar la limpieza a una campaña). Motivo: retirar el acceso es el argumento central del
    producto; dejar una concesión huérfana volvería a conceder acceso si esa persona
    reingresara más tarde.
  - **Lo que NO se borra**: los personajes que esa persona posee (`Character.ownerId`) y las
    entidades que creó (`Entity.createdById`) se quedan en la campaña, con su dueño/creador
    original intacto. Es deliberado — el DM conserva el registro de la partida — y significa
    que, tras una expulsión, `ownerId`/`createdById` puede apuntar a alguien que ya no es
    miembro. Ningún endpoint hoy trata ese caso como un error.
  Emite `campaign.member.removed`.

`packages/shared` no gana ningún esquema nuevo para expulsar/salir: la ruta no lleva body, el
`userId` viaja en la URL.

## El cuerpo de texto de una ficha (`Entity.body`, tarea 1.17b · A1)

`Entity.body` (`apps/api/prisma/schema.prisma`, `Json?`) ya existía, pero hasta esta tarea la pantalla
nunca lo pintaba ni lo mandaba: una ficha era nombre + etiquetas + visibilidad + enlaces +
comentarios, y nada más. Ahora tiene una forma explícita en `packages/shared/src/entity.schema.ts`:

```ts
export const entityBodySchema = z.object({
  format: z.literal("markdown"),
  text: z.string().max(50000),
});
```

**Se guarda como Markdown**, decisión ya tomada por el autor. El objeto `{format, text}` —y
no una cadena pelada— deja el formato escrito en el propio dato: el día que se admita otro
formato (o ninguno), `format` ya distingue de qué se trata sin adivinar por la forma del
contenido.

- **Vaciar el cuerpo se manda como `{ format: "markdown", text: "" }`**, nunca `null`: un
  `Json?` de Prisma necesita `Prisma.DbNull` para anularse de verdad, y no compensa el
  esfuerzo por un campo que ya sabe representar "vacío" con su propio `text`. El lector
  tolerante de la web (`bodyToText`, `EntityEditor.tsx`) trata un `text` vacío igual que un
  `body` ausente.
- **Como con cualquier `PATCH` de esta API, la clave solo se escribe si llega**
  (`entities.service.ts`: `if (rest.body !== undefined) data.body = rest.body as object`) —
  la misma trampa que 1.13 pagó con `Session.notes`. Por eso el editor manda `body` siempre
  que está editando, incluso vacío: omitir la clave para "vaciar" guardaría con éxito sin
  cambiar nada.
- **Por qué difiere de `Session.notes`** (`apps/api/prisma/schema.prisma`, también `Json?`): `notes` no
  tiene forma propia en el esquema (`session.schema.ts`: `notes: z.unknown().optional()`) y
  la web lo guarda como una cadena pelada dentro de la columna JSON — sin `format`, porque
  nunca se decidió que las notas de sesión llevaran texto enriquecido. `Entity.body` sí lo
  decide, así que necesita el campo extra. **Esta tarea no toca `Session.notes`.**
- Hoy ninguna fila tenía `body` — la pantalla nunca lo escribió — así que no hubo datos
  heredados que migrar al introducir la forma explícita.

**Render**: `apps/web/src/features/entities/Markdown.tsx` es el único punto del proyecto que
renderiza Markdown (`react-markdown` v9, sin `remark-gfm` ni `rehype-raw` — CommonMark basta y
cada plugin es superficie nueva). No usa `innerHTML` ni `dangerouslySetInnerHTML`: esa es la
razón de elegir esa biblioteca, no una casualidad.

## `User.passwordChangedAt` — por qué existe una columna solo para caducar tokens

Añadida en la tarea 1.18a (migración `20260902004144_add_password_changed_at`): una columna
**anulable, sin valor por defecto y sin relleno retroactivo**, así que la migración es un
`ALTER TABLE` que no reescribe ninguna fila y las sesiones abiertas siguen valiendo (con `null`
la comprobación no se aplica).

Sirve para una sola cosa: **cambiar la contraseña invalida los tokens emitidos antes**. El JWT
es autocontenido y no lleva ninguna señal de un cambio posterior, así que la única forma de
caducarlo es preguntar a la fuente de la verdad — por eso `JwtStrategy.validate` consulta la
base **en cada petición autenticada**, coste declarado en [06-pendientes.md](./06-pendientes.md).

Dos detalles que no son obvios:

- **El `iat` de un JWT tiene precisión de segundos** y la columna, de milisegundos. La
  comparación redondea hacia abajo y rechaza el empate (`<=`, no `<`): un token emitido en el
  mismo segundo del cambio no se puede demostrar posterior, y ante la duda se caduca. La
  función existe justo para el caso *"me robaron la contraseña"*, así que el fallo seguro es
  rechazar.
- **La consecuencia real era** que cambiar la contraseña y volver a entrar dentro del mismo
  segundo podía rechazar el token recién emitido. **Cerrado el 2026-09-11:** `PATCH /auth/password`
  devuelve un token fresco firmado con `iat` = segundo del cambio **+ 1**, que pasa la comparación
  de arriba sin aflojarla, y la pantalla de cuenta lo guarda en vez de cerrar la sesión.

## El modelo de visibilidad

Cinco niveles, en `Visibility`. Los interpreta **`canView` y solo `canView`**
(`apps/api/src/common/visibility.ts`), con la matriz completa probada.

| Nivel | Lo ve |
|---|---|
| `PUBLIC` | cualquiera con acceso a la campaña |
| `PLAYERS` | los miembros de la campaña |
| `SPECIFIC_PLAYERS` | solo los usuarios con `EntityVisibilityGrant` |
| `OWNER_DM` | el creador y el DM |
| `DM_ONLY` | solo el DM |

### Una tirada no elige nivel: elige **audiencia** (2C.1)

`POST /campaigns/:id/rolls` no recibe un `Visibility`. Recibe una **audiencia** —`PUBLIC`,
`DM_PRIVATE`, `BLIND`— y el nivel se deriva de ella en un solo sitio
(`VISIBILIDAD_POR_AUDIENCIA`, `packages/shared/src/roll.schema.ts`): `PLAYERS`, `OWNER_DM` y
`DM_ONLY` respectivamente. Dos motivos, y ninguno es cosmético:

1. **Ningún valor de enumeración del modelo llega a la pantalla** — es una regla del proyecto que
   ya se incumplió tres veces en una mañana.
2. `PUBLIC` (el nivel) significa *«fuera de la campaña también»*, y **una tirada no se publica al
   mundo**. Que la audiencia se llame igual y signifique otra cosa es justo por lo que la
   traducción vive escrita una vez.

**Y el nivel no basta para esconder una tirada.** `DM_ONLY` la esconde del registro, pero hasta
2C.1 el `POST` **devolvía el resultado a quien lo pedía**, así que su autor lo leía en su propia
respuesta. La tirada a ciegas se completa preguntando a `canView` si quien acaba de tirar puede
ver lo que tiró; si no, la respuesta omite el desglose.

**El desglose trae, además de `rolls`/`kept`/`dropped`, un `dice[]` por dado (C5).** Cada entrada
es `{ sides, value, kept }`: las caras del dado, lo que salió y si cuenta en el total —lo mismo
para un dado descartado por `kh`/`kl` que para el valor original de uno relanzado—, en el orden
en que cayó. Lo calcula `dadosTirados` (`apps/api/src/dice/dice.ts`), a partir de los mismos
`DiceTermResult` que ya conocía `rolls`/`kept`/`dropped`; no es un dato nuevo, es el mismo
desglose emparejado dado a dado para que la pantalla lo pinte uno a uno sin tener que rehacer el
emparejamiento a mano (`apps/web/src/features/rolls/desglose.ts` ya lo hacía por su cuenta contra
`rolled`/`dropped`). Vive en `rollResultSchema` (rama `revealed: true`) y en el payload
`ABILITY_ROLL` del suceso, y es **opcional en los dos**: el historial escrito antes de esta tarea
no lo trae, y no se reescribe.

**El cuarto modo de la industria no cabe en esta tabla**, y está declarado: ver la ficha **C2C-1**
de [06-pendientes.md](./06-pendientes.md).

Más el `isAdmin` del sistema, que ve todo — existe en el modelo (`User.isAdmin`, por defecto
`false`) y `canView` lo respeta, pero **ningún endpoint lo pone a `true`** hoy: no hay forma de
convertirse en admin desde la API. Es un límite conocido, no un mecanismo activo.

**`PUBLIC` y `PLAYERS` producen hoy el mismo conjunto de espectadores.** `canView`
(`canView`, `visibility.ts`) devuelve `true` para ambos sin distinguirlos, y todo listado exige
antes ser miembro de la campaña (`requireMember`) — así que, mientras no exista un modo de
"campaña pública" que deje entrar a alguien sin membresía, `PUBLIC` no amplía nada frente a
`PLAYERS`. La distinción está en el modelo y en el selector de visibilidad, lista para el día
en que algo no exija membresía.

**Escribir en el mundo es del DM; los personajes no** (desde el 2026-09-02). Crear una
entidad (`entities.service.ts:43`) y crear un enlace (`links.service.ts:41`) exigen
`requireDM`. Antes exigían solo `requireMember`, y la consecuencia la encontró el autor
probando con un jugador de verdad: **un jugador podía crear PNJs, lugares, misiones,
documentos y enlaces en la campaña del DM**. No era una fuga de lectura —`canView` nunca dejó
ver de más— pero sí de escritura, y en una mesa donde el mundo es del DM eso basta para
estropear una partida. Editar y borrar una entidad siguen siendo `requireMember` +
`requireEditable` (DM o quien la creó), que es lo correcto ahora que solo el DM puede crearlas.
**Los personajes van por su camino y no cambian:** un jugador crea y edita el suyo, porque es
suyo.

Por defecto una `Entity` nace `DM_ONLY` (el mundo es secreto hasta que el DM lo revela);
`Session` y `Character` nacen `PLAYERS`.

**El formulario de creación de entidades arranca en `OWNER_DM`, no en `DM_ONLY`**, aunque el
modelo y el esquema de `@dnd/shared` sigan por defecto en `DM_ONLY` (ese valor por defecto no
se toca). Es solo el punto de partida del editor (`EntityEditor.tsx`): con `DM_ONLY` como
inicial, cualquier miembro podía crear una entidad —`EntitiesService.create` exigía entonces
solo `requireMember`; **desde el 2026-09-02 exige `requireDM`**, ver más arriba— que quedaba
invisible incluso para su propio creador
(`canView` devuelve `false` en `DM_ONLY` también para quien la creó). Un jugador escribía la
ficha de su contacto, recibía 201 y la entidad desaparecía sin error. `OWNER_DM` no cambia nada
para el DM (`canView` ya devuelve `true` para cualquier DM antes de mirar la visibilidad, así
que `OWNER_DM` y `DM_ONLY` son indistinguibles desde ese lado); solo arregla el caso roto del
jugador. En modo edición se sigue respetando la visibilidad que la entidad ya tenga.

### Límites reales de hoy (MVP, aceptados a conciencia)

- **`Session` y `Character` no tienen `grants` ni `createdById` propio.** Por eso
  `SPECIFIC_PLAYERS` es inerte en los dos. **Desde el 2026-09-11 una sesión ya no puede llevar
  `SPECIFIC_PLAYERS` ni `OWNER_DM`**: `session.schema.ts` los excluye (400), el editor ofrece tres
  niveles y una sesión guardada con uno de esos dos valores lo enseña marcado y no seleccionable
  (en la base local había cero). El resto de este párrafo describe por qué eran inertes. En `Character` se usa `ownerId` como creador
  (`common/character-viewer.ts` lo pasa como `createdById` a `canView`), así que **el dueño sí
  ve su personaje aunque lo marque `DM_ONLY`** — hasta el 2026-09-10 esta línea decía lo
  contrario, y llevaba falsa desde el 2026-09-03. En
  `Session` no hay ningún campo de creador: `sessions.service.ts` pasa `createdById: ""` al
  comprobar visibilidad, así que la comparación de `OWNER_DM` (`createdById === viewer.userId`)
  es falsa para cualquier jugador — y como `visibility.ts` ya devuelve `true` para cualquier
  DM antes de mirar la visibilidad, `OWNER_DM`, `SPECIFIC_PLAYERS` y `DM_ONLY` producen en una
  sesión **exactamente el mismo conjunto de espectadores: solo el DM**. `OWNER_DM` en una
  sesión no es "funcional con nombre redundante" — es tan inerte como `SPECIFIC_PLAYERS`,
  porque el DM la ve igual pase lo que pase; el nombre sugiere que alguien más la verá, y no
  la ve nadie.
  **Decisión (tarea 1.13-fix):** el selector de visibilidad de `CharacterEditor.tsx` ofrece
  `PUBLIC`, `PLAYERS`, `OWNER_DM` y `DM_ONLY`, sin `SPECIFIC_PLAYERS`; el de
  `SessionEditor.tsx` ofrece solo `PUBLIC`, `PLAYERS` y `DM_ONLY`, sin `SPECIFIC_PLAYERS` **ni
  `OWNER_DM`**. En `Character`, `OWNER_DM` es correcto sin matices (`ownerId` existe, así que
  "el dueño y el DM" es literal). En `Session` no hay ningún campo que distinga "el creador"
  de "el DM", así que no hay forma de hacer que `OWNER_DM` signifique algo distinto de
  `DM_ONLY` sin tocar el esquema — fuera de alcance de esta tarea (`apps/api` y
  `packages/shared` no se tocan). Frente a ofrecer los cinco niveles como en
  `EntityEditor.tsx` (coherencia visual) se prefirió recortar: la entidad no tiene ningún
  nivel muerto, así que ahí la coherencia no cuesta nada; en sesión y personaje sí, y el
  brief es explícito en que ninguna opción puede ser un placebo sin aviso en pantalla.
- **`specificPlayerIds` no se valida contra la lista de miembros**: se puede conceder acceso
  a un usuario que no pertenece a la campaña. La concesión queda inerte, pero se guarda.
- **Un `grant` creado con una visibilidad distinta de `SPECIFIC_PLAYERS` no hace nada** y
  tampoco se rechaza.
- **Crear un enlace no comprueba la visibilidad del destino**, así que sirve de oráculo de
  existencia para un identificador ajeno.
- **Un enlace duplicado devuelve 500 en vez de 409** (choca contra el índice único).
- **Aceptar una invitación no es transaccional y el token no caduca.**

Todo esto está abierto en [06-pendientes.md](./06-pendientes.md). Ninguno es un agujero de
lectura: nadie ve contenido que no le toque. Son casos degradados o mensajes de error malos.

## Datos personales

Se guarda: correo, nombre visible y `passwordHash` (argon2). **Nunca la contraseña en
claro, nunca en un log.** No hay datos de menores ni categorías especiales.

**Retención (decidida el 2026-09-10, D-CF-9):** nada se borra solo. Una cuenta la borra su
dueño; una campaña, su DM, por el botón que ya existe (tarea 1.17a), y con ella se va todo lo
que cuelga de ella —fichas, sesiones, registro, invitaciones— por las claves en cascada. El
registro de sucesos vive tanto como su campaña: es su auditoría. **Se revisa el día que haya
usuarios que no sean la mesa del autor**, y ese día lo dice el autor; hasta entonces es de uso
personal y esto es toda la política.

## Tres cosas del modelo que parecen huecos y son decisiones (2026-09-10)

- **`Campaign.ownerId` es quién la creó, y nada más** (D-CF-6). La autoridad la da el rol en
  `CampaignMember` —`requireDM` mira eso— y ninguna comprobación lee `ownerId` ni debe leerlo.
  Se conserva como dato histórico; con el cambio de papel del plan 11 el creador puede dejar de
  ser DM y la campaña sigue teniendo dueño de rol.
- **`User.isAdmin` se concede a mano** (D-CF-7): `UPDATE "User" SET "isAdmin" = true WHERE …`
  en Postgres, y no hay pantalla ni endpoint que lo dé. Es el permiso que salta la matriz entera
  (`common/visibility.ts`) y por eso no tiene puerta cómoda. Su primer oficio, más allá de leer:
  el reinicio de contraseña por administrador (D-CF-18).
- **Editar una ficha revelada no escribe suceso, y es a propósito** (D-CF-11, la «hidra falsa»
  de los jugadores). No existe `ENTITY_UPDATED`; lo que sí se registra es revelar, reclasificar
  y enlazar. **Los apuntes del jugador no se tocan nunca**: son filas de `Comment` y sobreviven
  a cualquier edición de la ficha, que es lo que hace que el truco funcione en la mesa.

## El color de un personaje (plan 05, decisión D3)

**`Character.color`** (`String?`, migración `20260906020000_character_color`): **una clave de una
lista cerrada**, nunca un hexadecimal. La lista vive en `packages/shared/src/character.schema.ts`
(`CHARACTER_COLORS`, ocho claves) y la valida `characterColorSchema`, así que una clave inventada
es un **400** antes de llegar al servicio.

**Nulable a propósito y sin valor por defecto en la base.** `null` significa «no lo he elegido, dame
el de por defecto», y ese defecto **no se guarda**: lo calcula la pantalla como huella del `id` del
personaje, de modo que el mismo personaje sale del mismo color siempre —entre recargas, navegadores
y personas— sin que nadie tenga que elegir para empezar a jugar. Un valor escrito significa «lo
elegí yo» y **no se pisa nunca** con un recálculo; por eso `CharactersService.update()` comprueba
`input.color !== undefined` y no un *truthy*: con `if (input.color)` no se podría deshacer una
elección volviendo a `null`.

**Quién lo cambia:** el dueño del personaje o el DM, que es exactamente lo que ya impone
`requireEditable`. No hay endpoint nuevo — el color viaja en el `PATCH` del personaje como cualquier
otro campo suyo.

**Por qué en `Character` y no en `CampaignMember`:** el dato es del personaje. Un jugador con dos
personajes quiere dos voces, y hasta hoy no las tenía porque la voz del hilo era una huella del
`actorUserId`.

## La inspiración vive en `CharacterResource`, no en una columna (plan 08, ficha I8)

**No hay `Character.inspired`, y no es un olvido.** El plan pedía un booleano; lo que ya había en el
código es mejor y es lo que manda: `CharacterResource` es *«un contador con máximo que un descanso
repone»* y `schema.prisma` la nombra desde 2A.8 como **«recursos consumibles: inspiracion, furia,
ki…»** — la inspiración es literalmente el primer ejemplo con el que esa tabla se escribió. Una
columna nueva habría sido **una segunda verdad sobre el mismo hecho**, con dos sitios que pueden
discrepar.

La fila es `key: "inspiration"`, `max: 1`, `resetOn: NONE`, `grantedBy: DM_ONLY`:

- **`max: 1` es la regla del SRD escrita donde se cumple** —se tiene o no se tiene—, y el recorte de
  `ResourcesService.adjust` la hace cumplir: dos concesiones seguidas dejan una.
- **`NONE`**: no la repone ningún descanso. La da el DM por interpretar bien; dormir no la gana.
- **`DM_ONLY`** cierra quién puede **subirla**. Gastarla y regalarla son de su dueño.

**Se siembra al crear el personaje** (`CharactersService.create`, en la misma transacción), y **no**
en `ResourcesService.seedResourcesFor`, que siembra lo que implica *la clase* y por eso corre al
terminar la ficha. La inspiración no viene de la clase: sembrarla allí habría dejado sin ella justo
al personaje recién creado, que es a quien el DM más quiere dársela.

### Dos cambios de comportamiento que esto trajo, y valen para TODOS los recursos

1. **Gastar más de lo que hay es `409`**, no un recorte silencioso a cero. Antes, pedir un espacio de
   conjuro con cero devolvía **200 y `current: 0`** — la misma respuesta exacta que gastarlo de
   verdad—, así que nadie podía distinguir «lo has usado» de «no tenías». Reponer de más sí sigue
   topando en el máximo: ahí quedarse en el tope es el resultado correcto.
2. **Reponer un recurso `DM_ONLY` exige ser DM.** El candado vivía solo en `upsert`, con el argumento
   de que gastar y reponer «solo mueven el contador». Para la furia (`OWNER`) da igual; para la
   inspiración **no**: reponer es exactamente conceder, y sin esto un jugador se la habría dado a sí
   mismo con el «+1» de su propia hoja.

**Regalar** es `POST .../resources/:key/give`: mueve las dos filas en **una transacción** y deja un
solo suceso `RESOURCE_GIVEN` con los dos nombres. Dos peticiones sueltas —un gasto y una
reposición— podrían dejar la inspiración en los dos personajes o en ninguno.

## «Estable» es una condición reservada, no una columna (2026-09-11, ficha H1b)

**No hay tabla ni columna nueva.** Estabilizarse con tres éxitos en las salvaciones contra la
muerte crea `CharacterCondition` con `key: "stable"` (`CLAVE_ESTABLE`, en `@dnd/shared`), y
`estadoDeMuerte` la lee: a 0 PG **y** con esa condición, el estado es `stable`; sin ella, `dying`.
Antes los contadores volvían a cero al estabilizarse y un `GET` posterior no podía distinguir
«acaba de estabilizarse» de «acaba de caer». **La retiran** cualquier daño a 0 PG, cualquier caída a 0, y cualquier subida por
encima de 0 —curación, `PATCH` del DM o descanso— —SRD 5.1, *Stabilizing a Creature*: *«The creature stops being stable,
and must start making death saving throws again, if it takes any damage»*—; un 20 natural revive
a 1 PG y por tanto **no** deja estable. Es clave reservada como `raging` (D-P2-10): el endpoint
público de condiciones la rechaza a todos, DM incluido. **Y un personaje estable no tira salvación
de muerte**: `rollDeathSave` lee la fila dentro de la misma transacción y responde 400 —la revisión
final de la rama del 2026-09-11 encontró que sí dejaba tirar, acumulaba fallos y la tirada decía
`dying` mientras la hoja decía `stable`—. Lo que **no** se modela: el «recupera 1 PG al cabo de
1d4 horas» del SRD, porque no hay reloj de horas sobre el que apoyarlo.

## La acción Ayudar es una condición con vencimiento (plan 08, ficha I8)

**No hay tabla nueva.** La marca que deja Ayudar es `CharacterCondition` con `key: "helped"`
(`CLAVE_AYUDA`, en `@dnd/shared`), y va ahí porque **tiene exactamente la misma forma**: una clave
sobre un personaje, con origen (`appliedById`) y con vencimiento (`expiresAtClock`, 2C.4). Montar una
tabla aparte para una fila con las mismas cuatro columnas habría duplicado el mecanismo.

**No es una condición del SRD** —las quince son estados de la criatura; esto es el rastro de una
acción que alguien hizo por ti—, pero **el motor sí la entiende**, a diferencia de una clave libre
cualquiera: entra en `VENTAJA_EN_ATAQUE` (`suggested-roll-mode.ts`) y por eso la hoja sugiere ventaja
en el ataque diciendo quién ayuda.

Los tres límites del SRD, y qué se hace con cada uno:

1. **Una sola tirada.** Se cumple: la consume el primer ataque (`CharacterSheetService`), aunque el
   ayudado tenga varios. **Se consume después de tirar**, para que una tirada rechazada no la gaste.
2. **El enemigo a cinco pies de quien ayuda.** **No se comprueba y no se finge**: son distancias, y
   este producto no tiene tablero. La pantalla lo dice — *«la cercanía la juzgas tú»*.
3. **Caduca al principio del turno siguiente del ayudante.** Se cumple **sin inventar un reloj**: un
   asalto son seis segundos del reloj de campaña (`SEGUNDOS_POR_ASALTO`, decisión D-2C-1), así que
   «mi siguiente turno» es exactamente un asalto más tarde, guardado como `expiresAtClock` absoluto.

**Quién puede:** el dueño del personaje que ayuda, o el DM. El permiso se comprueba sobre **el
ayudante**, porque la acción es suya; recibir ayuda no necesita permiso —y exigirlo impediría ayudar
al personaje de otro, que es el caso entero. El suceso se emite con la visibilidad **del ayudado**:
con la del ayudante, ayudar a un PNJ `DM_ONLY` lo habría anunciado a la mesa.

**El flanqueo no existe en el modelo**, y es una decisión: es una regla **opcional del DMG**, no del
SRD, da **ventaja** y no un `+3` —ese +2 es de 3.ª edición y de Pathfinder—, y necesitaría saber
quién está adyacente a quién, o sea el tablero de la fase 3.

## La batuta y el disparador que se retira (plan 09, fichas I19 y I20)

**`DM_EXECUTED`** (migración `20260906040000_dm_executed_event`) es *«la batuta»*: el DM lee el
diálogo en voz alta, pulsa sobre una ficha del mundo, y **pasa lo que tenía que pasar**. Estaba en
el vocabulario del motor de reglas **desde el principio** y no existía el gesto en ninguna pantalla,
así que nadie escribía el suceso: era una función que faltaba, no un cable suelto. Con él, el motor
deja de ser solo reactivo — el DM **ata en frío** lo que ocurre al abrir el cofre o al entrar en la
cripta, y en la mesa solo pulsa.

- **`entityId` va en el `payload`, no en el sujeto.** El sujeto es la campaña: ejecutar no es algo
  que le pase a la ficha, es algo que hace el DM. Mismo patrón que `ENTITY_COMMENTED`.
- **`DM_ONLY` siempre.** Si heredara la visibilidad de la ficha, la mesa leería «el DM ejecutó *La
  cripta*» y con ello el nombre de una ficha que quizá no debía conocer. Lo que la mesa ve son los
  **efectos**, cada uno con su propia visibilidad.
- **Ejecutar no edita.** No cambia un campo, no revela, no marca: escribe el suceso y nada más.

**`ENTITY_ATTACKED` se retira de la oferta y se conserva en el esquema, para siempre** (I20). Se
atacan **criaturas**; un lugar o un documento no se atacan, y aquí se ataca a un `Character` —un PNJ
es una fila de `Character` desde 2D—, mientras el disparador apunta a una `Entity`. **No hay forma
honesta de conectarlo.** Medido antes de decidir: **244 reglas guardadas, ninguna lo usa** — pero
quitarlo del esquema Zod haría que una regla guardada con él **dejara de poder leerse**, y la regla
de interfaz vinculante dice lo contrario: un valor guardado que el selector no ofrece se enseña
marcado, no se esconde. Se queda en `DISPARADORES_SIN_MOTOR`, que es exactamente para esto.

**Lo que sí sirve es `CHARACTER_ATTACKED`**, y **no necesita ningún suceso nuevo**: lo alimenta
`ATTACK_RESOLVED`, que se escribe desde 2.5.3 y cuyo **sujeto es el objetivo**. Solo faltaba leerlo.

> **Trampa que costó una prueba roja:** `matchesTrigger` (`rules-engine/engine/matching.ts`) tenía un
> `default: return false`, así que un disparador nuevo sin su `case` **no coincidía nunca y en
> silencio** — el vocabulario lo admitía, el editor lo ofrecía y el motor lo recibía. Ahora ese
> `default` lleva un `never`: el olvido es un error de compilación.

## Administrar la mesa: el papel de un miembro y la vida de una invitación (plan 11)

### `CampaignMember.role` deja de ser inmutable (ficha D2)

`PATCH /campaigns/:id/members/:userId`, **solo DM**. Hasta hoy **no había forma de cambiarlo**: para
ascender a alguien había que expulsarlo y reinvitarlo, y `removeMember` **borra la membresía**, así
que se perdía su vínculo con sus personajes. No es equivalente ni de lejos.

**La mesa no puede quedarse sin ningún DM, y eso es un `409`**, no un 403: no es que no tengas
permiso, es que el resultado dejaría la campaña huérfana y nadie podría recuperarla. Se comprueba
**contando los DM que quedarían**, no mirando si eres el creador — el creador puede haber ascendido
a otro y querer bajarse, y eso es legítimo.

El cambio **deja rastro**: `MEMBER_ROLE_CHANGED` con el nombre y los dos papeles, visibilidad
`PLAYERS`. Es un cambio de permisos; sin suceso, un DM podría ascender a alguien y nadie lo sabría.
`PLAYERS` y no `DM_ONLY` porque quién dirige la mesa no es un secreto y la pantalla de miembros ya lo
enseña a todos.

> **Vive en su propio módulo (`apps/api/src/members/`) y no en `campaigns`**, y no es capricho:
> `GameEventsModule` **importa `CampaignsModule`**, así que inyectar `GameEventsService` en
> `CampaignsService` habría creado un ciclo que Nest solo resuelve con `forwardRef` — esconder el
> ciclo en vez de quitarlo. Con un módulo aparte el grafo se queda dirigido. La regla de
> autorización sigue siendo de `MembershipService`, su dueño único.

### Una invitación nace, caduca, se usa o se revoca (fichas D3b y A3)

Tres columnas nuevas en `Invite`, **todas nulables**:

| Columna | Qué dice |
|---|---|
| `expiresAt` | Cuándo caduca. **`null` = no caduca**, que es como se han comportado todos los enlaces hasta hoy: poner fecha a los ya repartidos los habría matado sin avisar |
| `revokedAt` | Cuándo se mató. **No es `usedAt`**: un enlace gastado y uno revocado son dos hechos distintos, y el listado tiene que distinguirlos |
| `usedById` | **Quién** la usó. `usedAt` decía cuándo y no quién, y un listado que no puede decir «esta se la di a Marta y entró Marta» no sirve para administrar nada. Sin clave foránea: es dato histórico del enlace, y borrar una cuenta no debe borrar la invitación |

**El estado se deriva, no se guarda** (`estadoDeInvitacion`), por la misma razón que el vencimiento
de una condición (2C.4): guardarlo sería una segunda verdad que puede discrepar, y obligaría a un
barrido que, si no corre, deja vivo un enlace que ya debía estar muerto. El orden es **revocada →
caducada → usada → viva**, que es el orden en que un DM quiere leerlo.

**Y `accept` mira las cuatro cosas con un solo `if` y un solo mensaje**: un token inventado, uno
gastado, uno revocado y uno caducado dan **exactamente la misma respuesta**. Si difirieran, el
mensaje diría si un token existió alguna vez y en qué estado acabó — el mismo criterio que el 404 del
oráculo de la CA.

**El listado no devuelve el token entero**, solo su cola: es una pantalla que un DM abre en una mesa
con gente al lado.

## Modificadores temporales con caducidad (plan 13, ficha M8)

**`TemporaryModifier`** (migración `20260906060000_temporary_modifier`): *«+2 a Fuerza durante una
hora»*. **Lo pidieron los jugadores por su nombre** —«subidas y bajadas de atributos temporales»— y
no estaba escrito en ningún plan: era un hueco de alcance, no una deuda de implementación.

**Tabla propia y NO `CharacterCondition`**, aunque compartan la caducidad: una condición es una regla
del SRD con **nombre cerrado** y esto es un número arbitrario con un motivo escrito a mano. Juntarlas
habría ensuciado el vocabulario que costó cerrar en 2A.12. Y hay una diferencia de forma que lo
confirma: una condición **se reemplaza** —no se está envenenado dos veces— y dos pociones de fuerza a
la vez son **dos** modificadores.

| Columna | Qué es |
|---|---|
| `target` | **Vocabulario cerrado** (`TEMPORARY_MODIFIER_TARGETS`): las seis características, la CA y las cinco velocidades. Ni una más — es exactamente lo que la hoja sabe derivar, y **un modificador a algo que la hoja no calcula es un número decorativo**. Las claves son **las mismas que usa la traza** (`ability.str`, `ac`, `speed.walk`), no unas paralelas |
| `amount` | **Con signo.** Subidas y bajadas, que es lo que se pidió |
| `reason` | Prosa: «Poción de fuerza de gigante». Se pinta en la traza, y es lo único que impide un `+2` sin origen |
| `expiresAtClock` | Segundos del **reloj de campaña** (2C.3), no de pared. `null` = hasta que alguien lo quite |

**La columna del personaje NO se toca.** El modificador **se suma al derivar**: entra en el motor
como un `Modifier` con `op: "add"` y `sourceType: "temporary"`, por la misma puerta que ya usaban las
anulaciones manuales. Si mutara la Fuerza, al caducar habría que restar, y cualquier fallo dejaría al
personaje cambiado para siempre. Como `add`, llega **antes de los topes** por construcción: el motor
aplica primero los `add` y después lo que sustituye o recorta.

**La caducidad se resuelve al leer**, con la misma función que las condiciones (`condicionesActivas`,
2C.4): sin barrido periódico y sin una segunda verdad que pueda discrepar. **Y al vencer se marca, no
desaparece** (D-2C-2): sigue en la hoja, apagado, hasta que alguien lo quite — así el jugador ve
**por qué** perdió el +2, que es la mitad del valor de la ficha.

**Quién puede conceder: solo el DM** (`requireDM`), desde el 2026-09-07. **Quitar sigue siendo del
DM o del dueño**, que es un reparto distinto y no se cambió de pasada.

> **Aquí ponía lo contrario, y por eso se cuenta en vez de sustituirse en silencio.** Decía «el DM o
> el dueño», con este argumento: la mayoría de estos efectos salen de algo que el jugador hace
> —beberse una poción que ya lleva encima— y obligar a que el DM los teclee convertiría una acción
> de un turno en una petición. **Ese argumento se cumplió por otro lado**: desde el 2026-09-06,
> consumir un objeto aplica sus efectos solo, escribiendo el modificador por dentro de la misma
> transacción (`inventory.service.ts`), sin pasar por esta puerta. Lo que quedaba de ella era el
> atajo: un jugador podía darse **`+10` al ataque, sin caducidad y con el motivo que quisiera**, y
> eso entra en la derivación de su propia hoja. Decisión del autor del 2026-09-07, ficha `P1`
> (puerta B); la pantalla dejó de ofrecer el formulario en el mismo commit, porque un botón que el
> servidor contesta con 403 es un defecto declarado en
> [04-convenciones.md](./04-convenciones.md).

**Conceder y vencer dejan suceso** (`TEMP_MODIFIER_GRANTED` / `TEMP_MODIFIER_EXPIRED`), con la
visibilidad **del personaje** y no `PLAYERS` fijo — un PNJ `DM_ONLY` al que se le pone un +2 no puede
anunciarle a la mesa que existe. El de vencimiento lo escribe **el avance del reloj**, junto al de
las condiciones y por el mismo motivo; **quitarlo a mano no lo emite**, porque no venció.

> **El reloj puede ir hacia atrás si el DM lo corrige, y entonces un modificador vencido revive.**
> Es coherente con cómo se calcula todo lo demás —la caducidad es una resta contra el reloj, no un
> estado guardado— y es lo mismo que ya le pasa a una condición. Se deja así **a propósito**: la
> alternativa sería guardar «ya venció», que es exactamente la segunda verdad que 2C.4 rechazó.

## `Combatant` gana su propia economía de acciones (paso 2, tarea A1, 2026-09-06)

**Cuatro columnas** (migración `20260906160000_combatant_action_economy`): `actionUsed`,
`bonusUsed` y `reactionUsed` (booleanos) más `movementUsed` (entero, en pies). Antes de esta tarea
el combate tenía turno y orden, pero nada guardaba **qué se había gastado dentro de un turno**; la
pantalla se lo inventaba en el navegador (ver la ficha de A3+A11 abajo).

**Se reponen al EMPEZAR el turno de quien entra, no al terminar el de quien sale.** SRD 5.1,
«Reactions»: *«you regain your reaction at the start of your turn»*
(<https://5thsrd.org/combat/actions-in-combat/#reactions>). `EncountersService.advanceTurn` repone
por `position` —no por fila— sobre los combatientes que **entran** en `toPosition`, en la misma
transacción que mueve el turno: entre el final de un turno y el principio del siguiente nadie tiene
reacción, que es justo lo que permite que solo se pueda reaccionar una vez por asalto. Repartirlo a
seis goblins que comparten posición es la misma consulta que ya agrupaba su iniciativa.

**El servidor cuenta y avisa; no impide.** Gastar por encima de lo que queda (`ActivitiesService`,
tarea A2) no se rechaza: se registra con un aviso (`ACTION_SPENT`) y la mesa decide, porque hay
decenas de aptitudes que conceden acciones extra y ninguna se modela el primer día — la misma
postura que este proyecto ya tomó con los bandos y con terminar un combate. Lo único que el servidor
sí impide es **quién** puede gastar (dueño o DM) y **qué ve**: un combatiente de un PNJ escondido es
un 404, nunca un 403 que confirmaría que existe.

## `derrotado` y `finalPropuesto`: el combate propone su final (2026-09-08)

**Ninguno de los dos es una columna.** Se calculan al leer el encuentro (`EncountersService.get`) y
viajan en su respuesta, porque los dos son preguntas sobre el estado de ahora y guardarlas sería la
segunda verdad que este documento rechaza en cada sección donde aparece la tentación.

- **`derrotado`** por combatiente: su personaje está a cero puntos de golpe. Nada retira a nadie de
  la mesa —**y esto corrige una creencia que la ficha original daba por hecha**: se comprobó que
  ningún punto de `apps/api/src/encounters/` lee `currentHp`, así que nunca hubo nadie retirando a
  nadie. Lo que faltaba era **decir en qué estado está**, no dejar de borrarlo.
- **`finalPropuesto`**: no queda nadie en pie de uno de los bandos.

**`NEUTRAL` no cuenta para ningún lado.** Significa literalmente «no se ha dicho» —ver el comentario
de `Side` en el esquema— y proponer el final sobre un silencio afirmaría algo que nadie declaró.

> **`finalPropuesto` se calcula sobre TODOS los combatientes y se entrega SOLO al DM**, y esas dos
> mitades van juntas o no valen. Calcularlo sobre los visibles le diría a un jugador que no queda
> ningún enemigo en pie **cuando queda un trasgo `DM_ONLY` que él no ve** — la misma fuga que
> `activePosition` ya cierra devolviendo `null`. La lista de combatientes sí se filtra por
> `canView`; el veredicto sobre el combate, no: se omite.

**Y propone, no cierra.** Es la doctrina impresa de las Herramientas del DM —*«el sistema propone;
tú decides»*— y aquí además la respalda el SRD 5.1 mejor de lo que el plan suponía: en «Monsters and
Death» la muerte de un monstruo a 0 PG es **costumbre del DM con excepciones nombradas**, no una
regla automática. Un cierre automático sería el servidor decidiendo por él.

## Todos los endpoints de encuentro devuelven la misma forma (2026-09-08)

**`start()`, `advanceTurn()` y `setInitiative()` devolvían filas crudas de `Combatant`** mientras el
cliente las tipaba como `Encounter`: sin `derrotado`, sin `finalPropuesto`, y por tanto sin validar
contra `encounterSchema` desde que existen esos dos campos. Era inocuo solo porque la web tira esas
respuestas e invalida la consulta — **un tipo que miente deja pasar exactamente eso**.

Los tres devuelven ahora por `get()`, como ya hacían `current()`, `setSide()` y `forceStart()`. **El
filtro por espectador no recorta nada por esos tres caminos**, comprobado y no supuesto: los tres
empiezan por `requireDM` y `canView` devuelve `true` para el DM en su segunda línea
(`common/visibility.ts`).

**`roundAdvanced` viaja al lado, no dentro.** No es parte de un encuentro —es algo que pasó en esta
llamada—, así que la respuesta de `advanceTurn()` es el encuentro **más** ese campo hermano, y el
tipo del cliente lo dice en vez de fingir que es un `Encounter` a secas. Se descartó derivarlo
(obligaría a quien llama a recordar el asalto anterior) y borrarlo (es información real que la mesa
querrá pintar, aunque hoy no la pinte nadie).

## `uses` de una actividad **es** `CharacterResource`, no una tabla nueva (paso 2, tarea A4/A5)

`activity.schema.ts` no tiene un campo `uses`: lo que una actividad gasta lo declara `consumption`,
apuntando por **clave** a un `CharacterResource` que ya existe (`current`, `max`, `resetOn`,
`grantedBy`). La Furia del bárbaro es la prueba en un sentido — sus usos son una fila de esa tabla,
sembrada por `ItemGrant` — y **el catálogo del SRD la confirma en el sentido contrario**: de los 320
conjuros contados en `docs/superpowers/specs/2026-09-05-paso-3-catalogo-design.md`, **ninguno**
declara `uses` propios en los datos de Foundry (`uses.max` viene vacío en los 320 ficheros), porque
lo que un conjuro gasta es un **espacio de lanzamiento**, no un contador suyo. Modelar `uses` como
tabla aparte habría sido una segunda verdad sobre el mismo hecho para el único caso —una aptitud de
clase— que ya tiene dónde vivir.

**«Sin tope» se escribe `null`, nunca un número grande.** `CharacterResource.max` ya era nulable y
`adjust()` ya leía `max ?? Number.POSITIVE_INFINITY`; la Furia a nivel 20 («Unlimited» en el SRD)
usa exactamente ese vocabulario en vez de repetir el `999` que Foundry escribe para lo mismo —un
número creíble y falso, el mismo fallo que `simplifyBonus` (ver `04-convenciones.md` § *Idioma* y
`packages/shared/src/origen.schema.ts`). La tabla de escala (`ScaleValue`) se queda solo con
números: la ausencia de tope vive en `uses`, no en la escala, porque un tramo de escala describe
«desde aquí, cuánto», nunca «no hay límite».

## La columna `entrega` de `DmTableEntry` (paso botín, tarea B1, 2026-09-06)

`entrega Json?` (migración `20260907010000_dm_table_entry_loot`) es lo que una fila de una tabla de
la casa reparte al salir: objetos por `ContentRef` —la unión que ya existía en
`character-build.schema.ts`, nunca una cadena tipo `"SRD:short-sword"`— y las cinco columnas de
moneda. **Opcional a propósito**: la misma tabla sirve para rumores y para encuentros, que no
entregan nada, y una fila sin `entrega` no cambia su comportamiento de hoy en absoluto.

**Es un `Json` que no se consulta por dentro**, la única forma en que este proyecto acepta uno (ver
la regla del log, más arriba): nada filtra ni ordena tablas por lo que entregan, así que no hay
motivo para promocionar un campo a columna. Se valida al escribir y al leer con `entregaSchema` /
`entregaResueltaSchema` de `@dnd/shared`, y al tirar la tabla los objetos se devuelven **resueltos**
por nombre —nunca la clave del catálogo— para que la pantalla no tenga que traducir nada.

**Una referencia caduca no tira la fila.** Si el DM borró el `CampaignItem` que una entrada
prometía, esa entrada vuelve marcada `ausente` con un motivo legible, y el resto de la tirada sigue
—el mismo trato que ya recibe una clase que dejó de existir en el catálogo—. Lo que **no** se
perdona es un fallo real de la base: se relanza tal cual, porque la tirada de un crítico corre
dentro de la transacción que la disparó y tragarse el error ahí borraría la única pista de qué pasó.

**Deuda declarada, no de esta tarea**: `entrega` solo se puede escribir hoy por API — el formulario
de crear tablas no tiene campo para redactarla. Ficha en [06-pendientes.md](./06-pendientes.md).

## Reglas de la mesa: `tableRules`, `hitPointsPerLevel` y `AbilityRollAttempt` (D-CF-53, migración `20260913100000_table_rules`)

Lo que hasta ahora decidía quien creaba un personaje —cómo salen las seis características, a qué
nivel nace, qué razas y clases se pueden elegir, cuánto oro trae— pasa a ser una decisión **de la
mesa entera**, escrita una vez por el DM en los ajustes de la campaña y aplicada por el servidor a
partir de ahí, no una convención que cada jugador siga o no por su cuenta.

**`Campaign.tableRules`** (`Json @default("{}")`, sin migración de columna nueva propia —viaja en
la misma `20260913100000_table_rules` que las otras dos— porque `Campaign` no gana una columna por
cada regla: es una sola bolsa validada por `tableRulesSchema` (`packages/shared/src/table-rules.schema.ts`).
`{}` son las reglas de siempre —libre, nivel 1, media, todo permitido, equipo—, así que ninguna
campaña que ya existiera cambia de comportamiento el día que esta columna aparece. Dentro:
`abilities` (unión discriminada por `metodo`: `LIBRE` | `MATRIZ` | `PUNTOS` | `DADOS`, esta última
con su `expresion`, sus `intentos` y si la asignación es libre), `nivelInicial`, `pgNivelesSiguientes`
(`MAXIMO` | `MEDIA` | `TIRADA`), `permitidos` (listas de claves de raza/clase/subclase; vacía =
todas permitidas) y `oroInicial` (`EQUIPO` | `ORO_TABLA` | `ORO_FIJO`). Se valida al guardar
(`PATCH /campaigns/:id`) y al leer (`reglasCompletas`, tanto en la API como en la web), así que un
valor parcial o una campaña anterior a esta columna resuelven igual, con los defaults puestos.

**`Character.hitPointsPerLevel`** (`Json?`): los puntos de golpe **ya decididos** para los niveles
2..N de un personaje que nace directamente a nivel N (regla `pgNivelesSiguientes` distinta de
`MEDIA`) — un valor por nivel, la tirada del dado de golpe o su máximo, **sin Constitución** (esa
se suma en la derivación, como siempre). `null` es el caso de siempre: la media. **`maxHp` no pasa
a guardarse por tener esta columna** — sigue sin existir como campo, y sigue siendo el motor quien
lo deriva sumando estos valores en vez de `(N−1) · media`; la traza lo cuenta en
`maxHp.perLevelAtCreation` para que la hoja diga de dónde sale cada punto, no solo el total. Se
escribe **una sola vez**, al fijar la clase por primera vez (E-RM-2/3): es entonces cuando el
personaje nace a su nivel inicial y hay un dado de golpe que tirar o promediar para cada nivel
además del primero.

**`AbilityRollAttempt`**: un intento de tirar las seis características con el servidor
(`abilities.metodo = "DADOS"`). Existe como tabla, y no como una fila más del log, por el mismo
motivo que `RollRequest` (§ arriba): tiene estado — nace sin elegir y un intento pasa a `chosen` —
y lo que hace falta comprobar es «¿cuántos intentos lleva ya este personaje?», una consulta por
`characterId`, no un recorrido del historial. Esa cuenta es la razón de ser de la tabla: **para
que no se pueda repetir a escondidas** — el servicio (`AbilityRollsService.roll`) cuenta las filas
de un personaje contra `abilities.intentos` de la regla vigente y rechaza el intento N+1 con 409,
en vez de fiarse de que la pantalla deje de ofrecer el botón. Guarda `values` (los seis totales, en
el orden en que salieron) y `rollEventIds` (los seis `GameEvent.id` de tipo `ABILITY_ROLL` que los
produjeron, para que la traza pueda señalar la tirada exacta) — nunca la expresión ni los dados
sueltos, que ya viven en el propio `GameEvent`. `chosen` se pone al elegir un intento
(`PATCH .../sheet` con `attemptId`) y, desde entonces, ningún intento nuevo se admite para ese
personaje: el jugador ya fijó sus seis números (E-RM-13), y solo el DM puede seguir corrigiéndolos
directamente porque `OVERRIDABLE_KEYS` nunca incluyó ninguna `ability.*`. Cuelga de `Character` con
`onDelete: Cascade`, igual que el resto de su estado mutable.

## La puerta de efectos: tres columnas y un suceso nuevo (spec 2026-09-12, D-CF-68/D-CF-69)

Tres columnas y un tipo de suceso más, todos de la misma tanda (2026-09-13): un daño de salvación
que se tira una vez y se aplica luego, una condición que dura hasta un descanso en vez de un
número de segundos, y la experiencia como algo que la hoja cuenta. Las tres migraciones son
aditivas —columna nueva o valor de enum nuevo, nunca se toca una fila existente— así que ninguna
campaña ni personaje que ya existiera cambia de comportamiento el día que se aplican.

### `RollRequest.pendingEffect` (migración `20260913200000_roll_request_pending_effect`)

`Json?`, por defecto ausente. El daño (o la curación) de una actividad de salvación —«el clérigo
lanza `cure wounds` y pide una Sabiduría»— se tira **una sola vez**, en `ActivitiesService.usar`,
y viaja aquí hasta que `RollRequestsService.answer` cierra la petición y lo aplica con
`changeHpFromEffect` **dentro de la misma transacción**. La forma es `PendingSaveEffect`
(`packages/shared/src/roll-request.schema.ts`, `pendingSaveEffectSchema`): `amount` (el entero ya
tirado o calculado), `signo` (`-1` daña, `1` cura — el mismo vocabulario que `dados.signo` del
catálogo de actividades), `tipoDeDano` (solo con `signo: -1`), `siSalva` (`"ninguno"` | `"mitad"`,
qué le pasa a `amount` si la tirada tiene éxito — SRD 5.1, *Fireball*: «half as much damage on a
successful one»), `actividadKey` (con qué se cita en la traza y en el `reason` de `changeHp`) y
`actorCharacterId` (quién firma el cambio de PG cuando se aplique: el actor de la actividad, no
quien responde la salvación). **No es del esquema público de crear una petición**
(`createRollRequestSchema`): nadie que llame a `POST /campaigns/:id/roll-requests` puede
inventarse un daño pendiente para otro personaje — solo lo escribe
`RollRequestsService.createFromEffect`, con lo que la actividad ya calculó dentro de su propia
transacción. `null` en cualquier petición corriente, que sigue siendo la inmensa mayoría: solo pide
un valor de la hoja. **Revertir**: `ALTER TABLE "RollRequest" DROP COLUMN "pendingEffect";` — sin
más filas que depender de ella, no hay nada que migrar hacia atrás.

### `CharacterCondition.expiresOnRest` (migración `20260913200100_condition_expires_on_rest`)

`TEXT?`, vocabulario cerrado `"SHORT" | "LONG"` (validado por Zod y el servicio, no por un enum de
Postgres — el mismo motivo que ya vale para `expiryEdge`: un enum de base se añade pero no se
edita ni se borra). SRD 5.1, *Resting*: docenas de condiciones usan literalmente «until you finish
a short or long rest» o «until you finish a long rest» como duración, y eso no es un número de
segundos, es un suceso — declarar «envenenado dura una hora» sería inventar una cifra que el
manual no da. `RestService.rest` la resuelve: al declarar un descanso corto retira las `SHORT`; al
declarar uno largo retira las `SHORT` **y** las `LONG`, con un `CONDITION_REMOVED` por cada una
que cae, cuyo `reason` guarda «Descanso corto»/«Descanso largo» **y el hilo lo pinta** («Se le
quita la condición «Asustado» — Descanso largo», `apps/web/src/features/sessions/linea-de-log.ts`, desde la ola de
arreglos 1 de la puerta de efectos; antes solo salía el nombre y una retirada por descanso era
indistinguible de una hecha a mano) — además del propio `REST_DECLARED` de la misma transacción,
que el hilo traduce como «Descanso corto»/«Descanso largo».
**Excluyente con `expiresAtClock`** —una
condición dura por reloj o hasta un descanso, nunca las dos—, y eso lo garantiza el esquema Zod
(`applyConditionSchema`, con un `.refine`), **no esta columna**: una `TEXT?` no impide por sí sola
que las dos lleguen puestas a la vez, así que quien lea la base directamente no puede fiarse de la
columna sola para esa regla. `null` es el caso de siempre: sin duración por descanso, ninguna
declaración de descanso la toca. **Revertir**: `ALTER TABLE "CharacterCondition" DROP COLUMN
"expiresOnRest";`.

### `Character.xp`, el suceso `XP_AWARDED` y `ABILITY_ROLL.pendingDamage` (migración `20260913200200_character_xp`)

**`Character.xp`** (`Int @default(0)`): la experiencia acumulada, solo significa algo con la regla
de la mesa `tableRules.progresion = "XP"` (por defecto `"HITO"`, para que ninguna campaña que ya
existiera cambie de comportamiento — D-CF-53). SRD 5.1, *Beyond 1st Level*: «A character who
reaches a specified experience point total advances in capability». **El nivel no sube solo**
(D-CF-66): esta columna cuenta, y subir el nivel lo sigue pulsando el DM desde `level-up`, igual
que en modo `HITO`. La sube `XpService.award` (`POST /campaigns/:id/xp`, solo DM), que reparte por
cabeza —`amount` es cuánto se lleva CADA personaje elegido, nunca el total de la mesa— y rechaza
con 400 a cualquier destinatario con `statblockRef`: un PNJ de statblock no tiene nivel al que
subir, así que acumularle XP no significa nada. `getSheet` calcula, solo en modo `XP`, `xp.actual`
(esta columna), `xp.siguiente` (el umbral del nivel siguiente, `null` a nivel máximo) y
`xp.nivelPorXp` (a qué nivel correspondería ya ese total) — los tres se leen de la tabla de
umbrales del SRD, ninguno se guarda aparte. **Revertir**: `ALTER TABLE "Character" DROP COLUMN
"xp";` (el valor `XP_AWARDED` que esta misma migración añade a `GameEventType` se queda: Postgres
no permite quitar un valor de un enum sin reescribir el tipo entero, así que revertir la columna no
revierte el enum).

**El suceso `XP_AWARDED`** (mismo `GameEventType`, sin columna propia): «Elara gana 300 PX» es un
hecho propio de la crónica, no un eco de `HP_CHANGED` con otro nombre — llevan cosas que un cambio
de PG no tiene. Payload: `characterId`, `amount` (lo que se llevó ESE personaje, ya dividido si el
reparto era «a repartir entre los elegidos»), `xpTotal` (el `xp` resultante, para que la traza no
tenga que sumar) y `reason` opcional (el motivo que el DM haya escrito). Uno por personaje
premiado, nunca un suceso colectivo con una lista dentro — es el mismo criterio que ya separa un
`HP_CHANGED` por objetivo en un `fireball`.

**`ABILITY_ROLL.pendingDamage`** (payload de un suceso `ABILITY_ROLL` que ya existía; no es
columna propia ni parte de esta migración de base, pero nace de la misma tanda y solo tiene sentido
leído junto a `RollRequest.pendingEffect`, arriba): el daño de un **ataque resuelto contra un
objetivo** — a diferencia de `pendingEffect`, que es el de una actividad de salvación. Forma:
`targetCharacterId`, `attackResolvedEventId` (la tirada de ataque que se cobra), `damageType`,
`amount` (el `total` de la tirada de daño — nunca lo que mandara quien la pidió: lo pone
`RollsService.roll`, no el cliente) y `appliedEventId` opcional, que es el candado de un solo uso:
vacío hasta que `CharacterSheetService.applyPendingDamage` lo rellena con el `id` del `HP_CHANGED`
que acaba de escribir, dentro de la misma transacción — un segundo intento de aplicar la misma
tirada encuentra el candado puesto y no duplica el golpe (`jsonb_set … WHERE appliedEventId IS
NULL`, la misma idea que ya usa una fila `UNIQUE` para lo mismo, pero sobre un campo dentro de un
`Json`). Sin `targetCharacterId` —un daño tirado al aire, sin objetivo— no hay `pendingDamage` en
absoluto: la bandeja de daño (`damage-tray.controller.ts`) trata esa ausencia exactamente igual que
un objetivo que no se puede ver, con el mismo 404, para que preguntar por el daño de una tirada
ajena no delate si esa tirada tenía objetivo o no.

## PNJ del mundo y la mesa: `Character.entityId` y tres sucesos (spec 2026-09-14)

Una columna y tres valores de `GameEventType` más, en tres migraciones aditivas de la misma tanda
(ver el mapa de ficheros de esa spec en
[superpowers/plans/2026-09-14-pnj-del-mundo-y-la-mesa.md](./superpowers/plans/2026-09-14-pnj-del-mundo-y-la-mesa.md)).

**`Character.entityId`** (`TEXT?`, migración `20260914100000_character_entity_id`): a qué ficha
del mundo (`Entity`) pertenece un cuerpo en la mesa — «¿de qué ficha del mundo es este PNJ?».
`SetNull` en el borrado: borrar la ficha del mundo no se lleva al cuerpo por delante, solo lo
desenlaza. Entra por dos puertas, las dos validadas por el mismo helper (`requireNpcEntity`: 400
si el `entityId` no existe, no es de la campaña o no es `type: NPC`) y las dos solo para el DM
(403 al dueño, como `level`): `PATCH /characters/:id` (`updateCharacterSchema.entityId`,
`cuid().nullable().optional()`, `null` desenlaza) y `POST /npcs`
(`instantiateNpcSchema.entityId`, `cuid().optional()`, al instanciar desde el Bestiario).

**Se redacta al leer, nunca se filtra al escribir.** `entityId` viaja al cliente **solo si el
espectador puede ver la ficha que señala** (`canView`); si no, `null` — un helper único,
`entityIdsVisibleFor` (`apps/api/src/common/entity-link.ts`), calcula de una vez el conjunto de
fichas visibles para el espectador y cada ruta de lectura mapea `entityId: set.has(id) ? id :
null`. Se aplica en las seis rutas de lectura de `Character` que hoy lo devuelven: `GET
/characters`, `GET /characters/archived`, `GET /characters/:id`, `PATCH /characters/:id`, `GET
/characters/:id/sheet` y `GET /npcs`. **Queda fuera, a propósito** (E-PM-10, ficha en
[06-pendientes.md](./06-pendientes.md)): las respuestas de mutación de estado —`PATCH hp`,
condiciones, descanso…— devuelven la fila cruda a quien ya tiene permiso de escritura (DM o
dueño), así que el dueño de un PNJ cedido con una ficha del mundo que no ve podría leer ahí el
`entityId` sin pasar por el helper. Cubrir las quince lecturas de `Character` repartidas en cinco
servicios en esta misma tanda era perseguir la completitud.

**Tres sucesos nuevos** (`ALTER TYPE "GameEventType" ADD VALUE`, cada uno en su propia sentencia,
migraciones `20260914100100_npc_reveal_events` y `20260914100200_combatant_left_event`; revertir
un valor de enum exige reescribir el tipo entero, así que las tres se quedan si algún día se
revierte la columna que las motivó):

- **`NPC_REVEALED`** (`PLAYERS`, `subjectType: "character"`): «Garrik entra en escena» —o «…—
  es Garrik el Herrero» si además subió la ficha del mundo. **Corregido en la ola de cierre
  (2026-09-14, I4): esta frase mezclaba los dos caminos que lo escriben, y no es lo que hace
  `reveal`.** Lo escribe `NpcsService.reveal` (`apps/api/src/statblocks/`, ruta en
  `NpcVisibilityController`, E-PM-1) al subir la instancia — con su ficha del mundo y su
  plantilla creada si estaban por debajo, en la misma transacción — y, aparte, `EntitiesService.
  update`, **uno por cada «cuerpo vivo»** que comparte `entityId` (E-PM-5, extraído a
  `raiseLiveBodies` en `common/entity-link.ts` — I3), al subir la ficha a `PLAYERS`/`PUBLIC`. El
  mismo suceso que ya emitía una ficha subida a mano, para que `rules-engine/world-builder.ts` no
  tenga que distinguir el origen.
- **`NPC_HIDDEN`** (`DM_ONLY`): lo escribe `NpcsService.hide`, siempre, aunque su única audiencia
  sea el propio DM — el canal en vivo emite un aviso por cada suceso escrito sin mirar su
  visibilidad, y sin este suceso la pantalla del jugador seguiría enseñando al bicho hasta el
  siguiente sondeo de 10 s.
- **`COMBATANT_LEFT`** (`PLAYERS`): «Garrik sale del combate», o «Alguien sale del combate» si el
  personaje no es visible para la mesa (`PLAYERS`/`PUBLIC`) en el momento de salir — el `payload`
  de un suceso no se filtra por espectador, así que el nombre de un oculto no puede viajar aquí.
  Lo escribe `EncountersService.removeCombatant` (`DELETE …/encounters/:id/combatants/:combatantId`,
  200 con el `Encounter` entero, como `setSide` y `advanceTurn`).

## `CharacterSpell` — el libro de conjuros de un personaje (3A.2, Task 2, D-CF-125, migración `20260918082612_character_spells`)

**`CharacterSpell`**: qué conjuros de su clase tiene marcados un personaje y en qué estado
(`EN_EL_LIBRO` | `PREPARADO` | `CONOCIDO`, `CharacterSpellState`). Una fila por conjuro que el
personaje tiene en su lista; que no exista fila es «ni siquiera lo tiene apuntado» — distinto de
`EN_EL_LIBRO` (lo tiene, pero no preparado para hoy). `@@unique([characterId, spellKey])`: un
conjuro aparece como mucho una vez por personaje.

**`spellKey` es una CADENA, nunca una clave foránea** — la misma decisión que `classKey`/
`raceKey` de `Character` (2A) y `InventoryItem.ref` de 2B, y por el mismo motivo: el catálogo del
SRD 5.1 (319 conjuros, tarea 3A.1) vive **en código**
(`apps/api/src/rules/catalog/generado/spells-srd.json`), no en una tabla, así que no hay fila a
la que apuntar con una clave foránea real. Guarda **y expone** el `key` interno del catálogo (`"fireball"`,
sin ningún prefijo): `GET .../spellbook` devuelve `key: "magic-missile"` y `PUT
.../spellbook/magic-missile` lo recibe igual. El prefijo `spell:` lo lleva solo la clave de
ACTIVIDAD (`claveDeConjuro`, `rules/catalog/spell-activities.ts`: `usar("spell:magic-missile")`,
`ACTIVITY_USED.actividadKey`) — no es parte de la clave del conjuro, y `SRD:` no aparece en ningún
sitio (a diferencia de `InventoryItem.ref`).

**Cuelga de `Character` en cascada** (`onDelete: Cascade`): borrar un personaje se lleva su libro
de conjuros, igual que sus `CharacterResource` y `CharacterCondition` (comprobado por conteo de
filas en `campaigns.e2e-spec.ts`, no por el tamaño de un volcado).

**`createdAt`, sin más columnas de auditoría.** Cuándo cambió de estado —cuándo se preparó, cuándo
se aprendió— no vive aquí: es `GameEvent` quien lo cuenta, con el suceso `SPELLBOOK_CHANGED`
(siguiente sección, misma tarea) que trae `cambio` (`PREPARADO` | `DESPREPARADO` | `APRENDIDO` |
`OLVIDADO` | `SEMBRADO`) y el `estado` resultante. La misma separación que ya declara el
encabezado de este fichero para `GameEvent` en general: la tabla es el estado, el registro es la
historia.

**Revertir**: `DROP TABLE "CharacterSpell"; DROP TYPE "CharacterSpellState";` — sin filas que
dependan de ninguna de las dos hasta que la Task 3 empiece a escribirlas.

### `ACTIVITY_USED` y `SPELLBOOK_CHANGED` (3A.2, Task 2, migración `20260918083644_activity_events`)

Dos valores más de `GameEventType` (`ALTER TYPE … ADD VALUE`, cada uno en su propia sentencia —
la misma regla que ya declaran `NPC_REVEALED`/`NPC_HIDDEN`/`COMBATANT_LEFT`: un valor se añade,
nunca se edita ni se borra, así que revertir la migración no quita el valor del tipo).

- **`ACTIVITY_USED`**: usar una actividad —lanzar un conjuro o activar un rasgo— es un hecho
  propio y no un eco de `RESOURCE_SPENT`. `RESOURCE_SPENT` ya cuenta que se gastó un espacio o un
  uso, pero no dice CON QUÉ: la crónica dice «Elara lanza Proyectil mágico», no «gasta 1 de
  Espacios (nivel 1)». `kind` distingue `SPELL` de `FEATURE`; `spellLevel`/`nivelDeEspacio` solo
  aparecen con un conjuro, y `fueraDeRegla` (`SIN_ESPACIO` | `NO_PREPARADO`) sigue la doctrina de
  siempre — el sistema avisa, no bloquea (paso 2, tarea A2).
- **`SPELLBOOK_CHANGED`**: cambiar el libro de conjuros —preparar, dejar de preparar, aprender,
  olvidar, o el sembrado inicial de la clase (`"SEMBRADO"`, el primer libro que recibe un mago al
  crear el personaje, D-CF-125)— es un hecho de la ficha, igual que subir de nivel. `estado` es
  el estado DESPUÉS del cambio, `null` si el conjuro salió de la lista — la misma forma que
  `HP_CHANGED.to`, para que la línea de tiempo no tenga que recalcular el historial. `fueraDeRegla`
  (`EN_COMBATE` | `SOBRE_EL_TOPE`) avisa sin bloquear, igual que en `ACTIVITY_USED`.

Sus frases del hilo viven en `apps/web/src/features/sessions/linea-de-log.ts`; las dos se
clasifican como «personaje» en `apps/web/src/features/sessions/hilo/tipo-de-mensaje.ts`, el mismo
cubo que `RESOURCE_SPENT` — le pasan a alguien de la mesa, no son el mundo hablando ni andamiaje
del sistema.

## `TemporaryModifier.inventoryItemId` — el encantamiento vive sobre una fila, no sobre el personaje (T15, 3A.2, migración `20260918143214_temporary_modifier_item`)

**Columna nueva, nullable, con su índice y su clave foránea** hacia `InventoryItem` (`onDelete:
Cascade`). Las once filas de `TEMPORARY_MODIFIER_TARGETS` que ya existían (las seis
características, la CA, las cinco velocidades) apuntan al personaje entero, y para ellas
`inventoryItemId` se queda en `null` — nada cambia. *Arma mágica* (SRD 5.1: «that weapon becomes
a magic weapon with a +1 bonus to attack rolls and damage rolls») necesita decir **sobre qué
arma**, y un personaje puede llevar más de una: `characterId` sigue diciendo de quién es la fila
del inventario (normalmente el aliado al que se le encanta el arma, no quien lanza el conjuro),
`inventoryItemId` dice cuál.

Dos targets nuevos en `TEMPORARY_MODIFIER_TARGETS` (`@dnd/shared`): `item.weaponAttack` y
`item.weaponDamage` — el mismo vocabulario que ya usa un objeto mágico permanente
(`ItemEffect.kind`, ficha HP-9a), aplicado a un efecto que vence. `grantTemporaryModifierSchema`
exige `inventoryItemId` cuando, y solo cuando, `target` empieza por `item.` (`esTargetDeObjeto`).

**`Cascade` y no `SetNull`.** Si la fila del inventario desaparece —se tira, se vende, el DM la
borra— el encantamiento sobre ella deja de significar algo: no hay «arma mágica sin arma». Un
`inventoryItemId` huérfano sería un dato que nadie puede leer sin mentir sobre a qué apunta.

**Se lee igual que los de personaje: por vencimiento contra el reloj, nunca se borra solo**
(D-2C-2). Lo que cambia es DÓNDE se lee: `character-sheet.service.ts`
(`temporalesPorObjeto`) agrupa los vivos por `inventoryItemId` y los adjunta a cada
`ResolvedItem.temporales` — así `rules/items.ts` (`efectosActivos`) los suma exactamente como
suma un `ItemEffect` del objeto, y `rules/attacks.ts` les da su propio paso de traza
(`temporary:<reason>`, para no confundirlos con el `+N` permanente del objeto).

**Revertir**: `ALTER TABLE "TemporaryModifier" DROP CONSTRAINT "TemporaryModifier_inventoryItemId_fkey"; DROP INDEX "TemporaryModifier_inventoryItemId_idx"; ALTER TABLE "TemporaryModifier" DROP COLUMN "inventoryItemId";` — ninguna fila existente antes de esta migración la usa, así que no hay dato que perder al quitarla.
