# Pendientes cerrados — el reconocimiento del 2026-09-08

**Las dieciocho fichas que `06-pendientes.md` llevaba abiertas y el código desmiente.** Salieron
de un reconocimiento pedido por el autor —*«revisar cuál de todas estas son verdad y cuáles
mentira»*— sobre el árbol en el commit `8467fed`. Se comprobaron unas cincuenta y cinco fichas,
las que llevaban dentro una cita, un símbolo o un barrido: esas se verifican o se caen solas.

> **Y el propio recuento se corrigió al hacerlo, que conviene que conste.** El informe que se le
> dio al autor decía **catorce**, porque agrupaba en una línea las fichas que dicen lo mismo desde
> dos sitios —`D3` con `J8`, `D8` con `E3`— y porque `B3` y `D5` aparecieron después, al medir
> citas desplazadas que el informe no había abierto. Un recuento redondeado en un informe es
> exactamente la clase de número que este fichero existe para no volver a creerse.

**No se editan.** Cada ficha se conserva **entera y con su texto original**, y debajo va la
medición que la cerró, con fecha y `fichero:línea`, que es lo que la cabecera de
`06-pendientes.md` exige desde el 2026-09-05 de todo lo que se tacha.

## Por qué se archivan en vez de borrarse, y qué enseñan

**Diez de las dieciocho eran fichas con un barrido, un símbolo o una cita de línea dentro**
—`D1`, `D2`, `D3`, `D5`, `D8`, `D9` del contraste, `E2`, `E3`, `U8-glifos` y `L2-traza-daño`—, y
lo que decían no es lo que dice el árbol. Ese es exactamente el modo de fallo que la ficha *«Dos
fichas de este documento mienten con un barrido citado dentro»* (2026-09-04) nombró y midió:
contaba dos, y eran al menos once. **Una ficha con un `grep` dentro envejece igual que el código,
y encima parece probada** — el barrido le presta la autoridad de una medición a una frase que ya
no es cierta.

**Cuatro eran P1** —`D1`, `D2`, `D3` y `E2`—, y `E2` era la que su propia tabla llamaba *«el
hallazgo más importante de la pasada»*. Una ficha falsa de prioridad alta no es ruido: es trabajo
que alguien va a hacer dos veces, o peor, un arreglo que va a deshacer el que ya existe.

**Y dos vivían por duplicado en dos documentos a la vez** —`D9` en este fichero y en la fila de
`notifications` de `01-arquitectura.md`, y `D3` contradicha por la propia cabecera de
`06-pendientes.md`, que ya declaraba que la cerró el plan 11 mientras el cuerpo la seguía
listando—. Las dos son la misma lección que el documento ya tenía escrita para otra cosa: **dos
frases del mismo documento que no se leen la una a la otra es la forma más barata de mentir.**

**Lo más incómodo, y lo que hay que mirar de frente: `05-datos.md` ya sabía que dos de estas
estaban cerradas.** Su sección del plan 11 se titula *«`CampaignMember.role` deja de ser
inmutable (ficha D2)»* y describe el `PATCH` entero, con su `409` de último DM; y su §3 dice, con
esas palabras, *«la ficha **D9**, ya cerrada»*. **Mientras `06-pendientes.md` las listaba como P1 y
P3 abiertas.** No hizo falta ir al código para desmentirlas: bastaba con leer dos documentos del
mismo directorio uno al lado del otro. El barrido de rutas y de líneas que `pnpm check:docs` hace
no puede ver esto, y **una ficha cerrada en un documento y abierta en otro es la forma de deriva
más cara que tiene este repositorio**, porque las dos frases están bien escritas y las dos citan
código real.

*(Y `05-datos.md` no sale limpio: el párrafo que declara `D9` cerrada seguía diciendo, dos líneas
después y con un «esto sí es cierto hoy» delante, que no hay `features/notifications` ni pantalla
de estado del mundo. Las dos existen. Corregido el mismo día.)*

