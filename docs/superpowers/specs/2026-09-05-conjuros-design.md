# Los conjuros — un mago que puede lanzar algo

> Escrito el 2026-09-05, después de que el autor se hiciera un mago y no encontrara ni un hechizo.
> **Decisión suya, ese mismo día: se hace la versión larga** —los conjuros de verdad, no un aviso de
> «todavía no»—, y *«no me preocupa alargar la partida de agentes»*.
>
> **Qué arregla.** La hoja de un lanzador enseña **sus casillas de espacios de conjuro y no hay nada
> que meter dentro**. Medido: cero conjuros en `apps/api/src` y `packages/shared/src`.
>
> **No está roto: está declarado fuera de alcance** desde 2A, en la cabecera de
> `apps/api/src/rules/catalog/spell-slots.ts` — *«lo que entra es la tabla, no la matemática de
> conjuros… lo que sigue fuera es la interpretación de cada conjuro: preparados contra conocidos,
> trucos que escalan, y la lista por clase»*. Esta spec cierra ese hueco.

---

## 1 · Lo que ya está construido, y es más de lo que parece

| Pieza | Estado | Dónde |
|---|---|---|
| Espacios de conjuro por nivel, **con sus tres progresiones** (`FULL`, `HALF`, `PACT`) | **hecho** | `apps/api/src/rules/catalog/spell-slots.ts:25` |
| Gastar y reponer un espacio, con su descanso | **hecho** — son recursos, como la inspiración | `apps/api/src/character-state/resources/resources.service.ts:408` |
| El brujo repone en descanso **corto**; el resto en el largo | **hecho** | `spellSlotResetOn` |
| **Concentración y su CD** —10 o la mitad del daño, la mayor— | **hecho** | `apps/api/src/character-state/concentration/concentration.ts:61` |
| Salvación pedida al recibir daño concentrando | **hecho** | `AplicarDano.tsx:116` |
| Pedir una tirada a varios personajes, con CD y modo | **hecho** | `apps/api/src/roll-requests/` |
| Condiciones que caducan solas | **hecho** | 2C |
| Las doce clases del SRD | **hecho** | `apps/api/src/rules/catalog/classes.ts` |
| **La lista de conjuros** | **NO existe** | — |
| **Lanzar uno** | **NO existe** | — |

**El andamio está entero.** Falta el contenido y el gesto.

---

## 2 · El alcance, y lo que deliberadamente queda fuera

### Entra

- **El catálogo de conjuros del SRD 5.1**, con su atribución, como ya se hizo con armas, armaduras,
  objetos y monstruos.
- **Qué conjuros tiene cada personaje**: preparados o conocidos, según su clase.
- **Lanzar uno**: gastar el espacio, elegir objetivo si lo tiene, tirar lo que haya que tirar, y que
  el resultado llegue a la mesa con su traza.
- **Los trucos**, que no gastan espacio y escalan por nivel de personaje.

### No entra

- **Rituales.** Son una segunda vía de lanzamiento con su propio tiempo, y el reloj de campaña
  tendría que entenderlos. Su propia tanda.
- **Componentes materiales con coste.** Piden inventario de reactivos y una economía que no existe.
  Los componentes sin coste se muestran como texto y no se comprueban.
- **Áreas de efecto medidas.** Un cono de 15 pies necesita el tablero de la fase 3. Hasta entonces el
  conjuro **dice a cuántos afecta y el DM elige a quiénes**, que es lo que hace una mesa sin mapa.
- **Invocaciones y familiares**: crean criaturas, y eso es el bestiario más un dueño.

---

## 3 · Las cuatro decisiones que este diseño toma, y por qué

Ninguna es libre: **el SRD contesta las cuatro**, y en este proyecto eso manda.

### 3.1 · Preparados y conocidos son cosas distintas, y no se pueden unificar

El SRD reparte a los lanzadores en dos familias, y meterlos en una sola tabla es el error obvio:

- **Preparan de una lista completa** —clérigo, druida, paladín—: acceden a **todos** los conjuros de
  su clase y cada día eligen cuántos llevar preparados.
- **Conocen un número fijo** —bardo, hechicero, brujo, explorador—: aprenden pocos y esos son los
  suyos hasta subir de nivel.
- **El mago es el tercero y no es ninguno de los dos**: tiene **libro de conjuros**, aprende los que
  copia, y **prepara** de entre los de su libro.

**Se modelan las tres**, porque son tres y fingir que son dos deja al mago mal. La clase dice cuál
le toca; el personaje no lo elige.

### 3.2 · Los trucos no gastan espacio, y escalan por nivel de PERSONAJE

