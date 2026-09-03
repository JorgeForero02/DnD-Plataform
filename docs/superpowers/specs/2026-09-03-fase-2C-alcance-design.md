# Fase 2C — dados, condiciones y el reloj de la mesa (alcance)

> Escrito el 2026-09-03, al cerrar 2B. **Manda sobre el plan maestro** para esta fase, igual que
> hizo `2026-09-01-fase-2-alcance-design.md` con la fase entera — y a diferencia de aquel, este
> documento parte de **lo que hay medido en el código hoy**, no de lo que el plan prometía.
>
> **Cambio de método, y viene de una corrección del autor.** En 2B las reglas del juego se
> **interpretaron** y se comprobaron después ([el contraste](./2026-09-03-contraste-de-reglas-2B.md)
> salió bien, pero por suerte). En 2C se comprueba **antes**: cada regla de la lista de abajo se
> contrasta con el SRD y con la práctica de la comunidad **antes de escribir su código**, y la
> cita se pega en el mismo commit.

## 1 · Qué queda de 2C, de verdad

2B se llevó por delante la mitad de lo que este documento debía traer. Lo que **ya funciona** hoy,
comprobado leyendo el código y no el plan:

| Ya existe | Dónde |
|---|---|
| Evaluador de expresiones (`2d20kh1`, `4d6kh3`, límites duros, error tipado) | `apps/api/src/dice/dice.ts` |
| **El servidor tira, persiste y devuelve**; el cliente solo anima | `apps/api/src/rolls/rolls.service.ts` |
| Ventaja y desventaja **como concepto**, compuestas por el servidor | `POST /campaigns/:id/rolls`, campo `mode` |
| Desglose completo: dados tirados, conservados y **el descartado a la vista** | `apps/web/src/features/rolls/ResultadoDeTirada.tsx` |
| Visibilidad por tirada (el DM decide si la suya se ve) | `createRollSchema.visibility` + `canView` |
| 20 y 1 naturales distinguidos del resultado, y CD opcional | `packages/shared/src/roll.schema.ts` |
| **Atacar con un arma equipada**: bono con traza, daño, versátil y crítico | fase 2B, `POST .../sheet/attacks/:key/roll` |
| Condiciones **indefinidas**, con su efecto sobre la velocidad y su traza | `apps/api/src/character-state/conditions/` |
| Las tiradas aparecen en la línea de tiempo de la sesión | `features/sessions/linea-de-log.ts` |

Lo que **no existe**, y es lo que 2C tiene que traer:

1. **No hay registro de tiradas como tal.** `RollsController` solo tiene `POST`: las tiradas se
   leen hoy *de rebote*, mezcladas en el log general de la campaña. No se puede pedir «las
   tiradas de esta sesión», ni filtrarlas, ni repasarlas al terminar.
2. **No hay pantalla de dados.** Se puede tirar desde un valor de la hoja o desde un arma, pero
   no *«tira 2d6+3 porque lo digo yo»*, que es la mitad de lo que pasa en una mesa.
3. **No hay reloj de campaña.** Es la corrección que trajo el DM asesor: hay efectos de una hora
   y el sistema no modela el tiempo de juego en absoluto.
4. **Las condiciones no caducan**: solo se quitan a mano.
5. **No hay guía de CD** para el DM.
6. **El DM no puede pedir una tirada** a un jugador.

## 2 · El alcance propuesto, en cinco bloques

Cada bloque dice **qué lo cierra**, porque un alcance sin criterio de terminado es una lista de
deseos.

### 2C.1 · El registro de tiradas

`GET` de tiradas con filtro por sesión y por personaje, filtrado por `canView` en el servidor —una
tirada `DM_ONLY` **no viaja**, no se esconde en el cliente— y su pantalla: la lista de la sesión,
con el desglose desplegable de cada una.

**Lo cierra:** un e2e donde el DM tira en oculto, el jugador pide el registro y esa tirada **no
está en la respuesta**, comprobado sobre el JSON y sobre el DOM.

