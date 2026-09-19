> **Archivado el 2026-09-19.** Auditoría de interfaz hecha sobre el prototipo navegable (copia visual
> del DOM de producción, 120 estados, `Mine/prototipo-dnd.html`). **Se congela entera y sin reescribir.**
> Lo que hace con ella el proyecto está fuera: el cruce con las decisiones tomadas —17 correcciones
> chocan con algo decidido, cinco describen cosas que ya existían— en `06-pendientes.md` § «Dejado por
> la auditoría de interfaz (2026-09-19)», y las que se aplican en
> `superpowers/plans/2026-09-19-correcciones-de-interfaz.md`. Los identificadores `dm:mesa`,
> `jug:mesa-activo`… son las claves de estado del prototipo, no rutas del código.

# Auditoría de interfaz — Plataforma de D&D

Prototipo navegable, 120 estados capturados (65 del DM, 55 del jugador).
Revisión de todos los flujos gráficos: qué falla y cómo corregirlo.

**Cómo leer la columna Gravedad**

| Nivel | Qué significa |
|---|---|
| **Alta** | Rompe o bloquea el flujo, o hace que la mesa entienda mal lo que pasó |
| **Media** | Cuesta tiempo, confunde u obliga a aprender dos veces lo mismo |
| **Baja** | Se nota, no duele |

Las correcciones que no caben en una celda están desarrolladas en la sección 21.

---

## 1. Mesa fuera de combate — DM

| # | Problema | Dónde | Gravedad | Cómo corregirlo |
|---|---|---|---|---|
| 1.1 | Los PNJ no existen en la mesa hasta que empieza el combate. Klarg y los goblins salen en «Entrar en combate», «Sacar criatura», «Dar…» y «Dar XP», pero no hay tarjeta suya en «En la mesa» | `dm:mesa` | **Alta** | Dejar de condicionar la sección `En escena` al estado de combate: se pinta siempre que la sesión tenga PNJ bajados. Es la misma tarjeta que ya existe en `dm:mesa-activo`, con la variante «PNJ · Enemigo». Ver §21.1 |
| 1.2 | Sin tarjeta de PNJ, el DM no puede dañar a una criatura fuera de combate (trampa, caída, daño narrativo) | `dm:mesa` | **Alta** | Se resuelve solo con 1.1: la tarjeta ya trae «Daño a X» y «Curar a X» |
| 1.3 | «Goblin 1 — 0 PG» sigue listado como disponible en todos los selectores, incluido el de tirar iniciativa | `dm:mesa-combate`, `dm:mesa-Sacar criatura` | Media | Estado `caido` cuando PG = 0: tarjeta atenuada con distintivo «A 0 PG». En los selectores, excluirlo por defecto y añadir una casilla «Incluir a los caídos» al pie de la lista |
| 1.4 | Los paneles «Hoja» y «Bolsa» aparecen deshabilitados para el DM, y los atajos de teclado los siguen anunciando | `dm:mesa`, `dm:mesa-atajos` | Media | No renderizar esos dos botones cuando `personajePropio == null`, en vez de renderizarlos con `disabled`. La lista de atajos se construye desde los paneles realmente disponibles, no desde una lista fija |
| 1.5 | El formulario del registro muestra 6 botones de categoría deshabilitados antes de escribir nada | `dm:mesa` | Media | Un único botón «Anotar» y la categoría como fila de chips seleccionables (sin estado deshabilitado, porque elegir categoría no requiere texto). El botón «Anotar» es el único que se deshabilita mientras el campo está vacío |
| 1.6 | Avisos repite «Alguien se ha sentado a tu mesa» 4 veces sin decir quién | `dm:mesa-avisos` | Baja | Agrupar por tipo y nombrar: «Marta, Bruno, Carla y Diego se sentaron a tu mesa», desplegable a las 4 entradas |

---

## 2. Mesa fuera de combate — jugador

| # | Problema | Dónde | Gravedad | Cómo corregirlo |
|---|---|---|---|---|
| 2.1 | Los PG propios se cambian con dos botones fijos **−5 / +5**, sin poder decir cuánto | `jug:mesa` | **Alta** | Sustituir los dos botones por «Daño» y «Curar», que abren el mismo diálogo del DM (`Daño · X`, `Curar · X`) con el campo de cantidad. Ver §21.2 |
| 2.2 | «Ayudar a» aparece dos veces: como selector fijo en la tarjeta del personaje y otra vez dentro de «Esquivar, ayudar…» | `jug:mesa`, `jug:mesa-barra-Esquivar, ayudar…` | Media | Quitarlo de la tarjeta. La tarjeta es estado, la barra es acción; Ayudar es acción |
| 2.3 | Se escapa el nombre interno del tipo de efecto: «Esquivar — acción · **Texto**», «Tomar aliento — … · **Daño o curación**» | popovers de la barra | Media | El tipo de efecto es un dato del motor, no de la mesa: no mostrarlo. En su sitio, el coste («acción», «acción adicional», «gratis») y los usos restantes, que es lo que el jugador necesita para decidir |
| 2.4 | La barra de acciones cambia de posición en el DOM entre «Con tablero» y «Sin tablero» | `jug:mesa` vs `jug:mesa-sintablero` | Media | Darle una celda fija en la rejilla de la mesa, anclada al borde inferior de la columna central, y que lo que cambie sea el contenido de la celda de arriba (iframe o registro), no el orden |
| 2.5 | La casilla «Solo el DM» del registro no dice si es un susurro al DM o una nota privada | `jug:mesa` | Baja | Renombrar a «Solo lo ve el DM» |

---

## 3. Entrar en combate e iniciativa

