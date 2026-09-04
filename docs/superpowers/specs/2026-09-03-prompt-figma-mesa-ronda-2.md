# Prompt para Figma Make — segunda ronda: completar la maqueta

> Se le entrega **sobre su propia maqueta**, no como encargo nuevo. Lo que ya hizo se conserva.

---

## 0 · Qué es esto

**Esto continúa la maqueta que ya construiste** para «Sala de Guerra», la plataforma de D&D 5.ª
edición. **No empieces de cero y no rehagas lo que hay: extiéndelo.**

Lo que hiciste está bien y se queda:

- **Elegir crónica** — la lista con «dónde se quedó» y «quién está dentro» funciona.
- **La mesa**: cabecera de escena persistente con lugar, hora del mundo y presentes; **tu personaje
  delante y el resto del grupo en segundo plano** con «mirar en detalle»; el hilo con capitulares y
  cada voz en su color; el campo de narración; la barra de acciones **con el coste bajo el nombre
  del verbo**; y el carril de paneles con sus teclas.
- Los tres estratos (permanente / superpuesto / contextual) y los tres estados.

**Lo que falló fue mi encargo, no tu ejecución: no te dije lo que el sistema hace por debajo.** Este
documento lo arregla. Abajo va **el inventario completo**, y luego las seis piezas que faltan.

---

## 1 · El inventario: todo lo que el sistema ya hace

Esto está **construido, probado y en producción**. Cada cosa de esta lista necesita existir en la
interfaz. Nada de aquí es una idea a futuro.

### 1.1 · La hoja de personaje — mucho más de lo que la maqueta enseña

**Todo se calcula, no se guarda.** Se guarda lo decidido (características base, raza, subraza, clase,
nivel, elecciones); el resto sale del motor:

- Las **seis características** y sus modificadores.
- **Bonificador de competencia** por nivel.
- **Clase de Armadura**, evaluando varias fórmulas de armadura y quedándose con la mayor, con el tope
  de Destreza de cada tipo.
- **Puntos de golpe máximos**, con dado de golpe por clase y Constitución por nivel.
- **Las seis salvaciones** y **las dieciocho habilidades**, con **cuatro estados de competencia**:
  ninguna, media, competente y **pericia** (que duplica el bonificador).
- **Percepción pasiva**, **visión en la oscuridad**, y **cinco velocidades** (caminar, trepar, nadar,
  volar, excavar), **ya afectadas por las condiciones activas**.
- **Iniciativa**, **bonos de ataque** cuerpo a cuerpo y a distancia, **CD de salvación de conjuros**
  y **espacios de conjuro** con su reposición.
- **Anulaciones manuales del DM** sobre cualquier valor derivado.

**Y la característica que distingue al producto: LA TRAZA.** Cada número guarda **de dónde sale**,
paso a paso y con el origen de cada paso:

```
CA 18  =  14 cota de malla  +  2 escudo  +  2 Destreza
Sigilo +6  =  +2 Destreza  +  2 competencia  +  2 pericia
PG máximos 29  =  59 del statblock  −  30 recortado por agotamiento nivel 4
```

**Esto tiene que ser protagonista, no un tooltip.** Es lo que hace que un jugador deje de
preguntarle al DM de dónde sale un número.

**Estado mutable de la hoja:** puntos de golpe actuales y **temporales**, **tres y tres casillas de
salvación de muerte**, recursos consumibles con su reposición (dados de golpe, inspiración, furia,
ki, espacios), y **subida de nivel con previsualización** — el servidor propone el cambio, se ve qué
sube, y se confirma.

### 1.2 · Objetos, inventario y dinero

- **Catálogo del SRD 5.1** (armas, armaduras, equipo) **y objetos propios del DM** por campaña, con
  su visibilidad.
- **Mochila con peso**, en onzas; **ranuras de equipo** (armadura, escudo, mano principal, mano
  secundaria…), **manos ocupadas**, y **sintonización con tope de tres**.
- **Cinco monedas**: platino, oro, electro, plata y cobre. Sin decimales.
- **Cuadro de ataques**: cada arma equipada con su bono al ataque, su dado de daño, su tipo de daño,
  la variante **versátil** y su alcance. Se tira desde ahí.
