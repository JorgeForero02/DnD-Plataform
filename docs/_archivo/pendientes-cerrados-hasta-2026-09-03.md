# Pendientes cerrados — archivados el 2026-09-03

**Congelado. Nada de aquí se edita.** Son las fichas que `docs/06-pendientes.md` seguía
arrastrando ya tachadas: cerradas, resueltas o contestadas. Se conservan por si algo se reabre y
hace falta saber cómo se cerró la vez anterior, y porque varias explican **una afirmación que
resultó ser falsa** — el patrón que este proyecto usa como vacuna.

Continúa a
[`pendientes-cerrados-hasta-2026-09-02.md`](./pendientes-cerrados-hasta-2026-09-02.md).

**La regla con la que se seleccionaron, sin criterio de nadie:** todo lo que estuviera tachado
—una fila de tabla, una viñeta o un encabezado— salió. Ninguna ficha abierta se tocó. Los
identificadores **no se reciclan**: el hueco que deja una ficha archivada se queda vacío, o se
rompen las citas de los documentos que ya la nombraban.

---

## De «Lo que deja abierto la fase 2C (2026-09-03)»

| | Qué | Por qué |
|---|---|---|

| ~~**C2C-3**~~ | **CERRADA el 2026-09-03**, antes de desplegar: el reloj tiene su mando en la pestaña «Dados» (`features/game-clock/RelojDeCampana.tsx`). La hora la lee cualquiera —qué hora es en el mundo no es información privilegiada—, la mueve el DM con cinco saltos y el viaje con sus tres ritmos, y **las salvaciones de marcha forzada se enseñan con su CD** en vez de esconderse en un aviso. Se cerró porque el guion de la partida de prueba pide avanzar el reloj: sin esto, la fase 2 se habría dado por cerrada con la mitad visible de 2C.4 sin el gesto que la enciende | Cerrada |

| ~~**C2C-4**~~ | **CERRADA el 2026-09-03**: el reloj ofrece pedir las salvaciones de marcha forzada como peticiones de tirada reales — **una por salvación y por personaje**, con su CD creciente, porque el SRD manda una al final de cada hora pasada de ocho y juntarlas limitaría el agotamiento a un nivel | Cerrada |

| ~~**C2C-4 (texto original)**~~ | **La marcha forzada devuelve las tiradas que hay que pedir y nadie las pide.** El servidor calcula `forcedMarchSaves` con su CD por hora; encadenarlas con la petición de tirada de 2C.5 es lo que las convierte en juego | Con 2C.5 dentro, es cablear una cosa a la otra: por cada salvación, una petición a cada personaje que viajó |

| ~~**C2C-5**~~ | **CERRADA el 2026-09-03**: la tabla de la casa se pinta dentro de `ResultadoDeTirada`, diciendo que es una regla de la casa y no del manual, y con el dado y el resultado que salieron. Va dentro y no al lado porque **es parte del resultado de esa tirada**, y así llega a los cuatro sitios que ya pintan un resultado sin tocar ninguno. **Y no se pinta si quien tiró no puede ver la tabla** — ver la revisión de seguridad de abajo | Cerrada |

| ~~**C2C-5 (texto original)**~~ | **El disparo automático de una tabla no se ve en la pantalla de la tirada.** `RollResult` trae `houseTable` cuando un natural la dispara, y la pantalla de dados **no lo pinta**: el resultado queda solo en la línea de tiempo | Es una rama de pintado en `ResultadoDeTirada`. Sin ella, la regla de la casa ocurre y quien tiró no la ve |

| ~~**C2C-6**~~ | **CERRADA el 2026-09-03**: `PUT /campaigns/:c/tables/:id` con el mismo cuerpo que crear, y **las filas se reemplazan enteras** porque se validan como conjunto: editar una sola dejaría a las demás en un estado que nadie ha comprobado. En la pantalla, el mismo formulario que crea, relleno | Cerrada |

| ~~**C2C-6 (texto original)**~~ | **Una tabla no se puede editar, solo crear y borrar** | Deliberado: el alcance pedía la primitiva. Editar una tabla de cien filas sin poder editarla es rehacerla |

| ~~**C2C-7**~~ | **CERRADA el 2026-09-03**: `GET /campaigns/:c/rolls?mine=true`. Lo resuelve el servidor y no el cliente porque **un jugador puede llevar varios personajes**: «las mías» no es un identificador, es un conjunto. Sin personajes propios son **ninguna**, no todas | Cerrada |

