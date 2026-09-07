# Estrategia de pruebas

**Qué prueba cada capa, qué NO cubre, y qué demuestra cada recorrido, suite a suite.**
Léelo antes de dar una tarea por terminada, y antes de escribir un e2e nuevo: la mitad de las
veces ya existe.

> Hasta el 2026-09-03 esto eran dos documentos —el 08 decía *cómo* se prueba y el 10 *qué* está
> probado— y se solapaban en media superficie: los dos listaban la cobertura, y solo uno se
> mantenía al día. Se fundieron. **El 10 ya no existe, y su número no se recicla.**

## Las cinco capas y qué prueba cada una

| Capa | Herramienta | Qué demuestra | Dónde vive |
|---|---|---|---|
| **Esquemas** | vitest | Que un cuerpo inválido se rechaza y uno válido se acepta, **antes** de que exista el endpoint | `packages/shared/src/*.test.ts` |
| **Unitarias de servicio** | jest + Prisma simulado | Las reglas de negocio y de autorización: quién puede escribir, qué se filtra al listar | `apps/api/src/**/*.spec.ts` |
| **e2e de API** | jest + supertest + **Postgres real** | Que la cadena completa funciona: HTTP → guardia → pipe → servicio → base, con los códigos de estado correctos | `apps/api/test/*.e2e-spec.ts` |
| **Componentes** | vitest + Testing Library (jsdom) | Que la pantalla renderiza lo suyo y que interactuar dispara la mutación correcta | `apps/web/src/**/__tests__/` |
| **Navegador** | **Playwright** (Chromium) | Que la aplicación real funciona de punta a punta: pintado, navegación, sesión, proxy `/api` | `apps/web/e2e/*.spec.ts` |

**La regla que separa las dos familias de e2e.** Una unitaria con Prisma simulado no bloquea
filas, no valida SQL, no tiene índices y no maqueta nada. Todo lo que dependa de eso **tiene**
que estar en un e2e, y cada suite de API lleva escrito en su cabecera por qué no puede ser
unitaria. Si una comprobación cabe en una unitaria, va en una unitaria: estas son caras y lentas.

## Los conteos

> **Este documento es la fuente única de los conteos, con una excepción declarada.** Las
> unitarias las genera `scripts/update-estado.mjs` en el bloque de estado de
> [00-INDEX.md](./00-INDEX.md) — un número generado no puede desincronizarse de sí mismo — y
> aquí se enlaza en vez de repetirlo. **Si necesitas cualquiera de los dos en otro sitio, enlaza
> en vez de copiar**: el 2026-09-01 el `00` decía 106, el `04` decía 66 y este decía 166 para
> las unitarias — tres cifras distintas y las tres falsas. Un dato repetido en cuatro documentos
> es un dato que va a mentir en tres.

**Unitarias:** el bloque de estado de [00-INDEX.md](./00-INDEX.md), regenerado con
`pnpm update:estado` y defendido por `pnpm verify`.

**Ficheros de e2e:** los cuenta del disco el mismo script, y no se editan a mano.

<!-- e2e:inicio -->
> **Este bloque también lo escribe `pnpm update:estado`, y no se edita a mano.**
>
> - **Ficheros de e2e de API:** 51 (`apps/api/test/*.e2e-spec.ts`), contados del disco.
> - **Ficheros de e2e de navegador:** 33 (`apps/web/e2e/*.spec.ts`), contados del disco.
>
> Cuenta **ficheros**, no pruebas: cuántas ejecuta cada uno solo lo sabe el corredor, y
> arriba se dice por qué. Existe porque este documento llegó a decir 21 especificaciones de
> navegador cuando había 20, y `check:docs` no puede cazar una frase falsa bien escrita.
<!-- e2e:fin -->

> **Vueltos a medir el 2026-09-05, con los planes 01–06 y el 15 dentro y corriendo las dos suites
> ENTERAS sobre el árbol ensamblado**, que es como se descubrió que los e2e de API no podían
> correrse todos juntos en esta máquina (ver el historial de ese día): **295 e2e de API en 38
> suites, todas en verde** —la suite nueva es la de `GET /health`— y **los recorridos de navegador
> en verde con 1 saltado**. Las cifras de abajo son las del 2026-09-04 y se conservan para poder
> comparar.

**Recorridos**, los dos medidos el 2026-09-04 con la fase 2.5 entera y el reseño de la mesa
(B0–B5) dentro: **269 e2e de API en 37 suites** (eran 216 al cerrar la fase 2D; los nuevos son tipos de daño y resistencias
—2.5.1—, encuentros —2.5.2—, el ataque comparado —2.5.3—, el daño con su traza —2.5.4—, las
condiciones en las tiradas —2.5.5— y la capa de combate —2.5.6—, con lo que añadieron sus revisiones
de cierre) y **108 recorridos de navegador** (eran 88; los nuevos son el tercer tema en las tres
pruebas de contraste, la medición del `/NN` y la del solape del conmutador, los dos de B1.1, los de
B1.2 y B1.3, el del mundo como destino y los cajones de B4, y el combate entero de 2.5.6). **Los dos
verdes en la misma tarde, en una sola pasada cada uno.** **Desde el 2026-09-05 son 109**: D1 añadió
el hilo como conversación a `mesa-mide`, y ese fichero se corrió entero y en verde en su propia
pasada (3 de 3) — el recuento de los otros 22 no se ha vuelto a medir ese día. **Y el 2026-09-06 son 130 en 33 ficheros**,
contados con `playwright test --list` y no a mano: los nuevos son los tres recorridos de `paso-1-goteras`
—crear y gastar un recurso, las dos dagas y la medición del botón de la bolsa— más lo que trajo la
tanda del paso 1. Este par sí se
escribe a mano, porque solo
lo sabe el corredor: un bloque declarado dentro de un bucle sobre los tres temas ejecuta más pruebas
de las que se pueden contar leyendo
el fichero, así que **la cifra buena es la que imprime el corredor**, no la de contar `test(`.