### 2C.2 · La pantalla de dados

Expresión libre con los siete dados, ventaja y desventaja, motivo y visibilidad. Es la entrada de
«tira por iniciativa», «tira 1d100», «tirad todos percepción».

**Lo cierra:** un recorrido de navegador que tira una expresión libre y ve su desglose, más el
rechazo legible de una expresión inválida (el evaluador ya devuelve el motivo; hoy nadie lo pinta).

### 2C.3 · El reloj de campaña

Tiempo **de juego**, que el DM avanza: *«pasan dos horas»*, *«descansáis ocho»*. Una columna en
`Campaign` y un endpoint de avance con su suceso en la línea de tiempo.

**Por qué ahora y no con la iniciativa:** sirve fuera del combate —viajes, antorchas, duraciones,
descansos— y cuando llegue el combate, un asalto son seis segundos **del mismo reloj**. Un solo
mecanismo, dos escalas.

**Lo cierra:** avanzar el reloj deja rastro, y una condición con caducidad (2C.4) se apaga sola al
pasar su hora.

### 2C.4 · Condiciones con duración

Hoy son indefinidas. Con reloj, una condición puede llevar **su vencimiento en tiempo de juego**
(una hora, ocho horas, hasta el próximo descanso largo). Lo que sigue **fuera** es la duración en
asaltos: eso necesita iniciativa, y la iniciativa es Encuentros.

**Lo cierra:** una condición con una hora de duración desaparece de la hoja al avanzar el reloj
una hora, y **el jugador ve por qué** (un aviso, no un silencio).

### 2C.5 · La ayuda de CD, y la petición de tirada

Las dos las pidió el DM asesor:

- **Guía de CD**: la escala habitual con ejemplos. **Comprobado el 2026-09-03: la tabla
  «Typical Difficulty Classes» sí está en el SRD 5.1** (sección de pruebas de característica),
  así que se siembra con atribución como el resto del catálogo — son seis filas, de CD 5 «muy
  fácil» a CD 30 «casi imposible». Deja de ser una decisión y pasa a ser una transcripción.
- **Pedir una tirada**: el DM pide «Percepción, CD 14» y al jugador le aparece en su pantalla.
  Con **sondeo**, no con tiempo real — el mismo criterio que ya rige el resto de la fase 2.

**Lo cierra:** el jugador ve la petición sin recargar, y responde tirando desde ahí.


## 2 bis · Lo que dijo el contraste, y los seis huecos que faltaban

Comprobado el 2026-09-03 contra el SRD 5.1 y la práctica de las mesas virtuales, **antes** de
escribir nada. Fuentes al final. Lo que el alcance de arriba no tenía y ahora sí:

| | Hueco encontrado | Por qué importa, y dónde encaja |
|---|---|---|
| **H-2C-1** | **Un solo descanso largo por 24 horas**, y hay que empezarlo con al menos 1 PG | Hoy se puede descansar largo tres veces seguidas y curarse entero cada vez: la mesa lo sabe y no usa el botón. **Es la primera regla que el reloj hace comprobable**, y por sí sola justifica 2C.3 |
| **H-2C-2** | **Un descanso se interrumpe**: iniciativa, un conjuro que no sea truco, daño, o **una hora de marcha**. Y si llevabas una hora, te llevas los beneficios de un descanso corto | Es la mitad del descanso que no existe. Sin ella, «descansáis ocho horas» y «os atacan a la tercera» dan el mismo resultado |
| **H-2C-3** | **Ritmo de viaje**: rápido / normal / lento, con sus 400, 300 y 200 pies por minuto —4, 3 y 2 millas por hora, 30, 24 y 18 al día—, y el rápido con **−5 a la Percepción pasiva** | El reloj sin ritmo de viaje es medio mecanismo: lo que la mesa dice no es «pasan seis horas», es «vamos a la ciudad». Es una tabla de tres filas y el reloj ya calcula el resto |
| **H-2C-4** | **Marcha forzada**: más de ocho horas de viaje exige salvación de Constitución CD 10 + 1 por hora extra, y el fallo da **un nivel de agotamiento** | Es el consumidor natural del reloj **y** de las condiciones: cierra el círculo entre 2C.3 y 2C.4 sin inventar nada |
| **H-2C-5** | **El agotamiento no llega al motor**: hoy las condiciones solo alimentan la velocidad, y el nivel 4 **reduce los PG máximos a la mitad** | Un personaje agotado enseña unos PG máximos que la regla dice que no tiene. Es exactamente el fallo que 2B tuvo con el equipo, en la otra mitad del sistema |
| **H-2C-6** | **El evaluador no sabe relanzar.** `apps/api/src/dice/dice.ts` acepta `kh`/`kl` y nada más | El propio alcance de la fase 2 pedía «relanzar 1 y 2» (estilo de combate con arma a dos manos), y sin eso hay una familia entera de tiradas que la mesa hace a mano |

