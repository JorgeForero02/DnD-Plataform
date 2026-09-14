# Paso 3 en dos partes — A (jugable, como Foundry sin módulos) y B (completo)

> **Escrito el 2026-09-14 por decisión del autor (D-CF-70, enmendada el mismo día por D-CF-71)**:
> el [plan del paso 3](./2026-09-08-paso-3-el-catalogo-y-los-conjuros-del-personaje.md) creció por
> acumulación —A y C el 8 de septiembre, B colgando fichas viejas, D lo temporal, E y F añadidos el
> 12 tras contrastar con el índice del SRD— y quedó ordenado por **cuándo se pensó cada cosa**, no
> por **qué vive el jugador**. Por la mañana se reordenó en cinco tandas; por la tarde el autor lo
> partió en **dos partes**: «primero lo que hace jugable una partida, aunque sea de voz; después el
> resto» — que es exactamente lo que hace Foundry sin módulos: tira, aplica daño con confirmación,
> conjuros con daño y salvación, **y todo lo demás es texto que el DM arbitra**.
>
> **Este fichero no reescribe las tareas: las reordena y las recorta.** El contenido de cada tarea
> —pasos, ficheros, invariantes, rulings, citas del SRD— sigue en el plan del 8 y se cita por su
> número («Tarea 16»). Cada tanda se planifica con `writing-plans` cuando le toque, sobre lo que
> aquí se le asigna, y se cierra como una tanda más (spec → plan → SDD → cierre → fusión del autor).

**Constantes globales, decisiones del autor y «lo que este plan NO hace»: las del plan del 8**, sin
cambios. **Las reglas de proceso del paso 3 se deciden antes de arrancar 3A.1** (D-CF-65 no las
anticipa; el autor las fija entonces y se declaran en `04-convenciones.md`).

---

## Lo que ya no está en el paso 3

| Tarea del plan del 8 | Dónde quedó |
|---|---|
| **T5** la segunda puerta · **T6** el daño de una salvación | Hechas en **puerta de efectos** (fusionada en `7688b44`) |
| **T9** `NOMBRE_TIPO_DANO` tres veces | Hecha el 2026-09-06 (D-OP-14) |
| Bloques A–F como orden | **Se disuelven**: cada tarea va a 3A o a 3B según lo de abajo |

**Antes de 3A** va, fuera del paso 3, la tanda **«PNJ del mundo y la mesa»** (spec del 2026-09-13:
`Character.entityId`, revelar/ocultar desde la mesa, sacar del combate): «es necesaria» — palabras
del autor tras su primera partida real.

---

## Parte A — jugable: el mago y el clérigo juegan, el resto de clases tiene sus aptitudes a la vista

**Principio (autor, 2026-09-14):** *«no importa que no hagan daño o encanten o así de momento»* → y
después: daño y curación **sí**, porque el motor ya está (la bandeja de daño y la segunda puerta lo
resuelven); lo demás, **texto con sus usos contados**, y el DM arbitra. Lo que no sale del mismo
árbol, a B.

### 3A.1 · El libro entra, de voz y con daño

| Tarea | Qué |
|---|---|
| **T0 (corto)** | Diez conjuros **y cinco aptitudes** a mano, en papel, para fijar **una** forma: texto + metadatos (nivel, escuela, tiempo, alcance, duración, componentes, español con inglés al lado) + **el pago** (espacio o usos con `resetOn`) + **la parte mecánica que entra en A**: daño/curación (dados, tipo) y **cómo se resuelve** — con salvación (característica, mitad), directo, o con tirada de ataque de conjuro. Nada más. Lo que no encaje ahí es texto |
| **T1** | El conversor: lee el YAML de Foundry (SRD 5.1, sin sufijo `24`), rechaza en voz alta, **re-ejecutable**: las actividades que quedan fuera hoy entran mañana como extensión de la misma forma, sin tirar nada |
| **T3 (A)** | Los 320 conjuros con esa forma |
| **T2 (A)** | Las 235 aptitudes de clase y 12 subclases **con la misma forma**: usos por descanso, texto, y daño/curación/salvación donde lo haya (Segundo aliento, Imposición de manos, Expulsar muertos vivientes…). Rasgos raciales (2b) igual. **Ninguna clase queda sin nada**: lo que no mapea existe como texto con usos |
| **T4** | `NOTICE.md`: MIT + CC-BY 4.0 |

**Cierra:** el catálogo tiene 320 conjuros y todas las aptitudes; un texto y unos usos por cada
uno; y los que hacen daño o curan lo declaran de forma que el motor lo entienda.