> **Y por eso la mitad contable se generó.** Este documento decía «21 especificaciones de
> navegador» y son **20**; antes había dicho «116 e2e de API en 22 suites» olvidando
> `rate-limit`, y «64 recorridos en quince especificaciones» en un párrafo mientras otro decía
> otra cosa. Las tres las encontró una auditoría, no un control. **La única defensa de una
> fuente única es mirarla de vez en cuando** — o hacer que la escriba una máquina, que es lo que
> se hizo el 2026-09-03 con lo que se puede contar.

## Qué escribe una tarea de API

1. **Unitarias del servicio** con el Prisma simulado: el caso normal, el caso sin permiso, y el
   filtrado de visibilidad para un jugador que no debe ver algo.
2. **Un e2e** que registra un DM y un jugador, crea la campaña, **invita al jugador**, y
   comprueba desde fuera que el jugador ve lo que le toca y **no ve** lo que no. Ese guion es el
   patrón de todas las suites existentes; cópialo, no inventes uno nuevo.
3. **El caso de entrada inválida**, si la tarea introduce validación nueva.

**Se prueba comportamiento, no implementación.** Un test que afirma que se llamó a
`prisma.entity.findMany` no prueba nada; el que afirma que un jugador no recibe la entidad
`DM_ONLY`, sí. Los criterios de aceptación se escriben antes, en Dado / Cuando / Entonces.

## Qué escribe una tarea de web

RTL con los módulos `api.ts` simulados y los hooks reales dentro de `QueryClientProvider` +
`MemoryRouter`. Se prueba lo que hace el usuario: escribir, elegir, enviar — y que la mutación
recibe la carga correcta. **Y `pnpm build` limpio**, que es lo que hace de type-check del `tsx`.

## Lo que las pruebas de hoy NO cubren

Esto no es una salvedad teórica; es el hueco por donde se cuelan los defectos.

- **jsdom no pinta nada.** No hay color, ni tamaño, ni posición, ni contraste, ni foco real, ni
  desbordamiento. Una pantalla puede estar ilegible con toda la suite en verde.
- **jsdom no navega.** Un enlace roto, una ruta que no existe, un `ProtectedRoute` que redirige
  mal: invisible para RTL.
- **El Prisma simulado no valida SQL.** Una restricción única violada aparece como 500 en la
  vida real y como nada en la unitaria.
- **La accesibilidad está a medias y el rendimiento no existe.** Playwright **sí** mide
  contraste en los tres temas y **sí** cubre un caso de responsive real (que un control de
  formulario no dispare el zoom de iOS Safari). Falta el resto: foco, lectores de pantalla,
  teclado, anchos intermedios, y cualquier medida de rendimiento.
- **No hay mutación ni umbral de cobertura** (N2/N3 no declarados).

## Playwright, y las reglas que no se negocian

Chromium, `apps/web/playwright.config.ts`. La configuración levanta los dos servidores sola: la
**API compilada** (`start:prod`, como en producción) y Vite, que hace de proxy de `/api` igual
que nginx. Cada prueba registra su propio usuario con correo único, así que **no dependen de
datos sembrados ni se pisan entre sí**. `vitest` tiene su `include` acotado a `src/` para que
los dos corredores no se disputen `e2e/`.

1. **Los e2e de navegador no entran en `pnpm verify` ni en el gancho de pre-commit.** Necesitan
   Docker y dos servidores vivos. Van en su script y en CI como trabajo aparte (`e2e-browser`),
   que sube el informe como artefacto cuando falla.
2. **Eso no los hace opcionales. Si una tarea toca una pantalla, corre el e2e antes de darla por
   terminada.**
3. **La regla también aplica al plan:** si una tarea toca una pantalla que ya recorre un
   `*.spec.ts`, **su brief lleva el e2e dentro**. En english-log un plan metió un componente en
   cuatro pantallas, creó un segundo enlace con el mismo nombre accesible y dejó un `spec` roto
   en la rama; no lo vio ninguna prueba de componente, ni la captura, ni la revisión de la tarea.
   Lo encontró, dos tareas más tarde, la primera con instrucción de abrir un navegador. **La
   culpa fue del plan.**
4. **Al medir en el navegador, mide los dos ejes.** Una revisión que solo comprueba posición y
   anchura deja pasar celdas estiradas por un `align-items` que nadie miró.

**Se comprobó que pueden fallar, no solo que pasan.** Con la guarda de autenticación desactivada
a mano, las siete pruebas de componente seguían en verde y el recorrido de sesión se caía con su
captura. Ese es el defecto que en english-log llegó a producción dos veces con la suite entera
en verde.

### Seis lecciones que costaron horas, en una línea cada una

- **Lo que solo se ve maquetado, se mide en el navegador.** Filas que pasaron de `<button>` a
  `<a>` heredaron `display: inline` y pintaron el borde **partido**, con la suite unitaria entera
  en verde y un despliegue de por medio.
- **Una clase de Tailwind que no existe compila a nada, y `jsdom` no lo ve.** 49 utilidades de
  opacidad se descartaban en silencio, incluido el velo de los diálogos. Se cubre con dos redes
  que no se sustituyen: un barrido del código fuente y una medición en el navegador. **Desde B0
  (2026-09-04) la causa está arreglada** —los tokens van por canales— y las dos redes siguen,
  cambiadas de trabajo: el barrido caza un canal usado como si fuera un color, y la medición
  comprueba que un `/NN` compone un color de verdad.
- **Una prueba en verde puede estar midiendo el caso equivocado.** El recorrido de la tirada a
  ciegas tiraba con el DM, que sí ve su propia tirada; el bueno invita a un jugador y tira desde
  su navegador.
