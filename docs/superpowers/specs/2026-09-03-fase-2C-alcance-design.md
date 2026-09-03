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

- **Guía de CD**: la escala habitual con ejemplos, para no inventarse el número cada vez.
  **Antes de escribirla hay que comprobar si la tabla está en el SRD 5.1**; si no lo está, se
  ofrece una escala propia y se dice que es nuestra.
- **Pedir una tirada**: el DM pide «Percepción, CD 14» y al jugador le aparece en su pantalla.
  Con **sondeo**, no con tiempo real — el mismo criterio que ya rige el resto de la fase 2.

**Lo cierra:** el jugador ve la petición sin recargar, y responde tirando desde ahí.

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
3. **La guía de CD: ¿del SRD o nuestra?** Depende de la comprobación de derechos de arriba.
4. **La petición de tirada: ¿entra en 2C o espera?** Es lo único de la lista que roza el tiempo
   real, y es también lo que más cambia la mesa.
5. **Pifias y tablas del DM.** El alcance de la fase 2 las dejó apuntadas como «tablas del DM»
   —una primitiva que serviría también para botín—. Si entran, 2C crece; si no, se dice.

## 5 · Lo que hay que contrastar **antes** de escribir cada bloque

Esta es la lista de búsquedas que abre el trabajo, no la que lo cierra:

- Duraciones del SRD en tiempo de juego y cómo se expresan (rondas, minutos, horas, días).
- Qué recupera exactamente un descanso corto y uno largo **contra el reloj** (y el límite de un
  descanso largo por 24 horas).
- Si la tabla de dificultades típicas está en el SRD 5.1 y bajo qué licencia.
- Cómo tratan el tiempo de juego las mesas virtuales conocidas (Foundry: *Simple Calendar*; Roll20;
  Fantasy Grounds), para no inventarnos un modelo que la gente ya sabe usar de otra forma.
- Práctica de la comunidad para **pedir una tirada** desde la pantalla del DM.

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
