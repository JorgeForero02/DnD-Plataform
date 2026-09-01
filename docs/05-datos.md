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

Todo lo colgado de una campaña se borra en cascada con ella (`onDelete: Cascade`).

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

Más el `isAdmin` del sistema, que ve todo.

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
  `SPECIFIC_PLAYERS` en ellos es inerte, y `OWNER_DM` en una sesión se resuelve como
  "solo DM". En `Character` se usa `ownerId` como creador, con la consecuencia de que
  **el dueño no ve su propio personaje si lo marca `DM_ONLY`**.
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