No por nivel de conjuro ni por espacios gastados. Es la trampa clásica: un truco de un mago de nivel
5 pega más que el mismo truco de nivel 1, **sin gastar nada**. Si se modelan como «conjuros de nivel
0 que consumen un espacio de nivel 0», sale mal a la primera.

### 3.3 · Un conjuro con salvación NO tira el atacante: tira el objetivo

Y eso ya está construido: **es una petición de tirada**, igual que la iniciativa. El lanzador dice
«lanzo bola de fuego», el servidor calcula la CD con su hoja, y **a cada objetivo le llega su
petición de salvación de Destreza**.

**Es la misma tubería que el plan de la iniciativa acaba de estrenar**, y esa reutilización es la
razón de que esta fase quepa.

### 3.4 · La concentración ya existe: se conecta, no se reescribe

Un conjuro que la pida **marca al lanzador como concentrando**, y el mecanismo que ya hay —la CD de
10 o la mitad del daño, y la salvación al recibir golpes— se dispara solo. **Lanzar un segundo
conjuro de concentración termina el primero**, y eso lo dice el servidor, no la pantalla.

---

## 4 · El modelo

```
Spell              el catálogo del SRD: nombre, nivel, escuela, tiempo, alcance,
                   componentes, duración, concentración, texto, y qué tira
CharacterSpell     qué conjuros tiene este personaje, y si están preparados hoy
```

**El catálogo es de solo lectura y no vive en la base**, igual que armas, armaduras y monstruos: es
un fichero del servidor con su atribución, y `CharacterSpell` apunta a él por clave. Meterlo en
Postgres obligaría a migrar cada corrección de una errata.

**El DM puede añadir conjuros propios**, como ya puede con objetos y statblocks — y por el mismo
motivo: una mesa inventa cosas. Esos sí van a la base.

---

## 5 · Las pantallas

**La hoja gana una pestaña «Conjuros»** junto a la de ataques, y enseña tres cosas:

1. **Los espacios**, que ya se pintan hoy — pero ahora con algo debajo.
2. **Lo que este personaje puede lanzar**, agrupado por nivel, con lo preparado destacado.
3. **El botón de lanzar**, que pregunta el nivel del espacio si el conjuro sube al gastarlo.

**Y el cuadro de ataques vacío deja de mentir por omisión** —la ficha P3 del 2026-09-05—: si no hay
armas equipadas, lo dice y dice por dónde se arregla.

**Preparar** es su propia pantalla y solo aparece para quien prepara: una lista con casillas y un
contador —«5 de 7 preparados»—, y el servidor rechazando el sexto si solo caben cinco.

---

## 6 · Lo que hay que probar, y lo que se rompe si no

- **Las tres familias**: un clérigo ve toda su lista, un bardo solo los suyos, un mago solo los de su
  libro. **Esta es la que se olvida** y la que deja al mago mal.
- **Un truco no gasta espacio**, y su daño sube al subir el personaje.
- **Lanzar sin espacios es 409**, no un 200 silencioso — el mismo defecto que el plan 08 ya arregló
  para los recursos: *«gastar más de lo que hay devolvía 200»*.
- **Un conjuro con salvación crea una petición por objetivo**, con la CD de la hoja del lanzador.
- **El segundo conjuro de concentración termina el primero**, y lo decide el servidor.
- **La puerta**: preparar los conjuros de otro es 403.

**Mutación obligatoria:** quita la comprobación de espacios disponibles y comprueba que la prueba
del 409 se pone roja.

---

## 7 · Por qué esto llega ahora y no antes

Dos razones, y las dos son de oportunidad:

**La tubería de peticiones acaba de demostrarse.** Una salvación contra un conjuro es exactamente
una petición de tirada con CD, y el plan de la iniciativa la deja rodada. Hacer los conjuros antes
habría significado construirla dos veces.

**Y la partida a ciegas lo va a exigir.** Tres agentes van a jugar dos sesiones; si uno se hace mago
—y alguien siempre se hace mago— la primera pregunta va a ser dónde están sus hechizos. El autor
decidió que prefiere alargar la prueba antes que hacerla con un mago que no puede lanzar nada.

## Lo que falta decidir, y es del autor

- **Cuántos conjuros entran del SRD**: los ~300 completos, o los de nivel 0 a 3, que cubren una
  campaña entera de niveles 1 a 5 y son la mitad del trabajo.
- **Si los trucos entran en la primera tanda** o después. Yo los metería: un mago de nivel 1 sin
  trucos se queda sin nada que hacer en el asalto 2.
