# Mapa de los recorridos de extremo a extremo

**Qué cubre cada suite, y por qué esa comprobación no puede vivir en otra capa.**

[08-pruebas.md](./08-pruebas.md) explica la estrategia —las capas, las reglas, la definición de
terminado— y es la **fuente única de los conteos**. Este documento es el mapa: suite a suite, qué
demuestra. Se escribió porque no existía, y sin él la única forma de saber si algo estaba cubierto
era abrir cincuenta ficheros.

**Dos familias, dos preguntas distintas:**

| | Dónde | Contra qué corre | Qué pregunta responde |
|---|---|---|---|
| **e2e de API** | `apps/api/test/*.e2e-spec.ts` | **Postgres real**, la aplicación Nest entera | ¿La cadena HTTP → guardia → validación → servicio → base hace lo que dice, con el código de estado correcto? |
| **Recorridos de navegador** | `apps/web/e2e/*.spec.ts` | Chromium, con la **API real compilada** detrás | ¿Una persona puede hacerlo, y se ve como debe? |

> **La regla que las separa.** Una unitaria con Prisma simulado no bloquea filas, no valida SQL, no
> tiene índices y no maqueta nada. Todo lo que dependa de eso **tiene** que estar aquí, y cada
> suite de API lleva escrito en su cabecera por qué no puede ser unitaria. Si una comprobación
> cabe en una unitaria, va en una unitaria: estas son caras y lentas.

---

## e2e de API

### Identidad y acceso

| Suite | Qué demuestra |
|---|---|
| `auth` | Registro, sesión y `/auth/me`. Cambiar el nombre visible y la contraseña; **cambiar la contraseña invalida los tokens emitidos antes**, que es una regla de seguridad y no una comodidad. Sin token, 401. |
| `rate-limit` | El límite de intentos en registro, sesión, cambio de contraseña y aceptación de invitación: el 429 llega cuando se agotan, por IP. |
| `trust-proxy` | **Que el límite no se puede evadir cambiando la cabecera `X-Forwarded-For`** en cada intento, y que un salto real distinto sí tiene su propia cuota. Es la comprobación que justifica el número de proxies de confianza en producción. |
| `security-headers` | Las cabeceras de Helmet salen **en toda respuesta, incluida una 401**, y no hay cabeceras CORS si no se configuró origen. |
| `invites` | El DM invita, el jugador acepta y entra; quien no es DM no puede invitar; **una invitación no se reutiliza**. |
| `members` | Listar miembros con su papel; expulsar a alguien le quita de verdad el acceso a lo que era visible para jugadores; un extraño recibe 403. |
| `notifications` | Aceptar una invitación notifica al DM; **nadie ve las notificaciones de otro**, ni las marca leídas. |

### El mundo y la campaña

| Suite | Qué demuestra |
|---|---|
| `campaigns` | Quien crea una campaña queda como DM; leerla y editarla exige el papel correcto; **borrar una campaña se lleva en cascada todo lo que cuelga de ella**, y eso se comprueba **contando filas de verdad** en cada tabla, no fiándose del 200. Cada tabla nueva del proyecto se añade aquí: una que falte es un huérfano que no avisa. |
| `entities` | El listado se filtra por visibilidad para el jugador; el cuerpo Markdown se guarda y vuelve idéntico; se rechaza un formato que no es Markdown y un texto desmesurado. |
| `links` | Enlazar dos fichas, rechazar el enlace de una consigo misma, y que **el jugador solo vea los enlaces cuyo destino puede ver**. |
| `comments` | Comentar una ficha visible; **no se puede comentar una `DM_ONLY`**. |
| `sessions` | El DM crea sesiones; el jugador no; el listado se filtra por visibilidad. |
| `world-state` | Marcas y conjuntos del mundo: solo el DM escribe, poner la misma marca la sobrescribe en vez de duplicarla, quitar un miembro dos veces no falla, y **una señal levantada por el DM queda `DM_ONLY` en el registro**. |
| `game-state` | **Como mucho una sesión en curso por campaña, y lo garantiza un índice único parcial de Postgres, no un `if`.** Arrancar escribe su suceso; un suceso `DM_ONLY` no sale en el registro del jugador; un límite de consulta inválido es 400 y no una consulta sin tope. |