| # | Problema | Dónde | Gravedad | Cómo corregirlo |
|---|---|---|---|---|
| 3.1 | La lista de espera se une con «y» repetida: «Esperando a Diego y Bruno y Carla y Marta» | `dm:mesa-prep` | Media | `new Intl.ListFormat('es', { style: 'long', type: 'conjunction' }).format(nombres)` → «Diego, Bruno, Carla y Marta» |
| 3.2 | El DM ve tres avisos apilados «Empieza el combate» pidiéndole tirar la iniciativa de Tessa, Mirela y Sylas, que son personajes de jugador. El propio diálogo dice «Cada jugador tira la suya; tú tiras la de los tuyos» | `dm:mesa-prep` | **Alta** | Ese aviso es del jugador, no del DM: no emitirlo al DM. En su lugar, el panel «Preparando combate» lista quién falta y ofrece un solo botón «Tirar por los que faltan (3)». Ver §21.3 |
| 3.3 | Tres avisos con el mismo título apilados, sin agrupado ni contador | `dm:mesa-prep` | Media | Se resuelve con 3.2. Para el caso general, la pila de avisos debería colapsar los del mismo tipo en uno con contador |
| 3.4 | El aviso de iniciativa del jugador muestra tres números: un **17** grande, un **16** en un `status`, y «17 = 16 dado +1 iniciativa». No se sabe cuál es el resultado | `jug:mesa-prep-tirada` | Media | Un solo número grande (17) y debajo, en texto secundario, «16 en el dado +1 de iniciativa». Quitar el 16 suelto del `status` |
| 3.5 | Asimetría de información: el DM ve «4 de 8 combatientes», el jugador solo «Todavía te falta tirar tu iniciativa» | `dm:mesa-prep` vs `jug:mesa-prep` | Baja | Dar al jugador el mismo contador «4 de 8», sin la lista de nombres |
| 3.6 | Las tarjetas de PNJ ya muestran «Su turno ·» durante la preparación, antes de que exista un orden de turnos | `jug:mesa-prep` | Media | Condicionar esa marca a `combate.estado === 'activo'`, no a la existencia del encuentro |
| 3.7 | Cada iniciativa tirada por el sistema genera **dos** entradas de registro: «Tessa — Iniciativa: 1d20+4 = 6» y «Elena, la DM — El sistema tira la iniciativa por Tessa (6)» | registro | Media | Emitir un solo suceso con sujeto y autor separados: sujeto «Tessa», autor «el sistema», texto «Iniciativa: 1d20+4 = 6». El «quién lo hizo» ya tiene su sitio en el renglón |
| 3.8 | Arrancar un combate llena el registro con ~14 líneas seguidas y no hay forma de plegarlas | registro | Media | Agrupar los sucesos del mismo `encuentroId` y `tipo = iniciativa` en un bloque plegable: «Iniciativa del asalto 1 — 6 tiradas», desplegable al pulsar |

---

## 4. Combate activo

| # | Problema | Dónde | Gravedad | Cómo corregirlo |
|---|---|---|---|---|
| 4.1 | El jugador ve **«Sin puntos de golpe en la hoja.»** donde el DM ve «PG 7/7». Un mensaje de dato ausente haciendo de mecanismo de ocultación | `jug:mesa-activo` | **Alta** | Separar «no hay dato» de «no te lo enseño». Para lo segundo, barra sin cifras y etiqueta de estado: Ileso / Arañado / Herido / Malherido / A punto de caer. Ver §21.4 |
| 4.2 | La franja «Economía del turno» muestra al combatiente activo en la vista del DM y al personaje propio en la del jugador. El mismo componente significa dos cosas distintas | `dm:mesa-activo` vs `jug:mesa-activo` | **Alta** | Que muestre siempre el turno activo, y que el jugador vea además una línea propia cuando no coincida. Ver §21.5 |
| 4.3 | Empate de iniciativa a 17 entre Brann y el grupo de goblins, sin desempate ni marca de que están empatados | `dm:mesa-activo` | Media | Distintivo «empate» en las dos filas implicadas y una entrada «Desempatar» en el mismo menú donde ya vive «Corregir la iniciativa», que reordene sin pedir número |
| 4.4 | El grupo de criaturas idénticas se rotula concatenando nombres: «Goblin 3 · Goblin 2 · Goblin 1» | `dm:mesa-activo` | Media | Rotular «Goblins ×3» y desplegar los tres al pulsar. El `aria-label` de las acciones pasa a «Apuntar al grupo de 3 goblins» |
| 4.5 | El botón «Atacar» se deshabilita con la razón «no es tu turno» solo al final, después de abrir la categoría y leer el ataque | `jug:mesa-activo-barra-Ataques` | Media | Atenuar la barra entera fuera de turno, con una línea encima: «No es tu turno. Le toca a Sylas». Dentro, los ataques se siguen pudiendo leer, pero el estado ya se sabía antes de abrir |
| 4.6 | Ese botón usa `aria-disabled`, no `disabled`: sigue siendo enfocable y clicable | ídem | Media | Unificar: `disabled` cuando la acción no existe; `aria-disabled` solo si al pulsar se explica por qué. Si se elige lo segundo, hay que manejar el clic y mostrar el motivo |
| 4.7 | No hay daño en área: aplicar una bola de fuego a tres goblins son tres diálogos | `dm:mesa-activo-dano` | **Alta** | Convertir el objetivo del diálogo de daño en selección múltiple, con opción por objetivo de «salvación superada → mitad». Ver §21.6 |
| 4.8 | El diálogo de daño no contempla resistencias ni vulnerabilidades pese a pedir el tipo de daño | `dm:mesa-activo-dano` | Media | Al elegir el tipo, si el objetivo tiene resistencia o vulnerabilidad, mostrar un aviso bajo el campo («Klarg resiste el fuego: se aplicarán 6 en vez de 12») y aplicar el ajuste, con posibilidad de desmarcarlo |
| 4.9 | El movimiento se gasta con un campo numérico por defecto a 5 y un botón «Mover» | `dm:mesa-activo`, `jug:mesa-activo` | Baja | Botones rápidos −5 y −10 pies junto al campo, que es como se juega en la práctica |
| 4.10 | No hay forma de deshacer un turno pasado ni un daño aplicado | todo el combate | **Alta** | Pila de deshacer por encuentro, con «Deshacer» en la franja del combate y `Ctrl+Z`. Cada suceso del registro guarda su inverso. Ver §21.7 |
| 4.11 | No se ve el estado de concentración de nadie en la tira de turnos | `dm:mesa-activo` | Media | Distintivo de concentración en la fila de la tira, y aviso automático de salvación cuando ese personaje recibe daño |

