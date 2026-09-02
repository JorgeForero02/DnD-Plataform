# La primera partida

> **Aplazado por decisión del autor (2026-09-01):** no se juega hasta tener al menos el
> tablero 2D (fase 3), quizá tampoco antes de las reglas (fase 2). Este documento queda listo
> para cuando toque; el riesgo de construir sin realimentación real está declarado en
> [06-pendientes.md](./06-pendientes.md).

**Este documento es la puerta de salida de la fase 1.** El plan tiene una regla dura: no se
empieza la fase N+1 hasta usar la N de verdad. La fase 1 está construida y verificada, pero
"verificada" y "usada" no son lo mismo — las cuatro revisiones de la fase encontraron fallos
que ninguna prueba había visto, y una mesa real encuentra otra clase distinta.

Aquí va cómo montar esa sesión, qué esperar, y qué anotar mientras juegas.

## Cómo levantarlo

```bash
docker compose up -d                            # Postgres 16 en :5432
pnpm install                                    # compila @dnd/shared y conecta el gancho
cp .env.example apps/api/.env                   # y edita JWT_SECRET (>= 32 caracteres)
pnpm --filter @dnd/api exec prisma migrate deploy
pnpm dev:api                                    # API en :3000
pnpm dev:web                                    # web en :5173
```

> **`JWT_SECRET` es obligatoria desde la tarea 1.18a**, y de **32 caracteres como mínimo**: sin
> ella **la API se niega a arrancar** (`common/jwt-secret.ts`), y ya no hay valor por defecto
> en el código que te salve. Si vienes con un `.env` viejo, esto es lo primero que te va a
> fallar, y falla **al levantar**, no al usar la aplicación. Genera uno con
> `openssl rand -hex 32`.

Detalle de variables y gotchas en [02-entorno.md](./02-entorno.md).

## Cómo juegan tus jugadores

**Corre en tu máquina, así que hoy solo se juega presencialmente**, con los jugadores en la
misma red apuntando a la IP de tu PC (`http://<tu-ip>:5173`), o mirando todos tu pantalla.
No hay despliegue: no hay VPS asignado, y esa parte de la tarea 1.14 quedó diferida a
propósito. Ver [03-despliegue.md](./03-despliegue.md).

Si quieres que entren desde sus casas, el despliegue **sí** es bloqueante y es una decisión
aparte, no un detalle de configuración.

## El guion, paso a paso

1. **Regístrate** y crea la campaña. Quien la crea es su DM.
2. **Prepara el mundo antes de la sesión**: entidades por tipo (NPC, lugar, misión, facción,
   objeto, evento, documento), con etiquetas, enlaces entre ellas y su visibilidad.
   **Ahí está el valor real de la herramienta**: que el lugar enlace con el NPC que lo
   habita y con la misión que lo cruza.
3. **Invita a cada jugador.** Pestaña Resumen → generar enlace → copiar → mandárselo.
   **Un enlace vale para una persona**: para cuatro jugadores, cuatro enlaces. Generar uno
   nuevo **no anula el anterior**, y no hay forma de revocarlo.
   **No abras tu propio enlace para "comprobar que va"**: unirte lo consume, y desde 1.14-fix
   la pantalla te avisa antes de que pulses.
4. **Cada jugador crea su personaje** desde la pestaña Personajes.
5. **Durante la partida**, ve creando la sesión con sus notas y revelando entidades:
   el movimiento típico es pasar algo de `DM_ONLY` a `PLAYERS` cuando la mesa lo descubre.

## Los cinco niveles de visibilidad, en la práctica

| Nivel | Quién lo ve |
|---|---|
| `PUBLIC` | cualquiera con acceso a la campaña |
| `PLAYERS` | los miembros |
| `SPECIFIC_PLAYERS` | solo los jugadores marcados (**solo en entidades**) |
| `OWNER_DM` | el creador y el DM (**solo en entidades y personajes**) |
| `DM_ONLY` | solo el DM |