## Lo que este barrido NO hizo, para que nadie lo lea como una auditoría completa

Se comprobó lo mecánico: rutas, símbolos, barridos y citas de línea. **No se re-midió** lo que
depende de algo fuera del árbol —el nombre en español de las cuatro armas contra el PDF oficial
(`I1`), la restauración de una copia (`D5` del despliegue), `TRUST_PROXY` en Coolify (`D7` del
despliegue), el servicio de correo (`D8` del despliegue), el censo del `docker-compose.prod.yml`
(`A3`)— ni lo que pide una medición propia en vez de una lectura: el coste del motor dentro de la
petición (`H8`) y el gasto real de peticiones de una sesión (`R1`).

**Y una ficha se dio por no medida y luego sí se midió, que es la corrección que este fichero
debe llevar dentro.** La primera versión de esta cabecera decía que `D5` del contraste (raza,
clase y biografía en la lista de personajes) *«se leyó a medias y no se cierra»*, porque lo
medido había sido la fila de **fichas del mundo**, que no es la de personajes. Al ir a corregir la
cita desplazada de `D5` se midió la fila que de verdad le corresponde, y estaba cerrada: su
sección va abajo. **Se conserva dicho** porque una cabecera de archivo que afirma no haber medido
algo que sí se midió es la misma clase de mentira que las dieciocho de abajo, solo que recién
nacida.

---

## D1 — «Cuenta sin pantalla»

Texto original, fila de la tabla de la *Segunda pasada del contraste modelo/API ↔ pantalla
(2026-09-01)*:

> | D1 | **Cuenta sin pantalla** — nombre visible y contraseña solo cambiables por API. **Ya asignado a la tarea 1.18b**, no es hueco nuevo | P1 — **asignado** | `auth/auth.controller.ts:63` y `:83` exponen los dos `PATCH`; `grep -rn "auth/me\|auth/password" apps/web/src` solo encuentra el `GET` de `features/auth/api.ts` |

**Cerrada. Medido el 2026-09-08:** el barrido de su propia evidencia es falso.
`apps/web/src/features/auth/api.ts` llama a los dos `PATCH` —`/auth/me` en su línea 15 y
`/auth/password` en la 27—, y la pantalla existe: `apps/web/src/pages/AccountPage.tsx` monta el
formulario de «Nombre» (línea 115) y el de «Contraseña» (línea 189), con su botón «Guardar
nombre». La tarea 1.18b, a la que la ficha se declaraba asignada, se entregó.

**Lo que sigue abierto y no es esta ficha:** recuperar la contraseña olvidada, que sigue
bloqueada por el servicio de correo — vive en `D8` del bloque de despliegue.

## D2 — «No se puede invitar a un segundo DM, ni ascender a nadie»

Texto original:

> | D2 | **No se puede invitar a un segundo DM, ni ascender a nadie**: el rol de un miembro es inmutable de por vida | P1 | `prisma/schema.prisma:73` declara `role Role @default(PLAYER)` y `invites/invites.service.ts:29` lo respeta al aceptar, pero `invites/invites.service.ts:17-19` crea la invitación **sin `role`**, el controlador no acepta cuerpo, y no existe ningún `PATCH .../members/:userId` |

**Cerrada. Medido el 2026-09-08:** existe. `apps/api/src/members/members.controller.ts:19` es un
`@Patch(":userId")` que llama a `changeRole`, y su propio comentario lo dice: *«La ruta que
faltaba (plan 11, D2)»*. La regla de quién puede cambiar un rol vive en
`MembershipService.changeRole`, que es su dueño único, y `members.service.ts` escribe además un
suceso con visibilidad `PLAYERS` —quién dirige la mesa no es un secreto del DM.

**Y con ella se cae el modo de fallo que la ficha construía con D1**: «si esa cuenta se pierde la
campaña queda huérfana para siempre» dependía de que nadie pudiera ascender a nadie.