---

## 5. Fin de combate

| # | Problema | Dónde | Gravedad | Cómo corregirlo |
|---|---|---|---|---|
| 5.1 | Error de plural: «queda con sus **1 asalto** y su rastro en el registro» | `dm:mesa-activo-terminar` | Baja | `Intl.PluralRules` o un ayudante `plural(n, 'asalto', 'asaltos')`, y concordar el posesivo: «queda con su asalto» / «queda con sus 3 asaltos» |
| 5.2 | El reparto de XP vuelve a listar a los PNJ con casillas deshabilitadas y repite «Un PNJ de statblock no acumula XP» una vez por criatura | `dm:mesa-fin` | Media | No listarlos. Una sola nota al pie: «Las criaturas del bestiario no acumulan experiencia» |
| 5.3 | «statblock» es jerga en inglés dentro de una interfaz que en todos lados dice «criatura» | `dm:mesa-fin`, `dm:mesa-Dar XP` | Media | Reemplazar la cadena por «criatura del bestiario» en las dos apariciones |
| 5.4 | El jugador no recibe ninguna señal del fin del combate salvo una línea de registro | `jug:mesa-fin` | Media | Aviso de cierre con el resumen: «Termina el combate — 1 asalto» y, si el DM reparte XP, «+250 PX» |

---

## 6. Puntos de golpe, daño y curación

| # | Problema | Dónde | Gravedad | Cómo corregirlo |
|---|---|---|---|---|
| 6.1 | **Tres interfaces distintas para lo mismo**: botones ±5 en la tarjeta del jugador; diálogo de cantidad para el DM; y en la hoja un panel de 6 controles (cantidad, tipo, crítico, «De qué tirada sale», motivo, «Corregir a un número exacto») | `jug:mesa`, `dm:mesa-activo-dano`, `dm:personaje-Recursos` | **Alta** | Un componente único con lo básico visible y lo avanzado plegado. Ver §21.2 |
| 6.2 | En la hoja, los botones dicen **«Recibo daño» / «Me curo»**, en primera persona, aunque el DM esté mirando la hoja de otro | `dm:personaje-Recursos`, `dm:mesa-suhoja` | **Alta** | Texto neutro en toda la aplicación: «Aplicar daño» y «Curar». Nunca primera persona en un componente que se sirve a dos roles |
| 6.3 | El selector «De qué tirada sale» lista ~20 entradas tipo «1d20+6 = 7 · 1 natural», sin quién tiró, sin cuándo, sin motivo | `dm:personaje-Recursos` | **Alta** | Limitar a las tiradas de los últimos 5 minutos de esa mesa y formatear cada opción como «11:14 · Sylas · Daño de la daga · 1d4+1 = 5». Si no hay ninguna, el campo no se muestra |
| 6.4 | Los dados de golpe se gastan desde dos sitios distintos de la misma pestaña | `dm:personaje-Recursos` | Media | Dejar solo el contador con ± junto a «Dados de golpe (d8) 3/3», y que «Descanso corto» lea ese contador en vez de tener su propio campo |
| 6.5 | En el resumen de combate, CA, Iniciativa, Velocidad y Competencia son botones que abren «de dónde sale». **PG no es botón**, y es el dato que más se toca | hoja, en sus tres apariciones | Media | Hacer PG un botón como los demás, que abra el mismo componente de cambio de PG de 6.1 |

---

## 7. Ataques

| # | Problema | Dónde | Gravedad | Cómo corregirlo |
|---|---|---|---|---|
| 7.1 | Dos entradas al mismo acto con verbos distintos: la barra de acciones dice **«Atacar»**, la hoja dice **«Tirar»** | `jug:mesa-barra-Ataques` vs `dm:personaje-Ataques` | **Alta** | «Atacar» en los dos sitios, y que los dos lleven al mismo flujo. Dejar «Tirar» solo para la bandeja de dados suelta |
| 7.2 | El popover de ataque no tiene selector de objetivo; el objetivo se elige aparte con «Apuntar a X» en las tarjetas | `jug:mesa-barra-Ataques` | **Alta** | Selector de objetivo dentro del popover, precargado con el apuntado. Ver §21.8 |
| 7.3 | Fuera de combate solo se puede apuntar a compañeros, porque no hay tarjetas de enemigo | `jug:mesa` | **Alta** | Se resuelve con 1.1 |
| 7.4 | La tabla de ataques de la hoja muestra bonificador y daño pero no permite tirar el daño, solo el ataque | `dm:personaje-Ataques` | Media | Tras la tirada de ataque, ofrecer «Tirar daño» en el mismo resultado, con los dados duplicados si el ataque fue un 20 natural |
| 7.5 | No hay ventaja ni desventaja en el ataque desde la barra, aunque sí existen en la bandeja de dados y en «Pedir tirada» | barra de acciones | **Alta** | Tres botones Normal / Ventaja / Desventaja en el popover de ataque, con el mismo componente que ya usa la bandeja de dados |
| 7.6 | Nada conecta la tirada de ataque con la CA del objetivo apuntado | todo el flujo | Media | Si hay objetivo y el servidor conoce su CA, el resultado dice «19 contra CA 15: impacta». Si la CA está oculta para quien tira, solo el total |

---

## 8. Hoja de personaje

