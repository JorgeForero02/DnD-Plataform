# Paso 3 en cinco tandas — el orden que manda

> **Escrito el 2026-09-14 por decisión del autor (D-CF-70)**: el
> [plan del paso 3](./2026-09-08-paso-3-el-catalogo-y-los-conjuros-del-personaje.md) creció por
> acumulación —A y C el 8 de septiembre, B colgando fichas viejas, D lo temporal, E y F añadidos el
> 12 tras contrastar con el índice del SRD— y quedó ordenado por **cuándo se pensó cada cosa**, no
> por **qué vive el jugador**: el mago estaba repartido en cuatro bloques y la mesa en dos. Palabras
> del autor: «siento que hay muchas cosas dispersas y que lo único que está bien cuadrado es el
> catálogo».
>
> **Este fichero no reescribe las tareas: las reordena.** El contenido de cada tarea —pasos,
> ficheros, invariantes, rulings, citas del SRD— sigue viviendo en el plan del 8 de septiembre y se
> cita por su número («Tarea 16»). Lo que cambia es **qué se ejecuta junto, en qué orden y cuándo se
> puede parar a jugar**. Cada tanda se planifica con `writing-plans` cuando le toque, sobre las
> tareas que aquí se le asignan, y se cierra como una tanda más (spec → plan → SDD → cierre → fusión
> del autor), igual que el pulido, las reglas de la mesa, los desbordes y la puerta de efectos.

**Constantes globales, decisiones del autor y «lo que este plan NO hace»: las del plan del 8**, sin
cambios. **Las reglas de proceso del paso 3 se deciden antes de arrancar la tanda 1** (D-CF-65 no las
anticipa; el autor las fija entonces, y se declaran en `04-convenciones.md`).

---

## Lo que ya no está en el paso 3

| Tarea del plan del 8 | Dónde quedó |
|---|---|
| **T5** la segunda puerta · **T6** el daño de una salvación | Hechas en **puerta de efectos** (2026-09-13, rama `puerta-de-efectos/antes-del-paso-3`, fusionada en `7688b44`) |
| **T9** `NOMBRE_TIPO_DANO` tres veces | Hecha el 2026-09-06 (D-OP-14, `apps/web/src/dominio/dano.ts`) |
| Bloque B como bloque | **Se disuelve**: T7 va a la tanda 2, T8 a la tanda 3 |

Antes de la tanda 1 también va, fuera del paso 3, la tanda **«PNJ del mundo y la mesa»** (spec del
2026-09-13: `Character.entityId`, revelar/ocultar desde la mesa, sacar del combate) — no comparte
ficheros con el catálogo y es lo primero que frena una partida real.

---

## Tanda 1 · El libro entra en el sistema

**Qué vive el jugador:** las aptitudes de su clase y de su raza **hacen algo** (Furia con sus usos,
Ataque adicional, Segundo aliento…), y los 320 conjuros del SRD existen en el catálogo.

| Tarea | Qué |
|---|---|
| **T0** | La prueba de fuego: mapear diez conjuros a mano, **antes de escribir el conversor**. Papel, no código |
| **T1** | El conversor (`scripts/convertir-catalogo.mjs`): lee el YAML de Foundry, rechaza en voz alta, no escribe todavía |
| **T2** (+2b) | 235 aptitudes de clase y 12 subclases con actividad; **los rasgos raciales** por el mismo conversor (D-CF-20) y las **cargas de objeto** como `uses` (D-CF-21) |
| **T3** | Los 320 conjuros en el catálogo |
| **T4** | `NOTICE.md`: MIT (estructura de Foundry) y CC-BY 4.0 (contenido del SRD) |

**Cierra:** un bárbaro de nivel 5 juega distinto de un guerrero; el catálogo tiene 320 conjuros con
nivel y escuela; los conteos cuadran con el censo medido
([spec](../specs/2026-09-07-paso-3-lo-que-cabe-medido.md)).
**Después de esta tanda todavía no se juega distinto con un mago**: sus conjuros existen pero no
son suyos. Es la única tanda con tarea de papel (T0) y la única que decide la forma del catálogo —
por eso va primera y sola.

## Tanda 2 · El mago

**Qué vive el jugador:** un mago tiene **sus** conjuros, los prepara mirando sus espacios y los
lanza de verdad: contra la CA, con salvación y daño (la puerta ya está), a nivel superior, como
reacción, y con los trucos e innatos de su raza sin gastar nada.

| Tarea | Qué |
|---|---|
| **T10** | `CharacterSpell`: qué conjuros son de quién, con los tres modelos de preparación ([spec](../specs/2026-09-07-los-conjuros-del-personaje-design.md)) |
| **T11** | La pestaña **Conjuros** de la hoja se llena (hoy enseña espacios y el hueco declarado, D-CF-34) |
| **T16** | Innatos: trucos raciales y «una vez por descanso largo», como actividades del rasgo |
| **T17** | Reacciones: se marcan y gastan la reacción del turno |
| **T18** | Elegir el espacio al lanzar (nivel superior) |
| **T19** | Ataque de conjuro contra la CA (extrae la pieza «1d20 + bono contra CA» de `resolveAttack`) |
| **T7** | El bono a tiradas que no es un entero (`+1d4` de Bendición y Perdición) |