- **Y puede estar midiendo lo que no es.** Una medición de contraste sospechosamente alta
  (12,89:1) leía el gris del preflight en lugar del filete que decía medir. Cuando sale
  demasiado bien, comprueba **qué** estás midiendo.
- **Medir no basta si se mide la cosa equivocada.** Tres diagnósticos seguidos sobre por qué no
  se disparaba un `dragstart` sonaron plausibles y dos eran falsos, apoyados los tres en
  mediciones reales. La causa era un `max-h-[85vh]`: la pieza y su carril **nunca estaban en
  pantalla a la vez**, y lo padecía igual una persona con un portátil.
- **Y un rojo masivo puede ser que la API no llegara a arrancar.** El `webServer` de Playwright
  levanta la API con `pnpm --filter @dnd/api build && start:prod` y **180 s de margen**.
  Compilarla sola tarda ~14 s; compilarla **mientras un agente del otro carril usa la máquina**
  se pasa de ese margen, la API no escucha, y todo lo que necesita sesión muere con
  `ECONNREFUSED` — medido el 2026-09-04: **82 fallos de 98**, y las mismas pruebas en verde al
  repetir con `pnpm --filter @dnd/api build` hecho antes. La firma que lo distingue de un
  defecto: **Vite arriba y `http proxy error` en la primera petición**, no un fallo a mitad de
  recorrido. `docs/04-convenciones.md` ya decía que los e2e los corre el orquestador y no los
  agentes; lo que faltaba es el matiz de que **mientras un agente compila, la suite del
  orquestador tampoco arranca**. Precompilar la API antes de lanzar la suite lo evita.
- **Y dos corridas de Playwright NO se solapan.** Con `reuseExistingServer`, la segunda se
  engancha al Vite que ya está levantado; cuando la primera termina, **se lo lleva**, y la
  segunda muere a mitad con `ERR_CONNECTION_REFUSED` en el **5173**. Medido el 2026-09-04: 48
  fallos de 103, ninguno del código. La firma que lo distingue del caso de arriba: el rechazo es
  del **puerto de Vite**, no un `http proxy error` del proxy `/api`. Se corre una y se espera.
- **Un intermitente puede ser el limitador de peticiones.** La suite dispara cientos de
  peticiones legítimas desde `127.0.0.1` en un minuto y chocaba con el tope global de 100: el
  429 rompía el recorrido donde le pillara, y cada fallo tenía una explicación creíble que no
  era la verdadera. Se le da margen **solo a la suite** (`RATE_LIMIT` en `playwright.config.ts`);
  el control de producción no se toca.

---

# Qué demuestra cada suite

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
| `notifications` | Aceptar una invitación notifica al DM; **nadie ve las notificaciones de otro**, ni las marca leídas. Y desde el plan 12, **los dos avisos que nadie emitía**: comentar avisa al DM y **no a quien comentó**; **no llega a quien no puede ver la ficha** —la fuga que protege esta suite—; y planificar una sesión con fecha avisa a la mesa menos a quien la planificó. Sondea la bandeja en vez de leerla una vez: los oyentes son asíncronos y nadie espera su promesa. |

### El mundo y la campaña

| Suite | Qué demuestra |
|---|---|
| `campaigns` | Quien crea una campaña queda como DM; leerla y editarla exige el papel correcto; **borrar una campaña se lleva en cascada todo lo que cuelga de ella**, y eso se comprueba **contando filas de verdad** en cada tabla, no fiándose del 200. Cada tabla nueva del proyecto se añade aquí: una que falte es un huérfano que no avisa. |
| `entities` | El listado se filtra por visibilidad para el jugador; el cuerpo Markdown se guarda y vuelve idéntico; se rechaza un formato que no es Markdown y un texto desmesurado. **Subir la visibilidad a mano emite `ENTITY_REVEALED`** y el jugador lo ve en su línea de tiempo; bajarla no emite nada; y un jugador que no puede ver la ficha tampoco ve el suceso (ficha P1, 2026-09-04). |
| `links` | Enlazar dos fichas, rechazar el enlace de una consigo misma, y que **el jugador solo vea los enlaces cuyo destino puede ver**. |
| `comments` | Comentar una ficha visible; **no se puede comentar una `DM_ONLY`**. |
| `sessions` | El DM crea sesiones; el jugador no; el listado se filtra por visibilidad. |
| `characters` | Quien crea un personaje queda como su dueño **según el servidor, no según lo que mande el cliente**; el listado del jugador se filtra por `canView` y el DM los ve todos; **editar exige ser dueño o DM, y otro jugador recibe 403**. Es la puerta de entrada a la hoja, y llevaba sin aparecer en este mapa desde que se escribió. **Archivar (2.5.8, ficha M9)**: saca al personaje del listado sin borrar nada —contando filas de verdad, no fiándose del 200—, recupera hoja/inventario/dinero enteros, deja su rastro en la línea de tiempo, y solo dueño o DM pueden archivar. |
| `world-state` | Marcas y conjuntos del mundo: solo el DM escribe, poner la misma marca la sobrescribe en vez de duplicarla, quitar un miembro dos veces no falla, y **una señal levantada por el DM queda `DM_ONLY` en el registro**. |
| `game-state` | **Como mucho una sesión en curso por campaña, y lo garantiza un índice único parcial de Postgres, no un `if`.** Arrancar escribe su suceso; un suceso `DM_ONLY` no sale en el registro del jugador; un límite de consulta inválido es 400 y no una consulta sin tope. |

### La hoja de personaje y su estado