### La hoja de personaje y su estado

| Suite | Qué demuestra |
|---|---|
| `character-sheet` | Rellenar la hoja y que el servidor derive PG máximos y CA. Una hoja a medias devuelve **un motivo, no un 500**; una clave de catálogo desconocida es 400. **Dos deltas de PG lanzados a la vez aterrizan los dos** —el Prisma simulado no bloquea filas, así que esa carrera solo se ve aquí—; una corrección absoluta exige DM y versión, y una versión vieja da 409 **con el estado actual dentro**. Salvaciones de muerte, el cuadro de ataques y el 403 de quien no es miembro. |
| `character-state` | Recursos propios, gastarlos, y las tres reglas de descanso que importan: **el largo devuelve la mitad de los dados de golpe, no todos**, y **el brujo repone en el corto**. Un jugador no puede subir un recurso `DM_ONLY`. |
| `level-up` | Subir de nivel escribe su suceso y sube los PG máximos en la cantidad prevista; el previo es idempotente; **el nivel 20 es el techo**. |
| `catalog-y-velocidad` | El catálogo en español y **la velocidad ya afectada por las condiciones, con su traza**, servidos por el servidor. Existe para que la pantalla **deje de calcular**: es el viaje lo que hay que demostrar. |
| `inventory` | Meter, equipar, mover y gastar. **Dos peticiones simultáneas de equipar en la misma ranura vacía: una gana y la otra no**, y lo garantiza un índice único parcial. Un objeto `DM_ONLY` no se le puede dar a quien no lo ve, y **uno de otra campaña del mismo DM no entra**. La bolsa no baja de cero. |
| `campaign-items` | Los objetos propios del DM: crear, filtrar por visibilidad, editar, y **no poder borrar uno que alguien lleva encima** (409) hasta vaciarlo. |
| `condiciones-con-duracion` | Una condición se guarda con **la hora en que vence, no con su duración**; mientras vive frena de verdad; al pasar su hora deja de aplicarse **y el jugador ve por qué**; no se vuelve a anunciar. Y **el agotamiento 4 parte los PG máximos, con la curación topando contra ese máximo**. |
| `game-clock` | El reloj es **una columna que sube de verdad**; solo el DM lo avanza; viajar pide las salvaciones de marcha forzada; **un segundo descanso largo en menos de 24 horas de juego se rechaza con un 409 que dice cuánto falta**; a 0 PG no se descansa largo; un descanso interrumpido no cura. |

### Dados, reglas y PNJ

| Suite | Qué demuestra |
|---|---|
| `rolls` | Quién puede tirar por qué hoja. **Una tirada a ciegas no lleva el resultado en la respuesta del jugador**, y el DM sí lo ve — se comprueba sobre el cuerpo HTTP. El azar es del servidor (treinta d20 dentro de rango). El registro filtra por sesión y por personaje, y **«solo las mías» son las de mis personajes**, no las de la mesa. |
| `peticion-de-tirada` | El DM pide **un valor de la hoja**, le llega a quien es y a nadie más; **otro jugador recibe 404 y no 403**, porque un 403 confirmaría que existe; se tira con el modificador de la hoja de quien responde; no se responde dos veces; la variante a ciegas no le enseña el resultado a quien tira. |
| `tablas-del-dm` | **Las tablas de la casa nacen apagadas** y el listado lo dice. Una tabla con un hueco se rechaza con una frase legible; **una segunda tabla de pifias la rechaza la base** (índice único parcial); varias sin disparador conviven; **un jugador que no ve una tabla recibe 404 al tirarla**; editar reemplaza las filas enteras. |
| `rules-engine` | El motor de reglas es **del DM entero**: incluso listar es 403 para un jugador. Una propuesta no cambia nada hasta que el DM la aplica; el ensayo en seco **dice qué pasaría y no persiste**; con el interruptor apagado, una regla que encaja no hace nada. |
| `statblocks` | El catálogo del SRD lo ve cualquiera que juegue. **El statblock propio del DM no viaja al jugador**, y se comprueba sobre el cuerpo serializado. Las columnas de lista y los campos Json sobreviven al viaje por Postgres; **editar un campo no borra los otros veinte**, comprobado contra la fila; uno de otra campaña da 404. |
| `pnj-en-la-mesa` | El bucle entero de un PNJ: instanciar (solo DM, con tope), que **nazca escondido**, que su hoja se derive del statblock con su traza, que reciba daño, que una anulación del DM salga con su delta, y que **el agotamiento le parta los PG máximos sin que se escribiera una línea de agotamiento para PNJ** — que es lo que justifica la decisión de diseño de la fase 2D. Y las tres comprobaciones de la revisión de cierre: **los números de un statblock `DM_ONLY` no llegan al jugador por la hoja**, el `ref` de una plantilla escondida no viaja, y los PNJ no salen en el listado de personajes. |
| `validacion` | Que un cuerpo inválido diga **qué campo falta y en español**, con la ruta completa de un campo anidado y la lista de los objetivos que sí existen. Y que **no sea un oráculo**: dos identificadores inexistentes son indistinguibles. |