## D3 — «Una invitación no se puede listar ni revocar»

Texto original:

> | D3 | **Una invitación no se puede listar ni revocar**: se generan a ciegas y valen para siempre | P1 | `schema.prisma:74-75` escribe `createdAt`/`usedAt` y ninguna pantalla los lee; `invites/invites.controller.ts` tiene exactamente dos rutas (ni `GET` de lista ni `DELETE`); `features/invites/InvitePanel.tsx` solo muestra el último enlace, y solo hasta que se recargue |

**Cerrada. Medido el 2026-09-08:** `apps/api/src/invites/invites.controller.ts` tiene **cuatro**
rutas, no dos: el `@Get("campaigns/:id/invites")` de su línea 26 y el `@Delete("invites/:id")` de
la 35 son precisamente las dos que la ficha declaraba ausentes.

**Esta es la que el documento se contradecía a sí mismo.** La cabecera de `06-pendientes.md`, en
el párrafo que desambigua la colisión del identificador `D3`, ya decía: *«Este documento, más
abajo: una invitación no se puede listar ni revocar — la cerró el plan 11, que la llamó `D3b`»*.
La cabecera lo sabía y el cuerpo la seguía listando como P1 abierta.

## J8 — la misma, vista desde la silla del DM

Texto original, fila de la tabla *Mesa de agentes del 2026-09-02*:

> | **J8** | **La invitación es de un solo uso y no se pueden listar ni revocar**: el DM emite códigos a ciegas | Abierto. Un `GET /campaigns/:id/invites` y un estado de la invitación |

**Cerrada por lo mismo que `D3`**, y se archiva con ella: el `GET` que pedía existe. Que la
invitación siga siendo de un solo uso **no se cierra aquí** — eso es `A3-invitaciones` (usos
máximos, caducidad y revocación), que sigue abierta y es una decisión de producto, no este hueco.

## D5 — «Raza, clase y biografía se editan y no salen en la lista de personajes»

Texto original:

> | D5 | **Raza, clase y biografía se editan y no salen en la lista de personajes** | P2 | `schema.prisma:141-144` los guarda, `features/characters/CharacterEditor.tsx` los edita, y la fila (`pages/CampaignDetailPage.tsx:284-285`) pinta nombre y nivel. Relacionado: `GET .../characters/:id` y `GET .../sessions/:id` no los llama nadie, porque el modal de edición se siembra desde el objeto de la lista — no es un fallo, es no tener vista de detalle |

**Cerrada. Medido el 2026-09-08**, y las dos citas de la ficha apuntaban a otra cosa:
`pages/CampaignDetailPage.tsx:284-285` ya no es la fila de personajes —ahí vive hoy código del
filtro de fichas del mundo—, así que la evidencia no señalaba lo que decía señalar.

- **La fila sí pinta raza y clase**, a través de `descriptorDePersonaje`
  (`apps/web/src/features/characters/descriptor.ts`), que devuelve «raza · clase» y prefiere la
  subraza cuando existe *«porque en la mesa nadie dice “elfo” de un elfo alto: dice “elfo alto”»*.
  La fila la imprime en `apps/web/src/pages/CampaignDetailPage.tsx:555`, y el comentario de su
  línea 552 nombra el motivo: **«una fila de personaje que dice solo un nombre y un nivel»** era
  el defecto del reseño del 2026-09-02.
- **Y la vista de detalle existe**, que era la otra mitad («no es un fallo, es no tener vista de
  detalle»): `apps/web/src/pages/CharacterDetailPage.tsx`, que además edita la biografía en sitio.

**La biografía sigue sin salir en la fila, y eso no se cuenta como hueco:** una fila de lista con
la biografía dentro no es lo que la ficha pedía, y la pantalla donde se lee ya existe.

## D8 — «Ninguna pantalla muestra ninguna fecha»