### 3A.2 · Elegir, lanzar y usar

| Tarea | Qué |
|---|---|
| **T10** | `CharacterSpell`: qué conjuros son de quién, con los tres modelos de preparación ([spec](../specs/2026-09-07-los-conjuros-del-personaje-design.md)) |
| **T11** | La pestaña **Conjuros** de la hoja se llena; y la de Aptitudes enseña las suyas con sus usos |
| **Lanzar / usar** | Gasta el espacio o el uso, escribe «Sylas lanza Proyectil mágico» en el hilo, y si declara daño/curación: **con salvación** → la puerta de efectos (ya hecha); **directo** → la bandeja de daño / `changeHpFromEffect` (ya hechos); **con ataque** → **T19**, ataque de conjuro contra la CA (extraer «1d20 + bono contra CA» de `resolveAttack`). Resistencias e inmunidades ya las aplica la bandeja. Lo que no declara nada → texto |
| **T18** | Elegir el espacio al lanzar (nivel superior); el escalado de daño usa el `nivelDeEspacio` que el esquema ya tiene |
| **T15** | **Encantar**: *Arma mágica*, *Arma elemental*, *Garrote* — un `TemporaryModifier` cuyo objetivo es un objeto del inventario (`itemId`), leído por `efectosActivos`, que vence con el reloj y con la concentración (las tres piezas existen). Una tarea |
| **Daño extra al impactar** (nueva) | Ataque furtivo, Castigo divino, Marca del cazador: en la **bandeja de daño**, una línea opcional «+ Ataque furtivo 2d6» que el jugador marca y el DM confirma. Un gancho, sobre lo que ya hay |

**Antes de planificarla, el autor contesta las tres preguntas del plan del 8** (libro sembrado,
preparar en combate, trucos). **Cierra:** guerrero, bárbaro, mago y clérigo de nivel 3 juegan con lo
suyo; un pícaro y un paladín tienen su daño extra. **Se puede parar a jugar aquí.**

### 3A.3 · La barra de acciones

| Tarea | Qué |
|---|---|
| **T21** | La lista de acciones, una sola forma: arma, actividad, conjuro, consumible; `GET …/characters/:id/actions` con el motivo de lo que no se puede |
| **T22** | «Acciones» en la mesa: cuatro menús que suben (Ataques · Conjuros · Aptitudes · Objetos). **La economía del turno se gasta al actuar, no con botones sueltos** — los tres contadores («acción», «adicional», «reacción») pasan a ser estado, no mandos: el autor los encuentra «raros» tal como están |

**Cierra:** una partida entera se juega desde la pantalla de la mesa. **Final de A; se juega.**

## Parte B — completo (después de jugar; en el orden que la partida pida)

| Bloque | Tareas del plan del 8 |
|---|---|
| Lo que el árbol de A dejó como texto | T2/T3 (resto de actividades: condiciones desde conjuros y aptitudes, utilidad con efecto), **T7** bonos con dado (Bendición, Inspiración bárdica), **T16** innatos, **T17** reacciones (Escudo, Esquiva asombrosa, Contrahechizo), **T8** empuñar o lanzar |
| Lo temporal que no es encantar | **T12** permiso partido, **T13** invocar, **T14** transformar (Forma salvaje, Polimorfar) |
| La mesa sin tablero, entera | **T23** acciones de combate (Esquivar, Esconderse, Preparar…, desarmado, dos armas, sorpresa, no letal, caída), **T24** enfrentadas y de grupo, **T25** legendarias y de guarida |
| Deuda compartida (tanda L) | **T20**: S11 tipos en `@dnd/shared` (puede adelantarse a cualquier tanda si un implementador la necesita), E1 buscar cruzado, L5 «este personaje no ve», S6 ASI como elección |

---

## El orden, en una línea

**PNJ del mundo y la mesa** → **3A.1 el libro** → **3A.2 elegir, lanzar y usar** (parar a jugar) →
**3A.3 la barra** (final de A; **se juega**) → **3B** por bloques, solo lo que la partida pida.
Después, lo que ya estaba: HP-9b, higiene, prueba de campo con agentes, partida real, fase 3.

## Lo que cada tanda deja escrito

Lo de siempre y nada más: su plan con `writing-plans` sobre las tareas de arriba (citando el plan
del 8 por número, sin copiarlas), ledger en `.superpowers/sdd/`, una fila por decisión en
[decisiones.md](../../decisiones.md), fichas cerradas archivadas, una línea en
[07-historial.md](../../07-historial.md), `pnpm update:estado`, y la tabla de observabilidad.
