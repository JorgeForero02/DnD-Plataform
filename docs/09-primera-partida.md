# La primera partida

> **Aplazado otra vez, y esta vez con criterio, el 2026-09-03.** El autor sitúa la partida de la
> mesa **cuando exista tiempo real** (fase 4): *«el DM y los demás jugadores no jugarán hasta que
> haya una versión verdaderamente jugable con cosas en tiempo real; es incómodo tener que recargar
> la página para cada acción»*. Lo que sí ocurre antes es otra cosa y no la sustituye: **una prueba
> de campo con agentes** al cerrar la fase 2 —dos jugadores, la cuenta del autor como DM— cuya
> ficha está en [06-pendientes.md](./06-pendientes.md). Este documento sigue sirviendo para montar
> la sesión el día que llegue; lo que ya no es cierto es la fecha.
>
> **Lo que decía el 2026-09-02, conservado porque explica el estado de entonces:** hay pruebas de
> juego con el DM **la semana que viene**. El
> aplazamiento del 2026-09-01 —«no se juega hasta el tablero 2D»— queda anulado por esa
> decisión. Lo que sigue vigente es que el tablero no existe: eso es la fase 3.
>
> **Y conviene que conste que la regla se incumplió.** El plan decía «no se empieza la fase N+1
> hasta usar la N de verdad», y la fase 2A se ejecutó entera entre el 1 y el 2 de septiembre sin
> que esta sesión ocurriera. El riesgo que la regla protegía —construir el motor sin
> realimentación de mesa— se ha materializado; la sesión de la semana que viene es ahora la
> primera prueba real de las dos fases a la vez.

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

**Está desplegado en `https://dnd.supportive.pro`**, así que tus jugadores entran desde sus
casas con su cuenta. Ver [03-despliegue.md](./03-despliegue.md).

Levantarlo en local sigue sirviendo, y para probar es lo que conviene: `http://localhost:5173`,
o la IP de tu PC si queréis jugar presencialmente en la misma red.

> Este párrafo decía **«no hay despliegue: no hay VPS asignado»**, y llevaba siendo falso desde
> el 2026-09-02 — enlazando además al documento que lo desmentía. Es el tipo de mentira que más
> daño hace en una guía: la que le dice a alguien que no puede hacer algo que sí puede.

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

## Lo que la herramienta SÍ hace ya, y este documento no contaba (2026-09-03)

**Este fichero se escribió como puerta de salida de la fase 1 y describía una wiki con sesiones.**
Desde entonces han entrado las fases 2A, 2B y 2C enteras, así que la lista de abajo —que sigue
siendo cierta en casi todo— se leía como si la herramienta fuera mucho menos de lo que es. Lo que
hay hoy, en una línea cada cosa:

- **Hoja de 5.ª edición derivada, con traza**: cada número dice de dónde sale. Raza, subraza, clase,
  características, competencias, PG, CA, salvaciones y habilidades.
- **Puntos de golpe, recursos, descansos y condiciones**, con su rastro en la línea de tiempo.
- **Objetos**: catálogo del SRD y objetos propios del DM, inventario con ranuras, manos y
  sintonización, dinero, y el cuadro de ataques — el equipo entra en el motor y sale en la traza.
- **Dados**: pantalla propia con expresión libre, los siete dados, ventaja y desventaja como
  decisión, relanzado, y **el registro de tiradas de la campaña**.
- **Reloj de campaña** en segundos de juego, con ritmo de viaje y marcha forzada.
- **Condiciones con duración** que caducan solas sin desaparecer de la hoja.
- **El DM pide tiradas** y al jugador le aparecen sin recargar.
- **Tablas del DM** (pifias, botín, rumores), apagadas por defecto y dichas como regla de la casa.
- **Motor de reglas** suceso–condición–efecto por campaña, con ensayo en seco y traza.
- **Subida de nivel** con diff propuesto por el servidor.

Lo que **sigue sin existir** es lo de siempre, y es de fases posteriores: mapas, tiempo real,
adjuntos y 3D.

## Lo que NO vas a poder hacer, y conviene saber antes de sentarte

Esto no son sorpresas: está todo en [06-pendientes.md](./06-pendientes.md), y lo repito aquí
porque es lo que se nota jugando.

- ~~**No puedes seguir los enlaces que has creado** (E2)~~ — **YA NO ES CIERTO, y era lo más
  importante de esta lista.** Desde el reseño del 2026-09-02 una ficha tiene su **página de
  lectura**, el enlace se lee como una frase por sus dos lados y **lleva al vecino**; hay prueba de
  navegador que lo recorre (`apps/web/e2e/ficha-lectura.spec.ts`). Se tacha en vez de borrarse
  porque este documento explica también de dónde viene la herramienta.
- **No puedes tener un segundo DM** (D2). Toda invitación entra como jugador y el rol de un
  miembro no se puede cambiar después. Si la mesa tiene dos narradores, uno de los dos ve la
  campaña como jugador toda la partida. Y como tampoco se recupera una contraseña olvidada, si
  se pierde la cuenta del DM **la campaña se queda sin nadie que mande**.
- **No puedes ver qué invitaciones has mandado** (D3), ni cuáles se han usado, ni revocar
  ninguna: el token no caduca en el servidor, y la pantalla solo te enseña el último enlace
  generado hasta que recargues. Cópialos a un sitio seguro según los generas.
- **Las sesiones vienen ordenadas por cuándo se crearon, no por cuándo se juegan** (D4). La
  fecha **sí** se ve en la fila desde el reseño del 2026-09-02 (o «sin fecha» si no la tiene),
  así que ya no hay que abrirlas una a una — pero el orden sigue siendo el de creación, y para
  responder *"¿cuándo jugamos?"* hay que mirarlas todas.
- **No se puede quitar la fecha de una sesión** una vez puesta.
- **De un personaje, la biografía exige abrir su ficha** (D5). Nombre, raza, clase y nivel **sí**
  se ven en la fila desde el reseño del 2026-09-02.
- **Nada de adjuntos ni imágenes**: llegan en la fase 3, con el almacenamiento.
- **Mapas y tiempo real**: fases 3 a 5, y siguen sin existir.
- **El agotamiento llega al motor por dos de sus seis efectos** (C2C-9): velocidad y PG máximos. La
  desventaja de los niveles 1, 3 y 5 **no la calcula nadie**, así que se arbitra en la mesa.
- **«Hasta el próximo descanso largo» no es una duración que la herramienta entienda** (C2C-8): es
  un suceso, y modelarlo como un número sería mentir. Esas condiciones se ponen indefinidas y las
  quita el DM.
- **Tiradas, hoja de 5.ª edición, PG, descansos, condiciones y subida de nivel ya se usan desde
  la pantalla** (2A.10 y 2A.11): la ficha de un personaje monta la hoja calculada con su traza,
  el marcador de PG con deltas, los recursos con sus dos descansos, las condiciones, el botón de
  tirar —con ventaja y desventaja— y las anulaciones del DM.
- **Lo que sigue a mano en la mesa**: inventario, objetos y dinero; el orden de iniciativa y los
  turnos; los puntos de golpe de los PNJ y monstruos; y todo lo de conjuros que no sea el
  contador de espacios. Están todos como huecos con ficha en
  [06-pendientes.md](./06-pendientes.md), no como sorpresas.
- **Empezar y cerrar una sesión no tiene botón todavía**, así que lo que se registre durante la
  partida quedará marcado como fuera de sesión.

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