Texto original:

> | D8 | **Ninguna pantalla muestra ninguna fecha**, comentarios incluidos | P3 | `grep -rn "createdAt" apps/web/src --include=*.tsx` fuera de comprobaciones: **cero**. `features/comments/CommentThread.tsx` pinta autor y cuerpo, sin marca de tiempo |

**Cerrada, y ya estaba declarada falsa dentro de este mismo documento.** La ficha *«Dos fichas de
este documento mienten con un barrido citado dentro»* (2026-09-04) la nombró y la desmintió, y
aun así se quedó en la tabla con su «cero» dentro. **Medido el 2026-09-08:** `createdAt` da
**ciento cincuenta y ocho** aciertos en `apps/web/src`.

Se archiva por eso y no solo por ser falsa: **una ficha a la que otra ficha del mismo fichero ya
llamó mentirosa y que sobrevive dos tandas más** dice algo sobre el documento, no sobre el
código. Corregir la frase no basta si la fila se queda.

## E3 — «`grep maxLength apps/web/src`: cero»

Texto original:

> | E3 | **Diez campos con límite en el servidor que la pantalla no anuncia**, y el error vuelve crudo y en inglés | P2 | `grep -rn "maxLength" apps/web/src`: **cero**; el único límite en cliente es `min`/`max` del nivel (`features/characters/CharacterEditor.tsx:151-152`). Los límites reales viven en `packages/shared/src` (`campaign.schema.ts`, `entity.schema.ts`, `session.schema.ts`, `character.schema.ts`) |

**Cerrada por las dos mitades. Medido el 2026-09-08:** `maxLength` da **cuarenta y cinco**
aciertos en `apps/web/src` —la ficha correctora del 2026-09-04 contó treinta y siete, así que
siguió subiendo—, y la segunda mitad («el error vuelve crudo y en inglés») la cierra
`apps/api/src/common/validation-errors.ts`, que traduce los problemas de Zod al español y está
cableado en `zod-validation.pipe.ts`. Ver la ficha `J9` de abajo, que es la misma mitad vista
desde la mesa.

## D9 (del contraste) — «seis emisiones de evento sin un solo oyente»

Texto original:

> | D9 | **Seis emisiones de evento sin un solo oyente** — andamiaje futuro, no afecta al usuario | P3 | `campaigns/campaigns.service.ts`, `entities/entities.service.ts` e `invites/invites.service.ts` emiten por `EventEmitter2`; `grep -rn "OnEvent" apps/api/src`: **cero** |

**Cerrada. Medido el 2026-09-08:** hay **cinco** `@OnEvent` reales. Cuatro en
`apps/api/src/notifications/notifications.service.ts` —`campaign.member_joined` en su línea 99,
`entity.created` en la 134, `comment.added` en la 183 y `session.scheduled` en la 232— y uno en
`apps/api/src/rules-engine/game-event-bridge.ts:28`, que es `game_event.recorded`.

O sea que las emisiones que la ficha llamaba andamiaje son justo el cableado de la bandeja de
avisos y del puente del motor de reglas.

## E2 — «los enlaces del mundo no se pueden recorrer, y son de un solo sentido»

Texto original:

> | E2 | **Los enlaces del mundo no se pueden recorrer, y son de un solo sentido** | P1 | `features/links/LinksPanel.tsx` pinta el destino como **texto plano**, no como enlace, así que ver una relación no lleva a ella; y `links/links.service.ts:49` consulta `where: { fromId: entityId }`, así que **no hay enlaces entrantes** — ninguna ficha sabe quién la menciona. **La tercera parte de este hallazgo se cerró el 2026-09-02**: el panel ya no vive dentro del editor, sino en la página de lectura de la ficha |

Y el párrafo que la acompañaba, en *«Lo que estas líneas significan en una mesa real»*:

> - **Preparando el mundo, no puede recorrer los enlaces que acaba de crear** (E2). Es el
>   hallazgo más importante de la pasada y es de dirección inversa: la pantalla **ofrece** una
>   wiki de entidades enlazadas y **no deja andar por ella**. Es literalmente lo que el paso 2 de
>   [09-jugar.md](../09-jugar.md) llama *"el valor de la herramienta"*.
>   Y como no hay enlaces entrantes, la ficha del NPC no sabe en qué misiones sale, que es la
>   forma en que se pregunta de verdad.

**Cerrada por las tres partes. Medido el 2026-09-08:**

- **El destino es navegable.** `apps/web/src/features/links/LinksPanel.tsx` importa `Link` de
  `react-router-dom` y su tarjeta pinta el destino como un `Link` hacia
  `/campaigns/:campaignId/entidades/:toId` (línea 200).
- **Los enlaces entrantes existen.** `apps/api/src/links/links.service.ts` consulta las dos
  direcciones: `where: { fromId: entityId }` en su línea 127 y `where: { toId: entityId }` en la
  131. El comentario de la 109 explica el caso que lo motivó —*«quien abría la Torre Gris no veía
  que Corvin vivía en ella»*—, que es literalmente el ejemplo de la ficha.
- **Y existe la página de detalle con URL propia**, que la ficha declaraba como su arreglo caro y
  del que decía que los otros dos puntos dependían: `apps/web/src/pages/EntityDetailPage.tsx`,
  con sus hermanas `CharacterDetailPage.tsx` y `SessionDetailPage.tsx`.

**La lección concreta:** la ficha describía el arreglo caro con precisión y no se volvió a leer el
día que ese arreglo se entregó. El coste declarado de la sección —*«E2 es el caro, porque su
arreglo de verdad es una página de detalle de entidad con URL propia»*— era correcto, y era la
señal de que había que releerla.

## D9 (del cierre de 2A) — «cinco módulos de la API no tienen pantalla»

Texto original, fila de la tabla *Cierre de la fase 2A*:

> | **D9** | **Cinco módulos de la API no tienen pantalla**: log de partida, listado de tiradas, avisos, marcas y conjuntos del mundo, y el estado de sesión (empezar y cerrar) | `docs/01-arquitectura.md` los describe como si el producto los ofreciera; hoy se usan **solo con un cliente HTTP**. Para la partida de la semana que viene lo que más se echa en falta es **empezar y cerrar sesión desde la pantalla**: sin eso, todos los sucesos se escriben fuera de sesión |

**Cerrada. Medido el 2026-09-08**, módulo a módulo de los cinco que nombra:

| Módulo | Pantalla |
|---|---|
| Avisos | `apps/web/src/features/notifications/BandejaDeAvisos.tsx`, montada en `apps/web/src/ui/AppShell.tsx:18`, con su recorrido de navegador en `apps/web/e2e/bandeja-de-avisos.spec.ts` |
| Listado de tiradas | `apps/web/src/features/rolls/` |
| Marcas y conjuntos del mundo | `apps/web/src/features/world-state/` |
| Estado de sesión (empezar y cerrar) | `apps/web/src/features/sessions/ControlesDeSesion.tsx` y `BandaDeMesa.tsx` |
| Log de partida | Sin carpeta propia, y **aun así no es un hueco**: lo pinta el hilo de la mesa, `apps/web/src/features/sessions/hilo/` |

**Esta era la que vivía por duplicado.** La fila de `notifications` de `01-arquitectura.md` decía
*«Ojo: es API sin pantalla — esta fila prometía «bandeja de avisos» y no hay ninguna, porque nada
de `apps/web/src` llama a estos endpoints»*, y remitía a una ficha `A1-avisos` que **ya no existe
en `06-pendientes.md`**: solo sobrevive su identificador, citado como ejemplo en el párrafo de
reglas de nombres. Un documento de estado apuntando a una ficha que no está, para afirmar un hueco
que está cerrado. Corregida el mismo día que esta.