**Y tres cosas que el contraste confirma y conviene no tocar:**

- **Ventaja y desventaja no se acumulan y se cancelan entre sí**, digan lo que digan las fuentes
  que las den: *«o tienes ventaja, o no la tienes»* (Crawford). Nuestro modelo lo cumple **por
  construcción** —el DM elige un modo, no suma modificadores—, y eso hay que conservarlo cuando
  llegue la petición de tirada: la pantalla que la pide no puede empezar a sumar ventajas.
- **Un asalto son seis segundos y diez asaltos un minuto**: el reloj de 2C.3 y la iniciativa de
  Encuentros son de verdad **el mismo mecanismo a dos escalas**, como decía el alcance de la fase.
- **La tabla de CD está en el SRD** y se puede sembrar (ver arriba).

### Lo que la práctica de las mesas virtuales aporta a 2C.5

La petición de tirada es un patrón resuelto, y conviene copiar su forma en vez de inventarla: el
DM elige **a quién**, **qué** (habilidad o salvación) y **con qué CD**; a cada jugador le aparece
un botón en su pantalla; al tirar, **el DM recibe el resultado**. Foundry lo tiene en varios
módulos (Requestor, Roll Manager, Request Roll) y Roll20 lo suple con macros.

De ahí sale **una decisión que el alcance no tenía**: la **tirada a ciegas** —el jugador tira y
**no ve** el resultado, solo el DM— es práctica común (módulo *Blind Skill Rolls*), y nuestro
modelo de visibilidad **no la sabe expresar**: `DM_ONLY` esconde la tirada del DM, no la del
jugador a sí mismo. Es una sexta decisión para el autor: si entra, la visibilidad de una tirada
deja de ser «quién puede verla» y pasa a ser «quién puede verla, incluido su autor».

## 3 · Lo que 2C **no** hace, y conviene repetirlo

- **Iniciativa, orden de turnos y duraciones en asaltos.** Eso es Encuentros.
- **Comparar la tirada contra la CA de un objetivo y aplicar daño.** La CA de un enemigo **no
  viaja** al navegador de un jugador: eso es metajuego servido en bandeja.
- **Tiempo real.** Sondeo hasta que la fase 4 traiga el empujón; el modelo no cambia cuando llegue.
- **Dados en 3D.**

## 4 · Las decisiones que son del autor

No las tomo yo. En 2B decidí once por ausencia y con permiso; estas cambian la forma de una tabla
o el trato con la mesa, y tienen dueño:

1. **El reloj: ¿qué escala se guarda?** Propuesta: un entero de **minutos de juego** desde el
   inicio de la campaña, y la pantalla lo enseña como fecha del mundo si algún día hay calendario.
   La alternativa —fecha y hora del mundo desde el principio— obliga a decidir el calendario ahora.
2. **¿La condición caduca sola, o solo avisa de que ha vencido?** Apagarla sola es cómodo; avisar
   respeta que **la máquina ejecuta y el DM arbitra**. Recomiendo avisar y ofrecer el botón.