| Suite | Qué demuestra |
|---|---|
| `character-sheet` | Rellenar la hoja y que el servidor derive PG máximos y CA. Una hoja a medias devuelve **un motivo, no un 500**; una clave de catálogo desconocida es 400. **Dos deltas de PG lanzados a la vez aterrizan los dos** —el Prisma simulado no bloquea filas, así que esa carrera solo se ve aquí—; una corrección absoluta exige DM y versión, y una versión vieja da 409 **con el estado actual dentro**. Salvaciones de muerte, el cuadro de ataques y el 403 de quien no es miembro. |
| `character-state` | Recursos propios, gastarlos, y las tres reglas de descanso que importan: **el largo devuelve la mitad de los dados de golpe, no todos**, y **el brujo repone en el corto**. Un jugador no puede subir un recurso `DM_ONLY`. |
| `inspiracion` | **El camino entero de la inspiración** (plan 08, ficha I8): que la fila **se siembra al crear el personaje** —no al terminar la ficha, porque no viene de la clase—, que **reponer un `DM_ONLY` es 403 para su dueño** (el jugador no se la concede a sí mismo), que **dos concesiones seguidas dejan una** (`max: 1`, que es la regla del SRD escrita donde se cumple), que gastarla **tira 2d20 y la deja a cero en la misma transacción**, que sin ella es **409 y no queda ni tirada ni gasto**, que con desventaja declarada es **400 en vez de quemarla**, y que **regalarla mueve las dos filas y deja un solo suceso** con los dos nombres. Lo que ningún mock ve: que después del 409 el registro no creció. |
| `ayudar` | **La acción Ayudar** (plan 08, ficha I8): la marca la recibe **el ayudado**, con el nombre de quien ayuda y un vencimiento de **un asalto exacto**; la hoja **sugiere ventaja en el ataque** y dice por qué; al pasar el asalto **vence y queda marcada**, no desaparece (D-2C-2), y deja de calcular; **se consume con el primer ataque** —dos dados— y el segundo ya tira uno; ayudarse a sí mismo es 400 y a alguien de otra campaña 404. El registro cuenta las dos mitades: quién ayudó y que se usó. |
| `batuta` | **La batuta de punta a punta** (plan 09, fichas I19 y I20): ejecutar es **solo del DM** (403 al jugador) y una ficha de otra campaña es **404, no 403**; **el camino entero** —el DM ata una regla en frío, pulsa, y el pasadizo aparece en la lista del jugador—, que es lo único que demuestra que el cable está conectado; **ejecutar no edita la ficha**; el suceso es **`DM_ONLY`** y el jugador no lo ve. Y `CHARACTER_ATTACKED` (I20) **se dispara con un ataque resuelto**, sin suceso nuevo. |
| `administrar-la-mesa` | **D2, D3b y A3 de punta a punta**: un jugador no cambia papeles (403); **degradar al último DM es 409 con su código**, y nada cambia; **ascender cambia el PERMISO** —la misma persona que recibía 403 al crear una ficha ahora recibe 201—, que es lo único que demuestra la ficha y no un `UPDATE`; el cambio **queda en el registro** con el nombre y los dos papeles; con dos DM sí se puede bajar a uno. Y las invitaciones: el listado **solo lo ve el DM**, dice **quién** usó cada una y **no devuelve el token entero**; **revocar da el mismo error que un token inventado** —byte a byte—; un enlace **caducado no se acepta** y los que no tienen fecha siguen valiendo. |
| `modificadores-temporales` | **M8 de punta a punta**: un `target` fuera del vocabulario cerrado es **400**; **la Fuerza derivada sube y la traza dice de dónde sale**, con su motivo; **la columna del personaje sigue intacta** —se lee la fila cruda—; al pasar el reloj **deja de sumar y queda marcado**, no borrado; el vencimiento **se anuncia** en el registro; un negativo resta; **sin duración no vence** por mucho reloj que pase; quitarlo a mano **no cuenta un vencimiento que no ocurrió**; y un jugador ajeno recibe **403**. |
| `buscar-en-el-cuerpo` | **La búsqueda de U3, y sobre todo lo que NO encuentra**: una palabra que solo está en el cuerpo aparece; sigue encontrando por nombre; no distingue mayúsculas; y **una ficha `DM_ONLY` que dice esa misma palabra no sale para el jugador** —ni ella ni un conteo que la delate— mientras el DM sí ve las dos. Sin `q` devuelve todo lo visible, y una `q` que no casa devuelve lista vacía, no un error. |
| `level-up` | Subir de nivel escribe su suceso y sube los PG máximos en la cantidad prevista; el previo es idempotente; **el nivel 20 es el techo**. |
| `catalog-y-velocidad` | El catálogo en español y **la velocidad ya afectada por las condiciones, con su traza**, servidos por el servidor. Existe para que la pantalla **deje de calcular**: es el viaje lo que hay que demostrar. |
| `inventory` | Meter, equipar, mover y gastar. **Dos peticiones simultáneas de equipar en la misma ranura vacía: una gana y la otra no**, y lo garantiza un índice único parcial. Un objeto `DM_ONLY` no se le puede dar a quien no lo ve, y **uno de otra campaña del mismo DM no entra**. La bolsa no baja de cero. |
| `campaign-items` | Los objetos propios del DM: crear, filtrar por visibilidad, editar, y **no poder borrar uno que alguien lleva encima** (409) hasta vaciarlo. |
| `condiciones-con-duracion` | Una condición se guarda con **la hora en que vence, no con su duración**; mientras vive frena de verdad; al pasar su hora deja de aplicarse **y el jugador ve por qué**; no se vuelve a anunciar. Y **el agotamiento 4 parte los PG máximos, con la curación topando contra ese máximo**. |
| `condiciones-en-las-tiradas` | **Las condiciones llegando a las tiradas** (2.5.5). La hoja publica la sugerencia de modo con su porqué —«desventaja: envenenado»— y **solo donde la regla la pone**: envenenado no toca las salvaciones, apresado penaliza la de Destreza y no la de Fuerza, el agotamiento 3 penaliza las seis. **Una condición de dos asaltos sobrevive al primer avance de seis segundos y se apaga en el segundo**, que es lo que demuestra que el reloj en segundos ya era el mecanismo. **El agotamiento 6 mata con los Puntos de Golpe intactos**, y quitarlo devuelve al personaje —la muerte se deriva, no se guarda—. Y la fuga: la hoja de un PNJ `DM_ONLY` es un 404 entero, así que la sugerencia no puede nombrar su condición. |
| `game-clock` | El reloj es **una columna que sube de verdad**; solo el DM lo avanza; viajar pide las salvaciones de marcha forzada; **un segundo descanso largo en menos de 24 horas de juego se rechaza con un 409 que dice cuánto falta**; a 0 PG no se descansa largo; un descanso interrumpido no cura. |