| ~~**C2C-7 (texto original)**~~ | **`GET /campaigns/:id/rolls` no filtra por «solo las mías»** | El registro trae las de la mesa. Con una sesión larga, un jugador que quiera repasar las suyas tiene que buscarlas. El hook de la web ya acepta el filtro por personaje; falta ofrecerlo |

## ~~C2C-1~~ · El cuarto modo de tirada — **CONTESTADA por el autor el 2026-09-03: no entra**

> **«No.»** Preguntado en una línea —*¿quieres que un jugador pueda esconderte una tirada a ti, el
> DM?*—, la respuesta es que no. **Se cierra con tres modos**: pública, privada del DM y a ciegas
> del DM.

Y conviene guardar el porqué, porque la pregunta volverá el día que alguien compare esta
herramienta con Foundry: el cuarto modo **no era un nivel de visibilidad que faltara**, era una
excepción a «el DM lo ve todo», que es una regla del proyecto entero y no un detalle de la pantalla
de dados. Cerrarla con tres modos no es una carencia: es la consecuencia de una regla que el autor
quiere. El razonamiento completo, con su fuente, queda abajo tal como se escribió.

### El razonamiento, conservado

## ~~C2C-1 (razonamiento original)~~ · El cuarto modo de tirada («Propia») no cabe en el modelo

**Es un hallazgo de 2C.1, y contradice una premisa del alcance.** El alcance de 2C decía que
«nuestro modelo ya expresa tres de los cuatro [modos de Foundry] con la visibilidad que existe» y
que *«lo que falta para la ciega no es el modelo, es el endpoint»*. Lo segundo era cierto y ya
está arreglado. Lo primero se quedó corto, y se vio al ir a escribirlo.