3. ~~**La guía de CD: ¿del SRD o nuestra?**~~ **Resuelta por el contraste**: está en el SRD 5.1,
   se siembra con atribución. Lo que sigue siendo tuyo es si además quieres ejemplos propios de
   tu mesa junto a los del manual.
4. **La petición de tirada: ¿entra en 2C o espera?** Es lo único de la lista que roza el tiempo
   real, y es también lo que más cambia la mesa.
5. **La tirada a ciegas.** ¿Puede el DM pedir una tirada cuyo resultado **el propio jugador no
   ve**? Es práctica común y cambia la forma de `visibility` en una tirada. Sin ella, el DM que
   quiere ocultar un resultado tiene que tirar él, que es lo que hoy ya puede hacer.
6. **Pifias y tablas del DM.** El alcance de la fase 2 las dejó apuntadas como «tablas del DM»
   —una primitiva que serviría también para botín—. Si entran, 2C crece; si no, se dice.

## 5 · Lo que queda por contrastar (lo demás ya está hecho, §2 bis)

- **Duraciones de conjuro y de efecto** tal como las escribe el SRD, para elegir qué vocabulario
  entiende el vencimiento de una condición (minutos, horas, «hasta el próximo descanso largo»).
- **Cómo modelan el tiempo de juego** las mesas virtuales conocidas (Foundry con *Simple
  Calendar*, Fantasy Grounds), por si conviene un calendario en vez de un contador. Se buscó la
  práctica de **pedir una tirada** y la de **tirar a ciegas**, no la del calendario.
- **La concentración** sigue declarada fuera de la fase 2 (hueco H12 del informe de huecos): si
  el reloj la hace barata, merece revisarse, pero no entra por la puerta de atrás.

## 6 · Trampas conocidas que aplican a esta fase

Las de siempre, escritas aquí para que el que ejecute no las vuelva a pagar: el **límite global de
100 peticiones por IP** (la suite de navegador ya lo desborda sin margen), `reuseExistingServer`
reutilizando un servidor viejo tras cambiar una variable, **ninguna clase de opacidad de Tailwind
compila** sobre los tokens, `jsdom` no maqueta, y —de 2B— **dos escrituras que toman sus candados
en orden inverso dan un abrazo mortal**, no una prueba frágil.

## 7 · Deuda de 2B que 2C debería recoger de paso

Está entera en [06-pendientes.md](../../06-pendientes.md); lo que toca de cerca a esta fase:

- **M2B-3**: el motor de reglas se dispara dentro de la transacción del llamante y **escribe fuera
  de ella**. 2C mete más sucesos en el log (tiradas, reloj, condiciones), así que multiplica la
  superficie de ese fallo: conviene arreglarlo **antes**.
- **M2B-13**: la suite de navegador reescribe nueve capturas y nunca deja el árbol limpio.
- **M2B-4**: las cargas de objeto (una varita de siete usos que se repone al descansar) encajan
  con el descanso, que 2C toca por el reloj.

---

## 8 · Anexo — Fase 2D (opcional): statblocks de PNJ

El alcance de la fase 2 la dejó escrita como *«statblocks de NPC reusando el mismo motor. Solo si
2A–2C salieron limpias»*. **Esa frase tiene un error de fondo que conviene corregir antes de
planificarla**, y lo dice el contraste:

> **Un monstruo no se deriva: se declara.** La CA de un orco no sale de una fórmula con su
> armadura y su Destreza; **está escrita en su ficha**. Sus PG son un dado de golpe y un total ya
> calculado. Su bono de ataque viene dado. El motor de 2A existe para responder *«¿de dónde sale
> este número?»* en una hoja de personaje, y un statblock **no tiene esa pregunta**: el número es
> el dato. Reusar el motor aquí sería resolver un problema que la ficha no tiene.

Lo que **sí** se reutiliza es la otra mitad de 2B y 2C: **el tirador** (mismo evaluador, misma
visibilidad, mismo registro) y **las condiciones**.