| # | Problema | Dónde | Gravedad | Cómo corregirlo |
|---|---|---|---|---|
| 8.1 | El avatar muestra `[` como inicial: toma el primer carácter sin saltar el prefijo del nombre | hoja, panel del jugador y panel del DM | Media | Extraer la primera letra real: `nombre.match(/\p{L}/u)?.[0]?.toUpperCase() ?? '?'` |
| 8.2 | Iniciativa se muestra como `4` y Competencia como `2`, sin signo, mientras habilidades y salvaciones usan `+4` / `−1` | resumen de combate | Media | Pasar los dos por el mismo formateador de modificadores que ya usan las habilidades (signo siempre, incluido el `+0`) |
| 8.3 | Destreza enseña el modificador `+4` junto a un campo que dice `16` y debajo «+2 mediano = 18». Tres números que no cuadran a simple vista | pestaña Números | Media | El campo editable muestra la puntuación final (18); el desglose («16 base +2 mediano») pasa al «de dónde sale» que ya existe para los demás valores |
| 8.4 | La hoja de otro jugador se sirve como el formulario completo con ~20 controles deshabilitados y el mensaje «Solo el dueño o el DM puede editar este personaje» repetido 5 veces | `jug:personaje` | **Alta** | Vista de lectura: los mismos datos como texto, sin campos ni botones, y un solo aviso arriba. Ver §21.9 |
| 8.5 | Se mezclan `disabled` nativo y `aria-disabled` en la misma página | `jug:personaje` | Media | Con 8.4 desaparece el problema en esta pantalla; para el resto, la regla de 4.6 |
| 8.6 | «Vista de DM: puedes anular a mano 5 valores derivados… desde “Anulaciones del DM”» es un párrafo que explica dónde está un control en vez de ser el control | `dm:personaje` | Media | Sustituir el párrafo por un botón «Anulaciones del DM» que abra el panel, con la lista de los 5 valores dentro |
| 8.7 | «0 / 2 700 PX» usa espacio como separador de miles mientras los pesos usan punto decimal («1.4 kg») | hoja y bolsa | Baja | Un solo formateador `Intl.NumberFormat('es-ES')` para todos los números de la aplicación |

---

## 9. Bolsa e inventario

| # | Problema | Dónde | Gravedad | Cómo corregirlo |
|---|---|---|---|---|
| 9.1 | Cinco monedas, cada una con su campo y su botón «Aplicar»: 10 controles para tocar el dinero | `jug:mesa-bolsa` | Media | Las cinco monedas quedan como lectura. Un solo control debajo: cantidad + selector de moneda + «Aplicar», con signo para quitar |
| 9.2 | No hay conversión entre monedas ni total | ídem | Media | Línea de total en oro equivalente bajo las cinco, y acción «Cambiar monedas» que agrupe cobre y plata en oro |
| 9.3 | Diez chips de filtro en fila sin opción de «Todo» para volver atrás | ídem | Baja | Chip «Todo» al principio, siempre activo por defecto, y separar en dos grupos: estado (equipado, encima, guardado, sintonizado) y tipo (arma, armadura, escudo, consumible, impedimenta, objeto) |
| 9.4 | La carga dice «3.5 kg de 109 kg» con punto decimal | ídem | Baja | Mismo formateador de 8.7 |

---

## 10. Dados y tiradas

| # | Problema | Dónde | Gravedad | Cómo corregirlo |
|---|---|---|---|---|
| 10.1 | En la bandeja del **DM**, las opciones de audiencia están escritas desde el punto de vista del jugador: «Privada del DM — La ves tú y el DM» y «A ciegas — Solo el DM ve el resultado; **tú no**» | `dm:mesa-dados` | **Alta** | Texto neutro que sirva a los dos roles: «Pública — la ve toda la mesa», «Privada — solo quien tira y el DM», «A ciegas — solo el DM». Nunca «tú» dentro de un componente compartido |
| 10.2 | Lo mismo en «Pedir una tirada» | `dm:mesa-Pedir tirada` | **Alta** | Mismas cadenas que 10.1, compartidas desde un único sitio |
| 10.3 | El diálogo repite título y explicación: cabecera «Pedir una tirada / Se pide un valor de la hoja, no una expresión: la compone el servidor» y justo debajo el mismo titular con la frase más larga | `dm:mesa-Pedir tirada` | Media | Quitar la cabecera interna. Ver §21.10 |
| 10.4 | «Sin animación» es una casilla por tirada, y no hay interruptor global | `dm:mesa-dados` | Media | Preferencia en Cuenta (ver 19.3); la casilla de la bandeja queda como excepción puntual |
| 10.5 | En «De dónde sale» la etiqueta **«Dice»** (del verbo decir) colisiona con el dominio de dados | `dm:mesa-dedondesale` | Baja | Renombrar a «Resultado» |
| 10.6 | Un `role="radiogroup"` envuelve un `fieldset` con radios nativos: semántica duplicada | `dm:mesa-dados` | Baja | Quitar el `role="radiogroup"` del contenedor y dejar el `fieldset` con `legend` |

---

## 11. Registro de la sesión

| # | Problema | Dónde | Gravedad | Cómo corregirlo |
|---|---|---|---|---|
| 11.1 | Los sucesos del sistema se duplican | registro | Media | Ver 3.7 |
| 11.2 | El registro arrastra combates anteriores abortados («Empieza el combate» / «Termina el combate en un asalto» / «Empieza el combate») sin separarlos | `jug:mesa-activo` | Media | Separador de encuentro entre bloques, con el mismo tratamiento visual del separador «Desde aquí te perdiste N sucesos», y el encuentro cerrado plegado por defecto |
| 11.3 | Los tres filtros (Todo / Relato / Números) son chips de ~20 px de alto | todas las mesas | Media | Cambiar `py-0.5` por `py-s1` y fijar `min-height: 32px` |
| 11.4 | El separador «Desde aquí te perdiste N sucesos» está bien, pero no hay forma de saltar al final | registro | Baja | Botón flotante «Ir a lo último» cuando el registro no está al final |

---

## 12. Condiciones y estado

| # | Problema | Dónde | Gravedad | Cómo corregirlo |
|---|---|---|---|---|
| 12.1 | La leyenda dice **«Las quince del manual»** y el grupo contiene **17 botones**: «Te ayudan» y «En furia» no son del manual y están dentro | `dm:mesa-condicion` | Media | Mover esos dos botones al grupo «De la mesa, no del manual», donde ya está Concentración. La leyenda debería además contar sola desde los datos, no traer el número escrito a mano |
| 12.2 | «De la mesa, no del manual» es un `<p>` haciendo de leyenda mientras el grupo de arriba usa `<legend>` | ídem | Baja | Convertirlo en `fieldset` + `legend` como el otro |
| 12.3 | Las condiciones se ponen desde dos sitios con interfaces distintas: rejilla de botones en la mesa, desplegable en la hoja | `dm:mesa-condicion` vs `dm:personaje-Estado` | Media | Un solo componente de condición, usado en los dos sitios. La rejilla funciona mejor: se ve el catálogo entero de un vistazo |
| 12.4 | Las duraciones también difieren: la mesa ofrece 10 opciones del reloj de campaña, la hoja ofrece 5 en segundos | ídem | Media | Una sola lista de duraciones, la del reloj de campaña, compartida por los dos |