### La partida entera

| Suite | Qué demuestra |
|---|---|
| `partida` | **Doce pasos seguidos, en orden, como una sesión de verdad**: montar la mesa con dos jugadores, crear personajes, el aviso de una hoja a medias, el mundo con una ficha que no deben ver, arrancar la sesión, tirar y que la tirada se cuelgue sola de la sesión en curso, la tirada oculta del DM, caer a 0 PG y estabilizarse, volver a la vida y descansar, una condición bajando la velocidad con su traza, el 403 de tocar la hoja de otro, y cerrar la sesión con **cada uno viendo su versión del registro**. Es la suite que caza lo que las demás no ven: **los defectos aparecen al juntar carriles que estaban verdes por separado**. |

---

## Recorridos de navegador

### Que el sistema se puede usar

| Suite | Qué demuestra |
|---|---|
| `campana` | Del registro a ver una ficha creada; enlaces y comentarios ejercitados de verdad; borrar una entidad se lleva sus enlaces; crear sesión y personaje con su visibilidad; el Markdown que vuelve como encabezado; filtrar por etiqueta; y editar, expulsar y borrar desde Ajustes. |
| `invitacion` | **Dos contextos de navegador**, con cookies y almacenamiento propios, como dos navegadores distintos: el DM invita, el jugador entra por el enlace, se registra desde ahí y **no ve la entidad `DM_ONLY`**. |
| `cuenta` | Cambiar la contraseña **invalida el token viejo contra la API real**; la contraseña equivocada no cierra la sesión; una ruta inventada y una campaña inexistente dicen qué pasa **en vez de dejar la pantalla en blanco**. |
| `sesion` | La sesión entera desde la interfaz: empezar, sellar, verla en la mesa y cerrarla con la crónica; el elenco leyendo los PG de la hoja calculada; una anotación desde la mesa. |
| `hoja` | La hoja con datos reales: completar, ver la traza, tirar, cambiar PG. Y lo que solo se ve maquetado: la cabecera fija, **un paso de la traza llevando el foco a su causa**, que lo editable se distinga de lo derivado, y que las veinticuatro líneas de habilidad quepan. |
| `inventario` | Equipar una armadura **cambia la CA y añade su paso a la traza**; un arma equipada llega al cuadro de ataques y se tira; el catálogo propio se distingue del SRD. |
| `subir-nivel` | El servidor propone el diff, **tirar no aplica nada**, y confirmar deja la hoja en el nivel nuevo. |
| `dados` y `tirada` | El desglose y no solo el total; **el dado descartado pintado tachado** —que solo se puede medir en un navegador—; el motivo del evaluador real junto al campo; y **a ciegas, el total no viaja: se mide sobre la respuesta HTTP, no sobre el DOM**. |
| `peticion-de-tirada` | El DM pide, **a la jugadora le aparece sin recargar**, tira, y el DM ve el resultado. |
| `reglas` y `reglas-arrastrar` | Escribir una regla, armarla y ensayarla en seco sin dejar traza; clonar una plantilla. Y el tablero de arrastre medido: cada pieza con su silueta, los carriles rechazando lo que no es suyo, el orden en pantalla ancha y estrecha, y **los conectores en color y negrita, porque el color no puede decidir solo**. |
| `tablas-del-dm` | Que lo primero que se lea sea **que esto no es del manual**; que el interruptor diga su posición **leída del servidor**; y que un error enseñe **la frase del servidor** y no una genérica. |
| `bestiario` | Las quince criaturas con sus números; **ningún valor de enumeración en pantalla**; la velocidad en pies; bajar una criatura a la mesa de punta a punta; y que **el botón no prometa un combate que no existe**. |
| `condiciones-con-duracion` | Una condición vencida **se marca y no desaparece**, y los PG partidos por agotamiento **se explican en la hoja**. |