**Dos recortes deliberados, explicados en [05-datos.md](./05-datos.md):** en sesiones y
personajes no hay concesiones por jugador, así que el selector no ofrece `SPECIFIC_PLAYERS`;
y en sesiones tampoco ofrece `OWNER_DM`, porque sin creador propio colapsa en "solo el DM" y
prometería algo que el modelo no da.

**El secreto por defecto es real:** una entidad nace `DM_ONLY`. Si un jugador crea una,
el formulario arranca en `OWNER_DM` para que no la pierda de vista al instante.

## Lo que NO vas a poder hacer, y conviene saber antes de sentarte

Esto no son sorpresas: está todo en [06-pendientes.md](./06-pendientes.md), y lo repito aquí
porque es lo que se nota jugando.

- **No puedes seguir los enlaces que has creado** (E2). Es lo más importante de esta lista,
  porque es exactamente la capacidad que el paso 2 de arriba llama *"el valor real de la
  herramienta"*: puedes **declarar** que el lugar enlaza con el NPC, pero el enlace se pinta
  como texto plano y no lleva a ninguna parte, y **no hay enlaces entrantes** — la ficha del
  NPC no sabe en qué misiones sale. Para ir de una entidad a otra: cerrar el modal, cambiar de
  pestaña, buscarla en la lista y abrirla.
- **No puedes tener un segundo DM** (D2). Toda invitación entra como jugador y el rol de un
  miembro no se puede cambiar después. Si la mesa tiene dos narradores, uno de los dos ve la
  campaña como jugador toda la partida. Y como tampoco se recupera una contraseña olvidada, si
  se pierde la cuenta del DM **la campaña se queda sin nadie que mande**.
- **No puedes ver qué invitaciones has mandado** (D3), ni cuáles se han usado, ni revocar
  ninguna: el token no caduca en el servidor, y la pantalla solo te enseña el último enlace
  generado hasta que recargues. Cópialos a un sitio seguro según los generas.
- **La fecha de una sesión no se ve en la lista** (D4): la lista pinta título y visibilidad, y
  viene ordenada por cuándo se creó la sesión, no por cuándo se juega. Para responder *"¿cuándo
  jugamos?"* hay que abrirlas una a una.
- **No se puede quitar la fecha de una sesión** una vez puesta.
- **En la lista de personajes solo se ven nombre y nivel** (D5): raza, clase y biografía están
  guardadas, pero hay que abrir cada ficha para verlas.
- **Nada de adjuntos ni imágenes**: llegan en la fase 3, con el almacenamiento.
- **Nada de mapas, tiradas, tiempo real ni ficha con reglas**: fases 2 a 5.

## Qué anotar mientras juegas

El objetivo de la sesión **no** es que salga perfecta: es descubrir qué falta de verdad.
Apunta, con la mano o donde sea:

1. **Qué intentaste hacer y no pudiste.** Literalmente eso; es lo que decide el plan de la
   fase 2.
2. **Qué visibilidad te equivocaste al poner**, y si la pantalla te ayudó o te confundió.
3. **Qué se te hizo lento**: demasiados clics para revelar una entidad, pestañas de más,
   buscar algo y no encontrarlo.
4. **Qué vio un jugador que no debía ver** — o al revés, qué no vio y sí debía. Esto es lo
   más importante de todo: es la promesa central del producto.
5. **Qué no volviste a abrir** después de crearlo. Sobra.

Eso va a `06-pendientes.md` al terminar, y de ahí sale el plan de la fase 2 (que hoy solo
tiene alcance, a propósito).

## Y después

La fase 2 es la ficha de personaje con motor de reglas. **No se empieza hasta que esta
sesión haya ocurrido**, y su plan se escribe con lo que aprendas aquí, no antes. Alcance en
[el plan maestro](./superpowers/plans/2026-07-02-plataforma-dnd.md).