### Dados, reglas y PNJ

| Suite | Qué demuestra |
|---|---|
| `rolls` | Quién puede tirar por qué hoja. **Una tirada a ciegas no lleva el resultado en la respuesta del jugador**, y el DM sí lo ve — se comprueba sobre el cuerpo HTTP. El azar es del servidor (treinta d20 dentro de rango). El registro filtra por sesión y por personaje, y **«solo las mías» son las de mis personajes**, no las de la mesa. |
| `peticion-de-tirada` | El DM pide **un valor de la hoja**, le llega a quien es y a nadie más; **otro jugador recibe 404 y no 403**, porque un 403 confirmaría que existe; se tira con el modificador de la hoja de quien responde; no se responde dos veces; la variante a ciegas no le enseña el resultado a quien tira. |
| `tablas-del-dm` | **Las tablas de la casa nacen apagadas** y el listado lo dice. Una tabla con un hueco se rechaza con una frase legible; **una segunda tabla de pifias la rechaza la base** (índice único parcial); varias sin disparador conviven; **un jugador que no ve una tabla recibe 404 al tirarla**; editar reemplaza las filas enteras. |
| `rules-engine` | El motor de reglas es **del DM entero**: incluso listar es 403 para un jugador. Una propuesta no cambia nada hasta que el DM la aplica; el ensayo en seco **dice qué pasaría y no persiste**; con el interruptor apagado, una regla que encaja no hace nada. |
| `statblocks` | El catálogo del SRD lo ve cualquiera que juegue. **El statblock propio del DM no viaja al jugador**, y se comprueba sobre el cuerpo serializado. Las columnas de lista y los campos Json sobreviven al viaje por Postgres; **editar un campo no borra los otros veinte**, comprobado contra la fila; uno de otra campaña da 404. |
| `pnj-en-la-mesa` | El bucle entero de un PNJ: instanciar (solo DM, con tope), que **nazca escondido**, que su hoja se derive del statblock con su traza, que reciba daño, que una anulación del DM salga con su delta, y que **el agotamiento le parta los PG máximos sin que se escribiera una línea de agotamiento para PNJ** — que es lo que justifica la decisión de diseño de la fase 2D. Y las tres comprobaciones de la revisión de cierre: **los números de un statblock `DM_ONLY` no llegan al jugador por la hoja**, el `ref` de una plantilla escondida no viaja, y los PNJ no salen en el listado de personajes. **La primera de esas tres se comprueba recorriendo CADA VALOR del cuerpo, no buscando una subcadena** — la versión anterior hacía `JSON.stringify(...).not.toContain("17")` y el cuerpo lleva `createdAt` en ISO, así que **entre las 17:00 y las 18:00 de cualquier día se ponía roja sin que nada estuviera mal**: once horas de cada doce pasaba, y parecía sólida. El caminante lleva su control —el cuerpo del DM **sí** contiene el 17—, porque uno roto que devolviera la lista vacía dejaría la comprobación en verde para siempre. **Y lo que esa prueba NO comprueba está abierto**: las seis características del statblock `DM_ONLY` sí llegan al jugador (ficha P1 de [06-pendientes.md](./06-pendientes.md)). |
| `tipos-de-dano-y-resistencias` | **Que una resistencia reduce de verdad**, sobre el tumulario del catálogo real: 25 de necrótico se quedan en 12, y la traza trae la nota que limita la regla sin que el servidor la interprete. Que `damageType` es **una columna consultable** y no un campo dentro del Json — se filtra contra la base, que es la única forma de demostrarlo. Y las tres de su revisión de cierre: **el registro anuncia el daño aplicado y no el bruto**, así que un statblock `DM_ONLY` no filtra su resistencia por la línea de tiempo; una **curación no se puede etiquetar** con tipo de daño, o «¿de qué murió?» devolvería curaciones; y un delta **sin** `damageType` no cambia de comportamiento, que es lo que hace la pieza reversible. |
| `validacion` | Que un cuerpo inválido diga **qué campo falta y en español**, con la ruta completa de un campo anidado y la lista de los objetivos que sí existen. Y que **no sea un oráculo**: dos identificadores inexistentes son indistinguibles. |
| `encounters` | Iniciativa y orden de turnos (2.5.2). Dos personajes y seis goblins dan **ocho combatientes y TRES posiciones**: los goblins comparten tirada **y entrada del orden**, porque el SRD dice que actúan a la vez. **La base impide que un personaje entre dos veces** y en cambio **sí deja compartir posición**, que es lo que hace el grupo (las dos saltándose el servicio a propósito); **como mucho un encuentro activo por sesión, garantizado por el índice único parcial** y no por la comprobación previa. **Pasar de turno tres veces sube el asalto y avanza el reloj exactamente seis segundos**, dejando caducada sola una condición de un asalto sin que nadie la toque. Y las tres de su revisión de cierre: **la tirada de iniciativa de un PNJ que el jugador no ve no aparece en su línea de tiempo** —comprobado sobre el cuerpo serializado—, el suceso de inicio **no cuenta cuántos son** (de «ocho» menos «los dos míos» salen seis enemigos escondidos), y una iniciativa fuera del rango del esquema es 400 sin dejar rastro. |
| `ataque-comparado-en-el-servidor` | El ataque contra la CA, comparado en el servidor (2.5.3). Un jugador ataca a un plebeyo del SRD `DM_ONLY` hasta ver «impacta», y **en ningún cuerpo HTTP serializado —ni el de la respuesta, ni el del registro de la partida— aparece la CA del objetivo**, salga lo que salga en cada intento. Objetivo inexistente es 404; sin ser miembro, 403; sin token, 401. |
| `la-capa-de-combate` | Las dos puertas que 2.5.6 necesitaba, y sin las cuales la pantalla no existe. **`current` contesta `null`, no un 404**: no estar en combate es lo normal. Empezado el combate lo encuentra **sin conocer su id**, que es exactamente recargar la mesa. **El jugador ve su combate y no cuántos enemigos escondidos hay** —un combatiente, posición 0, sin huecos que se puedan contar—. Terminar exige DM (403 para el jugador, y sigue activo después), deja el encuentro en `ENDED` sin borrar nada, permite empezar el siguiente, y **terminarlo dos veces es 409 y un solo final en el registro**. |
| `dano-con-su-traza` | El daño aplicado desde la tirada (2.5.4). **`rollEventId` sobrevive el viaje de ida y vuelta por la columna `Json`** y aparece en el `HP_CHANGED` del registro; uno inventado o de otra campaña es 400 contra la base real, no contra un mock que siempre dice que sí. Un personaje **de nivel 8** con una condición `concentrating-*` que recibe 25 de daño hace que el sistema **pida** una salvación de Constitución con CD 12 — el nivel es parte de la prueba: a nivel 1 esos 25 son muerte masiva y no se pide nada, que es lo que dejaba este recorrido en rojo el día que se escribió sin ejecutarlo, visible donde `GET /roll-requests` la sondea de verdad — y responderla sigue el camino de 2C.5 sin tocar. Dos golpes concentrados piden **dos** peticiones, nunca una. |