## J9 — «los errores de Zod salen crudos al usuario»

Texto original:

> | **J9** | **Los errores de Zod salen crudos al usuario** (`fieldErrors {"kind":["Required"]}`, «Required» en inglés) | Abierto. Un filtro que traduzca el error de validación a un mensaje de dominio |

**Cerrada. Medido el 2026-09-08:** `apps/api/src/common/validation-errors.ts` existe, traduce al
español y lo consume `zod-validation.pipe.ts` a través de `buildValidationErrorBody`. Y la
cabecera de ese módulo **cita literalmente el ejemplo de esta ficha** como lo que salía *antes*:
el mismo `fieldErrors` con `"kind": ["Required"]`, con su diagnóstico —*«tres fallos a la vez: en
inglés, en la jerga de la librería, y el segundo sin decir qué valores acepta»*— y el caso real
que lo motivó: un DM probó `{"type":"LONG"}` porque `type` era lo que parecía, y la clave era
`kind`.

O sea que quien arregló el hueco tenía la ficha delante, la citó en el código y no volvió a
cerrarla en el documento. **El arreglo llevaba la evidencia dentro y la ficha se quedó abierta
igual.**

Y lleva además una decisión que conviene no re-litigar, escrita en ese mismo módulo: el nombre del
campo se cita **literal y entrecomillado** —«kind», tal cual lo espera la API— y el español pone
solo la gramática alrededor. Deliberadamente **no** hay diccionario campo→etiqueta en esa capa:
sería una segunda fuente de verdad sobre la forma de los datos.

## U8-glifos — «seis glifos de fuente incumplen la regla de iconos dibujados»

Texto original:

> | **U8-glifos** | **Seis glifos de fuente incumplen la regla de iconos dibujados**, incluido el `✓` que la propia regla pone como ejemplo prohibido | En `InvitePanel`, `AccountPage`, `LoginPage`, `Field`, `Traza` y `Ornament`. O se dibujan como el resto, o `docs/04-convenciones.md` amplía la excepción por escrito — que es lo que la regla exige. Lo que no puede quedarse es la regla conviviendo con su propio contraejemplo |

**Cerrada, y con las dos salidas que la ficha exigía tomadas. Medido el 2026-09-08:** un barrido
de las seis marcas de verificación y estrellas en toda `apps/web/src`, fuera de las pruebas, da
**un solo acierto**, y es el comentario de `apps/web/src/features/rules/iconos.tsx` que prohíbe
usarlas. Cero en los seis ficheros que la ficha nombra.

Y la ficha pedía *«o se dibujan como el resto, o `04-convenciones.md` amplía la excepción por
escrito»*. **Se hizo lo uno y lo otro**, y está en `docs/04-convenciones.md`:

- Se dibujaron, y además existe el control que la propia regla decía que faltaba —*«escribir la
  regla no la aplica, hace falta la prueba»*—: `apps/web/src/ui/__tests__/Iconos.test.tsx` echa
  dos redes, un barrido del **código fuente** de esos ficheros contra la lista de glifos
  prohibidos y el **DOM pintado**. De ahí que los comentarios de esos ficheros nombren los glifos
  **con palabras** en vez de escribirlos.
- Y la excepción está declarada: los cinco glifos de `ui/Badge.tsx` (`○ ◐ ◈ ◆ ●`), que son
  geometría pura, se alinean con el texto y distinguen los niveles de visibilidad **sin depender
  del color**.

## B3 — «no se puede cambiar el nombre visible ni la contraseña»

Texto original, fila de la tabla de la *Tarea 1.17*:

> | B3 | **No se puede cambiar el nombre visible ni la contraseña**, ni recuperarla si se olvida — va con la **tarea 1.18** (seguridad), no con 1.17 | API + web |

