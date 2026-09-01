# Fase 2 — decisión de alcance: objetos, dados y condiciones

**Fecha:** 2026-09-01. **Estado:** decidido con el autor, pendiente de convertirse en plan.
**Manda sobre el plan maestro** en lo que se refiere al alcance de la fase 2.

Este documento existe porque el plan maestro define la fase 2 como *"ficha de personaje +
motor de reglas mínimo"* y **no menciona objetos, inventario, equipar ni tiradas**, mientras
que el documento fuente del producto sí los pide explícitamente:

> *"para los jugadores… consulta de hoja, progreso, **inventario**, recursos, hechizos y acceso
> a la información relevante **sin depender siempre del DM**"*
>
> Capas del motor: *"**fuentes de modificación permanentes**, por ejemplo raza, clase, feats o
> **items**"* · *"**fuentes de modificación temporales**: buffs, heridas, condiciones o efectos
> mágicos"*

Era un hueco entre el documento fuente y el plan. Se cierra aquí.

## Los dos principios que gobiernan todo lo de abajo

**1 · La máquina ejecuta, el DM arbitra.**
El sistema **no** decide cuándo hay ventaja o desventaja, ni si una condición aplica. Eso
depende de estar tumbado, cegado, flanqueado, a distancia larga, agarrando al enemigo, de un
hechizo de hace tres turnos… Automatizarlo es intentar interpretar el reglamento entero, y es
donde estos proyectos se hunden. **El DM lo marca; el sistema lo aplica y lo explica.**

**2 · El azar vive fuera del motor de reglas.**
El motor es determinista: esa es su razón de ser y lo que permite probarlo a fondo. Los dados
son lo contrario. Por tanto:

- El **motor** calcula **qué** hay que tirar: `2d20 quédate el peor + 7`, daño `1d8 + 4`.
- Un **tirador** aparte lo ejecuta, con generador aleatorio **inyectable**, para que las
  pruebas fijen la semilla y el resultado sea reproducible.

Si el azar entra en el motor, el motor deja de ser comprobable y pierde lo único que lo hacía
fiable.

## El corte, en cuatro entregas

| | Qué entra |
|---|---|
| **2A** | Motor de reglas + hoja de personaje. Modificadores manuales. **Traza de derivación por valor** |
| **2B** | Objetos con datos, inventario, equipar y desequipar → alimentan el motor como fuentes de modificación |
| **2C** | Tirador de dados con ventaja/desventaja marcada por el DM, condiciones **indefinidas** que el DM pone y quita, y registro de tiradas de la sesión |
| *(2D, opcional)* | Statblocks de NPC reusando el mismo motor. Solo si 2A–2C salieron limpias |

Cada una recibe su propio plan TDD cuando se llegue, siguiendo el patrón de la fase 1.

### 2A — el motor y la hoja

Lo que ya decía el plan maestro: modificadores de característica, bonificador de competencia,
CA (base + Destreza + anulaciones manuales), PG máximos por clase/nivel/CON, CD de salvación,
bonos de ataque. Datos del SRD 5.1 sembrados.

**La traza de derivación no es un adorno: es la funcionalidad.** Que el jugador vea

```
CA 18 = 14 cota de malla + 2 escudo + 2 Destreza
```

es lo que hace que **deje de preguntarle al DM de dónde sale el número** — que es el objetivo
declarado del autor. Sin traza, un inventario que cambia cifras solo cambia el motivo de la
pregunta: de *"¿cuánta CA tengo?"* a *"¿por qué tengo esa?"*.

### 2B — objetos e inventario

**Sí hacen falta datos estructurados.** Un objeto que solo es texto no puede alimentar el
motor ni tirar dados. Como mínimo: tipo (arma / armadura / escudo / consumible / otro), sus
efectos, y para las armas el dado de daño, el tipo de daño y la característica de ataque.

Dos orígenes: **catálogo SRD 5.1 sembrado** y **objetos propios del DM por campaña** (eso es
el *homebrew override* que el documento fuente ya pedía).

**Lista cerrada de efectos, y esto es una regla dura:**

| Se automatiza | Se queda como texto |
|---|---|
| Bono a la CA | *"prende fuego a los no-muertos los martes"* |
| Puntuación de característica (fija o sumada) | Cualquier efecto condicional o narrativo |
| Bono a salvaciones | Reacciones, activaciones, cargas |
| PG máximos, velocidad, competencia | Todo lo que no sea un número |

Con esa lista quedan cubiertos armadura, escudo, capa de protección, cinturón de fuerza y
anillos de bonos: **la inmensa mayoría de lo que una mesa toca de verdad**. Todo lo demás lo
lee el jugador y lo aplica a mano. El plan maestro ya avisaba: *"sin interpretación automática
de dotes y hechizos todavía"* — aquí pasa de aspiración a regla.

**Legal:** armaduras, escudos y armas del SRD 5.1 son OGL. Los objetos mágicos del SRD son un
subconjunto limitado; lo llamativo **no está** y no se copia.

### 2C — dados y condiciones

**Tirar:** "atacar con esta arma" produce `1d20 + bonificador` y su daño. Ventaja y desventaja
las **marca el DM** (`2d20` quedándose el mejor o el peor). Se muestra el desglose, no solo el
número.

**Condiciones: solo indefinidas, hasta que el DM las quite.** Y esto es una decisión de diseño
con motivo, no una simplificación perezosa:

> **Un turno no existe en el sistema.** Contar "tres turnos" exige iniciativa, orden y alguien
> que declare el comienzo de cada turno — es decir, un **rastreador de combate**, que es una
> funcionalidad entera de la fase 3–4.

La condición indefinida cubre el caso real que planteó el autor —*"le dio debilidad… y cuando
se cure se lo quito"*— **sin necesitar reloj alguno**. La duración en turnos entra cuando
exista la iniciativa, y entonces es casi gratis, porque la condición ya estará modelada.

## Lo que queda explícitamente fuera de la fase 2

- **Comparar la tirada contra la CA del objetivo**, decidir acierto o fallo, y **aplicar daño a
  los PG de un NPC**. Eso ya es combate: necesita statblocks vivos y alguien llevando la
  cuenta.
- **Iniciativa, orden de turnos y duraciones por turnos.**
- **Ver la tirada del otro en directo.** Eso es tiempo real (fase 4). Como de momento se juega
  presencialmente, se dice en voz alta; un registro de tiradas guardado en la sesión cubre el
  resto **sin WebSockets**. No se paga por tiempo real hasta que se juegue a distancia.
- **Modelos 3D o imágenes de objetos**: fase 5.

## El riesgo que asume esta decisión

El plan maestro ya avisaba de que **la fase 2 era el mayor riesgo del proyecto** (*"el motor es
el diferenciador y el mayor riesgo"*). Esta decisión **la hace más grande**: añade inventario,
tiradas y condiciones. Partirla en 2A–2C es la mitigación.

La otra mitigación, **recomendada y no aceptada todavía**: el autor decidió no jugar hasta la
fase 3 (ver `docs/06-pendientes.md`). Eso significa que 2B y 2C se construirían **encima de una
hoja de personaje que nadie ha usado nunca**. La recomendación es que, al terminar 2A, el autor
monte su propio personaje real y lo mire diez minutos — no es jugar una partida, es abrir la
ficha. Si la hoja está mal pensada, es infinitamente más barato descubrirlo ahí que después de
construir el inventario encima.