### La partida entera

| Suite | Qué demuestra |
|---|---|
| `partida` | **Doce pasos seguidos, en orden, como una sesión de verdad**: montar la mesa con dos jugadores, crear personajes, el aviso de una hoja a medias, el mundo con una ficha que no deben ver, arrancar la sesión, tirar y que la tirada se cuelgue sola de la sesión en curso, la tirada oculta del DM, caer a 0 PG y estabilizarse, volver a la vida y descansar, una condición bajando la velocidad con su traza, el 403 de tocar la hoja de otro, y cerrar la sesión con **cada uno viendo su versión del registro**. Es la suite que caza lo que las demás no ven: **los defectos aparecen al juntar carriles que estaban verdes por separado**. |

---

## Recorridos de navegador

### Que el sistema se puede usar

| Suite | Qué demuestra |
|---|---|
| `campana` | **Desde B4: el mundo es un solo destino** — los siete tipos ya no están en el carril, son filtros con `aria-pressed` dentro de él, y `?seccion=LOCATION` sigue abriendo los lugares en los dos sentidos. **Desde B3: la puerta de entrada** — elegir una crónica no navega, entrar sí, y va a la mesa y no a los ajustes. Del registro a ver una ficha creada; enlaces y comentarios ejercitados de verdad; borrar una entidad se lleva sus enlaces; crear sesión y personaje con su visibilidad; el Markdown que vuelve como encabezado; filtrar por etiqueta; y editar, expulsar y borrar desde Ajustes. |
| `invitacion` | **Y desde B5, el camino nuevo**: el DM llega a la invitación **desde el resumen**, que le dice «Todavía no hay jugadores» —cosa que antes no decía: enseñaba personajes, que no es lo mismo— y le lleva a Ajustes en un clic; con el jugador ya dentro, **el aviso se apaga** y el papel sale traducido, nunca `PLAYER`. **Dos contextos de navegador**, con cookies y almacenamiento propios, como dos navegadores distintos: el DM invita, el jugador entra por el enlace, se registra desde ahí y **no ve la entidad `DM_ONLY`**. |
| `cuenta` | Cambiar la contraseña **invalida el token viejo contra la API real**; la contraseña equivocada no cierra la sesión; una ruta inventada y una campaña inexistente dicen qué pasa **en vez de dejar la pantalla en blanco**. |
| `condiciones-en-la-mesa` | **Las dos mitades con las que el motor de condiciones llega a la mesa** (fichas M16 y M17), que se habían dado por cerradas con el servidor hecho y ninguna pantalla usándolo. Marcar la concentración desde la hoja y que **entonces** 25 de daño hagan que el servidor pida la salvación con CD 12, vista donde el jugador la sondea — el nivel 8 del personaje es parte de la prueba: a nivel 1 esos 25 son muerte masiva. Y que una condición ponga su aviso **donde se decide el modo de la tirada**, preseleccionado y **editable**, sin aviso donde la regla no aplica (envenenado no toca las salvaciones de Fuerza). |
| `combate` | **El combate entero desde la mesa** (2.5.6): entrar en combate, ver el orden, pasar turno hasta subir de asalto, recargar la página y que el combate siga, y salir. Lo que se demuestra aquí y no en `jsdom` es que **no se navega a ninguna parte** —la URL no cambia y el elenco y el registro siguen visibles debajo de la tira—, que **uno y solo uno tiene el turno**, y que la tira **no arrastra la página a lo ancho**. Y de paso caza lo que ninguna otra capa podía: **`apiFetch` mandaba `Content-Type: application/json` sin cuerpo**, y Fastify rechaza eso con un 400 — o sea que **todos los POST sin cuerpo estaban rotos desde el navegador** mientras los e2e de API pasaban en verde, porque supertest no pone esa cabecera si no hay `.send()`. |
| `sesion` | La sesión entera desde la interfaz: empezar, sellar, verla en la mesa y cerrarla con la crónica; el elenco leyendo los PG de la hoja calculada; una anotación desde la mesa. **Y desde B1.2: las dos disposiciones del elenco medidas con dos navegadores** —el jugador ve el suyo delante y **sobre el de otro no hay mandos**, el DM ve la parrilla entera con mandos sobre cada uno—, y la franja de «desde aquí te perdiste», que solo se puede medir aquí porque la marca vive en `localStorage`. **Y desde B1.3: el estrato superpuesto** —los paneles se abren encima, uno a la vez, y Escape devuelve el foco al control que los abrió, medido sobre `document.activeElement`—. **Y el recorrido donde los dos carriles se juntan**: el DM sube un lugar de `DM_ONLY` a `PLAYERS` y la cabecera de escena pasa a decirlo **sin que nadie tocara la pantalla** — la promesa de la ficha P1, comprobada de punta a punta. Desde B1.1: que a la mesa se llega desde la campaña SIN sesión abierta** —el defecto de arquitectura que el reseño señaló— y que la cabecera de escena nombra la sesión y no se solapa con la banda de estado, medido en los dos ejes. |
| `hoja` | La hoja con datos reales: completar, ver la traza, tirar, cambiar PG. Y lo que solo se ve maquetado: la cabecera fija, **un paso de la traza llevando el foco a su causa**, que lo editable se distinga de lo derivado, y que las veinticuatro líneas de habilidad quepan. |
| `inventario` | Equipar una armadura **cambia la CA y añade su paso a la traza**; un arma equipada llega al cuadro de ataques y se tira; el catálogo propio se distingue del SRD. |
| `subir-nivel` | El servidor propone el diff, **tirar no aplica nada**, y confirmar deja la hoja en el nivel nuevo. |
| `dados` y `tirada` | El desglose y no solo el total; **el dado descartado pintado tachado** —que solo se puede medir en un navegador—; el motivo del evaluador real junto al campo; y **a ciegas, el total no viaja: se mide sobre la respuesta HTTP, no sobre el DOM**. |
| `peticion-de-tirada` | El DM pide, **a la jugadora le aparece sin recargar**, tira, y el DM ve el resultado. |
| `reglas` y `reglas-arrastrar` | Escribir una regla, armarla y ensayarla en seco sin dejar traza; clonar una plantilla. Y el tablero de arrastre medido: cada pieza con su silueta, los carriles rechazando lo que no es suyo, el orden en pantalla ancha y estrecha, y **los conectores en color y negrita, porque el color no puede decidir solo**. |
| `tablas-del-dm` | Que lo primero que se lea sea **que esto no es del manual**; que el interruptor diga su posición **leída del servidor**; y que un error enseñe **la frase del servidor** y no una genérica. |
| `bestiario` | Las quince criaturas con sus números; **ningún valor de enumeración en pantalla**; la velocidad en pies; bajar una criatura a la mesa de punta a punta; y que **el botón no prometa un combate que no existe**. |
| `condiciones-con-duracion` | Una condición vencida **se marca y no desaparece**, y los PG partidos por agotamiento **se explican en la hoja**. |
| `archivar` | **El camino entero de archivar un personaje** (ficha M9, plan 06), que es lo único que demuestra que el gesto existe de verdad: archivar → **desaparece de la lista** → aparece en «Archivados» → se devuelve → **vuelve a la lista**. Lo que aquí se mide y en `jsdom` no se puede: que **archivar y borrar no se pintan igual** —se comparan los bordes calculados de los dos botones—, porque el plan pide que se **vea** cuál cuesta menos. Y con dos contextos de navegador, que el suceso llega al registro en español y con el nombre del personaje: **hace falta un jugador** porque el hilo de la mesa filtra por la sesión abierta y este suceso se guarda sin sesión (ficha P3 de [06-pendientes.md](./06-pendientes.md)). |