**Cerrada en sus dos primeras mitades, por la misma evidencia que `D1`.** La tercera —recuperarla
si se olvida— **no se cierra y no se pierde**: sigue viva en `D8` del bloque de despliegue, que es
donde vive por depender de un servicio de correo que no existe.

## L2-traza-daño — «no tiene pantalla ni vocabulario en español»

Texto original, entero:

> ### L2-traza-dano — la traza de resistencia (2.5.1) no tiene pantalla ni vocabulario en español (2026-09-03)
>
> > **Lleva sufijo porque `L2` ya existía** —«arco y radio de visión», más arriba en este mismo
> > fichero—, y la regla de nombres de arriba dice que manda la aparición más temprana. Corregido
> > en la revisión de cierre del 2026-09-04, junto con los dos errores de abajo.
>
> **Abierto, y a propósito: 2.5.1 es servidor.** `apps/api/src/character-state/damage/apply-damage-modifiers.ts`
> devuelve `labelKey`s nuevas (`damage.raw`, `damage.modifier.resist`, `.vulnerable`, `.immune`)
> que hoy no tienen traducción en `apps/web/src/features/character-sheet/vocabulario.ts` ni en
> ningún otro sitio de la web — si algo las pinta tal cual, sale la clave en inglés. (`.cancelled`
> **ya no existe**: la revisión de cierre encontró que resistencia y vulnerabilidad no se cancelan,
> se encadenan.)
>
> **Y hay un dato que esta ficha se dejaba, que es el que de verdad importa al arreglarla:** la
> traducción de los trece `DamageType` ya existe **tres veces**, las tres con el mismo nombre
> `NOMBRE_TIPO_DANO`:
>
> - `apps/web/src/features/campaign-items/vocabulario.ts:81`
> - `apps/web/src/features/character-sheet/vocabulario.ts:77`
> - `apps/web/src/features/inventory/vocabulario.ts:57`
>
> Eso contradice la regla vinculante de que **la forma legible se escribe una sola vez por
> dominio**, así que la tarea no es «añadir una cuarta»: es dejar una y que las otras la importen.
> (La revisión de cierre contó dos y se dejó la de `character-sheet`; se comprobó con un barrido
> antes de escribir esta línea, que es lo que la regla de «evidencia antes que afirmación» pide
> incluso de un hallazgo de revisión.)
>
> La primera versión de esta ficha citaba un símbolo inventado —«`nombreDeTipoDeDaño` o como se
> llame en esa capa»—, que es exactamente el registro que `04-convenciones.md` prohíbe: un nombre
> con cobertura manda a quien lo lea a buscar algo que no existe.
>
> Entra con la pantalla del daño aplicado (probablemente parte de 2.5.4 o de la pantalla del
> encuentro de 2.5.6), no antes.

**Cerrada por las dos mitades. Medido el 2026-09-08:**

- **Las cuatro claves tienen traducción**, en `apps/web/src/features/character-sheet/vocabulario.ts`:
  `damage.raw` en su línea 504, `damage.modifier.immune` en la 505, `damage.modifier.resist` en la
  506 y `damage.modifier.vulnerable` en la 507. El comentario que las encabeza (línea 500) cita el
  fichero del servidor que las emite, así que el arreglo se hizo con la ficha delante.
- **`NOMBRE_TIPO_DANO` ya no existe tres veces, sino una**: vive en
  `apps/web/src/dominio/dano.ts`, con su prueba al lado. Las tres rutas de
  `features/*/vocabulario.ts` que la ficha enumera ya no la tienen. La tarea que pedía —«dejar una
  y que las otras la importen»— se hizo, y además se hizo mejor: no se quedó en una de las tres,
  subió a `dominio/`.

**Es la ficha con más citas de línea de todas las que se archivan, y las tres estaban obsoletas.**
La ficha razonaba bien, medía bien y citaba bien el día que se escribió. Nada de eso la salvó.

## «No hay prueba de rechazo por validación en personajes»