### Qué traería 2D

1. **El statblock como dato**, por campaña: nombre, tamaño, tipo, alineamiento, CA (con la nota de
   de dónde sale: «armadura natural»), PG y su dado de golpe, velocidades, las seis
   características, salvaciones y habilidades con bono, sentidos con **Percepción pasiva**,
   idiomas, **desafío y su PX**, rasgos, acciones y —solo como texto— reacciones y acciones
   legendarias.
2. **Sus ataques, tirables**: cada acción de ataque con su bono y su daño, pidiendo la tirada al
   mismo endpoint que ya usan los personajes. Es lo que convierte la ficha en herramienta.
3. **El vínculo con el mundo**: un statblock puede colgar de una ficha de PNJ ya existente
   (`Entity` de tipo `NPC`), que es donde vive su historia. Dos caras de la misma cosa, como el
   objeto de inventario y el objeto del mundo en 2B.

### Lo que el contraste aporta, y cambia el coste

- **El SRD 5.1 trae 334 criaturas bajo CC BY 4.0**: se pueden sembrar legalmente, con la misma
  atribución que razas, clases y armas. **Pero transcribir 334 statblocks a mano es el trabajo
  más grande de todo lo hecho hasta ahora**, y es transcripción, no diseño: es exactamente donde
  una tabla se llena de errores que ningún invariante caza (la lección de la ficha S10).
- **La forma del statblock es estándar** y está bien documentada, así que el esquema no es una
  invención nuestra: seguirlo campo por campo es lo que permitirá importar de fuera algún día.
- **El desafío y sus PX son una tabla**, no un cálculo: no hay que derivar nada.

### Las decisiones que serían del autor

1. **¿Sembramos criaturas del SRD, y cuántas?** Recomiendo **no sembrar las 334**: una selección
   corta y declarada (las diez o veinte que salen en una campaña de nivel 1–5) y el resto,
   homebrew del DM. Misma política que el equipo: muestra representativa, declarada en su cabecera.
2. **¿PG vivos ya?** El alcance de la fase 2 los dejó explícitamente para **Encuentros** («no
   basta el dato: los PG tienen que bajar»). Si 2D solo trae el dato, es barato; si trae los PG
   vivos, ha empezado el rastreador de combate por la puerta de atrás.
3. **¿Acciones legendarias y de guarida?** Como **texto** son gratis; automatizarlas es Encuentros.

### Lo que 2D no hace, en ningún caso

Iniciativa, orden de turnos, comparar contra la CA, aplicar daño, y **la CA del monstruo no viaja
al navegador de un jugador** — eso último ya está decidido en el alcance de la fase 2 y no se
reabre.

## 9 · Fuentes del contraste

- [SRD 5.1 (PDF oficial, Wizards)](https://media.wizards.com/2023/downloads/dnd/SRD_CC_v5.1.pdf)
- [Pruebas de característica y la tabla de dificultades típicas](https://5thsrd.org/rules/abilities/ability_checks/)
- [Descansos: corto, largo, interrupciones y el límite de 24 horas](https://rpgbot.net/dnd5/how-to-play/resting/)
- [Movimiento y ritmo de viaje, con la marcha forzada](https://5thsrd.org/adventuring/movement/)
- [Agotamiento: los seis niveles y el descanso largo](https://www.5esrd.com/gamemastering/conditions/)
- [Ventaja y desventaja no se acumulan (Crawford)](https://twitter.com/JeremyECrawford/status/977548681120423936)
- [Pedir una tirada: Roll Manager](https://foundryvtt.com/packages/pf2e-roll-manager) ·
  [Requestor](https://foundryvtt.com/packages/requestor) ·
  [tiradas a ciegas](https://foundryvtt.com/packages/blind-skill-rolls)
- [Monstruos del SRD por desafío](https://dnd5e.info/monsters/monsters-by-challenge/) y
  [la forma del statblock](https://www.gmbinder.com/share/-LOjOMS9INYKFkhsNuAy)