### Que se ve como debe

`jsdom` no maqueta. Todo lo de esta tabla puede estar roto con la suite de componentes entera en
verde — ya pasó con un borde partido, y por eso estas comprobaciones son regla y no adorno.

| Suite | Qué mide |
|---|---|
| `armazon` | El pie apoyado en el borde inferior con poco contenido; **ninguna entrada del carril sin su icono dibujado**; la marca. |
| `color-de-personaje` | **El color de un personaje, de punta a punta** (plan 05, D3): sin elegir, el selector lo dice; elegir **sobrevive a una recarga entera**, que es lo único que demuestra que llegó al servidor; repetir un color de otro **se avisa nombrando a quién y no se bloquea**; y en la mesa, **tres personajes con tres tintas distintas**, una de ellas exactamente la que se eligió. Los colores se leen del DOM calculado, no del nombre de la clase: `jsdom` no resuelve una clase de Tailwind hasta un color, que es la trampa declarada de este proyecto. Deja la captura que el plan pedía en `apps/web/e2e-resultados/`. |
| `nervio-en-vivo` | **El canal en vivo** (plan 12 · 12.3, D-OP-22), con **dos navegadores**: la jugadora comenta y **la pestaña del DM se entera sin recargar**, en menos de 20 s —el sondeo está en **60 s**, así que no puede haberlo traído él—. Y su **control**: el mismo recorrido con el canal **apagado** desde `localStorage` no enciende nada en diez segundos, y recargando sí. Sin ese control, la primera prueba no demuestra que mida el canal. |
| `iniciativa-en-vivo` | **La tarea que hace real el plan de iniciativa y bando** (2026-09-05), con **dos navegadores**: el DM pide iniciativa desde el diálogo de entrar en combate y **la jugadora ve el panel «Empieza el combate» sin recargar** en menos de 10 s —el sondeo de peticiones está en 15 s—; tira, y **el DM ve la sala de espera resolverse sola**, pasando a «Orden de turnos» sin que él toque nada. El total nace en «1 de 2» y no en «0 de 2»: el propio combatiente del DM ya tiró dentro de la misma transacción que crea el encuentro, y es justo esa tirada la que dispara `GameEventsService.record` y, con ella, el canal — sin un combatiente propio del DM no habría ningún aviso al empezar. **Y dos medidas a 390 px con `boundingBox`, que `jsdom` no puede dar**: el panel de iniciativa del jugador (cabe en el ancho: `x=12, width=366` sobre 390) y el diálogo de entrar en combate con cuatro combatientes, cajón entero y las cuatro filas de bando midiendo cada una por separado (cajón `x=0, width=390`; filas `x=25, width=341`). Comprobado por mutación: comentando el `this.live.publish(...)` único de `GameEventsService.record`, la primera prueba se pone roja **por tiempo agotado** esperando el panel — la prueba mide el canal, no el sondeo. |
| `bandeja-de-avisos` | **La bandeja** (plan 12 · 12.2), con **dos navegadores**: recién registrado **no hay distintivo** —un cero con globo es ruido—; la jugadora comenta y **no se avisa a sí misma**; al DM le llega, el aviso **no lleva el cuerpo del comentario** y **lleva a su ficha**; «marcar todo leído» apaga el distintivo **sin borrar nada**. Y lo que `jsdom` no puede decir: el distintivo **no tapa** «Cuenta» y el panel **cabe en la ventana**. |
| `leer-una-sesion` | **La página de lectura de una sesión** (ficha U1): se llega desde la lista, pinta estado, fecha y quién vino, y **dice que no hay crónica** en vez de dejar un hueco. Con **dos contextos de navegador**: el jugador abre **la misma URL** y no ve una crónica que no sea suya. |
| `navegar-en-estrecho` | **U2, remedida** (plan 14): a **375 px** hay **siete destinos alcanzables sin escribir una URL**, todos visibles, dentro de la ventana y con tamaño, y pulsar uno cambia de pantalla. La ficha describía una columna que ya no existe. |
| `ornamento` | **U7**: de partida el ornamento está y **ocupa sitio medido**; apagado desde la cuenta **deja de pintarse** —el nodo no está en el documento, no se esconde— y **sobrevive a recargar**, con `data-ornamento` estampado en `<html>` para que no parpadee. |
| `arrastre-dentro-del-cajon` | **La remedición de R1** (plan 14): el mismo `<div draggable>` trivial dentro del cajón y fuera, comparados. Con su control, porque una medición sin control «confirma» lo que ya creías. |
| `tokens-contrast` | **El contraste real, medido, en los tres temas** (Oscuro, Claro y Lectura) y en las pantallas de sesión, campaña, 404, atribución y cuenta. Desde el plan 05 mide también **las ocho voces de personaje**, cada una sobre `--bg` y sobre `--surface`, que son los dos fondos donde se pintan: **ninguna voz nueva se acepta sin su medición**, y los nombres salen del propio DOM para que un color añadido a `CHARACTER_COLORS` se mida solo. Y que un control de formulario **no dispare el zoom de iOS Safari** en un puntero basto. |
| `clases-que-si-pintan` | Que las superficies que la aplicación promete **se pintan de verdad** — la comprobación que caza una clase de Tailwind que no existe y compila a nada. |
| `ficha-lectura` | El enlace que se lee como frase por sus dos lados; la capitular, los párrafos y la medida corta; el contraste de la página de lectura en los dos temas. |
| `mesa-mide` | **La mesa medida en un navegador**: la página no scrollea y el hilo sí, la rejilla llega al pie, ningún panel se corta sin poder desplazarse y abrir un cajón no desmonta el hilo. **Y desde D1 (2026-09-05), el hilo como conversación**: al abrir está **al fondo**, con el scroll subido un suceso nuevo **no roba la posición** y sale un aviso pulsable, y estando al fondo sí baja. Nada de eso se puede probar en `jsdom`, donde `scrollHeight` y `clientHeight` valen cero y **cualquier aserción de anclaje pasa siempre**. |
| `capturas-comparacion` | Capturas de nuestras pantallas **para compararlas con el prototipo**. No afirma nada por sí sola: es material para el ojo humano. |