Texto original, dentro de *P2 — Ruta de mejora del nivel*:

> **No hay prueba de rechazo por validación** en personajes (`level > 20` devuelve 400 y nadie
> lo comprueba). Detectado en la tarea 1.9.

**Cerrada. Medido el 2026-09-08:** `apps/api/src/level-up/level-up.service.spec.ts` lo comprueba
dos veces, y sus nombres lo dicen: *«el nivel 20 es el techo: el previo se rechaza con 400, no con
un nivel 21»* (línea 218) y *«el nivel 20 es el techo: subir se rechaza con 400, no con un nivel
21»* (línea 306). El límite que fijan está en `packages/shared/src/character.schema.ts:38`
(`.min(1).max(20)`), y `apps/api/src/rules/catalog/guards.spec.ts` cubre además el motivo por el
que importa: sin ese techo, el nivel 21 daba bonificador de competencia +7, fuera de la tabla.

## «`ENTITY_LINKED` no se escribe nunca»

Texto original, dentro de *P3 · Deuda menor abierta por el reseño de la mesa (2026-09-04)*:

> - **`ENTITY_LINKED` no se escribe nunca**: enlazar dos fichas no deja rastro ni dispara una regla.

**Cerrada. Medido el 2026-09-08:** `apps/api/src/links/links.service.ts:94` lo escribe con los dos
extremos, dentro de la misma transacción que crea el enlace, y el comentario de su línea 73
explica que el motor sabía evaluarlo desde que existe. Lo fija su prueba:
`links.service.spec.ts` trae *«create() records ENTITY_LINKED with both ends»*, y el
encadenamiento está cubierto por `game-event-triggers.spec.ts`.

## «`DISPARADORES_SIN_MOTOR` está duplicado entre web y API»

Texto original, misma lista:

> - **`DISPARADORES_SIN_MOTOR` está duplicado** entre web y API. Caben en `packages/shared/src`; se
>   duplicaron **por una frontera de trabajo, no por una imposibilidad**.

**Cerrada, y su cierre estaba escrito dentro del propio código. Medido el 2026-09-08:** la lista
vive **una sola vez**, en `packages/shared/src/rules-engine.schema.ts:103`. La web la reexporta
(`apps/web/src/features/rules/vocabulario.ts:81`) y en la API solo queda el nombre viejo dentro de
un comentario. Y el comentario que la encabeza en la forma compartida cuenta la historia entera:

> Vive aquí, en la forma compartida, y no en cada lado: hasta la Ola 3 la misma lista estaba
> escrita dos veces —`DISPARADORES_SIN_MOTOR` en la web y `UNREACHABLE_TRIGGER_KINDS` en la
> API—, y dos listas que tienen que coincidir divergen en cuanto una se toca sin la otra. **Es la
> ficha C6-1, y su cierre escrito era exactamente esto.**

O sea: el código nombra la ficha que cierra, dice que la cierra, y la ficha siguió abierta en otra
sección del mismo documento con otro identificador. **Dos fichas para el mismo hueco, una cerrada
y otra no**, que es la colisión de identificadores de la cabecera vista por su lado caro.

## «`houseTablesEnabled` no tiene `GET`»

Texto original, misma lista:

> - **`houseTablesEnabled` no tiene `GET`**: la pantalla se ve apagada aunque esté encendido.

**Cerrada. Medido el 2026-09-08:** `apps/api/src/dm-tables/dm-tables.service.ts:107` lo devuelve
dentro de la respuesta de `list()`, que es lo que sirve el `@Get()` de `dm-tables.controller.ts`.
Y el comentario que lo acompaña razona las dos decisiones que lo colocan ahí: va dentro de `list`
y no en un endpoint aparte **porque nadie necesita lo uno sin lo otro**, y **lo ve la mesa entera,
no solo el DM** —si una campaña juega con tabla de pifias, sus jugadores tienen derecho a saberlo
antes de sacar un 1.