---

## 13. Mundo, entidades y revelar

| # | Problema | Dónde | Gravedad | Cómo corregirlo |
|---|---|---|---|---|
| 13.1 | El diálogo mete la cabecera de la página dentro: «Consulta del mundo» y debajo «El mundo, sin salir». Dos `h2` | `dm:mesa-Consultar el mundo` | Media | Ver §21.10 |
| 13.2 | Cinco niveles de visibilidad (Solo DM, DM y creador, Jugadores concretos, Jugadores, Público) representados con glifos abstractos ● ◆ ◈ ◐ ○ | entidades, revelar | Media | Reducir a tres (Solo DM, Jugadores, Público) y tratar «creador» y «jugadores concretos» como excepciones añadidas a esos tres. Los glifos, siempre con su etiqueta al lado, nunca solos |
| 13.3 | El botón «Ejecutar» está deshabilitado y su explicación aparece dos veces: en el `title` y como texto debajo | `dm:entidad` | Baja | Dejar solo el texto visible y quitar el `title` |
| 13.4 | El bloque de reglas termina mandando a otra pantalla: «Componer, ensayar y armar siguen en la pestaña Reglas» | `dm:mesa-Bloques de reglas` | Baja | Poner esa aclaración en la cabecera del diálogo, no al final, para que no se lea como un callejón sin salida |

---

## 14. Campaña (el taller)

| # | Problema | Dónde | Gravedad | Cómo corregirlo |
|---|---|---|---|---|
| 14.1 | **Dos sistemas de navegación en la misma franja**: «Cajones del taller» (Personajes, Bestiario, Catálogo) son botones sin URL; el `tablist` (Resumen, El mundo, Sesiones, Reglas, Dados, Tablas, Ajustes) sí lleva `?seccion=`. Tres de diez destinos no se pueden enlazar ni sobreviven a un recargue | `dm:campana` | **Alta** | Dar URL propia a los tres cajones (`?cajon=personajes`) y separarlos visualmente de las pestañas. Ver §21.11 |
| 14.2 | Una etiqueta suelta «La mesa» aparece dentro del `tablist`, entre dos pestañas | ídem | Baja | Sacarla del `tablist` (rompe la navegación por flechas) y ponerla como encabezado encima del grupo |
| 14.3 | Dados y Tablas existen como pestaña de campaña y como panel de mesa; «El mundo» como pestaña y «Consulta del mundo» como diálogo | campaña y mesa | Media | La campaña es donde se crean y editan; la mesa es donde se consultan y usan. Que los paneles de la mesa sean explícitamente de consulta, con un enlace «Editar en el taller» |
| 14.4 | Diez destinos de primer nivel en la campaña | ídem | Media | Tres grupos: **Material** (Personajes, Bestiario, Catálogo, Tablas), **Mundo** (El mundo, Reglas), **Partida** (Resumen, Sesiones, Dados, Ajustes) |

---

## 15. Bestiario, tablas y sacar criaturas

| # | Problema | Dónde | Gravedad | Cómo corregirlo |
|---|---|---|---|---|
| 15.1 | «Sacar una criatura» embute el bestiario completo con su propia cabecera: dos títulos y dos explicaciones apiladas | `dm:mesa-Sacar criatura` | Media | Ver §21.10 |
| 15.2 | Lo mismo en «Tablas de la casa», que contiene «Tablas del DM» con la misma explicación repetida más larga | `dm:mesa-Tablas` | Media | Ver §21.10 |
| 15.3 | Y en «Tu bolsa», que contiene «Inventario» | `jug:mesa-bolsa` | Media | Ver §21.10 |
| 15.4 | Dentro de «Sacar criatura» aparece un control de «PG temporales + Dárselos» por cada criatura ya en mesa, que no tiene que ver con sacar criaturas | `dm:mesa-Sacar criatura` | Media | Mover ese control al menú «Más acciones» de la tarjeta de la criatura. En este diálogo, la lista «En la mesa» solo debería servir para saber qué hay ya bajado |

---

## 16. Reloj, XP y otras herramientas del DM

| # | Problema | Dónde | Gravedad | Cómo corregirlo |
|---|---|---|---|---|
| 16.1 | «Avanzar el reloj» mezcla dos acciones distintas (saltos rápidos y formulario de viaje), y el campo «Qué pasa (opcional)» queda al final, debajo de los botones rápidos que ya dispararon sin él | `dm:mesa-Avanzar el reloj` | Media | Subir «Qué pasa» justo debajo del reloj, antes de los dos bloques, para que aplique a cualquiera de los dos. Y separar «Pasa el tiempo» y «Viajáis» en dos pestañas dentro del diálogo |
| 16.2 | «Dar XP» repite «Un PNJ de statblock no acumula XP» cuatro veces | `dm:mesa-Dar XP` | Media | Ver 5.2 |
| 16.3 | Tres nombres para lo mismo: botón **«Dar XP»**, diálogo **«Dar experiencia»**, hoja **«PX»** | herramientas, hoja | **Alta** | Elegir **PX** (que es lo que dice la traducción española del manual) y usarlo en los tres sitios: botón «Dar PX», diálogo «Dar PX», hoja «0 / 2 700 PX» |

---

## 17. Nomenclatura, unidades y redacción (transversal)