**Lo que dice la fuente**, comprobado en la documentación de Foundry
([Basic Dice](https://foundryvtt.com/article/dice/)): un *self roll* es *«a private dice roll
which is only visible to the user who rolled it»*, y *«whether a GM or Player uses a self roll,
only the user who made the roll can choose to reveal it»*. O sea: **esconde el resultado también
del DM**.

**Por qué eso no cabe aquí.** `canView` (`apps/api/src/common/visibility.ts`) devuelve `true` al
DM **antes** de mirar el nivel de visibilidad, y eso no es un detalle de esta pantalla: es la
regla del proyecto. Así que «Propia» no es un nivel que falte en el enum, es una **excepción a
esa regla**. Y hay dos maneras de hacerla, las dos malas sin que el autor lo decida:

- **Tocar `canView`** afecta a todos los recursos del producto —fichas, sesiones, objetos,
  sucesos—, y convierte «el DM lo ve todo» en «el DM lo ve todo menos…». Es una decisión de
  producto con consecuencias en cada pantalla.
- **Filtrar solo las tiradas** sería reimplementar la matriz de visibilidad a mano en un
  servicio, que es exactamente lo que `CLAUDE.md` prohíbe: *«`canView` es el dueño único de quién
  ve qué»*.

**Lo que se hizo mientras tanto:** entran **tres** modos con el vocabulario de la industria
—Pública, Privada del DM, Ciega del DM— y el cuarto no se finge. Fingirlo era la peor opción:
una tirada que la pantalla llama «Propia» y que el DM lee en su registro es una promesa de
privacidad incumplida, que es peor que no ofrecerla.

**La pregunta para el autor, en una línea:** ¿quieres que un jugador pueda esconderte una tirada?
En una herramienta donde el DM arbitra, la respuesta por defecto razonable es «no», y entonces
esta ficha se cierra declarando tres modos. Si la respuesta es «sí», es un nivel de visibilidad
nuevo con su migración y su repaso de todas las pantallas.

> **Contestada: «no».** Tres modos, y el vocabulario queda cerrado.

## ~~P2~~ · Los topes de la tirada y de la anulación — **CERRADA el 2026-09-03 (2C.2)**

Los dos entraron con la pantalla de dados, que es donde estaban prometidos.

- **El término constante ya tiene tope**: `DICE_LIMITS.maxConstant` = 1000
  (`apps/api/src/dice/dice.ts`). `1d20+999999999` es ahora un 400 con su motivo, en vez de una
  cifra sin sentido escrita en el registro de la partida. **Mil sale de «qué cifra ya no puede ser
  un error de tecleo»**, no del rango de la 5.ª edición: el modificador más alto de una hoja
  legítima no llega a 30.
- **La anulación del DM tiene un rango por clave**, no uno solo para las cinco
  (`RANGO_DE_ANULACION`, `packages/shared/src/character-sheet.schema.ts`): CA 0–50, PG máximos
  1–2000, iniciativa −20–50, velocidad 0–1000 pies, Percepción pasiva 0–50. Una CA de −999 se
  rechaza; una CA de 30 por una regla de la casa **sigue entrando**, que era el riesgo que la
  ficha avisaba — apretar el tope al rango del manual habría inutilizado la válvula de escape.
  Los negativos se admiten **solo donde significan algo**: un modificador de iniciativa puede ser
  negativo; unos PG máximos o una velocidad, no.

**Dónde vive la comprobación del rango, y por qué no está en el esquema:** el tope depende de QUÉ
se anula, y eso viaja en la URL (`PUT overrides/:target`), así que ningún esquema del cuerpo puede
expresarlo. La tabla vive en `@dnd/shared` —una sola vez— y el servicio la aplica, igual que aplica
«solo el DM». El esquema conserva un bordillo de ±2000 para cortar lo que no es un entero antes de
tocar la base.

## De «Huecos abiertos de la fase 2A (2026-09-02)»

| | Qué | Por qué |
|---|---|---|

| ~~**H6**~~ | ~~**¿Con qué autoridad escribe una regla?**~~ **CERRADO el 2026-09-02** — es un diputado confundido, y su fallo en siete puntos está en [autoridad de las reglas](./superpowers/specs/2026-09-02-autoridad-de-las-reglas-design.md). Lo esencial: el objetivo se fija **al armar**, no al disparar, y los objetivos dinámicos por etiqueta **salen de la v1**. Lo de abajo se conserva porque explica el riesgo: Un jugador abre una ficha, eso dispara una regla, y la regla revela algo **que ese jugador no podría haber revelado** | Propuesta: se aplica con la autoridad **del DM que armó la regla**, y la traza lo dice. **Necesita su propia revisión de seguridad antes de 2A.16** — es el único hueco de esta lista que puede convertirse en una fuga |

## De «Deuda de las tareas 2A.3 y 2A.4 (catálogo SRD y elecciones) — 2026-09-02»

| | Qué | Por qué |
|---|---|---|

| ~~**S1**~~ | ~~**La atribución CC BY no se ve todavía en la aplicación**~~ **CERRADA el 2026-09-02**: hay pie en toda pantalla con sesión (`apps/web/src/ui/LegalNotice.tsx`, montado en `AppShell`) y pantalla `/acerca-de` con el texto completo, **sin exigir sesión** — una atribución detrás del acceso no está en la obra distribuida. | Se cerró **antes** de que 2A.10 pintara una hoja, que era la condición de disparo. Ocho pruebas RTL la sostienen, y la que importa es la de la **nota de modificación**: traducir al español ES una modificación y omitirla incumple igual que omitir el autor — comprobado quitándola, la prueba se pone roja |

| ~~**S5**~~ | **CERRADO en 2A.10**, a medias declaradas. La tabla existe: `apps/web/src/features/character-sheet/vocabulario.ts`, y una `labelKey` sin traducir se pinta como «Sin traducir: <clave>», visible y no silenciosa. **Lo que sigue sin existir es la prueba que falle cuando el catálogo estrene una `labelKey` nueva**: hoy la lista de la prueba se escribe a mano, así que comprueba lo que alguien recordó, no lo que el catálogo emite | Abierto (la prueba) |

| ~~**S7**~~ | **CERRADA de hecho, sin filtro global.** `character-sheet.service.ts` captura las tres en el borde y lanza `BadRequestException` (líneas 128, 500, 528 y 536), así que el camino que las produce **sí** devuelve 400. Lo que sigue sin existir es el `useGlobalFilters`: si mañana otro servicio deja escapar una de estas excepciones sin capturarla, Nest devolverá 500. Es traducción caso a caso, no una red de seguridad | Cerrada como fallo; abierta como patrón. La versión anterior de esta ficha decía «hoy no hay camino que las provoque por HTTP», y llevaba desde 2A.6 siendo falsa |

| ~~**S8**~~ | **CERRADO en 2B, y por el camino que la ficha pedía: no se escribió el `else`.** El equipo llega al resolutor **ya resuelto** (`CharacterBuild.items: ResolvedItem[]`), no por referencia, así que no hay ninguna rama donde un identificador de otra campaña pueda colarse. Quien traduce un `ContentRef` de campaña a un objeto es la API, siempre con el `campaignId` en el `where` (`campaign-items.service.ts`, `inventory/common/resolve-item.ts`) | `findRace`/`findClass`/`findArmor` reciben solo la referencia. Cuando 2B rellene la rama `CAMPAIGN`, la firma **no tiene por dónde comprobar que ese identificador pertenece a la campaña del personaje**: es un IDOR entre campañas esperando a que alguien implemente el `else`. Hoy esa rama lanza `UnknownContentError`, así que no hay agujero; el arreglo es meter el `campaignId` en la firma **antes** de escribir ese `else`, no después |

| ~~**S9**~~ | **CERRADO en 2A.12.** `GET .../sheet` devuelve `effectiveSpeeds`: la velocidad ya afectada por las condiciones, con la traza que nombra **todas** las causas. Y con una lección: la primera versión de la pantalla la recalculaba en el navegador copiando la función del servidor letra por letra, porque no había endpoint. Dos copias de una regla del juego se separan en cuanto se toca una | Cerrado |

## De «Lo que dejó abierto la auditoría de mecánica de 2B (2026-09-03, noche)»

| | Qué | Por qué |
|---|---|---|

| ~~**M2B-1**~~ | **CERRADA el 2026-09-03**: `weaponAttack` y `weaponDamage` entran en la lista cerrada, `attacks.ts` los suma al bono **y al daño del arma que los lleva**, y el paso sale en la traza. La línea de derechos no se mueve: se abre la **forma**, y los objetos mágicos del SRD siguen sin copiarse. Lo que queda fuera es un objeto que suba **todos** los ataques (un anillo), que no está en el SRD | Cerrada |

| ~~**M2B-1 (texto original)**~~ | **Un arma mágica no se puede representar.** Ni `+1` al ataque ni al daño: la lista cerrada de efectos no los tiene, `buildAttacks` no lee `effects`, y `OVERRIDABLE_KEYS` tampoco incluye `attack.*` | **Es el que más rápido devuelve la mesa al papel**: el DM entrega la primera espada +1 y el cuadro de ataques miente en cada tirada. Son dos `kind` nuevos en `itemEffectSchema` (`weaponAttack`, `weaponDamage`) y consumirlos en `attacks.ts`. Ojo con la línea de derechos: los objetos mágicos del SRD **no** se copian; lo que se abre es la forma para que el DM escriba los suyos |

| ~~**M2B-2**~~ | **CERRADA el 2026-09-03**: `ITEM_ADDED`, `ITEM_MOVED` e `ITEM_REMOVED`, escritos **en la misma transacción** que el cambio. Y soltar pasó a ser idempotente (`deleteMany`), que era el otro fallo de la misma línea: soltar dos veces con mala red daba un 500 sobre una operación que sí había funcionado | Cerrada |

| ~~**M2B-2 (texto original)**~~ | **Ninguna mutación de inventario deja rastro en la línea de tiempo** | El dinero sí (`MONEY_CHANGED`). Una semana después nadie puede responder «¿quién cogió la gema?». Tres tipos de suceso y un `events.record` dentro de cada transacción |

| ~~**M2B-3**~~ | **CERRADA el 2026-09-03**: los sucesos registrados dentro de una transacción se **encolan** y se emiten tras el *commit*, esperando cada emisión (`apps/api/src/common/after-commit.ts`). Si la transacción se deshace, el buzón se descarta y no se emite nada. Y la promesa del comentario ya es verdad: `emitAsync` **se espera**, así que el motor evalúa dentro de la petición. La garantía no depende de que nadie se olvide: la única puerta a una transacción es `PrismaService.transaction`, y un barrido del código prohíbe la llamada cruda (`apps/api/src/prisma/no-transaction-suelta.spec.ts`) | Cerrada |

| ~~**M2B-3 (texto original)**~~ | **El motor de reglas se dispara dentro de la transacción del llamante y escribe fuera de ella** | Sus efectos sobreviven a un cambio que se deshace, y lee el mundo anterior al suceso. Hoy la única puerta real es arrancar o cerrar sesión —las tiradas y el mundo registran sin `tx`—, pero **el comentario de `game-events.service.ts` afirma que la evaluación ocurre «dentro de la petición» y no es cierto**: `emit` no se espera. Se arregla encolando los sucesos y emitiéndolos tras el *commit* |

| ~~**M2B-4 (texto original)**~~ | **No hay munición, ni cargas, ni forma de gastar un consumible** | La propiedad `AMMUNITION` se pinta y no la consume nadie; `quantity` no puede bajar a 0 (la última poción se «bebe» borrando la fila); un descanso no repone cargas porque no existen. El explorador dispara indefinidamente |

| ~~**M2B-13**~~ | **CERRADA el 2026-09-03**: el destino por defecto de las capturas es `apps/web/capturas-salida/`, **ignorada por git**, y el juego de referencia de `apps/web/capturas/` solo se reescribe a propósito con `SALIDA_CAPTURAS=capturas`. Una foto de referencia se actualiza cuando alguien lo decide, no como efecto colateral de correr las pruebas. **Y lo guarda una prueba** (`apps/web/src/ui/__tests__/capturas-no-ensucian.test.ts`) que lee el guion y el `.gitignore`: ninguna prueba de comportamiento puede fallar por lo que una suite deja detrás. Medido: tras correr el guion, `git status` solo enseña las ediciones de código | Cerrada |

| ~~**M2B-13 (texto original)**~~ | **La suite de navegador nunca deja el árbol limpio** | `capturas-comparacion.spec.ts` reescribe los nueve PNG de `apps/web/capturas/` en cada corrida —cada una con otra cuenta, otras horas y otros identificadores—, y los ficheros están seguidos por git. Así que después de cada `pnpm --filter @dnd/web e2e` hay nueve binarios modificados que no significan nada. Se arregla escribiendo a una carpeta ignorada por defecto y dejando `SALIDA_CAPTURAS` para cuando se quieran guardar de verdad. **Ojo con la comodidad de `git checkout` para limpiarlos**: es el comando que este proyecto prohíbe usar sobre un árbol con cambios sin commitear |

| ~~**M2B-6**~~ | **CERRADA el 2026-09-03**: un arma va en una mano, una armadura en el cuerpo, un escudo en la izquierda; lo demás se rechaza con un 400 que dice dónde va. `OTHER` y `CONSUMABLE` siguen sin acotar a propósito: son el cajón de lo que el SRD no nombra | Cerrada |

| ~~**M2B-6 (texto original)**~~ | **La ranura no comprueba qué clase de objeto acepta** | Una cota de malla equipada en «CABEZA» sigue dando su CA, y un segundo escudo colocado a propósito en otra ranura **apaga la hoja entera** (`InvalidEquipmentError` → `sheet: null`). Hace falta atar `kind` ↔ `slot` |

| ~~**M2B-7**~~ | **CERRADA el 2026-09-03**: el tope de Destreza **lo determina la categoría** (`TOPE_DE_DESTREZA_POR_CATEGORIA`), el esquema rechaza la incoherencia y la pantalla ya no ofrece dos controles que puedan discrepar | Cerrada |

| ~~**M2B-7 (texto original)**~~ | **`armor.category` es un rótulo decorativo** | Nadie la consume salvo para distinguir el escudo: el tope de Destreza lo fija `dexCap` a mano, así que un DM puede marcar «Pesada» y que sume toda la Destreza. Lo suyo es derivar el tope de la categoría, o atarlos en el esquema |

| ~~**M2B-9**~~ | **CERRADA el 2026-09-03**: el previo y la aplicación derivan con el equipo equipado, así que las dos pantallas del mismo personaje dicen el mismo número | Cerrada |

| ~~**M2B-9 (texto original)**~~ | **La subida de nivel deriva la hoja sin el equipo puesto** | El previo enseña unos PG que no coinciden con la hoja si hay un objeto con efecto `maxHp`. Hoy no corrompe nada porque los PG no se persisten, pero `apply` siembra recursos con esa hoja incompleta: es una segunda boca del mismo error |

| ~~**M2B-10**~~ | **CERRADA el 2026-09-03**: el inventario sondea cada treinta segundos, igual que la sesión en curso. Sigue sin ser tiempo real, que es la fase 4 | Cerrada |

| ~~**M2B-10 (texto original)**~~ | **Nada refresca el inventario cuando lo cambia otra persona** | El DM entrega el botín y los jugadores no lo ven hasta volver a la pestaña (el refutador matizó que `refetchOnWindowFocus` sí lo recarga al volver, así que no es «hasta recargar»). Las sesiones ya sondean; falta el mismo `refetchInterval` |

## De «Lo que dejó la auditoría de documentación (2026-09-02)»

| | Qué | Por qué |
|---|---|---|

| ~~**A1**~~ | **CERRADA el 2026-09-03, antes de desplegar.** La prueba de cascada cuenta ahora **diecisiete tablas**: las ocho que ya contaba, las cuatro de la ficha (`gameEvent`, `campaignFlag`, `campaignSet`, `rule`), el catálogo propio de la campaña, las condiciones de un personaje, y las tres que trajo 2C (`rollRequest`, `dmTable`, `dmTableEntry`). Cuenta filas de verdad antes y después, y sale a cero. Se cerró justo antes del despliegue porque un huérfano en una tabla nueva no avisa: la operación devuelve 200 igual | Cerrada |

| ~~**A2**~~ | **REVISADA el 2026-09-03: la mitad que era una mentira, corregida; la otra mitad sigue siendo correcta.** `entities` **ya lo engancha** —abrir una ficha escribe el suceso—, así que la fila de [01-arquitectura.md](./01-arquitectura.md) que decía «solo DM» de este módulo **era falsa** y se ha corregido: un jugador escribe ahí sin pasar por su controlador. Lo que **no** se cambia es la falta de comprobación de membresía dentro del método: quien llama (`getOne`) ya ha comprobado que quien mira puede ver la ficha, que es el mismo patrón declarado de `GameEventsService.record` («quien llama ya decidió»). No es explotable: no hay ninguna puerta HTTP que llegue a él sin pasar antes por esa comprobación | Cerrada |

| ~~**A2 (texto original)**~~ | **`recordEntityOpened` escribe un `GameEvent` sin comprobar membresía**, y `world-state.module.ts` lo exporta a propósito | Hoy **no lo llama nadie**, así que no es explotable. Sigue el mismo patrón que `GameEventsService.record` («quien llama ya decidió»), y por eso no se cambió. **Pero la fila de 01 dice «solo DM» de ese módulo, y dejará de ser verdad en cuanto `entities` lo enganche** — que es lo que su propio comentario anuncia |

## De «Cabos sueltos de 2A.6, 2A.7, 2A.8 y 2A.12 (2026-09-02)»

| | Qué | Por qué |
|---|---|---|

| ~~**H3b**~~ | **CERRADO el 2026-09-02.** `seedResourcesFor` ya lo llaman `CharacterSheetService` al completar la ficha y `LevelUpService` dentro de la transacción de subida de nivel, con prueba del caso negativo (ficha a medias no siembra). Estuvo abierto desde 2A.8 —función con prueba y sin llamador—, así que **ningún personaje tenía dados de golpe ni espacios de conjuro** y el panel de recursos salía vacío para todos. Lo encontró la revisión de la pantalla, no la suite | Cerrado |

## De «Reseño de interfaz (2026-09-02) — lo que dejó abierto»

| | Qué | Por qué |
|---|---|---|

| ~~**U5**~~ | **CERRADO en 2A.10.** `HojaCalculada.tsx` pinta los valores del motor con su traza desplegable, los PG con deltas, recursos, descansos, condiciones, tirar y las anulaciones del DM. El «—» que queda en `HojaCincoE.tsx` es solo lo que 2B alimentará (equipo, conjuros) | Cerrado |

## De «P3 — Correcciones funcionales conocidas»

| | Qué | Por qué |
|---|---|---|

- ~~No hay botón de borrar sesión o personaje en la interfaz~~ — CERRADO, tarea 1.16 (ver
  "Cerrados").

- ~~Los botones "Quitar" (`LinksPanel.tsx`) y "Borrar" (`CommentThread.tsx`) se pintan en
  todas las filas, sin mirar si el usuario es DM o autor~~ — CERRADO, tarea 1.16 (ver
  "Cerrados").

- ~~**El modal del editor de entidades no tiene `role="dialog"` ni se cierra con Escape**~~
  — **CERRADO, y la línea era falsa desde el reseño de interfaz.** `EntityEditor.tsx` monta
  `ui/Dialog`, que pone `role="dialog"` y llama a `onClose` con `Escape`, además de devolver
  el foco a lo que lo abrió. Se conserva tachado porque la observación del revisor de 1.12a
  fue correcta **cuando se escribió**: lo que caducó es la ficha, no el hallazgo.

## De «Cierre de la fase 2A — lo que las auditorías del 2026-09-02 encontraron»

| | Qué | Por qué |
|---|---|---|

| ~~**M13**~~ **CERRADO por la fase 2D (2026-09-03)** | ~~Los PNJ y los monstruos no tienen puntos de golpe, ni CA, ni condiciones~~ · **La salida fue otra que la prevista aquí y sale más barata**: en vez de una tabla de estado de combate nueva colgando de la ficha del mundo, un PNJ instanciado **es una fila de `Character`** con `statblockRef`. Así los PG, las condiciones, el daño y el registro funcionan sin tocarlos, y el endpoint de PG no necesita aceptar otro objetivo porque la ruta de personaje ya vale. Y **2D.6 cerró la mitad que faltaba**: los PNJ ya no salen en el listado de personajes, que vuelve a ser «quién se sienta a la mesa». Tienen su propia lista en «Bestiario», con sus PG y sus condiciones vivas | El hueco más caro: el DM hace daño a un monstruo en el minuto diez. Hoy, para llevar los PG de tres goblins hay que crear tres «personajes» a su nombre, que salen en el listado junto a los de los jugadores | Una tabla de estado de combate colgando de la ficha del mundo, y que el endpoint de PG acepte un objetivo en vez de estar clavado en la ruta de personaje |

| ~~**M19**~~ | **CERRADO en 2B (2026-09-03): objetos con datos, inventario, equipo, dinero y el cuadro de ataques con su daño.** Lo que queda de esa ficha es lo que 2B declaró fuera: la carga no penaliza (I4) y el botín sigue sin tabla propia | ~~pendiente~~ |

| ~~**M19 (texto original)**~~ | **Ni objetos, ni inventario, ni dinero** | La hoja enseña «+5 al ataque» y no tiene dónde leer «1d8+3 cortante». **Media mecánica de ataque en pantalla es peor que ninguna, porque parece completa.** Y el botín de la sesión se apunta fuera | La fase 2B lo modela entero. Para la semana que viene bastaría un texto libre por personaje y una columna de dinero: no es 2B, es un cuaderno, pero evita tener dos sitios donde mirar |

| ~~**J1**~~ | **Curar a un muerto lo resucitaba**: a 0 PG con tres fracasos, echarle diez puntos lo devolvía a la vida con el contador a cero y sin aviso | **CERRADO**: `changeHp` lo rechaza con un 400 que dice que hace falta resurrección; bajarle los PG a un cadáver sigue permitido |

| ~~**J2**~~ | **El ensayo en seco decía `status: "APPLIED"`**, la palabra que sostiene toda la promesa del dry-run | **CERRADO**: el ensayo reetiqueta a `WOULD_APPLY`/`WOULD_PROPOSE` y devuelve `simulated: true`; el enum persistido de `RuleTrace` no se toca |

| ~~**J3**~~ | **`ENTITY_OPENED` se disparaba con las lecturas del propio DM**: preparar la sesión le llenaba la bandeja de propuestas disparadas por sí mismo | **CERRADO**: no se registra cuando quien mira es el DM o el creador; el suceso capta que **un jugador** examinó algo, que es su razón de ser |

| ~~**J4**~~ | **El combate se grababa fuera de sesión**: `GET /events?sessionId` devolvía 2 de 19 sucesos aunque la sesión estuviera abierta | **CERRADO** para el daño y las salvaciones de muerte: `changeHp` y `rollDeathSave` averiguan la sesión en curso y la graban, como ya hacía `RollsService` |

## De «Despliegue — abierto tras escribir la pila (2026-09-02)» (segunda pasada)

| | Qué | Por qué |
|---|---|---|

| **D1** | ~~`02-entorno.md` decía `TRUST_PROXY=1`~~ | **Cerrado.** El documento ya dice que en producción son **dos** saltos y por qué |

| **D2** | ~~`00-INDEX.md` anunciaba "no desplegado"~~ | **Cerrado el 2026-09-02**, junto con la misma afirmación en `CLAUDE.md` |

| **D4** | ~~¿Descubre el respaldo diario los contenedores nuevos?~~ | **Cerrado: no los descubre.** El trabajo de las 04:00 lleva **una lista escrita a mano**. Se le añadió un bloque para esta base (`dnd-pg.sql.gz`), resolviendo el contenedor por prefijo de uuid porque su nombre cambia en cada despliegue. Volcado verificado por contenido: 11 tablas y la cuenta del autor dentro |

| **D6** | ~~`TRUST_PROXY` sin verificar contra el sistema real~~ | **Cerrado el 2026-09-02 con la prueba de las dos tandas.** Seis logins fallidos → 429; seis **con `X-Forwarded-For` falsificado y rotando** → **también 429**. Traefik descarta la cabecera del cliente, que es de donde viene la protección |

## De «Antes de desplegar — seguridad» (segunda pasada)

| | Qué | Por qué |
|---|---|---|

| 1 | ~~**`JWT_SECRET` tiene un valor por defecto en el código**, en dos sitios~~ — **HECHO** (2026-09-01, ver [07-historial.md](./07-historial.md)): no hay valor por defecto, la variable es obligatoria y de 32 caracteres mínimo, y la API se niega a arrancar sin ella | ~~**Crítico**~~ |

| 2 | ~~**29 vulnerabilidades en dependencias de producción**~~ — **HECHO** (1.18a): Nest y Fastify subidos a 11.x, `fast-uri` a 3.1.6; quedan **4 moderadas** (`@opentelemetry/core` vía Sentry v8, 3 de `react-router` en web). CI audita con `--audit-level=high` | ~~Alto~~ |

| 3 | ~~**Sin límite de peticiones**~~ — **HECHO** (1.18a): límite por IP en login, registro, aceptar invitación y cambiar contraseña. **Exige el `TRUST_PROXY` correcto en producción, que en `vps1new` es `2`, no `1`** (Traefik **y** nginx son dos proxies), ver [03-despliegue.md](./03-despliegue.md) | ~~Alto~~ |

| 4 | ~~**Sin cabeceras de seguridad**~~ — **HECHO** (1.18a): `@fastify/helmet` con política revisada, fijada por `apps/api/test/security-headers.e2e-spec.ts` | ~~Medio~~ |

| 5 | ~~**CORS abierto**~~ — **HECHO** (1.18a): apagado por defecto; `CORS_ORIGIN` es la única forma de encenderlo | ~~Medio~~ |

| 6 | ~~**Sin pantalla de 404 ni `ErrorBoundary`**~~ — **HECHO** (1.18b): ruta comodín, red de errores con salida que funciona, y un comentario que declara lo que una red de React **no** atrapa | ~~Medio~~ |

## De «Tarea 1.17 — cierre real de la fase 1» (segunda pasada)

| | Qué | Por qué |
|---|---|---|

| A2 | ~~Las etiquetas se guardan y no se ven en ninguna parte ni se puede filtrar por ellas~~ — **CERRADO en 1.17c**: se pintan en la fila y `EntityFilterBar` filtra por ellas (Y lógico) | — |

| B1 | ~~Una campaña no se puede editar ni borrar~~ — **CERRADO en 1.17d**: `CampaignSettings.tsx` (pestaña Resumen) consume el `PATCH`/`DELETE` que 1.17a ya tenía probados | — |

| B2 | ~~No se puede expulsar a un jugador ni salirse~~ — **CERRADO en 1.17d**: `MembersPanel.tsx` (pestaña Resumen) consume el `DELETE /campaigns/:id/members/:userId` de 1.17a | — |

| C1 | ~~No hay búsqueda ni filtro en ninguna pantalla~~ — **cerrado en 1.17c para las siete pestañas de entidades**; **Sesiones y Personajes se quedan sin buscador, ver la nota debajo de la tabla** | Solo web |

## De «P1 — Huecos de verificación» (segunda pasada)

| | Qué | Por qué |
|---|---|---|

**~~`invites.e2e-spec.ts` y `members.e2e-spec.ts` podían colisionar de correo entre workers de
Jest~~ — CERRADO el 2026-09-01 (tarea 1.15-fix, Menor).** Ambas suites construían sus correos
como `dm${Date.now()}@b.com` / `pl${Date.now()}@b.com` — resolución de milisegundo. Dos
workers de Jest que arrancaran en el mismo milisegundo generaban correos idénticos: el
segundo `register()` fallaba con 400 (email duplicado) y el `afterAll` de un worker borraba
el usuario que el otro seguía usando, produciendo fallos intermitentes sin relación con el
código bajo prueba. Detectado y explicado durante la revisión de 1.15 (explicación verificada
por el revisor), no corregido en su momento porque quedaba fuera del arreglo que se estaba
revisando. **Arreglado** añadiendo un sufijo aleatorio a `Date.now()` en los dos ficheros
(`${Date.now()}${Math.floor(Math.random() * 1e6)}`). **El mismo patrón de correo
(`Date.now()` a secas) existe también en `auth.e2e-spec.ts`, `campaigns.e2e-spec.ts`,
`characters.e2e-spec.ts`, `comments.e2e-spec.ts`, `entities.e2e-spec.ts`,
`links.e2e-spec.ts` y `sessions.e2e-spec.ts`** — comparten el mismo riesgo teórico, pero no
fueron los que la revisión de 1.15 vio fallar y el brief de 1.15-fix pedía arreglar
específicamente los dos de arriba; se deja anotado aquí en vez de corregido en silencio.