- **Equipar cambia la hoja y sale en la traza**: ponerse una cota de malla mueve la CA y **añade su
  paso**.

### 1.3 · Dados

- Expresiones libres (`2d6+3`, `1d100`), con **ventaja y desventaja** y **relanzado** (`2d6r<3`).
- **El azar es del servidor, siempre.**
- **Tres audiencias**: pública, privada del DM, y **a ciegas** — en la ciega **el resultado no viaja
  al jugador que tira**, solo lo ve el DM.
- **Peticiones de tirada**: el DM pide **un valor de la hoja** («Percepción», «Salvación de
  Destreza»), no una expresión, y quien responde tira **con el modificador de su propia hoja**. Con
  la **guía de dificultad del SRD** (muy fácil 5 · fácil 10 · media 15 · difícil 20 · muy difícil 25
  · casi imposible 30).
- **Registro de tiradas**, filtrable por sesión, por personaje y por «solo las mías».

### 1.4 · El reloj y el tiempo

- **Reloj de campaña en segundos de juego**, que solo el DM avanza, con su rastro en la línea de
  tiempo.
- **Ritmos de viaje** (rápido, normal, lento) con sus millas por hora y su penalización a la
  percepción pasiva, y **salvaciones de marcha forzada** a partir de la novena hora.
- **Descansos corto y largo**, con la regla de **un descanso largo por cada 24 horas de juego**, el
  mínimo de un punto de golpe, y los descansos **interrumpidos**, que no dan nada.

### 1.5 · Condiciones — los «temporizadores»

- **Las quince del SRD** más clave libre para las de la mesa («concentrándose en Bendición»).
- **Con duración: se guardan con la hora en que VENCEN**, contra el reloj de campaña. Al pasar su
  hora **dejan de aplicarse solas** — y **no desaparecen: se marcan como vencidas**, para que se vea
  por qué algo dejó de contar.
- **Agotamiento con seis niveles**, que recorta la velocidad y **parte los puntos de golpe máximos
  por la mitad en el nivel 4**.

### 1.6 · El bestiario

- **Quince criaturas del SRD 5.1** transcritas, más **las propias del DM**.
- La CA la **dice** el statblock; los puntos de golpe salen de una fórmula de dados; la competencia
  sale del **valor de desafío**.
- **Bajar una criatura a la mesa**: de una plantilla nacen N combatientes, que **reciben daño, cogen
  condiciones y aparecen en el registro** como cualquiera. Nacen **ocultos** y el DM los revela.

### 1.7 · Las tablas del DM

- Tablas con **rangos y resultados** («01–05: se te cae el arma»), con su **visibilidad**.
- **Disparador**: ninguno (se tira a mano), **crítico** o **pifia**.
- **Son una regla de la casa y nacen apagadas**, con un interruptor por campaña — el SRD no trae
  ninguna tabla de críticos.
- Sirven igual para **botín, rumores y encuentros aleatorios**.

### 1.8 · El motor de reglas — «los bloques»

**Una frase de tres partes: cuando pase ESTO, si se cumple AQUELLO, haz LO OTRO.** Vocabulario
cerrado, y estas son las piezas exactas:

**Sucesos (cuando pase…):** empieza la sesión · se cierra la sesión · se abre una ficha · se comenta
una ficha · **se revela una ficha** · se pone una marca · se levanta una señal · el DM ejecuta algo ·
se enlazan dos fichas · **una tirada de característica** · se ataca una ficha · entra un miembro.

**Condiciones (si se cumple…):** una marca vale sí o no · un conjunto tiene al menos N miembros ·
alguien está en un conjunto · **están todos los jugadores presentes** · el sujeto lleva una etiqueta
· se han revelado al menos N fichas con una etiqueta · vamos por la sesión N o más · **esta regla no
ha disparado nunca**.

**Efectos (haz…):** **revelar una ficha** · ocultar una ficha · poner una marca · meter o sacar a
alguien de un conjunto · levantar una señal · **avisar a alguien** · añadir una nota a la sesión ·
armar o desarmar otra regla.

Y además: **ensayo en seco** —dice qué pasaría y no cambia nada—, **propuestas** que el DM aprueba o
rechaza, un **interruptor por campaña** que lo apaga entero, y **traza de cada disparo**.

### 1.9 · El mundo y su visibilidad

