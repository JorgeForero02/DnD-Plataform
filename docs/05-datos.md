# Datos

PostgreSQL 16 vía Prisma. Esquema: `apps/api/prisma/schema.prisma`.
Migraciones aplicadas: `20260702170844_init`, `20260702215016_campaign_core`.
Todos los identificadores son `cuid()`.

## Modelo

```
User ──dueño──> Campaign ──> CampaignMember (DM | PLAYER, único por campaña+usuario)
                    │
                    ├──> Invite      (token único, role, usedAt)
                    ├──> Entity      (polimórfica por `type`)
                    ├──> Session
                    └──> Character   (ownerId)

Entity ──> EntityLink (from → to, label; único por from+to+label)
       ──> EntityVisibilityGrant (entidad + usuario; único)
       ──> Comment (authorId, body)
```

**Una sola tabla `Entity` para siete tipos** (`NPC`, `LOCATION`, `QUEST`, `FACTION`,
`OBJECT`, `EVENT`, `DOCUMENT`), con `body Json?` y `tags String[]`. Se eligió polimorfismo
por campo en vez de siete tablas porque la relación wiki (`EntityLink`) tiene que poder unir
cualquier tipo con cualquier tipo; con siete tablas ese enlace sería una tabla de uniones
por par.

Todo lo colgado de una campaña se borra en cascada con ella (`onDelete: Cascade`). Dentro de
una campaña, borrar una `Entity` se lleva también sus `EntityLink` (**en las dos
direcciones**: tanto los que salen de ella como los que otras entidades tienen hacia ella,
porque `from` y `to` tienen ambos `onDelete: Cascade`), sus `EntityVisibilityGrant` y sus
`Comment`. `Session` y `Character` no tienen ninguna tabla colgando de ellos, así que borrar
uno de los dos no se lleva nada más por delante.

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