### Que se ve como debe

`jsdom` no maqueta. Todo lo de esta tabla puede estar roto con la suite de componentes entera en
verde — ya pasó con un borde partido, y por eso estas comprobaciones son regla y no adorno.

| Suite | Qué mide |
|---|---|
| `armazon` | El pie apoyado en el borde inferior con poco contenido; **ninguna entrada del carril sin su icono dibujado**; la marca. |
| `tokens-contrast` | **El contraste real, medido, en los dos temas** y en las pantallas de sesión, campaña, 404, atribución y cuenta. Y que un control de formulario **no dispare el zoom de iOS Safari** en un puntero basto. |
| `clases-que-si-pintan` | Que las superficies que la aplicación promete **se pintan de verdad** — la comprobación que caza una clase de Tailwind que no existe y compila a nada. |
| `ficha-lectura` | El enlace que se lee como frase por sus dos lados; la capitular, los párrafos y la medida corta; el contraste de la página de lectura en los dos temas. |
| `capturas-comparacion` | Capturas de nuestras pantallas **para compararlas con el prototipo**. No afirma nada por sí sola: es material para el ojo humano. |

---

## Lo que ningún recorrido cubre hoy

Se dice aquí para que nadie lo dé por cubierto al leer la lista de arriba.

- **Nada de un sistema de encuentros**, porque no existe: no hay iniciativa, ni turnos, ni un
  ataque comparado contra la CA en el servidor, ni daño aplicado desde una tirada. **Es un bloque
  planificado** —el plan maestro lo sitúa entre la fase 2 y la 3— y lo único suyo que ya está
  construido son los statblocks de PNJ con PG vivos, que entregó 2D.
- **La partida de prueba con dos cuentas de jugador reales**, jugada por personas. `partida`
  recorre los doce pasos por HTTP, pero **nadie ha jugado una sesión de verdad en producción**: es
  lo único que le queda a la fase 2.
- **El disparo automático de una tabla de críticos o pifias.** Necesita que el d20 saque un 20 o un
  1 a voluntad, y el tirador solo se fija inyectándolo — lo cubren las unitarias. Un recorrido que
  tirara cuarenta veces esperando un natural sería una prueba que a veces no prueba nada, y además
  desbordaría el límite de peticiones.
- **El móvil.** No hay recorrido en viewport de teléfono más allá de la comprobación del zoom de
  iOS. La hoja en móvil está declarada como objetivo y no está medida.
- **La accesibilidad más allá del contraste y el foco.** No hay auditoría de lector de pantalla.
- **La carga.** Nada mide qué pasa con doscientas fichas o con cincuenta tiradas por minuto.
- **La recuperación ante desastre de la aplicación.** El servidor tiene su documento
  ([03-despliegue.md](./03-despliegue.md)), pero **restaurar la base de esta aplicación y seguir
  jugando no está probado desde la propia aplicación**, y la copia de seguridad sigue con la ficha
  abierta en [06-pendientes.md](./06-pendientes.md).

## Cómo se corren

```bash
docker compose up -d                     # Postgres 16 en :5432 — los e2e de API lo necesitan
pnpm --filter @dnd/api test:e2e          # todos los de API
pnpm --filter @dnd/api test:e2e -- rolls # una suite
pnpm --filter @dnd/web e2e               # todos los de navegador (Chromium)
pnpm --filter @dnd/web e2e -- e2e/hoja.spec.ts   # una sola, por RUTA
```

> **Dos trampas que ya costaron tiempo.** El filtro de Playwright es una expresión sobre la ruta:
> `-- hoja` también engancha otras suites, así que para correr **una sola** hay que dar la ruta
> entera. Y `reuseExistingServer` reaprovecha un servidor ya levantado: **si se cambia una variable
> de entorno del servidor hay que matar el proceso viejo**, o la tanda corre contra la
> configuración anterior sin decirlo.