| # | Problema | Dónde | Gravedad | Cómo corregirlo |
|---|---|---|---|---|
| 17.1 | **Cuatro sistemas de unidades**: velocidad en pies, alcance de arma en metros («Alcance 6/18 m»), viaje en millas por hora, peso en kilos | hoja, bolsa, reloj | **Alta** | Una sola política de unidades. Ver §21.12 |
| 17.2 | Decimales con punto («1.4 kg», «3.5 kg») y miles con espacio («2 700 PX»): dos convenios opuestos | hoja, bolsa | Baja | Un formateador único `Intl.NumberFormat('es-ES')` aplicado en todos los renderizados numéricos |
| 17.3 | Fechas con y sin año: «sábado, 19 de septiembre» y «viernes, 25 de septiembre de 2026» | home, detalle de sesión | Baja | Un ayudante de fecha con dos modos: corto (sin año, si es del año en curso) y largo, y una regla de cuándo se usa cada uno |
| 17.4 | Separador huérfano: las notas empiezan con «· Nota: …» con el punto medio antes de nada | `dm:home`, `dm:sesion-detalle` | Baja | Construir la cadena filtrando los vacíos antes de unir: `partes.filter(Boolean).join(' · ')` |
| 17.5 | Cadenas de metadatos unidas con punto medio por todas partes («Mediano · Pícaro · Nivel 3», «acción · 1d8+3 cortante») | mesa, hoja | Baja | Reservarlo para donde ordena información real; en la tarjeta de personaje, raza y clase pueden ir en dos renglones |
| 17.6 | Una acción cambia de nombre a lo largo del flujo (Atacar/Tirar, Dar XP/experiencia/PX) | varios | **Alta** | Glosario de acciones en un solo archivo de cadenas, y la regla de que el botón, el diálogo y el suceso del registro usan el mismo verbo |

---

## 18. Accesibilidad y comodidad visual (transversal)

| # | Problema | Dónde | Gravedad | Cómo corregirlo |
|---|---|---|---|---|
| 18.1 | **Contraste de texto: sin problemas.** En los tres temas todos los pares (texto, muted, acento, cobre, peligro, aviso, sobre fondo y sobre superficie) pasan 4.5:1, varios por encima de 7. Tinta sobre vitela en el tema lectura: 9.95 | tokens | — | Nada que corregir. Conviene dejarlo cubierto con una prueba automática que falle si un par baja de 4.5 |
| 18.2 | Los bordes usan `border-muted/30`, que da **1.5–1.8** de contraste contra el fondo en los tres temas. El mínimo para el contorno de un control es 3:1. Se lee el texto pero no se distingue dónde empieza y acaba cada botón | todo el chrome | **Alta** | Token propio de borde por tema en vez de opacidad sobre `muted`. Ver §21.13 |
| 18.3 | Foco desigual: en la hoja 71 de 96 controles llevan anillo propio; en la mesa del DM solo 11 de 52 y en la del jugador 12 de 38. No hay `outline-none`, así que el resto cae al anillo del navegador | mesa vs hoja | Media | Sacar el anillo de las clases de utilidad y ponerlo una vez en la capa base: `:where(button, a, input, select, textarea, [role="tab"], [role="radio"]):focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }` |
| 18.4 | Tamaño base 14 px, y 50 de los textos de la mesa a 12 px | todas las mesas | Media | Subir `--text-base` a 15 px y `--text-xs` a 13 px solo dentro de la mesa, con una variable de escala propia de esa pantalla |
| 18.5 | Botones de 24 px de alto y chips de filtro cerca de 20 px | mesa, registro | Media | `min-height: 32px` y `min-width: 32px` en todo botón de icono de la mesa; los chips, a 28 px |
| 18.6 | Tema y ornamento del fondo se guardan en el navegador, no en la cuenta | `dm:cuenta` | Baja | Guardar en la cuenta como preferencia, con `localStorage` solo como caché para evitar el parpadeo al cargar |

---

## 19. Efectos y movimiento

| # | Problema | Dónde | Gravedad | Cómo corregirlo |
|---|---|---|---|---|
| 19.1 | `prefers-reduced-motion` apaga casi todo (tarjetas, pantalla, números flotantes, dados), pero hace una excepción con el destello a pantalla completa `.fx-pantalla-destello`, que solo se acorta a 0.25 s | CSS | **Alta** | Quitar la excepción: dentro del bloque de movimiento reducido, `.fx-pantalla-destello { animation: none }`. Si hace falta señalar el suceso, sustituirlo por un cambio de color de borde sin animación |
| 19.2 | Hay 33 animaciones, incluida una por condición, sacudida de pantalla, escala de grises y brillo. Ninguna aparece en los 120 estados capturados | CSS | Media | Montar una pantalla de prueba que las dispare todas seguidas y revisarlas en bloque. Presupuesto sugerido: un efecto de pantalla por suceso, nunca dos a la vez, y ninguno por encima de 600 ms |
| 19.3 | No hay control global de efectos: el único interruptor es «Sin animación» dentro de la bandeja de dados, y es por tirada | `dm:mesa-dados`, `dm:cuenta` | Media | Preferencia en Cuenta con tres niveles: Completos / Discretos (sin efectos de pantalla, solo tarjetas y números) / Ninguno. El nivel «Discretos» es el que debería activarse solo cuando el sistema pide movimiento reducido |

---

## 20. Huecos del prototipo (no son fallos del producto, es que no están)

| # | Qué falta | Por qué importa | Qué capturar en la próxima pasada |
|---|---|---|---|
| 20.1 | El resultado de un ataque | Es el flujo central del combate | Estado tras pulsar «Atacar», con y sin objetivo apuntado, impacto y fallo |
| 20.2 | El asalto 2 en adelante | No se ve cómo se reinicia la economía ni cómo avanza el orden | «Siguiente turno» hasta cerrar la vuelta |
| 20.3 | Un personaje a 0 PG | Es el momento de más tensión de una partida | Tarjeta a 0 PG, salvaciones de muerte en la mesa, estabilización |
| 20.4 | Una condición activa en una tarjeta de la mesa | Todas las capturas dicen «Sin condiciones activas» | Tarjeta con dos o tres condiciones y una a punto de vencer |
| 20.5 | Editor de reglas, catálogo de objetos y pestaña de sesiones | Se mencionan pero no se capturaron | Las tres pantallas completas |
| 20.6 | Cualquier vista estrecha | Todo está capturado en escritorio | La mesa a 390 px y a 768 px, en los dos roles |