**Antes de planificarla, el autor contesta las tres preguntas del plan del 8** («Lo que decide el
autor antes de empezar»): ¿el mago nace con el libro sembrado?, ¿se puede preparar en mitad del
combate (cuenta y avisa)?, ¿los trucos se eligen o se siembran?
**Cierra:** guerrero, bárbaro y mago de nivel 3 —la partida de prueba declarada— juegan con lo
suyo. **Primer punto donde se puede parar a jugar.**

## Tanda 3 · La mesa en combate

**Qué vive el jugador:** desde la mesa, sin ir a la hoja, pulsa **Acciones** y ve lo que puede hacer
ahora y por qué no lo demás; el combate sin tablero está entero: esquivar, esconderse, preparar,
agarrar, empujar, dos armas, desarmado, sorpresa, caída; y los monstruos legendarios actúan fuera
de turno.

| Tarea | Qué |
|---|---|
| **T21** | La lista de acciones, una sola forma: arma, actividad, conjuro, consumible, básica; `GET …/characters/:id/actions` con el motivo de lo que no se puede |
| **T22** | «Acciones» en la mesa: cuatro menús que suben (Ataques · Conjuros · Aptitudes · Objetos), decisión del autor contrastada con BG3 |
| **T23** | Las acciones de combate que no son atacar (Esquivar, Esconderse, Preparar, Correr, Destrabarse, Buscar, Usar objeto, desarmado, dos armas, sorpresa, no letal, caída) |
| **T8** | Empuñar o lanzar: el bono de Furia no se cuela en un arma arrojada (ficha A11-lanzado) |
| **T24** | Pruebas enfrentadas y de grupo; agarrar y empujar; dote Grappler |
| **T25** | Acciones legendarias y de guarida |

**Depende de** la tanda 2 (el menú Conjuros enseña preparados, niveles, espacio superior y
reacciones) y de la tanda 1 (Aptitudes con usos). **Cierra:** una partida entera se juega desde la
pantalla de la mesa. **Segundo punto donde parar a jugar** — y el que el autor tiene como «final
temporal»: todas las mecánicas del SRD 5.1 sin tablero, conectadas.

## Tanda 4 · Lo temporal

**Qué vive el jugador:** invoca y la criatura aparece en el elenco a su nombre; se transforma y su
hoja es la del oso un rato; encanta un arma y el bono dura lo que dura — y todo se retira solo.

| Tarea | Qué |
|---|---|
| **T12** | El permiso partido (P2-9): el jugador decide, el DM resuelve — SRD *Polimorfar* |
| **T13** | Invocar: un PNJ temporal con `ownerId` del invocador (29 `summon`, la mitad con varios perfiles: selector) |
| **T14** | Transformar: `statblockRef` temporal |
| **T15** | Encantar: efecto temporal sobre un objeto |

Sube la cobertura del motor del 61 % al 72 %. **Es el bloque que el plan del 8 ya declaraba «el
único que se puede aplazar entero sin que nadie lo note en la primera partida»**: va después de
jugar con las tandas 1–3, si la partida lo pide.

## Tanda 5 · Deuda compartida (la «tanda L», D-CF-37)

| Tarea | Qué |
|---|---|
| **T20** | S11 los tipos del motor y de la hoja en `@dnd/shared` (los dos lados importan) · E1 buscar cruzando pestañas · L5 «este personaje no ve» · S6 la mejora de característica como elección |

Cuatro fichas viejas que comparten `@dnd/shared` y el catálogo. **Sin fecha propia**: S11 puede
adelantarse a cualquier tanda si un implementador la necesita (es la que evita que la web calque
tipos a mano); las otras tres, cuando molesten.

---

## El orden, en una línea

**PNJ del mundo y la mesa** → **1 · el libro** → **2 · el mago** (parar a jugar) → **3 · la mesa en
combate** (parar a jugar; «final temporal») → 4 · lo temporal y 5 · deuda **solo si jugar lo pide**.
Después, lo que ya estaba: HP-9b, higiene, prueba de campo con agentes, partida real, fase 3.

## Lo que cada tanda deja escrito

Lo de siempre y nada más: su plan con `writing-plans` sobre las tareas de arriba (citando el plan
del 8 por número, sin copiarlas), ledger en `.superpowers/sdd/`, una fila por decisión en
[decisiones.md](../../decisiones.md), fichas cerradas archivadas, una línea en
[07-historial.md](../../07-historial.md), `pnpm update:estado`, y la tabla de observabilidad.