---

---

> **El canal en vivo se apaga en una prueba** con
> `context.addInitScript(() => localStorage.setItem("canal-en-vivo", "off"))`, antes de que cargue
> la aplicación. Existe porque una conexión SSE sobrevive al final de un caso y vuelve
> intermitente a Playwright; y en `nervio-en-vivo.spec.ts` es, además, el control de la medición.

## Lo que ningún recorrido cubre hoy

Se dice aquí para que nadie lo dé por cubierto al leer la lista de arriba.

- **El ataque no se ve resolverse en el navegador de punta a punta.** El ataque contra la CA está
  medido en el servidor desde 2.5.3 (`ataque-comparado-en-el-servidor`) y el daño con su traza
  desde 2.5.4 (`dano-con-su-traza`); elegir objetivo entre los combatientes del encuentro está
  probado en RTL (`apps/web/src/features/character-sheet/__tests__/TirarAtaqueBoton.test.tsx`,
  2026-09-05/06). **Lo que ningún recorrido de navegador hace todavía es pulsar «Atacar», ver el
  veredicto traducido y el daño bajar solo desde esa tirada**: `combate.spec.ts` mide entrar en
  combate, ver el orden y pasar turno, e `iniciativa-en-vivo.spec.ts` mide pedir y responder la
  iniciativa; ninguno de los dos ataca. `sesion.spec.ts` mide el gesto de anotar daño desde el
  elenco, pero con un número **escrito a mano**, no con el resultado de una tirada de ataque.
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

## Definición de terminado

Una tarea está terminada solo si: los criterios de aceptación pasan · las unitarias y los e2e
que le tocan pasan **y se ha visto la salida** · `pnpm build` está limpio · la arquitectura y
las convenciones se respetan · **la documentación está actualizada** · y, si tocó una pantalla,
**se abrió el navegador**: `pnpm --filter @dnd/web e2e` en verde.