- **Siete tipos de ficha**: PNJ, lugares, misiones, facciones, objetos, sucesos y documentos. Con
  cuerpo en Markdown, etiquetas, comentarios y **enlaces entre cualquier tipo y cualquier tipo**.
- **Estado del mundo**: **marcas** con nombre («el-puente-cayó»), **conjuntos** («los que saben») y
  **señales**.
- **Cinco niveles de visibilidad** por objeto: público · para los jugadores · solo su dueño · solo el
  DM · **para personas concretas**.
- **Lo que un jugador no puede ver NO se le envía.** No se esconde en el navegador: no llega.

### 1.10 · La sesión

- Empezar y cerrar sesión, **como mucho una en curso** por campaña.
- **Registro de sucesos** donde cada línea lleva **su propia visibilidad**: el DM y el jugador leen
  **dos crónicas distintas de la misma sesión**.
- Sellos manuales de anotación: combate, PNJ, decisión, hallazgo, objeto, nota.
- **«Ver el registro como»**: el DM puede mirar el registro con los ojos de un jugador, y entonces ve
  **menos**, nunca más.

---

## 2 · Las seis piezas que faltan, en orden de prioridad

### 2.1 · EL TALLER DEL DM — lo más importante que falta

**Es lo que un DM hace entre sesiones, y no está diseñado en absoluto.** Preparar una campaña:
escribir el mundo, enlazarlo y decidir quién ve qué.

Tiene que sentirse **un taller de creación, no un gestor de contenidos**. Piensa en el editor de
campañas de un juego de rol, o en un tablero de detective con hilos entre las fichas — **nunca en
una tabla con filtros**.

Lo que necesita:

- **Escribir una ficha del mundo** (PNJ, lugar, misión, facción, objeto, suceso, documento) con su
  prosa larga, sus etiquetas y **su nivel de visibilidad decidido al escribir**, no después.
- **Enlazarla con otras** de forma que se vea la telaraña: quién conoce a quién, qué lugar guarda qué
  objeto, qué misión toca a qué facción. **La relación es lo interesante, no la lista.**
- **Preparar la próxima sesión**: qué escena abre, qué tengo a mano para revelar, qué criaturas voy a
  necesitar, qué tiradas voy a pedir.
- **Una vista de «lo que sabe la mesa»**: qué has revelado y qué sigue oculto, de un vistazo. Es la
  pregunta que un DM se hace todo el rato y hoy no tiene respuesta.
- Y el gesto que atraviesa todo: **enseñar algo a la mesa** — que aparece en la pantalla de los
  jugadores, como un empujón, no como un cambio de permiso.

**Diséñalo también como estado de la mesa «en reposo»**: el DM entra a la campaña fuera de sesión y
**este es su sitio**, igual que el hilo es el del jugador.

### 2.2 · LA HOJA DE PERSONAJE COMPLETA

La maqueta la insinúa; hay que construirla entera, con todo lo de §1.1 y §1.2. Es **la superficie que
más usa un jugador**.

**La traza es la protagonista.** Quiero ver cómo se despliega un número: pulsas «CA 18» y se abre su
desglose con cada paso y su origen. Que sea **satisfactorio de mirar**, no una lista de depuración.

Respeta la anatomía conocida de una hoja de 5.ª edición —seis características en cajas grandes, las
habilidades en columna, el combate a un lado— porque la gente lleva cuarenta años leyéndola así.

Y tiene que caber, **dentro de un panel superpuesto sobre la mesa**, en un portátil.

Incluye: el **cuadro de ataques** del que se tira, el **inventario con ranuras, manos y
sintonización**, la **bolsa de cinco monedas**, los **recursos** con su reposición, las **salvaciones
de muerte** con sus seis casillas, y la **subida de nivel con previsualización**.

### 2.3 · LOS BLOQUES DE REGLAS

La pantalla del motor de §1.8. **Solo la ve el DM.**

Una frase de tres partes que se **compone arrastrando piezas** a tres carriles —cuando pase / si se
cumple / haz—, con el vocabulario exacto de arriba. Cada pieza tiene su forma y su color según a qué
carril pertenece, y **un carril rechaza la pieza que no es suya**.

