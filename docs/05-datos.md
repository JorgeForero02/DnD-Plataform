# Datos

PostgreSQL 16 vía Prisma. Esquema: `apps/api/prisma/schema.prisma`.
**Las migraciones no se listan aquí:** la lista es `apps/api/prisma/migrations/`, que es la
única que no puede quedarse vieja. Esta línea enumeraba dos cuando ya había seis, y el propio
documento citaba más abajo dos de las que faltaban.
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

Campaign ──> CampaignFlag         (marcas con nombre)
         ──> CampaignSet ──> CampaignSetMember
         ──> Rule ──> RuleTrace   (el motor de eventos; `Campaign.rulesEnabled` lo apaga entero)

Notification (por usuario; `campaignId` suelto, sin clave foránea)

Entity ──> EntityLink (from → to, label; único por from+to+label)
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
`Comment`. **`Session` no tiene ninguna tabla colgando; `Character` sí desde 2A.8 y 2A.12**:
borrar un personaje se lleva sus `CharacterResource` y sus `CharacterCondition`, las dos en
cascada. **`GameEvent` cuelga de la campaña, no de la
sesión**, y su `sessionId` es una columna suelta sin clave foránea: borrar una sesión **no**
borra su historia, que es lo que se quiere de un log.

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

**2 · Un log append-only al lado, `GameEvent`.** Campaña, sesión (nulable), actor, tipo,
sujeto, `payload Json`, visibilidad y fecha, con tres índices por los tres caminos de consulta.

**La línea que impide que ese `Json` sea la trampa de `Entity.body`: el log nunca es la fuente
del estado.** El estado se lee de sus columnas; el log cuenta *qué lo cambió*. De ahí la regla,
escrita en [04-convenciones](./04-convenciones.md) y no dejada implícita: **todo lo que haga
falta consultar o filtrar es una columna real**, y si algún día hace falta consultar por un
campo del `payload`, ese campo **se promociona a columna**. No se consulta dentro del JSON.

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
desde 2A.10** (`apps/web/src/features/character-sheet/`). Lo que **no** tiene pantalla es el
estado de sesión, el log, los avisos, las marcas y conjuntos: existen por HTTP y se prueban por
e2e, pero hoy solo se usan con un cliente HTTP (ficha **D9** de
[06-pendientes.md](./06-pendientes.md)). En la práctica, eso significa que **todos los sucesos
se escriben hoy fuera de sesión**, porque no hay botón que la empiece.

**4 · `Character.overrides`** (2026-09-02, migración `character_manual_overrides`). Anulaciones
manuales del DM sobre valores **derivados**: `{ "ac": 18 }`. Es la válvula de escape de «se
guarda lo decidido, se calcula lo derivado» — el catálogo del SRD no cubre un objeto mágico, un
don ni una regla de la casa, y sin esto la única salida era mentirle a la ficha subiendo una
característica hasta que cuadrara el número. **Se aplica como un `override` del motor**, así que
sale en la traza con su delta y el jugador ve de dónde viene. Solo el DM la escribe: una
anulación que el dueño puede ponerse no es una anulación, es un campo libre. El tipo de suceso
`MANUAL_OVERRIDE_SET` existía desde 2A.5 **sin columna que lo produjera**; ahora la tiene.

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
  `campaign.deleted`. Probado con recuentos reales de **ocho** tablas, no solo por el código
  de estado — y **cuatro de las que hoy cascadean desde `Campaign` no están en ese recuento**
  (`gameEvent`, `campaignFlag`, `campaignSet`, `rule`), que es deuda anotada en
  [06-pendientes](./06-pendientes.md) — ver [08-pruebas.md](./08-pruebas.md).
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
- **La consecuencia real** es que cambiar la contraseña y volver a entrar dentro del mismo
  segundo puede rechazar el token recién emitido. Se cierra el día que `PATCH /auth/password`
  devuelva un token nuevo en su respuesta; está anotado.

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

Más el `isAdmin` del sistema, que ve todo — existe en el modelo (`User.isAdmin`, por defecto
`false`) y `canView` lo respeta, pero **ningún endpoint lo pone a `true`** hoy: no hay forma de
convertirse en admin desde la API. Es un límite conocido, no un mecanismo activo.

**`PUBLIC` y `PLAYERS` producen hoy el mismo conjunto de espectadores.** `canView`
(`visibility.ts:21-23`) devuelve `true` para ambos sin distinguirlos, y todo listado exige
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
inicial, cualquier miembro podía crear una entidad — `entities.service.ts:25` deja crear a
cualquier miembro, no solo al DM — que quedaba invisible incluso para su propio creador
(`canView` devuelve `false` en `DM_ONLY` también para quien la creó). Un jugador escribía la
ficha de su contacto, recibía 201 y la entidad desaparecía sin error. `OWNER_DM` no cambia nada
para el DM (`canView` ya devuelve `true` para cualquier DM antes de mirar la visibilidad, así
que `OWNER_DM` y `DM_ONLY` son indistinguibles desde ese lado); solo arregla el caso roto del
jugador. En modo edición se sigue respetando la visibilidad que la entidad ya tenga.

### Límites reales de hoy (MVP, aceptados a conciencia)

- **`Session` y `Character` no tienen `grants` ni `createdById` propio.** Por eso
  `SPECIFIC_PLAYERS` es inerte en los dos. En `Character` se usa `ownerId` como creador, con
  la consecuencia de que **el dueño no ve su propio personaje si lo marca `DM_ONLY`**. En
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
claro, nunca en un log.** No hay datos de menores ni categorías especiales. No hay política
de retención escrita todavía — pendiente antes de que el sistema deje de ser de uso
personal.