---

# 21. Correcciones que no caben en una celda

## 21.1 — Los PNJ viven en la mesa, no en el combate

Hoy la sección `En escena` solo se pinta cuando hay un encuentro. Debería depender de si hay PNJ bajados a la sesión, no del combate.

    Sección "En la mesa"
      ├── El grupo (N)      ← personajes de jugador
      └── En escena (N)     ← PNJ bajados, haya combate o no

La tarjeta ya existe y ya funciona: es la misma de `dm:mesa-activo`, con «PNJ · Enemigo», PG, CA, velocidad y los botones de daño, curación y más acciones. Lo único que cambia es la condición de renderizado.

Efecto secundario que hay que decidir: si un PNJ está en la mesa fuera de combate, el jugador lo verá. Eso es correcto para una taberna con un posadero, pero no para una emboscada. Conviene un interruptor por PNJ, «Visible para la mesa», que por defecto siga la visibilidad de su ficha del mundo.

## 21.2 — Un solo componente de cambio de PG

Tres interfaces distintas para el mismo acto. Propuesta de componente único, con el mismo aspecto en la tarjeta, en el diálogo y en la hoja:

    ┌─ Daño · Tessa ──────────────────────────┐
    │  Cuánto                          [ 5 ]  │
    │  De qué tipo        [ Sin especificar ] │
    │                                         │
    │  ▸ Más opciones                         │
    │    ☐ Fue un crítico                     │
    │    ¿De quién viene?   [ Sin decir    ]  │
    │    Motivo             [             ]   │
    │    ▸ Corregir a un número exacto        │
    │                                         │
    │              [ Cancelar ] [ Aplicar ]   │
    └─────────────────────────────────────────┘

Reglas:

- Lo visible siempre: cantidad y tipo. Todo lo demás, plegado.
- El jugador abre el mismo diálogo desde su tarjeta, con «Más opciones» sin la parte de «¿De quién viene?» si el DM no se lo permite.
- La hoja abre este mismo diálogo en vez de tener su propio panel de seis controles.
- Los botones, siempre «Aplicar daño» y «Curar», nunca en primera persona.

## 21.3 — Quién tira la iniciativa

El diálogo ya establece la regla correcta: cada jugador tira la suya, el DM tira la de los suyos. La implementación la contradice mandando al DM un aviso por cada personaje de jugador que falta.

    ┌─ Preparando combate ────────────────────────────┐
    │  4 de 8 han tirado                              │
    │  Faltan: Tessa, Mirela y Sylas                  │
    │                                                 │
    │  [ Tirar por los que faltan (3) ]               │
    │  [ Empezar igualmente ]  [ Cancelar ]           │
    └─────────────────────────────────────────────────┘

«Empezar igualmente» debe decir qué pasa con los que no tiraron: o el sistema tira por ellos, o entran al final del orden. Ahora mismo tira por ellos en silencio y lo escribe en el registro, que es donde nadie mira mientras empieza un combate.

## 21.4 — Ocultar los PG del enemigo

El problema no es que se oculten, es que el mensaje de «no hay dato» está haciendo de mensaje de «no te lo enseño». Son dos estados distintos y necesitan dos textos distintos.

| Estado real | Qué ve el DM | Qué ve el jugador hoy | Qué debería ver |
|---|---|---|---|
| La criatura tiene PG y el DM los oculta | `PG 7 / 7` | «Sin puntos de golpe en la hoja.» | Barra sin cifras + «Herido» |
| La criatura no tiene PG en su ficha | «Sin puntos de golpe en la hoja.» | «Sin puntos de golpe en la hoja.» | El mismo mensaje, que aquí sí es correcto |

Escala sugerida, calculada sobre el porcentaje de PG, sin revelar números: **Ileso** (100 %), **Arañado** (≥75 %), **Herido** (≥50 %), **Malherido** (≥25 %), **A punto de caer** (>0), **Fuera de combate** (0).

Y un ajuste por campaña, en Ajustes: *PG de los enemigos → Ocultos / Como estado / Visibles*. Hay mesas que los enseñan y la decisión es del DM, no del producto.

## 21.5 — Qué significa «Economía del turno»

Hoy el mismo componente muestra al combatiente activo para el DM y al personaje propio para el jugador. Hay que elegir, y la elección correcta es el turno activo, porque la franja está pegada a la tira de turnos y esa tira ya habla del turno activo.

    ┌─ Le toca: Sylas ────────────────────────────────┐
    │  ● acción   ● adicional   ● reacción   30/30 ▸  │
    └─────────────────────────────────────────────────┘
    ┌─ Tú: Brann ─────────────────────────────────────┐   ← solo si no coincide
    │  ● acción   ● adicional   ○ reacción (usada)    │
    └─────────────────────────────────────────────────┘

La segunda línea importa porque la reacción se gasta fuera del turno propio, y el jugador necesita verla en el turno de otro.

## 21.6 — Daño a varios objetivos

    ┌─ Daño ──────────────────────────────────────────┐
    │  Cuánto  [ 12 ]   De qué tipo  [ fuego      ]   │
    │                                                 │
    │  A quién                                        │
    │   ☑ Goblin 1    ☐ superó la salvación (mitad)   │
    │   ☑ Goblin 2    ☑ superó la salvación (mitad)   │
    │   ☑ Goblin 3    ☐ superó la salvación (mitad)   │
    │   ☐ Brann                                       │
    │                                                 │
    │  Se aplicarán: 12, 6, 12                        │
    │              [ Cancelar ]  [ Aplicar daño ]     │
    └─────────────────────────────────────────────────┘

El resumen en vivo («Se aplicarán: 12, 6, 12») es lo que evita el error más caro: aplicar el daño entero a quien salvó. El registro debe recoger una sola entrada de área, no tres sueltas.

## 21.7 — Deshacer

Sin deshacer, cada error de dedo obliga a corregir PG a mano y deja dos líneas falsas en el registro, que es justamente la crónica que la mesa lee después.