Necesita además: **ensayo en seco** con su resultado bien diferenciado de un disparo real, la lista
de reglas con **cuántas veces ha disparado cada una**, el **interruptor de campaña**, y las
**propuestas** esperando aprobación.

**No lo hagas parecer un editor de automatizaciones de oficina.** Es el DM escribiendo el destino de
su historia: *«cuando revelen la carta del gremio, si Kellan ya está muerto, avisa a Sirella».*

### 2.4 · LAS TABLAS DEL DM

Crear y editar una tabla de rangos (§1.7), tirarla, y **verla disparar sola** en un crítico o una
pifia. Con su visibilidad, y el **interruptor de la casa apagado por defecto** diciendo claramente
qué significa.

Y el gesto que pediste: **dar un objeto a un personaje** desde el catálogo o desde una tabla de
botín, sin salir de la mesa.

### 2.5 · LOS TEMPORIZADORES

Las condiciones con duración de §1.5, **visibles donde importan**:

- **En el retrato de la mesa**: cuánto le queda a «envenenado».
- **En la hoja**, con lo que la condición está haciendo a los números (y ahí vuelve a salir la traza:
  *«velocidad 15 pies — recortada por agotamiento nivel 2»*).
- **Al vencer**, que se vea que venció: la condición **no desaparece, se marca**.
- Y para el DM, **poner una condición con duración** desde el retrato, sin abrir la hoja de nadie.

Cuando exista el combate, esas duraciones se contarán **en asaltos**. Diseña el rótulo para que
admita las dos escalas.

### 2.6 · EL DADO EN TRES DIMENSIONES

**El momento de la tirada, con un dado real rodando.** Es lo que más convierte un hilo de texto en
un juego.

**Regla que no se puede romper: el servidor decide el número y el dado LO REPRESENTA.** El dado no
tira, **rueda hasta un resultado ya decidido**. Si el dado decidiera, tendríamos azar en el navegador
y se acabarían las tiradas a ciegas. Usa una librería que permita «rodar hasta este valor».

El momento tiene tres instantes:

1. **Antes** — se puede intervenir: ventaja, desventaja, ayuda de un compañero, gastar un recurso.
2. **Durante** — el dado rueda, y **la traza se compone alrededor mientras cae**: cada modificador
   apareciendo con su origen escrito.
3. **Después** — el total, el veredicto contra la dificultad si la había, y **si se falló, la segunda
   oportunidad**, con el recurso contado en el propio botón.

**Y se tiene que poder saltar.** A la tirada cincuenta uno quiere velocidad: un ajuste de «sin
animación» que respete al que ya lo ha visto.

Para una tirada **a ciegas**, el dado rueda **en la pantalla del DM** y en la del jugador solo se ve
que tiró.

---

## 3 · Lo que NO debes cambiar

- **La arquitectura de tres estratos** y los tres estados. Todo lo nuevo pertenece a uno de ellos, y
  dilo en un comentario.
- **La mesa que ya hiciste.** Solo se le añade lo que falta.
- **La identidad**: pizarra naval y cobre, las cuatro tipografías, los tokens que ya usas. Y los
  tres oficios del color: **azul es acción, cobre es mundo, rojo es peligro**, y no se mezclan.
- **Nada de valores de enumeración en pantalla.** Ni `DM_ONLY`, ni `poisoned`, ni `REVEAL_ENTITY`:
  «solo el DM», «envenenado», «revelar una ficha».
- **Las anti-referencias siguen en pie**: nada de panel de administración, ni rejilla de tarjetas, ni
  formulario con etiquetas encima, ni una pestaña por tipo de dato.
- **Los criterios de código** de la ronda anterior: React + TypeScript + Tailwind con **nuestras
  clases** (`bg-surface`, `text-muted`, `p-s4`, `rounded-radius-sm`, `font-title`, `text-chrome-lg`),
  sin bibliotecas de componentes, **componentes presentacionales sin datos**, primitivas en `ui/` con
  sus nombres, iconos SVG en línea, y los datos de ejemplo en un fichero aparte.

## 4 · Cómo quiero la entrega

Las seis piezas **navegables desde la maqueta que ya existe**, en el orden de arriba: si algo se
queda a medias, prefiero **el taller del DM y la hoja completos** antes que las seis a medio hacer.

Y al final, dime **qué has puesto en cada estrato** y **qué has dejado fuera**.