Alcance mínimo: daño y curación, condición puesta o quitada, turno pasado, combate terminado, PX repartida. Cada suceso guarda su inverso al crearse; «Deshacer» aplica el inverso y marca la línea original como anulada en vez de borrarla, para que la crónica siga siendo fiel.

Sitio: botón en la franja del combate, `Ctrl+Z` como atajo, y ventana corta (los últimos 10 sucesos de la sesión).

## 21.8 — Objetivo dentro del ataque

    ┌─ Ataques ───────────────────────────────────────┐
    │  Espada larga                                   │
    │  acción · 1d8+3 cortante                        │
    │                                                 │
    │  A quién   [ Goblin 2            ▾ ]            │
    │  [ Normal ] [ Ventaja ] [ Desventaja ]          │
    │                                                 │
    │                            [ Atacar ]           │
    └─────────────────────────────────────────────────┘

El selector viene precargado con quien esté apuntado, así que «Apuntar a X» sigue sirviendo como atajo pero deja de ser obligatorio. Ventaja y desventaja usan el mismo componente de tres botones que ya existe en la bandeja de dados y en «Pedir tirada», así que no hay que inventar nada.

## 21.9 — La hoja de otro, en lectura

Un formulario con veinte campos apagados es ruido: el ojo tiene que reconocer campo por campo que no puede tocarlo. Una vista de lectura es la mitad de alta y se entiende de un vistazo.

    Fuerza        8   (−1)
    Destreza     18   (+4)
    Constitución 12   (+1)

en vez de seis campos numéricos grises con el mismo `title` repetido. Un solo aviso arriba: «Estás viendo la hoja de Tessa. Solo su dueño y el DM pueden editarla».

## 21.10 — Diálogos que se comen la cabecera de la página

Es el mismo fallo cinco veces: un componente de página se reutiliza dentro de un diálogo sin quitarle su cabecera, y salen dos títulos y la explicación repetida.

| Diálogo | Título del diálogo | Título que trae dentro |
|---|---|---|
| Sacar una criatura | «Sacar una criatura» | «Bestiario» |
| Tablas de la casa | «Tablas de la casa» | «Tablas del DM» |
| Consulta del mundo | «Consulta del mundo» | «El mundo, sin salir» |
| Tu bolsa | «Tu bolsa» | «Inventario» |
| Pedir una tirada | «Pedir una tirada» | «Pedir una tirada» otra vez |

Corrección: que esos componentes reciban su cabecera como propiedad en vez de dibujarla ellos, de forma que el diálogo pase `cabecera={null}` y la página pase la suya. Y una regla de revisión: **un diálogo tiene exactamente un `h2`**, el suyo.

## 21.11 — Cajón o pestaña, pero no las dos cosas

Diez destinos en la misma franja, de los que tres no tienen URL. Dos salidas posibles:

**A. Todo son pestañas.** Personajes, Bestiario y Catálogo pasan a `?seccion=`, y la franja tiene diez pestañas. Sencillo, pero diez es demasiado.

**B. Cajón y pestaña se distinguen.** Los tres cajones se mueven a un sitio visualmente distinto (una fila superior de tarjetas grandes, o un botón «Material del taller» que abre un panel), y se les da URL propia igualmente. Las pestañas se quedan en siete.

Recomiendo B, con el reagrupado de 14.4. Lo que no puede quedarse es el estado actual, donde dos cosas que se ven iguales se comportan distinto.

## 21.12 — Una política de unidades

Ahora mismo conviven pies (velocidad), metros (alcance de arma), millas (viaje) y kilos (peso). Hay que elegir:

**Opción imperial**, que es la del manual: pies, libras, millas. Coherente con el SRD y con lo que los jugadores leen en cualquier mesa.

**Opción métrica**, que es la de la traducción española: metros, kilos, kilómetros. Coherente con el público.

Cualquiera de las dos sirve. Lo que no sirve es la mezcla. Implementación: los datos se guardan siempre en una unidad canónica (pies y libras, que es como vienen del SRD) y se formatean al vuelo con un ayudante `formatearDistancia()` / `formatearPeso()` que lee la preferencia de la campaña. Así se puede ofrecer el interruptor en Ajustes sin tocar los datos.

## 21.13 — El token de borde

El problema es que el borde se construye como `muted` al 30 %, y `muted` está calibrado para texto secundario, no para contornos. Al bajarlo al 30 % queda en 1.5–1.8:1.

Corrección: un token propio por tema, calibrado a 3:1 contra el fondo, y sustituir `border-muted/30` por `border-borde` en todo el chrome.

    :root            { --borde: rgb(72 88 97); }   /* oscuro  */
    [data-theme=light]   { --borde: rgb(160 152 136); }
    [data-theme=reading] { --borde: rgb(92 80 58); }

Los valores exactos hay que medirlos, pero el criterio es fijo: el contorno de cualquier control debe dar 3:1 contra la superficie sobre la que se dibuja. Conviene una prueba automática igual que la de 18.1.

---

## Las diez primeras

Por orden de lo que más cambia la partida:

| Orden | Qué | Referencia |
|---|---|---|
| 1 | Ocultación deliberada de los PG del enemigo, en vez de un mensaje de dato ausente | 4.1 · §21.4 |
| 2 | Un solo componente de cambio de PG para jugador, DM, tarjeta y hoja | 6.1 · §21.2 |
| 3 | Los PNJ en la mesa también fuera de combate | 1.1 · §21.1 |
| 4 | Objetivo y ventaja dentro del flujo de ataque, y un solo verbo | 7.1, 7.2, 7.5 · §21.8 |
| 5 | Daño a varios objetivos a la vez | 4.7 · §21.6 |
| 6 | Deshacer en el combate | 4.10 · §21.7 |
| 7 | «Economía del turno» con un solo significado | 4.2 · §21.5 |
| 8 | Bordes a 3:1 y objetivos táctiles a 32 px | 18.2, 18.5 · §21.13 |
| 9 | Apagar del todo el destello a pantalla completa con movimiento reducido | 19.1 |
| 10 | Resolver la navegación de la campaña | 14.1 · §21.11 |
