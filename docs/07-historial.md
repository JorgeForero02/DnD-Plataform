# Historial

Qué se entregó, por qué, y cómo revertirlo. Fechas absolutas. El detalle por tarea —commit,
número de pruebas, resultado de la revisión— vive en el ledger
`.superpowers/sdd/progress.md`; aquí van los hitos.

---

## 2026-09-02 (mesa de agentes) — Un DM y un tramposo jugaron contra la API, y encontraron cuatro fallos de corrección

**Qué.** Dos agentes usaron la aplicación como personas: uno dirigió una partida entera contra
una PNJ, otro intentó romper la autorización desde fuera. El tramposo **no encontró ni un hueco
de seguridad** —todo 403/404, `canView` aguantó— y eso también es un resultado. El DM encontró
cuatro fallos de corrección, arreglados el mismo día:

- **Curar a un muerto lo resucitaba.** A 0 PG con tres fracasos, un delta positivo lo devolvía a
  la vida con el contador a cero y sin aviso — un clérigo deshacía una muerte por accidente.
  Ahora es un 400 que dice que hace falta resurrección; bajarle los PG a un cadáver sigue
  permitido.
- **El ensayo en seco decía «Aplicada».** El núcleo marca `APPLIED` la traza que *se aplicaría*,
  porque en un disparo real eso pasa; pero en un ensayo no ha pasado nada, y la palabra que
  sostiene toda la promesa del dry-run era la que mentía. Se reetiqueta a `WOULD_APPLY` y la
  respuesta lleva `simulated: true`. El enum persistido no se toca.
- **`ENTITY_OPENED` se disparaba con las lecturas del propio DM.** Lo enganché esta misma
  mañana, y el DM descubrió el efecto: preparar la sesión abriendo sus fichas le disparaba las
  reglas contra sí mismo y le llenaba la bandeja. El suceso capta que **un jugador** examinó
  algo; ahora no se registra cuando quien mira es el DM o el creador.
- **El combate se grababa fuera de sesión.** `changeHp` y `rollDeathSave` no sabían en qué
  sesión ocurrían, así que `GET /events?sessionId` devolvía dos sucesos de diecinueve. Ahora
  averiguan la sesión en curso y la graban, como ya hacía `RollsService`.

**Por qué importa la forma de encontrarlos.** Ninguno de los cuatro lo veía una prueba unitaria:
tres solo se notan jugando una partida, y el cuarto es un comportamiento emergente entre dos
piezas que por separado estaban bien. Es el argumento entero de haber puesto a un agente a
dirigir de verdad en vez de a leer el código.

**Lo que el DM dejó fichado y no se arregló** (J5–J11 en `docs/06-pendientes.md`): la muerte no
deja evento propio, `ENTITY_REVEALED` viaja vacío, la anulación se ve como delta sin el motivo,
la invitación es de un solo uso sin listar, los errores de Zod salen crudos, la CA llega a 999 y
el modificador de tirada no tiene tope. Y su veredicto: la preparación aguanta una sesión real;
el combate no, por los monstruos sin PG y la falta de iniciativa (M13, M14).

**Cómo revertirlo.** Cuatro cambios independientes de servicio, sin migración; revertir cada
commit por separado.

---

## 2026-09-02 (19:25) — Despliegue de la fase 2A completa a producción, con su migración

**Qué.** `adb110c` en `dnd.supportive.pro`, lanzado a mano por la API de Coolify
(`deployment_uuid f5yrnzktq9xzdehtw3tyqiop`, `finished` en ~2,5 min). Trae la única migración
del día, `20260902163450_character_manual_overrides`, que solo **añade** una columna anulable.

**Volcado previo**, aunque el autor había dicho que en este proyecto no hace falta copia: la
tanda traía migración, cuesta segundos, y la regla de 03 lo pide. 30 826 bytes en
`vps1new:/root/dnd-predespliegue/dnd-2026-09-02-1922.sql`.

**Verificado con evidencia, no con el «finished» del panel.**

- Los tres contenedores `healthy`; `_prisma_migrations` pasó de **5 a 7** filas y la columna
  `Character.overrides` existe. El único usuario de producción seguía ahí antes y después.
- `GET /` → 200, `GET /api/auth/me` sin credenciales → 401, `GET /api/catalog` sin
  credenciales → 401.
- Una partida entera contra producción, con datos de prueba y borrada después: hoja derivada
  (CA 11, PG 13, velocidad 25, visión en la oscuridad 60), **dados de golpe sembrados**
  (`hit-dice-d10 1/1`, el agujero que estuvo abierto desde 2A.8), apresado deja la velocidad
  efectiva en **0 con `restrained` en la traza**, la anulación del DM pone la CA en 18 dejando
  `('override', 7, 'manual')` —la traza sigue sumando—, una tirada con ventaja sale como
  `2d20kh1+3` con `[10, 12]` tirados, `12` conservado y `10` descartado, y el previo de subida
  de nivel da `13 + 9 = 22` con la Constitución **16** del enano: la suma que esta mañana no
  cuadraba.
- **El motor de reglas disparó de verdad**: una regla armada sobre «empieza la sesión» revelando
  una ficha la pasó de `DM_ONLY` a `PLAYERS` al arrancar la sesión, y dejó su `RuleTrace` en
  `APPLIED`. Es el camino completo —escritura del log → emisión → puente → motor → efecto—
  funcionando fuera de las pruebas por primera vez.
- Un usuario ajeno recibe **403** tanto en las trazas como en la ficha revelada de esa campaña.

**Un susto que no lo era:** el listado de trazas volvió vacío en la prueba de humo. Era el
guion, que buscaba `items`; la respuesta es `{traces, nextCursor}`. La fila estaba en la base.

**Limpieza.** La campaña y los tres usuarios de humo, borrados. Producción vuelve a **1 usuario
y 2 campañas**, comprobado por conteo de filas.

**Cómo revertirlo.** Redesplegar `3221bea` desde Coolify. La migración solo añade una columna
anulable, así que el código viejo convive con ella; si aun así se quiere quitar:
`ALTER TABLE "Character" DROP COLUMN "overrides";`.

---

## 2026-09-02 (cierre) — La fase 2A completa: las diecisiete tareas, y lo que tres auditorías encontraron encima

**Qué.** Se cerraron las cuatro tareas que faltaban —2A.9 (subida de nivel), 2A.16 (motor de
reglas), 2A.10 (pantalla de la hoja) y 2A.11 y 2A.17 (sus pantallas)— y, con la fase entera en
pie, tres auditorías cruzaron **toda** la documentación contra el código. Lo que encontraron no
fue documentación desactualizada: fueron **cinco fallos de código que solo se veían por HTTP o
en un navegador**.

**Por qué importa cada uno.**

- **El motor de reglas no estaba enchufado al log.** Ahora `GameEventsService` emite
  `game_event.recorded` y un puente en `rules-engine/` lo escucha. Es un puente y no una llamada
  directa porque el motor **escribe** eventos: llamarle desde el log cerraría un ciclo entre los
  dos módulos que Nest solo tapa con `forwardRef`, que es esconder el ciclo en vez de quitarlo.
  Y el suceso lleva una bandera `fromRulesEngine`: sin ella, cada efecto del motor arrancaría
  una cascada **nueva a profundidad 0**, y el tope de diez saltos no lo vería, porque cuenta
  dentro de una cascada y no entre cascadas.
- **Una tirada puede disparar dos reglas.** Un 20 natural que no llega a la CD es
  `NATURAL_TWENTY` **y** `FAILURE`; el traductor devuelve una lista, no un disparador.
- **`ENTITY_OPENED` era un disparador muerto.** `recordEntityOpened` existía desde 2A.15 con su
  prueba y **no lo llamaba nadie**, así que el ejemplo con el que se definió el sistema entero
  —«cuando un jugador revise esta ficha, se desvela el camino secreto»— era inalcanzable en
  producción. Ahora lo escribe la lectura de una ficha, siempre `DM_ONLY`.
- **Tres funciones con prueba y sin llamador.** La de arriba, `seedResourcesFor` (así que
  **ningún personaje tenía dados de golpe ni espacios de conjuro**) y `assertNoUnknownChoices`
  (así que una clave de concesión inventada se guardaba en silencio). Una prueba unitaria verde
  no dice que la función se use.
- **Un 500 donde tenía que haber un 400.** `InvalidChoiceError` no lo capturaba nadie: mandar dos
  veces la misma habilidad reventaba. Se valida ahora contra la ficha que quedaría, **antes** de
  guardar — y solo lo que llega en esa petición, porque un dato viejo ya guardado no puede dejar
  a un personaje imposible de editar, incluida la edición que lo arreglaría.
- **Una suma que no cuadraba en pantalla.** El previo de subida de nivel decía «13 → 22 (+8)»:
  el destino salía de la hoja derivada y el delta de la columna en bruto, ignorando el +2 de
  Constitución del enano. El comentario del código llegaba a afirmar que los dos caminos daban
  el mismo número «para no calcularlo dos veces»; discrepaban, y nada lo comprobaba. Lo cazó un
  recorrido de navegador, no la suite: las unitarias montaban humanos.

**Lo que se añadió porque faltaba para jugar.**

- **Ventaja y desventaja** como concepto, no como sintaxis. El servidor compone `2d20kh1` o
  `2d20kl1`; el cliente pide el modo por nombre. Estaba declarado fuera del alcance de 2A cuando
  no había pantalla, y con pantalla era insostenible: sale en casi todos los turnos.
- **Anulaciones manuales del DM** (`Character.overrides`, migración
  `20260902163450_character_manual_overrides`). El tipo de suceso `MANUAL_OVERRIDE_SET` existía
  desde 2A.5 **sin columna que lo produjera**. Es la válvula de escape de «se guarda lo decidido,
  se calcula lo derivado»: sin ella, la única salida ante un objeto mágico o una regla de la casa
  era mentirle a la ficha. Se aplica como un `override` del motor, así que **sale en la traza con
  su delta**.
- **`GET /catalog`** y **`effectiveSpeeds` en la hoja**, porque la pantalla estaba duplicando dos
  reglas del servidor: la velocidad efectiva copiada letra por letra, y las nueve razas y doce
  clases transcritas a mano. Una regla del juego vive una vez, igual que la matriz de visibilidad.

**Verificación.** 682 unitarias de API, 393 de web, **116 e2e de API en 22 suites** y **30
recorridos de navegador en 7 especificaciones**, todos en verde. Diecinueve mutaciones aplicadas
a mano y comprobadas rojas; **tres de ellas no se pusieron rojas y destaparon pruebas que pasaban
por el motivo equivocado** —una usaba la etiqueta de una concesión en vez de su identificador,
otra fallaba igual con la comprobación de DM quitada, y la tercera vigilaba código muerto—; las
tres se reescribieron o se borró el código que fingían proteger.

**Cómo revertirlo.** Los commits del día son independientes por tarea. La única migración es
`20260902163450_character_manual_overrides`, que solo **añade** una columna anulable: revertirla
es un `ALTER TABLE "Character" DROP COLUMN "overrides"` y no toca ningún dato existente.

---

## 2026-09-02 (tarde) — Las salvaciones de muerte estaban a medias, y la mitad que faltaba era un fallo vivo

**Que.** Una investigacion de huecos de mecanica —pedida por el autor con el ejemplo de la
iluminacion— encontro que las tiradas de salvacion contra muerte estaban construidas por la
mitad. La parte hecha era la buena; **la que faltaba era la que ocurre en la mesa**.

**Y una de las tres no era un hueco, era un fallo activo sobre codigo ya desplegado:** curar a un
personaje a 0 PG **no borraba sus fracasos**. El clerigo lo levantaba con dos encima y ahi seguian
la sesion siguiente. El descanso largo tampoco los borraba, asi que eran dos caminos con el mismo
defecto.

**Las tres reglas del SRD que ahora si aplica `changeHp`:**

- **Golpear a quien ya esta a 0 PG suma un fracaso**, y **dos si el golpe fue critico**. Es el
  momento mas frecuente del juego —el remate al que esta en el suelo— y no dejaba ningun rastro.
- **Muerte masiva**: si lo que sobra tras llegar a 0 iguala o supera los PG maximos, el personaje
  muere en el acto, sin tiradas. **El sobrante se calcula ANTES de recortar a 0**, porque el
  `clamp` que protegia el minimo era justo el que borraba la evidencia.
- **Recuperar un solo PG desde 0 borra los dos contadores.** No es cortesia: arrastrar fracasos
  de una caida anterior mataria a alguien por algo que ya sobrevivio.

**`ChangeHpInput` gana `critical`, y ahora y no despues.** Sin ese campo la regla del doble
fracaso no se puede aplicar, y anadirlo mañana es migrar el payload del evento **que mas veces se
escribe en una sesion**. `HP_CHANGED` gana ademas `massive`, porque una muerte sin tiradas hay que
poder explicarla en la linea de tiempo o parece un error de la herramienta.

**Mutacion comprobada, cuatro veces.** Quitando el borrado al curar desde 0, cae una prueba;
haciendo que el critico cuente uno, otra; calculando el sobrante despues de recortar, se pierde la
muerte masiva; y quitando el fracaso por golpear a quien esta caido, caen dos. Restauradas, 27
verdes.

**Dos pruebas existentes se aflojaron a proposito**, y merece decirse por que: afirmaban el objeto
`data` **entero** del `update`, asi que anadir dos columnas las rompia sin que el comportamiento
cambiara. Pasan a `objectContaining`: una prueba tiene que fijar **lo que le importa**, no la
forma completa de una llamada.

**Como revertirlo.** Quitar el bloque de salvaciones de `changeHp` y los dos campos de los
esquemas. **Pero eso devuelve el fallo**, no solo la funcionalidad.

---

## 2026-09-02 (tarde) — La copia de seguridad estaba rota, y habria dicho que no

**Que.** El pendiente que llevaba todo el dia abierto —«¿el trabajo de copias de las 04:00 cubre
esta base?»— se comprobo por fin. La respuesta es peor que un no.

**El bloque existe y nunca ha corrido**: se anadio hoy, despues de la corrida de las 04:00, asi
que la copia de esta manana **no contiene la base de D&D en absoluto**.

**Y cuando corra esta noche, no serviria.** Perdio las **comillas simples**, asi que
`$POSTGRES_PASSWORD` y `$POSTGRES_USER` se expanden en el *host* —a vacio— en vez de dentro del
contenedor. `sh -c PGPASSWORD=` ejecuta una asignacion y **sale con codigo 0**, de modo que el
`if` del script lo da por bueno y registra `dnd-pg OK` con `FAILED=0`.

**Medido contra el contenedor real, que es la unica forma que vale:**

```
forma rota (la del script):     20 bytes   <- gzip de la nada
forma correcta (con comillas): 6305 bytes
```

**Por que esto importa mas que cualquier funcionalidad de hoy.** La documentacion de despliegue
ya lo decia con estas palabras: *«una copia que nadie ha verificado que cubra esta base es peor
que saber que no la cubre»*. Este caso es el escalon siguiente — una copia que **afirma** cubrirla.
Sin mirarla, el primer aviso habria sido el dia que hiciera falta restaurar.

**Lo que NO pude hacer, y queda para el autor:** editar el script. Este equipo tiene bloqueada la
modificacion de ficheros de produccion por SSH; se intento tres veces y se paro en vez de buscar
un rodeo. **El arreglo es una linea y esta escrito, con su comando, al principio de
[06-pendientes](./06-pendientes.md)** y en `vps1new:/root/docs/06-pendientes.md`. Copia previa
del script en `/root/scripts/backup-coolify.sh.bak.antes-dnd`.

**Mientras tanto, lo unico que cubre esta base** son los dos volcados manuales que se hicieron
antes de cada despliegue de hoy, en `vps1new:/root/backups/dnd/`. Que existan fue suerte del
procedimiento, no del sistema de copias.

---

## 2026-09-02 (tarde) — Segundo despliegue: la hoja de personaje en produccion

**Que.** Subieron 2A.6, 2A.7, 2A.8, 2A.12, 2A.14, 2A.15, los cuatro huecos de mecanica y la
pantalla legal. Volcado previo en `vps1new:/root/backups/dnd/pre-hoja-<fecha>.dump`.

**Comprobado con salida real, no con configuracion:** los tres contenedores sanos; la segunda
migracion del dia aplicada sola por el `CMD` de la imagen; **las seis tablas nuevas y las
dieciseis columnas de la hoja presentes en la base de produccion**; `/` y `/acerca-de` en 200;
y los cinco endpoints nuevos devolviendo **401** sin sesion.

**Y 26 recorridos de navegador verdes** antes de subir, incluidas las cuatro medidas de
contraste del aviso legal —5,39:1 y 6,17:1 sobre el 4,5:1 exigido—, porque **un aviso legal que
no se puede leer no cumple mejor que no ponerlo**, y eso solo se mide en un navegador.

**Lo que este despliegue NO vuelve a comprobar, y por que:** las dos tandas del limite de
intentos. No cambio la topologia de proxies ni las variables de entorno, que es de lo unico que
depende esa aritmetica.

---

## 2026-09-02 (tarde) — 2A.6, 2A.7, 2A.8 y 2A.12: la hoja deja de ser un formulario

**Que.** Cuatro tareas a la vez, escritas por dos implementadores en paralelo sobre una migracion
y unos contratos que se escribieron **antes** de repartir, precisamente para que nadie se
disputara `schema.prisma`.

**2A.6 — la hoja persistida.** `GET`/`PATCH .../sheet`. Se guardan las seis caracteristicas en
seis columnas, las claves de raza, subraza y clase, y las elecciones resueltas. **Los PG maximos,
la CA y los modificadores no se guardan: se calculan** en cada lectura con `deriveCharacter`.
Guardar lo calculado significa que el dia que se corrija una formula habra mil filas mintiendo
sin forma de saber cuales.

**Y una hoja a medio hacer no es un error.** Sin caracteristicas o sin clase no hay nada que
derivar, y el `GET` devuelve `sheet: null` con su motivo en vez de un 500.

**2A.7 — PG mutables, partidos por intencion.** Un `POST` de **delta** para el caso normal —en la
mesa nadie dice «tengo 12», dice «recibo 5»— aplicado con la fila bloqueada, asi que **dos
jugadores aplicando −5 y −3 aterrizan los dos**; y un `PATCH` **absoluto** con `expectedVersion`
para la correccion del DM, que da **409** si alguien cambio los PG mientras miraba. Un DM que
corrige a mano quiere pisar, pero quiere saber que pisa.

**Los PG temporales se gastan primero y no se acumulan**: dos fuentes no se suman, se queda la
mayor. Es el error clasico y esta probado por mutacion.

**Tiradas de muerte, con sus cuatro resultados.** Un 20 natural devuelve a 1 PG; un 1 natural
cuenta **dos** fracasos. Meterlos en exito/fracaso seria perder justo lo que hace tensa esa
tirada.

**2A.8 — recursos, descansos y dados de golpe.** Inspiracion, furia, ki, dados de golpe y
espacios de conjuro son **el mismo mecanismo**, y por eso son una tabla y no cinco
funcionalidades. El descanso largo recupera **la mitad de los dados de golpe redondeando hacia
arriba, minimo uno** —«todos» es el error clasico— y **el brujo repone sus espacios en descanso
CORTO**, que es lo que distingue la magia de pacto.

**2A.12 — condiciones y velocidad efectiva.** Con la regla que habia que acertar: **la condicion
que deja la velocidad a 0 gana, y dos mitades NO se multiplican.** Derribado y agotado nivel 2 a
la vez sigue siendo la mitad, nunca un cuarto: el SRD no compone reducciones de movimiento, y un
modelo que las multiplicara inventaria una regla que no existe. **La traza nombra todas las
causas**, no solo la primera.

**Dos cosas que encontro mi revision y los informes no traian:**

- **La traza de velocidad no era sumable.** Con dos condiciones a cero, cada paso restaba la base
  entera, asi que sumar los pasos daba un negativo donde la hoja dice 0 — y el motor de
  derivacion **si** mantiene esa invariante (`override` guarda el delta). Ahora la primera causa
  lleva el delta y las demas llevan cero: siguen nombradas y ya no mueven un total que no vuelven
  a mover.
- **La curacion por dados de golpe no se topaba contra los PG maximos.** Lo dejo anotado quien lo
  escribio, porque el maximo no se guarda y su modulo no lo tenia a mano. Ahora lo deriva
  (`character-state/common/max-hp.ts`), y **las dos carpetas cuelgan del mismo calculo y ninguna
  de la otra**, que es lo que evita el ciclo.

**Mutacion comprobada por el orquestador, seis veces y sin fiarme de los informes:** el 409 de
version obsoleta, los PG temporales gastandose primero, el 1 natural contando dos, el candado del
recurso `DM_ONLY`, la mitad de los dados de golpe y el cero ganando sobre la mitad. **Las seis en
rojo**, restauradas, y una septima propia sobre el tope de curacion. 585 unitarias y **90 e2e en
18 suites**, corridos **en serie** al final porque tres agentes compartieron base de datos.

**Tres cabos declarados en 06**, y uno importa mas de lo que parece: **«estable» no sobrevive a la
peticion que lo produce**, porque estabilizarse pone los contadores a cero y un `GET` posterior no
lo distingue de «acaba de caer». La solucion no necesita migracion — `CharacterCondition` acepta
clave libre desde 2A.12, y «estable» es una condicion.

**Como revertirlo.** Borrar `apps/api/src/character-state/`, los ficheros `character-sheet.*` de
`characters/`, sus e2e, y quitar `CharacterStateModule` de `app.module.ts`. Las columnas y las
tablas se quedan sin usar, que no molesta.

---

## 2026-09-02 (tarde) — 2A.14 y 2A.15: la aplicacion empieza a avisar, y el mundo a recordar

**Que.** Dos tareas que el motor de reglas necesita antes de existir. La **bandeja de avisos**
(`GET /notifications`, `POST /notifications/read`) y el **estado del mundo**: marcas con nombre,
conjuntos con nombre y senales, todos con su `GameEvent`.

**Por que estan en 2A y no despues.** El efecto «avisar» del motor **no tiene donde escribir**
sin la bandeja, y sin «avisar» el modo propuesta no puede existir. Y las marcas y los conjuntos
son sobre lo que el motor condiciona: sin ellos, «SI el puente esta caido» no se puede escribir.

**Lo que la bandeja arregla, y llevaba tiempo:** la aplicacion **no le contaba nada a nadie**.
Habia eventos de dominio emitiendose desde la fase 1 —`campaign.member_joined`,
`entity.created`— que **nadie escuchaba**. Ahora los escucha, y con un cuidado que merece
decirse: el aviso de entidad creada **se reparte a traves de `canView`**, no a todos los
miembros. Avisar a ciegas de que existe una ficha `DM_ONLY` filtra su existencia, que es la
mitad del secreto.

**Aislamiento entre usuarios, comprobado donde importa:** `userId` va **en el `where` de la
consulta**, no en una comprobacion posterior; tanto al listar como al marcar leidas. Comprobado
por mutacion: quitandolo de `list()`, los avisos del DM se colaban en la bandeja del jugador.

**Y el payload lleva datos, nunca la frase.** Guardar «Ana te invito a Ceniza» en la base seria
escribir espanol en una columna y perder la posibilidad de cambiarlo. Es la misma regla que
`labelKey` en el motor.

**Idempotencia, que no es un adorno:** anadir dos veces el mismo miembro a un conjunto **no lo
duplica ni falla**, y ademas **no escribe una segunda linea en el log**. Los efectos del motor
se van a encadenar hasta diez saltos; un efecto que no sea idempotente produce basura que crece
sola. Comprobado por mutacion: cambiando el `upsert` por un `create`, la segunda llamada daba
500.

**Lo que NO se enganicho, y se dice en vez de inventarlo.** Cinco tipos de aviso existen en el
contrato y **nada los emite todavia** (`ENTITY_REVEALED`, `SESSION_STARTED`,
`SESSION_SCHEDULED`, `COMMENT_ADDED`, `RULE_PROPOSAL`), y cuatro eventos de dominio que si se
emiten no tienen tipo de aviso que les corresponda. Y `recordEntityOpened` —el suceso que el
motor escuchara, escrito con visibilidad `DM_ONLY` como exige el hueco H3— **esta implementado
y no esta conectado** al modulo de entidades. Va a 06.

**Como revertirlo.** Borrar `apps/api/src/notifications/`, `apps/api/src/world-state/` y sus dos
e2e, y quitar los dos modulos de `app.module.ts`. Las tablas se quedan vacias sin molestar.

---

## 2026-09-02 (tarde) — La atribucion del SRD, vista desde la aplicacion (deuda S1)

**Que.** Un pie en toda pantalla con sesion (`apps/web/src/ui/LegalNotice.tsx`, montado dentro de
`AppShell`) y una pantalla `/acerca-de` con el texto completo de la atribucion CC BY 4.0.

**Por que ahora y no con 2A.10.** La ficha S1 llevaba una condicion de disparo, no una fecha:
*«deja de ser opcional en cuanto una pantalla pinte datos del SRD»*. La hoja de personaje los va
a pintar, y cerrar esto **antes** cuesta lo mismo y quita el riesgo de que se recorte junto con
la tarea que lo arrastraba.

**Tres decisiones que merecen leerse:**

- **El aviso va en ingles y no se traduce.** Es el texto de atribucion que la licencia
  especifica; traducirlo seria modificar justo lo que da fe de la modificacion. Lo que si va en
  espanol es la nota de modificacion, porque describe lo que hicimos nosotros.
- **`/acerca-de` no lleva `ProtectedRoute`.** Una atribucion que exige iniciar sesion no esta en
  la obra distribuida: esta detras de ella.
- **El pie vive en el armazon y no en cada pantalla.** La CC BY la pide en la obra distribuida, y
  el armazon es lo unico que todas las pantallas con sesion comparten; ponerla una por una seria
  una regla que se olvida en la siguiente.

**Un efecto secundario aceptado y dicho:** en `/acerca-de` la atribucion sale dos veces, porque
la pagina vive dentro del armazon que ya lleva el pie. No molesta a nadie y evita una excepcion
—«ocultar el pie en esta ruta»— que habria que recordar en cada rediseno. Las pruebas lo dicen
en vez de romperse por ello.

**Mutacion comprobada.** Quitando la nota de modificacion del pie, la prueba se pone roja. Es la
mitad que se olvida: omitirla incumple igual que omitir el nombre del autor.

**256 pruebas de web verdes**, ocho de ellas nuevas.

**Como revertirlo.** Borrar `LegalNotice.tsx`, `AcercaDePage.tsx` y su prueba, y quitar la ruta y
la llamada al pie. **Pero entonces vuelve el incumplimiento** en cuanto una pantalla ensene datos
del SRD, asi que revertir esto exige quitar tambien esa pantalla.

---

## 2026-09-02 (tarde) — 2A.13: tirar de verdad

**Qué.** `POST /campaigns/:id/rolls`. El servidor tira con el evaluador de 2A.1, escribe un
`GameEvent` de tipo `ABILITY_ROLL` con la expresión, los dados, lo conservado, lo descartado, el
total, la CD si la había y el resultado, y lo devuelve. La visibilidad la elige quien tira.

**Por qué era una tarea y no un detalle.** 2A.1 solo evaluaba; **nadie ejecutaba una tirada**.
De esto dependen tres cosas: las tiradas de creación de personaje (2A.6), el disparador «una
tirada falla» del motor de eventos, y la línea de tiempo de la sesión.

**El azar vive en el servidor y en ningún otro sitio.** Si tirara el cliente, una tirada sería
una afirmación del navegador, y la mesa no tendría forma de distinguir un 20 de un 20 escrito a
mano.

**`natural` y `outcome` son dos campos porque son dos hechos.** Un 20 natural que no llega a la
CD sigue siendo un 20 natural, y un 1 que la supera sigue siendo un 1; en la mesa se cantan los
dos. Y el natural es **el dado que se conserva**, no el que se tira: con desventaja, un 20
descartado no es un 20 natural. Cuando no hay exactamente un d20 con un solo dado conservado
—`3d20`, dos términos de veinte— se dice `NONE` en vez de elegir uno por orden de aparición.

**Dos comodidades que se ganan gratis:** si quien tira no dice la sesión, **se usa la que esté
en curso**; y no tener ninguna abierta no es un error, la tirada queda fuera de sesión, que es
un estado que el log ya sabía representar.

**Una adición a 2A.1:** `DiceTermResult` gana `sides`. Para decir si una tirada es un 20 natural
hay que saber que el dado era de veinte, y la alternativa era volver a analizar la expresión con
una segunda copia del analizador — que es como dos copias del mismo dato acaban discrepando.

**Mutación comprobada, tres veces.** Mirando el dado tirado en vez del conservado: cae la prueba
de la desventaja. Cambiando `>=` por `>` contra la CD: cae la del éxito justo. Invirtiendo la
comprobación de propiedad del personaje: caen dos. Restauradas; 20 unitarias y 8 e2e verdes.

**Un hallazgo que salió de una prueba fallida, y se queda anotado.** La prueba de cien tiradas se
ponía roja sola: no por los dados, sino por el **límite global de 100 peticiones por minuto y por
IP**, que empezaba a devolver 429 a mitad de bucle. La prueba se bajó a treinta —medir el
limitador no era su trabajo— y **la pregunta que abre va a 06 como R1**: una mesa entera puede
salir por una sola IP, y el sondeo del log gasta del mismo presupuesto.

**Cómo revertirlo.** Borrar `apps/api/src/rolls/`, `packages/shared/src/roll.schema.ts` y
`apps/api/test/rolls.e2e-spec.ts`, y quitar `RollsModule` de `app.module.ts`. `sides` en el
evaluador puede quedarse: no molesta a nadie.

---

## 2026-09-02 (tarde) — Once huecos de mecánica, y los cuatro que no podían esperar

**Qué.** El autor pidió un repaso de mecánicas faltantes con 2A.1-2A.5 ya en producción. Salieron
once huecos, en [su propia spec](./superpowers/specs/2026-09-02-huecos-de-mecanica-2A.md): no
repite los informes anteriores, los lee **contra el código que ya existe** y contra lo que
contestaron los jugadores.

**El criterio para cerrar uno ya no es nuevo:** si cerrarlo hoy es cambiar una forma de datos y
cerrarlo mañana es migrar filas escritas, se cierra hoy. Y hay una circunstancia que aprieta —
**la aplicación está en producción**, así que cada hora puede haber filas reales.

**M1 · La media competencia no existía, y dos clases del SRD ya la usaban.** El enum era
`none / proficient / expertise`; la 5.ª edición necesita **cuatro**. «Aprendiz de todo» del bardo
(nivel 2) y «Atleta excepcional» del campeón (nivel 7) suman **la mitad** del bonificador, y las
dos estaban ya transcritas en el catálogo: **la hoja las anunciaba y no las aplicaba**. Es el
mismo argumento con el que la pericia entró siendo un enum de tres en vez de un booleano — se
había cerrado media puerta.

**M2 · Ataque Extra.** El informe de huecos dijo que el dato iba en 2A con el catálogo de
clases; 2A.3 transcribió el catálogo y no lo incluyó. No era un hueco futuro: era una tarea
cerrada a la que le faltaba una columna. Y la corrección que hacía ese informe era buena: Ataque
Extra **no es un rasgo condicional como Ataque Furtivo, es un número**.

**M3 · Los espacios de conjuro, que los jugadores pidieron por su nombre.** El documento de
respuestas ya los había fallado dentro de 2A y **las diecisiete tareas no los nombraban**. Entra
la tabla, no la matemática de conjuros: un espacio es el mismo mecanismo que la inspiración, un
contador con máximo que un descanso repone. Con sus **tres progresiones**, porque confundirlas es
el error obvio: completa, media —que empieza al nivel 2, y por eso su primera fila está vacía a
propósito— y de pacto, que tiene pocos espacios del mismo nivel y **repone en descanso corto**.

**M4 · La iniciativa.** Estaba en la anatomía de la hoja al lado de la CA y la velocidad, y el
motor no la derivaba. Una línea, y evita que 2A.10 tenga que volver a tocar el motor.

**Mutación comprobada, cinco veces.** Media competencia devolviendo el bonificador entero: 12
pruebas en rojo. El guerrero perdiendo su tercer ataque: 2. El paladín lanzando desde el nivel 1:
1. El brujo reponiendo en descanso largo: 1. La iniciativa dejando de derivarse: 4. Todas
restauradas; 322 pruebas verdes en `src/rules`.

**Tres huecos colocados en una tarea concreta**, para que la tarea no los redecida:
`Character.equippedSlots` —que la parte 2 del plan mandaba crear en 2A y sigue sin existir— va en
**2A.6**; las tiradas de salvación contra muerte van en **2A.7**, porque la mecánica empieza justo
cuando los PG llegan a 0; y la **clave libre de condiciones** va en **2A.12** — el informe de
huecos avisó de que un enum cerrado deja fuera la concentración, y la parte 2 del plan escribió
«lista cerrada» pisando el aviso.

**Cuatro declarados en 06**, y uno de ellos con prisa: **el personaje se archiva, no se borra**.
Lo pidieron los jugadores, hoy el borrado es definitivo, y es lo único de esa lista que pierde
datos mientras espera.

**Cómo revertirlo.** Quitar `spell-slots.ts` y `mechanics-gaps.spec.ts`, y devolver el enum a
tres estados. **Ojo con el orden:** si ya hay personajes guardados con `half`, revertir el enum
es una migración de datos, que es exactamente lo que este cambio existía para evitar.

---

## 2026-09-02 (tarde) — Despliegue de la tanda 2A.3-2A.5, con su migracion

**Que.** Subieron a `dnd.supportive.pro` las tareas 2A.3, 2A.4, 2A.5 y el commit de arreglos de
la revision. Lanzado por la API de Coolify desde **dentro** de la VPS, no desde este PC.

**Volcado previo, porque una migracion cambia el esquema y eso no se hace a ciegas:**
`pg_dump --format=custom` en `vps1new:/root/backups/dnd/pre-2A5-<fecha>.dump`. Es una red de
seguridad del despliegue, no el sistema de copias — ese sigue sin verificarse que cubra esta
base, y es el primer pendiente de [03](./03-despliegue.md).

**Comprobado en produccion, con salida real:** los tres contenedores vuelven `healthy`; la
migracion `20260902131046_session_state_and_game_event` se aplica sola por el `CMD` de la
imagen; **el indice unico parcial `session_one_in_progress_per_campaign` existe en la base de
produccion**; `GET /` da 200; `/api/auth/me` y el `/events` nuevo dan 401 sin token; el
certificado es de Let's Encrypt para el dominio, medido **desde dentro** con `openssl s_client`
porque Norton intercepta el TLS en el PC del autor.

**Y las dos tandas del limite de intentos, incluida la que casi nadie hace:** sin cabecera
falsa, `401 401 401 401 401 429`; **falsificando `X-Forwarded-For`, exactamente lo mismo**. Eso
confirma que Traefik sigue descartando la cabecera del cliente y que `TRUST_PROXY=2` alcanza al
cliente real. Si hubiera dado seis 401, el limite no protegeria a nadie.

**Lo que este despliegue NO comprueba, dicho para que nadie lo suponga:** que dos visitantes
distintos tengan cubos separados. La prueba se hizo desde una sola red —la del propio
servidor—, y para eso hacen falta dos origenes reales. Sigue pendiente en 03.

**Y una mentira de documentacion corregida:** `03-despliegue.md` seguia diciendo en su cabecera
«TODAVIA NO SE HA DESPLEGADO NADA», falso desde el primer despliegue del mismo dia. Importa mas
de lo que parece, porque el resto del documento se lee distinto segun si su lista del primer dia
ya se hizo o no. Ahora hay una seccion con lo comprobado y su evidencia, y otra con lo que sigue
sin comprobarse.

**Como revertirlo.** Volver a desplegar el commit anterior desde Coolify. La migracion es
**aditiva** —columnas y una tabla nuevas, ningun borrado—, asi que el esquema viejo convive con
los datos; si hubiera que deshacerla, el volcado de arriba es el punto de partida.

---

## 2026-09-02 (tarde) — La revisión de 2A.3 y 2A.4, y lo que destapó

**Qué.** Dos agentes revisaron el rango `51a0daa..f268a7c` en paralelo, de solo lectura y con
contexto limpio, como manda [04-convenciones](./04-convenciones.md): uno sobre corrección del
SRD y calidad de las pruebas, otro sobre arquitectura, contrato con las tareas siguientes y
seguridad. Entre los dos: ocho hallazgos altos, siete medios y nueve bajos. **Esta entrada
existe porque el proceso se había saltado**: 2A.3 y 2A.4 se cerraron sin revisión, y lo señaló
el autor.

**El hallazgo que más duele, y era mío.** Los invariantes del catálogo **no fijaban ni una cifra
concreta**. El revisor lo demostró de la única forma que vale: mutó las salvaciones del clérigo
a Inteligencia, las mejoras del guerrero a las estándar y la CA de la media placa de 15 a 11, y
**las 210 pruebas siguieron verdes**. Comprobaban la *forma* («dos salvaciones, distintas y
válidas») y no el *valor*. La forma caza el copiar y pegar; el valor caza el dígito mal
transcrito, que es el otro error de una transcripción. El arreglo es `reference.spec.ts`: la
tabla del SRD entera, a mano, comparada con `toEqual`. Las mismas mutaciones ahora ponen en rojo
cuatro pruebas.

**Y lo que sigue sin estar cubierto, dicho en vez de tapado:** el nivel de las ~203 aptitudes de
clase. Fijarlas sería transcribir los mismos datos dos veces, y dos copias derivan. Está como
**S10** en [06](./06-pendientes.md), y la mutación «evasión del pícaro del 7 al 4» sigue pasando.

**Dos errores reales en el código, no en las pruebas.** `spellcastingAbility` se pasaba al motor
sin mirar el nivel, así que un paladín o un explorador de **nivel 1** recibía CD de salvación de
conjuro y bono de ataque de conjuro que el SRD no le da — y `classes.ts` llevaba un comentario
que decía la regla correcta y que el código no aplicaba. Y al explorador le faltaban dos filas de
progresión, las mejoras de los niveles 10 y 14.

**Cuatro trampas puestas para las tareas siguientes, desactivadas ahora que salen gratis:**

- `CharacterBuild` era una interfaz de TypeScript **sin esquema Zod**, contra la norma del
  proyecto. Si a `abilities` le faltaba una característica, el `NaN` se propagaba a **toda** la
  hoja en silencio. Ahora vive en `packages/shared/src/character-build.schema.ts`, con el nivel
  acotado a 1–20 — sin ese tope, el nivel 21 daba competencia +7 y el 0 daba PG negativos.
- Una elección huérfana lanzaba una excepción **al derivar**. En cuanto 2A.6 persista las
  elecciones, cambiar de raza dejaría filas viejas y **el personaje se volvería ilegible por un
  dato caduco**. Ahora derivar avisa (`stale_choice`) y solo escribir es un error.
- `deriveCharacter` —«la puerta de entrada» según 01— **tiraba** los rasgos, las velocidades y
  las claves de raza y clase, así que ni 2A.10 ni 2A.12 podrían haberla usado.
- Dos escudos sumaban **+4** y dos armaduras de cuerpo dejaban la descartada como un aviso que en
  pantalla parece una sugerencia. Ahora es `InvalidEquipmentError`.

**Tres mentiras de documentación, corregidas donde miente el texto y no el código:** «es un 400,
no un 500» (no hay filtro de excepciones; la API devolvería 500, y montarlo es 2A.6 → ficha S7);
«el catálogo tiene un solo consumidor, el motor» (es al revés: la dirección es `catalog →
engine`); y «trece armaduras y el escudo», que son doce.

**Y una prueba que no podía ponerse roja**, anunciada además como control legal: afirmaba
`sourceType !== "manual"` sobre modificadores que **nunca** llevan ese valor. Sustituida por una
lista blanca real de claves del SRD.

**Una postura discrepante, anotada con las dos versiones** como pide 04: el revisor pedía que las
velocidades pasaran ya por el motor; se deja para 2A.12, que es literalmente esa tarea, con la
obligación explícita de convertirlas allí en modificadores. Ficha **S9**.

**Una incidencia de proceso, que también se anota.** Uno de los revisores dejó **cinco
mutaciones sin restaurar** en el árbol de trabajo; se detectaron antes de que entraran en ningún
commit y se restauraron desde git. El encargo ya decía que un revisor que toca el árbol limpia
después; a partir de ahora tiene que exigir además un `git status` limpio como última acción.

**Cómo revertirlo.** Es un commit de arreglos: revertirlo devuelve los defectos de arriba, no
quita funcionalidad.

---

## 2026-09-02 (tarde) — 2A.5: la partida empieza a tener estado

**Qué.** El proyecto guardaba **documentos** y no guardaba **partida**: `Session` no tenía
estado, así que no existía «sesión en curso» y una tirada, unos PG o un descanso no tenían de
dónde colgar. Ahora la sesión tiene `status`, `startedAt` y `endedAt` con sus dos endpoints de
DM, y al lado hay un log append-only, `GameEvent`, con su unión discriminada de Zod y su
lectura paginada y filtrada por `canView`.

**La decisión que da valor a todo esto: el log nunca es la fuente del estado.** El estado se
lee de sus columnas; el log cuenta *qué lo cambió*. Es lo que impide que su `payload Json` sea
la trampa que el proyecto ya pisó con `Entity.body` en 1.17b. La regla queda escrita en
[04-convenciones](./04-convenciones.md), no implícita: **todo lo que haga falta consultar es
una columna real, y un campo del `payload` que haya que consultar se promociona a columna**.

**Una restricción que la base puede garantizar, la garantiza la base.** «Como máximo una sesión
en curso por campaña» es un índice único **parcial** de Postgres dentro de la migración, no un
`if` en el servicio — un `if` ahí es una carrera esperando a ocurrir en cuanto el DM tenga dos
pestañas abiertas. El servicio solo traduce el choque a un 409 legible.

**Mutación comprobada, y esta era la que importaba:** con el índice **borrado de la base**, la
prueba «arrancar una segunda sesión en la misma campaña falla» se pone roja y las otras cinco
siguen verdes. Y quitando el filtro de `canView` de la lectura del log, cae la del evento
`DM_ONLY`. Restaurados los dos: 51 e2e de API en 13 suites, verdes.

**Un detalle de paginación dicho en voz alta en vez de escondido:** el filtro por `canView` va
después de traer la página, así que una página puede volver vacía con log por leer. El cursor
sale de la **última fila traída**, no de la última visible — si saliera de la visible, una
página entera de eventos `DM_ONLY` dejaría al jugador atascado. Filtrar en SQL exigiría
reimplementar la matriz de visibilidad en un `where`, que es justo lo que `canView` existe para
que nadie haga.

**No hay `POST` del log.** Un evento nace del cambio que lo provoca y se escribe en su misma
transacción; dejar escribirlo suelto permitiría inventar una historia que no ocurrió.

**Un fallo propio, anotado:** una prueba nueva pasaba y otra fallaba por `jest.clearAllMocks()`,
que borra las llamadas pero **no las implementaciones** — el rechazo de una prueba se colaba en
la siguiente. Es `resetAllMocks`, y queda dicho en el propio fichero.

**Cómo revertirlo.** `prisma migrate resolve` hacia atrás sobre
`20260902131046_session_state_and_game_event`, borrar `apps/api/src/game-events/`,
`packages/shared/src/game-event.schema.ts`, `apps/api/test/game-state.e2e-spec.ts` y los dos
métodos `start`/`close` de `sessions`. Ninguna pantalla depende de ello todavía.

---

## 2026-09-02 (tarde) — 2A.4: elecciones pendientes y avisos

**Qué.** *«+1 a dos características a tu elección»* y *«elige cuatro habilidades»* dejan de ser
casos especiales por raza y pasan a ser **el mismo mecanismo**: una concesión con `choose`, una
validación en el servidor y un aviso cuando falta. `choices.ts` valida; `resolve.ts` aplica o
apunta; `deriveCharacter` junta los avisos del catálogo con los del motor.

**Las tres reglas, cada una con su prueba.** Sin elección **no se aplica nada** y sale un aviso
`unresolved_choice` que dice cuántas faltan. Una elección **incompleta tampoco aplica nada** —
aplicar la mitad daría una ficha con pinta de terminada y números mal, y un aviso dice más—.
Y una elección **inválida es un error, no un aviso**: elegir de más, repetir, salirse de la
lista o elegir lo que `excluding` prohíbe son `InvalidChoiceError`, que el borde traducirá a
400. Se distingue `EXCLUDED` de `NOT_IN_LIST` a propósito: Carisma **sí** está en la lista del
semielfo, lo prohíbe su +2 fijo, y un mensaje que dijera «no está en la lista» mandaría a
buscar el error donde no está.

**Dos comprobaciones que no pedía el plan y salieron escribiéndolo.** Una elección cuya
concesión esta ficha no tiene es un error (`UNKNOWN_GRANT`) y no un silencio: sin eso, una clave
mal escrita haría desaparecer un bono sin explicación. Y elegir una habilidad que ya se tiene
por otra vía —el elfo ya trae Percepción— **no es un error sino un aviso**
(`duplicate_skill_choice`), porque este resolutor no ve todas las fuentes de una mesa real.

**Y lo que hace útil el mecanismo:** una elección resuelta es **indistinguible de un bono fijo**
en la traza — mismo `op`, mismo `sourceType`, misma pinta—, y hay una prueba que lo compara paso
a paso contra el +2 de Carisma. Eso es lo que evita una rama `if (race === "half-elf")` en el
motor y hace que una raza propia en 2B sea añadir datos, no código.

**Mutación comprobada, tres veces.** Forzando `complete: true` en `validatePicks`, caen 10
pruebas, entre ellas «no aplica la mitad». Quitando la comprobación de `excluding`, caen 3.
Quitando `assertNoUnknownChoices`, cae la de la clave desconocida. Restauradas, 210 pruebas
verdes en `src/rules`.

**Lo que no entra, y por qué:** la mejora de característica de los niveles 4, 8, 12, 16 y 19.
Es el mismo mecanismo, pero «+2 a una **o** +1 a dos» es una concesión con dos modos, y quien
decide la forma de la subida de nivel es 2A.9. Anotado como **S6** en 06.

**Cómo revertirlo.** Borrar `choices.ts` y `choices.spec.ts`, y devolver `resolve.ts` a su
versión de `ce4140b`. Nada persiste todavía: las elecciones se pasan en memoria.

---

## 2026-09-02 (tarde) — 2A.3: el catálogo SRD 5.1, y las tres capas que lo verifican

**Qué.** Nueve razas con sus cuatro subrazas, doce clases con su progresión y su única subclase
del SRD, doce armaduras y el escudo, la tabla de bonificador de competencia, `ContentRef`, el
resolutor que traduce una ficha declarada a la entrada del motor de 2A.2, y `NOTICE.md` con la
atribución CC BY 4.0 y su nota de modificación. En `apps/api/src/rules/catalog/`.

**Lo que lo hace fiable no son los datos, son las tres capas de verificación.** Los invariantes
(una prueba, todo el catálogo) cazan el error de copiar y pegar: una clave duplicada, una clase
con tres competencias de salvación, una velocidad a cero, un tope de Destreza que no cuadra con
la categoría de la armadura. Los cinco casos de mesa conocidos —enano de las colinas bárbaro a
nivel 1 y a nivel 5, elfo alto mago, guerrero con cota de malla y escudo, semielfo sin
elecciones— cazan el otro error, que es peor: una cifra transcrita mal o **un rasgo modelado
como suma única cuando el SRD lo da por nivel**. Y el control legal es una prueba, no una
intención: falla si `NOTICE.md` pierde la atribución o la nota de modificación, o si un fichero
de datos pierde su cabecera.

**Mutación comprobada, tres veces.** Cambiando `grant.amount * build.level` por `grant.amount`
en el resolutor, el caso 2 falla (`60` pasa a `55`) — y el caso 1 **no**, porque a nivel 1 el
producto es el mismo, que es exactamente por qué el plan pedía los dos niveles. Poniendo el tope
de Destreza de la cota de malla a `2`, la CA sube a 20 y caen tres pruebas, una de ellas el
invariante de categoría. Cambiando «Modificaciones:» por «Cambios:» en `NOTICE.md`, cae el
control legal. Restaurados los tres, 184 pruebas verdes en `src/rules`.

**Decisiones tomadas en ausencia del autor**, las tres en 06 con su coste de revertir: el
catálogo vive en `apps/api` y no en un paquete (S3), de cada aptitud se transcribió el nombre y
el nivel y no su texto de reglas (S2), y **la atribución todavía no se ve en ninguna pantalla**
(S1) — no hay incumplimiento porque el catálogo aún no se publica, pero deja de ser cierto en
cuanto 2A.10 pinte una hoja.

**Una contradicción del plan, resuelta y dicha:** su §4.4 pone el caso del semielfo («dos avisos
`unresolved_choice`») en 2A.3 y su §5.4 lo pone en 2A.4. Se hace lo que 2A.3 permite sin tocar
el motor: el resolutor devuelve las elecciones pendientes y **no altera ninguna característica**;
convertirlas en avisos del motor y validar una elección propuesta sigue siendo 2A.4.

**Cómo revertirlo.** Borrar `apps/api/src/rules/catalog/` y `NOTICE.md`. Nada más depende de
ellos: el motor no los importa, no hay tabla nueva, no hay migración y no hay endpoint.

---

## 2026-09-02 (mediodía) — El plan de 2A, completo; y su primera tarea

**Qué.** El plan de la fase 2A estaba a medias: once tareas y **ocho preguntas sin responder**,
esperando al autor. El autor pidió además tres cosas nuevas —el sistema de eventos «por cajas»,
las distancias y una bandeja de notificaciones— y se fue a la universidad dejando la fase en
marcha. Así que el plan se cierra: [parte 2](./superpowers/plans/2026-09-02-fase-2A-parte-2-eventos-distancias-y-cierre.md).

**Las ocho preguntas, falladas** en ausencia del autor y con su permiso expreso, cada una con su
motivo y **lo que cuesta si el fallo está mal**. Y los cuatro huecos de forma que llevaban desde
el 2026-09-01 sin decidir —manos, descansos y dados de golpe, PG temporales, pericia— también,
porque cambian la forma de una tabla y decidirlos después de la primera migración sale caro.

**Seis tareas nuevas**, hasta diecisiete: tirar de verdad (endpoint y registro), velocidades y
condiciones, bandeja de notificaciones, marcas y conjuntos, el motor de reglas y su pantalla.
Con su orden final y su punto de corte declarado por si no da tiempo: **el bloque del motor no
se parte por la mitad**, porque un motor sin pantalla no lo usa nadie y una pantalla sin motor
es una mentira.

**Once huecos** aparecieron al juntarlo todo. Cinco resueltos ahí mismo —las condiciones
bajaron de 2C a 2A porque la velocidad efectiva las necesita; nada ejecutaba una tirada; el
efecto «avisar» no tenía dónde escribir; deshacer exige guardar el antes y el después—. **Seis
siguen abiertos** y están en 06, y uno de ellos importa más que el resto: **con qué autoridad
escribe una regla**. Si un jugador abre una ficha y eso revela algo, la escritura la hace
alguien que no podía hacerla. La propuesta es que se aplique con la autoridad del DM que armó la
regla, pero **eso necesita su propia revisión de seguridad antes de construir el motor**.

**Y la primera tarea, hecha:** el evaluador de expresiones de dados (2A.1), con 27 pruebas y sus
dos mutaciones comprobadas.

**Un error propio, anotado para no repetirlo:** un `git add -A` metió el evaluador **sin sus
pruebas** dentro de un commit de documentación. No se reescribió historia ya empujada; la tarea
se cerró en el commit siguiente y quedó dicho. `add -A` no se usa con trabajo a medias en el
árbol.

**Revertir.** Todo esto es documentación salvo `apps/api/src/dice/`, que es puro y no lo importa
nadie todavía.

---

## 2026-09-02 (tarde) — Segunda pasada del reseño: lo que el autor señaló al verlo

**Qué.** El autor miró la interfaz desplegada y mandó dos capturas con tres cosas: el logotipo
parecía un emoji, la cabecera «casi no se nota», y las insignias de visibilidad eran cajas que
pesaban más que el nombre al que acompañaban. Pidió además mejorar los formularios.

| Señalado | Qué era en realidad |
|---|---|
| «que el logo no sea un emoji» | **Había dos.** La pestaña **no tenía icono ninguno**, así que el navegador ponía el suyo genérico; y el conmutador de tema era el carácter `☾`/`☀`, que se pinta como emoji a color en unos sistemas y como cuadrado vacío en otros |
| «el header casi no se nota» | 48 px de alto, **del mismo color que las tarjetas** que debía enmarcar y separado por el mismo filete gris. Era una tarjeta más |
| Las insignias | Borde de **3 px**: pesaban más que el nombre de la ficha |
| El horizonte del acceso | Un zigzag de rectas. Se leía como un **gráfico de líneas**, no como terreno |

**Lo entregado.** Marca dibujada (rosa de los vientos + regla, en trazo, heredando el color)
con su `favicon.svg`, iconos de sol y luna dibujados, cabecera de 64 px sobre fondo **más
oscuro** que las superficies y con filete de cobre, insignias de 1 px —donde la señal que
distingue los cinco niveles es el **glifo**, no el grosor—, y un horizonte de curvas
irregulares con cumbres, abetos de escala y una torre en ruinas **apoyada** en la loma.

**Lo que apareció tirando del hilo, que es lo interesante:**

1. **El mismo defecto tres veces en una mañana: un valor de enumeración llegando a la
   pantalla.** `Ciudad Ceniza (LOCATION)` en los enlaces; `PUBLIC`, `DM_ONLY` como opciones del
   selector de visibilidad; y `Nuevo LOCATION` como título de diálogo. Se arreglaron los tres y
   **se escribió la regla** en [04-convenciones](./04-convenciones.md), porque un fallo que
   reaparece tres veces en una mañana volverá una cuarta.

2. **La visibilidad pasó de desplegable a radios con explicación.** Es el rasgo que distingue
   este producto de una wiki cualquiera y estaba pidiendo elegir entre cinco palabras en inglés
   sin decir qué hacía ninguna. Ahora cada nivel lleva su insignia y una frase.

3. **Y esa frase mintió.** La primera versión prometía que «público» dejaba ver a quien no
   estuviera en la campaña. Es falso: `canView` rechaza al no miembro **antes** de mirar el
   nivel, así que `PUBLIC` y `PLAYERS` producen hoy el mismo conjunto de espectadores —y
   [05-datos.md](./05-datos.md) **ya lo decía bien**. Se corrigió el texto, no el documento.
   De ahí sale la regla: si la interfaz explica una regla del servidor y discrepan, **miente la
   interfaz**.

4. **Las filas dibujaban el borde partido**, y eso era un defecto de verdad, no un gusto. Al
   pasar de `<button>` a `<a>` heredaron `display: inline`, y un borde sobre un elemento en
   línea que ocupa varias líneas se dibuja a trozos. **Nada podía cazarlo**: `jsdom` no
   maqueta, ninguna aserción de texto lo nota, y sobrevivió a la suite entera en verde y a un
   despliegue. Ahora la suite de navegador lee el `display` **calculado** de la fila.

**Alineación de la documentación**, revisada a propósito en esta pasada: dos afirmaciones vivas
habían quedado desfasadas y se corrigieron —[01-arquitectura](./01-arquitectura.md) decía que
el editor era «la única vista de detalle que existe», y el hallazgo **E2** de
[06-pendientes](./06-pendientes.md) daba por hecho que los enlaces solo se pintaban dentro de
él—. Los registros fechados **no se reescribieron**: donde su premisa cambió, se anotó al
margen.

**Revertir.** Cada arreglo es su propio commit. El logotipo, el favicon y los iconos viven en
`apps/web/src/ui/Logo.tsx` y `apps/web/public/favicon.svg`; las reglas de interfaz, en
`04-convenciones`.

---

## 2026-09-02 — Reseño completo de la interfaz

**Qué.** La identidad, la navegación y todas las pantallas. El autor entró en producción por
primera vez y dijo, con razón, que la interfaz *"se ve terrible"* y que *"cada cosa es super
incomoda de usar"*.

**Cómo se decidió qué arreglar.** No leyendo el código: se sembró una campaña real en
producción —nueve fichas de los siete tipos, cuatro enlaces, dos sesiones, tres personajes— y
se fotografió cada pantalla en escritorio y en móvil. Los hallazgos y su evidencia están en
[la auditoría](./superpowers/specs/2026-09-02-auditoria-interfaz.md), que es un registro
fechado y no se reescribe.

**Lo entregado, en cinco commits:**

| | Qué |
|---|---|
| Identidad | Paleta «Sala de guerra» (pizarra naval y cobre) y cuatro voces tipográficas: Marcellus, Public Sans, EB Garamond, IBM Plex Mono. Medievo por cartografía y grabado, no por pergamino |
| Esqueleto | Cabecera global, migas de pan, y las diez secciones agrupadas en una columna: el mundo por un lado, la mesa por otro |
| Listas | Cada fila con su resumen —el texto ya venía en la respuesta y nadie lo pintaba—, una sola barra de herramientas, botones que dicen qué crean, estados vacíos que invitan |
| Lectura | Página propia para cada ficha y para cada personaje. Leer un PNJ ya no exige abrir un formulario |
| Hoja 5.ª ed. | La **forma** de la hoja real, con todas las casillas a su tamaño y vacías, diciendo que lo están. El motor es la fase 2A |

**Por qué la interfaz cuenta lo que cuenta.** Los contadores por tipo se calculan **en el
cliente** sobre listas que el servidor ya filtró por `canView`, así que significan «lo que tú
puedes ver». `listForUser` añadió el rol del visitante y cuántas personas hay en la mesa, y
**no** cuenta fichas: «12 lugares» dicho a quien solo ve 4 delata los otros 8.

**Tres fallos que solo aparecieron al ejecutar, no al mirar:**

1. El conmutador de tema, fijo en la esquina, **tapaba «Cuenta» y «Salir»** de la cabecera
   nueva; los clics no llegaban.
2. Un contador en una pestaña se colaba en su **nombre accesible** («PNJ 12»), de modo que un
   lector de pantalla anunciaba un número como parte del nombre de la sección.
3. Las migas decidían enlace-o-texto **por posición**, y convertían «Mis campañas» en texto
   muerto cuando era la única. Una miga es enlace cuando tiene destino.

**Revertir.** Cada tanda es un commit propio y se puede revertir por separado; la capa de
tokens (`apps/web/src/ui/tokens.css`) es el único punto por el que pasa el color, así que
volver a la paleta anterior es cambiar un bloque de valores, no repintar pantallas.

---

## 2026-09-02 — Primera puesta en producción: dnd.supportive.pro

**Qué.** La plataforma corre en el servidor dedicado (`vps1new`) tras Coolify 4.3.10 + Traefik,
desde `docker-compose.prod.yml`: `db` (postgres:16, volumen `dnd_pgdata_prod`), `api` (aplica
las migraciones de Prisma al arrancar) y `web` (nginx, sirve la SPA y hace de proxy de `/api`).
**Ningún puerto publicado**: el único que entra es Traefik, y solo contra `web`.

**Por qué.** El autor va a enseñar la plataforma a sus jugadores, y una demostración en local
no es una demostración.

**Lo que costó, para que no vuelva a costar:**

- **El primer despliegue falló** con `Permission denied (publickey)`: la clave de Coolify no
  estaba autorizada en el repositorio. Se arregló añadiendo su pública como **deploy key de
  solo lectura** en GitHub.
- **Coolify rechaza el dominio hasta haber leído el compose del repositorio**
  (`Cannot set docker_compose_domains without docker_compose_raw`). El orden obligatorio es:
  desplegar → poner el dominio → redesplegar. No se puede hacer en un solo paso.

**Verificado desde fuera, con evidencia y no con configuración:**

| Comprobación | Resultado |
|---|---|
| Los tres contenedores | `healthy` |
| Migraciones de Prisma | las **tres** aplicadas en el arranque |
| Certificado | Let's Encrypt para `dnd.supportive.pro`, hasta 2026-12-01 |
| `GET /` | 200, con `<title>Plataforma D&D</title>` |
| `GET /api/auth/me` sin token | 401 |
| `POST /api/auth/register` | 201 — escritura real contra Postgres |
| Sexto login fallido | **429** |
| Sexto login **con `X-Forwarded-For` falsificado y rotando** | **429** |

**La última fila es la que vale.** Prueba que **Traefik descarta la cabecera que manda el
cliente** (corre sin `forwardedHeaders.trustedIPs`), y que ahí — no en el número 2 de
`TRUST_PROXY` — está la protección. Si algún día la API sale a un dominio propio, se mete otro
proxy delante, o alguien configura `trustedIPs`, **este razonamiento deja de valer** y hay que
recontar los saltos. Ver `docs/03-despliegue.md`.

**Además.** La base entró en el respaldo diario del servidor (`dnd-pg.sql.gz`), con el volcado
verificado por contenido —11 tablas y la cuenta dentro—, no por tamaño de fichero.
**El restore no se ha probado todavía**: un volcado que nunca se restauró no es un respaldo, y
así queda anotado en el 06 del servidor.

**Revertir.** Borrar la aplicación desde el panel de Coolify. El volumen `dnd_pgdata_prod`
**sobrevive al borrado**; eliminarlo aparte solo si se quieren tirar los datos.

---

## 2026-09-01 — 404, red de errores y las pantallas de cuenta (tarea 1.18b)

**Qué.** Cierra el hallazgo 6 de la auditoría de seguridad y la mitad de web del 8 (B3), sobre
las primitivas de 1.19 y las pantallas ya convertidas de 1.19b:

- **Ruta comodín y pantalla de 404**: una URL inventada daba pantalla en blanco porque `App.tsx`
  no tenía comodín. Ahora dice dónde estás y cómo volver.
- **`ErrorBoundary`** alrededor de la aplicación, con un camino de vuelta que **funciona** — no
  un botón que reintenta el mismo árbol roto — y un comentario que dice lo que una red de errores
  de React **no** atrapa: los errores en manejadores de eventos, en callbacks asíncronos y en SSR.
  Callar eso en un proyecto cuya cicatriz es una pantalla en blanco sería peor que no tener nada.
- **Pantalla de cuenta**: cambiar el nombre visible y cambiar la contraseña, contra la API que
  entró en 1.18a. **La recuperación de contraseña sigue bloqueada** por no haber servicio de
  correo, y no se añade un enlace que no lleve a ninguna parte.
- **Un octavo token, `--warning` en oropimente** (oscuro `#E0A83C`: 8,70 / 7,99 / 7,77 sobre
  `--bg` / `--surface` / `--vellum`; claro `#7A5310`: 5,28 / 5,90 / 6,06), y los tres sitios que
  1.19b había dejado diciendo menos de lo que debían.

**Lo interesante de la tarea, y de dónde salieron sus dos críticos.** `PATCH /auth/password`
**invalida todos los tokens anteriores**, así que la pantalla es deslogueada por su propio éxito
— un comportamiento sin precedente en el resto de la aplicación, sin patrón que copiar.

1. La primera versión mostraba el mensaje y **esperaba a que el usuario pulsara** para cerrar
   sesión. Cualquier otra cosa que hiciera —pinchar «← Mis campañas», volver atrás, dejar la
   pestaña abierta— lo dejaba con **aspecto de sesión viva y un token muerto**, que es el estado
   exacto del crítico de la tarea 1.15, por otro camino. Ahora el token desaparece de
   `localStorage` **en el instante en que la petición responde**, y la explicación viaja al
   inicio de sesión en vez de retener la sesión para poder enseñarse.
2. `logout()` **no vaciaba la caché de consultas** (30 s de vida). En este flujo se vuelve a
   entrar segundos después, y si es otra cuenta —máquina compartida, que es justo el escenario de
   un cambio de contraseña— se pintaban las campañas del usuario anterior.

**Y un tercero que no era del código, sino de la prueba.** El recorrido se titulaba *«el token
viejo muere»* y **no probaba eso**: probaba que la contraseña vieja ya no entra, cierto de
cualquier cambio de contraseña. Ahora captura el token antes del cambio y comprueba que
`GET /auth/me` con él responde **401**. Verificado por mutación: aflojando un año la ventana de
`passwordChangedAt` en el servidor, ese recorrido falla con *Expected: 401, Received: 200*.

**Una lección que no estaba en el plan.** El primer arreglo del crítico 1 —llevar el mensaje en
el estado del enrutador— **pasaba en jsdom y fallaba en un navegador real**: la propia redirección
de `ProtectedRoute` lo borraba entre tres navegaciones. Lo cazó Playwright, no las unitarias. Es
la regla de *«si tocas una pantalla, abres el navegador»* ganándose el sueldo.

**Prueba.** 225 unitarias de web y 24 recorridos de navegador, con las mediciones de contraste
sobre pantallas reales. La prueba de la caché también se comprobó por mutación: quitando
`queryClient.clear()` cae *«logout clears the react-query cache, not just the auth state»*.

**Cómo revertir.** Un commit propio. Revertirlo devuelve la pantalla en blanco en una URL
inventada, quita las pantallas de cuenta y el token de aviso. No toca `apps/api`.

---

## 2026-09-01 — De dónde salen los números de tarea 1.18c, 1.19b, 1.20, 1.21 y 1.22

El plan maestro llega hasta **1.19**. Los números de arriba **no estaban en él**: los creó el
orquestador durante la sesión del 2026-09-01, para trabajo que apareció **por hallazgos de la
propia sesión**, no por el plan. Se registran aquí porque un número de tarea que solo existe en
los mensajes de commit es exactamente la clase de deriva que este proyecto persigue — y porque
el autor preguntó, con razón, de dónde había salido el 21.

| Número | Qué es | Por qué existe |
|---|---|---|
| **1.18a** | Endurecimiento de la API (cabeceras, CORS, límite de intentos, dependencias, cuenta) | Partición por capa del 1.18 del plan, para poder trabajarlo en paralelo con 1.19 |
| **1.18b** | 404, `ErrorBoundary` y pantallas de cuenta | La otra mitad de 1.18, la de web |
| **1.18c** | El límite de intentos, configurable por entorno | **Rotura descubierta al integrar**: el límite de 1.18a dejaba sin sesión a la suite de navegador, que registra usuarios desde una sola IP |
| **1.19b** | Vestir las 19 pantallas con la capa de tokens | 1.19 construyó la capa y convirtió dos consumidores a propósito; sin esto el tema claro no servía de nada |
| **1.20** | Acciones de CI al runtime actual | Aviso de GitHub durante la sesión |
| **1.21** | Aislamiento por ranura (puertos y base de datos) | El paralelismo se serializaba solo por recursos globales |
| **1.22** | Convenciones de trabajo multiagente | La sesión llegó a cinco agentes y las reglas no estaban escritas en ninguna parte |

**Regla que sale de esto:** si se inventa un número de tarea fuera del plan, se registra en el
mismo commit que lo estrena. Un número sin ficha es un número que nadie podrá explicar en tres
meses.

---

## 2026-09-01 — Una ranura por worktree: puertos y base de datos aislados (tarea 1.21)

**Qué.** `scripts/worktree-slot.mjs` (nuevo) es la única fuente de la aritmética: la ranura N usa
el puerto `3000+N·100` para la API, `5173+N·100` para la web, y la base `dnd_wtN`. La **ranura 0
es exactamente lo de hoy** — puertos 3000/5173 y base `dnd` — y quien no defina nada no nota
nada, CI incluido. `pnpm db:slot` crea y migra la base de la ranura, y termina imprimiendo el par
`PORT=` / `DATABASE_URL=` para pegar en el `apps/api/.env` de ese worktree.

**Por qué.** Cuatro copias del repositorio compartían puerto y base de datos, así que dos agentes
no podían probar a la vez: toda la sesión hubo que serializar Playwright a mano, y una rotura de
CI vino exactamente de ese reparto. El paralelismo no lo limitaba el modelo, lo limitaba un
puerto.

**Dos trampas que encontró la revisión doble** —dos revisores sobre el mismo diff, uno en
correctitud y otro en CI, seguridad y Windows—, y que son la lección de la tarea:

1. **La variable estaba documentada en el único fichero donde no hace nada.** `.env.example` se
   copia a `apps/api/.env`, que solo lee la API; Vite y Playwright leen el entorno del shell.
   Quien siguiera la instrucción del propio fichero habría creído estar aislado mientras escribía
   en la base compartida: el fallo que la tarea existe para evitar, servido por su documentación.
   Ahora se documenta **solo como variable de shell**.
2. **La ranura 0 no era idéntica a lo de hoy.** La primera versión inyectaba siempre `PORT` y un
   `DATABASE_URL` reconstruido, ignorando `apps/api/.env`. Coincidía en las cuatro copias y en
   CI, así que la regresión estaba **latente**: `verify` seguía verde. Ahora en la ranura 0 no se
   inyecta nada y el proceso hereda exactamente lo que tenía.

Además: la validación pasa de `Number()` a solo dígitos con tope (`" "`, `".0"`, `"0x1f"`, `"1e2"`
dejaban de ser errores y se convertían en ranuras silenciosas, y `" "` caía en la **ranura 0**);
la aritmética deja de estar duplicada en dos ficheros que decían vivir en uno; y `db-slot.mjs`
deja de poner un valor del entorno en una línea de comandos con `shell: true` —pasa la URL por
`env` y usa `--stdin`—, con lo que el comentario que afirmaba "todos los argumentos son
literales" pasa a ser verdad.

**Prueba.** 23 pruebas del módulo nuevo, 92 unitarias y 43 e2e de API. Y la que importa: la suite
de navegador en la **ranura 1 con los puertos 3000 y 5173 deliberadamente ocupados**, 16/16 en
verde, con la base `dnd` intacta (760/539/84) mientras `dnd_wt1` pasaba de vacía a 13/10/1. Eso
es aislamiento **observado**, no configurado.

**Lo que sigue sin resolver.** Los e2e de API **no** son conscientes de la ranura: leen
`apps/api/.env` y nada más, así que aislarlos sigue siendo editar ese fichero a mano. Está
documentado en [02-entorno.md](./02-entorno.md) y anotado en
[06-pendientes.md](./06-pendientes.md).

**Cómo revertir.** Un commit propio. Revertirlo devuelve los puertos y la base fijos; no toca
`apps/api/src` ni la aplicación.

---

## 2026-09-01 — Las pantallas se visten con la capa de tokens (tarea 1.19b)

**Qué.** Las 19 pantallas y componentes que quedaban pasan a los tokens y a las primitivas de
1.19: **cero clases de paleta de Tailwind** en `apps/web/src` (eran 202 en 19 ficheros), la tira
de pestañas pasa a `Tabs`, los cuatro editores modales a `Dialog`, los formularios a `Field`, y
`ThemeToggle` se monta por fin en el chrome, en todas las rutas.

**Por qué ahora y no con 1.19.** 1.19 construyó la capa y convirtió solo dos consumidores a
propósito, para no mezclar "construir el sistema" con "rediseñar la aplicación". El resultado
era honesto pero incompleto: con las pantallas clavadas a `bg-slate-900`, el interruptor de tema
no mejoraba nada y dejaba el distintivo de visibilidad a **1,10:1** en claro. Convertir las
pantallas es lo que hace que el modo pergamino exista de verdad. Ese distintivo mide ahora
**5,95:1**, y la suite de contraste ya no mide solo la página de muestra: mide **pantallas
reales** —entrar y el detalle de campaña, con una entidad `DM_ONLY`, que es el peor caso— en los
dos temas.

**La densidad, decidida a propósito.** 14 px de base, la misma que ya usaban las primitivas, con
un **suelo de 16 px para los controles de formulario en pantallas táctiles**
(`@media (pointer: coarse)`): por debajo de 16 px, iOS Safari hace zoom al enfocar un campo. La
primera versión del arreglo sostenía que el riesgo no aplicaba "porque cada control lleva su
clase explícita"; lo que dispara el zoom es el tamaño **calculado**, y eran 29 controles a 13 px.

**Lo que la conversión se dejó por el camino, y que la revisión recuperó.** Cambiar a una
primitiva no es solo cambiar clases: la tira de pestañas **perdió el `flex-wrap`** que sí tenía
antes, y los editores modales perdieron el `overflow-y-auto` del overlay viejo, con lo que en
una ventana baja los botones de guardar quedaban fuera sin nada que desplazar. El scroll se
arregla **una vez dentro de `Dialog`**, no tres veces en las pantallas.

**Lo que NO se hizo, a propósito.** Faltan un token de aviso y otro de éxito, y hay tres sitios
que hoy dicen menos de lo que decían. Está esperando una decisión del autor entre dos
direcciones de paleta; no se inventa un color mientras tanto. Ver
[06-pendientes.md](./06-pendientes.md).

**El arreglo que no se aplicaba, y cómo se cazó.** El suelo de 16 px se escribió primero como
`@media (pointer: coarse) { input, textarea, select { ... } }` en `tokens.css`. **No hacía
nada**: son selectores de elemento (0,0,1) y todos los controles llevan la clase
`text-chrome-sm` (0,1,0) sin media query, así que la clase gana pase lo que pase con el orden.
Se comprobó compilando y leyendo el CSS de `dist`. Se arregla en el origen —una variante
`[@media(pointer:coarse)]:text-chrome-md` dentro de `fieldControlClass`, misma especificidad y
emitida después— y **se borra la regla inerte**: dejarla al lado del arreglo bueno haría creer
al siguiente que el problema ya estaba resuelto.

Es la tercera vez en la misma sesión con la misma forma —una prueba que confirma que la pieza
existe pero no que actúa—, así que el criterio de aceptación dejó de ser "que la clase esté":
hay un recorrido que **emula un dispositivo táctil, enfoca un campo real y mide
`getComputedStyle().fontSize`**. Quitando la variante, mide 13 px y falla; con ella, 16 px.

**Prueba.** 204 unitarias de web y **16 recorridos de navegador**, con las mediciones de
contraste sobre pantallas reales bloqueando la suite. Corridos por el orquestador sobre el árbol
final, no tomados del informe, incluida la mutación de arriba.

**Cómo revertir.** Un commit propio. Revertirlo devuelve las pantallas a las clases de paleta y
desmonta el interruptor de tema; no toca `apps/api` ni `packages/`.

---

## 2026-09-01 — Capa de tokens y seis primitivas: "la mesa y el manual" (tarea 1.19)

**Qué.** `apps/web/src/ui/` (nuevo): `tokens.css` con la paleta por tema, `theme.ts` con el
interruptor, y seis primitivas —`Button`, `Field`, `Panel`, `Badge`, `Dialog`, `Tabs`—, cada una
con sus pruebas. `/design-tokens` las muestra todas. Se convierten **solo dos consumidores**, a
propósito: el Markdown del mundo pasa a `Panel tone="vellum"` y el distintivo de visibilidad a
`Badge`.

**La dirección visual la eligió el autor** en conversación, antes de escribir el brief:
**chrome oscuro sobrio, tipo instrumento; el contenido del mundo sobre pergamino con serifa**.
El tema claro no es un extra — **es el modo de lectura en pergamino**. Oscuro por defecto,
`prefers-color-scheme` la primera vez, elección guardada. Elemento firma único: el panel de
pergamino dentro del chrome oscuro. Tipografías por pila del sistema, sin fuentes de red, para
que la medición de contraste sea estable.

**Ocho tokens por tema**, y ninguno se escribe como literal en ningún componente. Acento
**cardenillo** (`#3F8C79`) y destructivo **lacre** (`#B4463C`), más dos variantes de texto que
la medición obligó a añadir: `--accent-text` (`#469b86`) y `--danger-text` (`#cb6b62`). Ese es
el resultado más útil de la tarea: **en oscuro, ningún par ponía `--danger` como texto por
encima de 4,5:1** —lo mejor era 3,43:1—, así que la tabla original estaba incompleta. La
alternativa que llegó primero era pintar el mensaje de error con el color del texto normal, es
decir, un error que no se distingue de un párrafo; se descartó.

**El contraste se mide, no se supone.** `e2e/tokens-contrast.spec.ts` lee los colores calculados
del DOM en los dos temas —componiendo el alfa contra el fondo real— y falla por debajo del
umbral. Ver [08-pruebas.md](./08-pruebas.md).

**Las tres trampas que encontró la revisión, y que son la lección de la tarea:**

1. **`tailwind.config.js` remaquetaba la aplicación entera.** `extend` con las **mismas claves**
   que Tailwind (`fontSize`, `spacing`, y también `borderRadius`) **sustituye**, no añade:
   `.text-base` pasaba de 1rem a 0.875rem, `.text-sm` perdía su `line-height`, `.p-6` de 1.5rem
   a 2rem. 124 usos en pantallas que esta tarea no debía tocar. Ninguna prueba lo veía, porque
   RTL y Playwright seleccionan por rol y por texto. Se renombran a `chrome-*`, `world-*`,
   `s1..s8` y `radius-*`, y se comprueba compilando el CSS.
2. **Medir solo lo que uno eligió medir no es medir.** Dos pares incumplían el umbral de la
   propia tarea —enlaces sobre pergamino a 4,14:1, botón fantasma sobre `--surface` a 4,26:1— y
   la prueba no los veía porque la página de muestra no tenía ningún enlace dentro del panel de
   pergamino. Se añaden las muestras que faltaban y una lista cerrada de qué puede medirse sin
   bloquear.
3. **El `body` bajaba la base de 16 a 14 px** en 17 ficheros no revisados —98 elementos de texto
   sin clase de tamaño, 28 de ellos controles de formulario, y por debajo de 16 px iOS Safari
   hace zoom al enfocar—. Era la misma remaquetación por otra puerta. Se quita: la densidad se
   decide en 1.19b, con las pantallas delante.

**Lo que NO entra, y por qué.** `ThemeToggle` está construido y probado, pero **solo se alcanza
en `/design-tokens`**: mientras las pantallas sigan clavadas a `bg-slate-900`, pulsarlo no
mejora nada y deja los distintivos de visibilidad a **1,10:1** sobre la fila sin convertir. Un
interruptor que anuncia un modo que la aplicación todavía no tiene es una regresión, no una
funcionalidad. Se monta en **1.19b**, que convierte las pantallas. Ver
[06-pendientes.md](./06-pendientes.md).

**Cómo revertir.** Un commit propio. Revertirlo borra `src/ui/`, la página de tokens y la suite
de contraste, y devuelve el Markdown y el distintivo a su forma anterior. No toca `apps/api` ni
`packages/`.

---

## 2026-09-01 — Endurecimiento de la API: cabeceras, CORS, límite de intentos, dependencias y cuenta (tarea 1.18a)

**Qué.** Los hallazgos 2, 3, 4, 5 y la mitad de servidor del 8 de la auditoría del 2026-09-01,
en una sola rama que solo tocó `apps/api` y `packages/shared`:

- **Cabeceras (`@fastify/helmet`)** con política revisada, no la de por defecto: `X-Frame-Options:
  DENY`, `nosniff`, `Referrer-Policy`, y `Content-Security-Policy` **apagada a propósito** —
  gobierna cómo un navegador pinta una página, y esta API solo devuelve JSON.
- **CORS apagado por defecto.** La configuración contradecía a `01-arquitectura.md` (*"No hay
  CORS por diseño"*): en producción nginx y en local Vite sirven `/api` en el mismo origen.
  `CORS_ORIGIN` queda como única forma de encenderlo.
- **Límite de peticiones por IP** (`@nestjs/throttler`) en login, registro, aceptar invitación y
  cambiar contraseña, con constantes con nombre en `common/rate-limit.constants.ts`.
- **Dependencias**: Nest y Fastify a 11.x y `fast-uri` a 3.1.6. `pnpm audit --prod` pasa de
  **29 hallazgos (1 crítico, 16 altos) a 4 moderados**, y CI audita con `--audit-level=high`.
- **Cuenta**: cambiar el nombre visible y la contraseña —exigiendo la actual y verificándola con
  argon2—, con esquemas Zod en `@dnd/shared`. **Cambiar la contraseña invalida los tokens
  anteriores** (`User.passwordChangedAt`, ver [05-datos.md](./05-datos.md)).
- `main.ts` se parte: `configure-app.ts` expone `buildAdapter()`, `configureApp()` y
  `loadBootEnv()`, que ahora usan tanto el arranque real como las pruebas.

**Por qué se parte `main.ts`.** Porque lo que solo vive en `bootstrap()` **no lo prueba nadie**:
los e2e construyen `AppModule` directamente. Antes eso era una línea (`enableCors()`); al añadir
toda la política de cabeceras y la configuración del adaptador habría sido borrable en silencio
por el siguiente refactor.

**La trampa que encontró la revisión, y que es la lección de la tarea.** `trustProxy: true`
**anulaba el límite de intentos que esta misma tarea añadía**: el limitador usa `req.ip`, y con
`true` Fastify toma la entrada **más a la izquierda** de `X-Forwarded-For` —la que manda el
cliente—, mientras el `proxy_add_x_forwarded_for` de nginx **añade** sin sustituir. Un atacante
rotando la cabecera tenía intentos ilimitados. Medido contra fastify 5.11.3: con `true` la clave
era `9.9.9.9` (falsa); con `1`, `203.0.113.7` (la real). Se sustituye por `TRUST_PROXY`, un
**número de saltos** que por defecto no confía en ninguno.

Y una segunda vuelta de tuerca: `TRUST_PROXY` se leía **antes** de cargarse `apps/api/.env`
—`buildAdapter()` es un argumento de `NestFactory.create`, la misma trampa que ya documentaba
`auth.module.ts` para `JWT_SECRET`—, así que ponerlo en el `.env` no hacía nada. Falla al
cerrar, que suena bien y no lo es: detrás de nginx significa que todo internet comparte un cubo
de cinco intentos por minuto y cualquiera deja a todos fuera del login. Se arregla con
`loadBootEnv()` **dentro de `buildAdapter()`**, donde vive la lectura.

**Prueba.** 81 unitarias y 43 e2e de API. Cada protección tiene una prueba que **falla si se
quita**, comprobado por mutación **ejecutada por el orquestador**, no por el informe:
`trustProxy` de vuelta a `true` → `trust-proxy.e2e-spec.ts` da *Expected: 429, Received: 401*;
la ventana de `passwordChangedAt` aflojada → caen dos de `jwt.strategy.spec.ts` y la e2e de
cambio de contraseña; `loadBootEnv()` fuera de `buildAdapter()` → *Expected: "203.0.113.7",
Received: "127.0.0.1"*. Esa última mutación **descubrió que el arreglo anterior no estaba
fijado**: borrar la llamada de `main.ts` dejaba la suite entera en verde, porque la prueba
llamaba a `dotenv` por su cuenta. Probaba el mecanismo, no el cableado.

**Cómo revertir.** Un commit propio. Revertirlo devuelve CORS abierto, quita cabeceras y límite
de intentos, y deja la columna `passwordChangedAt` huérfana (anulable: no estorba). La
autorización del servidor no se tocó: `canView` sigue intacto.

---

## 2026-09-01 — `JWT_SECRET` deja de tener valor por defecto (tarea 1.18, hallazgo 1)

**Qué.** `apps/api/src/common/jwt-secret.ts` (nuevo) expone `requireJwtSecret()`, que lee la
variable y **lanza** si falta, si está vacía o si mide menos de `JWT_SECRET_MIN_LENGTH` (32);
nunca incluye el valor en el mensaje. `auth.module.ts` y `jwt.strategy.ts` pierden su
`?? "change-me-in-production"`. El primero pasa a `JwtModule.registerAsync`: el array
`imports` del decorador `@Module` se evalúa **al importar el fichero**, antes de que
`ConfigModule.forRoot()` cargue `apps/api/.env`, así que la lectura tenía que aplazarse a la
instanciación para que el secreto de firma y el de verificación —que `jwt.strategy.ts` lee en
su constructor— salgan de la misma fuente. Se alargan a 32 caracteres los **dos**
`JWT_SECRET` de `.github/workflows/ci.yml`, que con `ci-secret` (9) ya no arrancarían. En `.env.example` el valor se deja **vacío**, no con un marcador largo: un
marcador de 32 caracteres o más pasaría la validación, y como el arranque documentado es
`cp .env.example apps/api/.env`, la API acabaría firmando con una cadena publicada en el
repositorio — el mismo agujero por otra puerta. Vacío falla al cerrar. `main.ts` gana un
`.catch` en `bootstrap()` para que el operador lea el mensaje accionable y no una traza cruda.

**Por qué.** Era el hallazgo **crítico** de la auditoría del 2026-09-01: un despliegue sin la
variable firmaba tokens válidos con una cadena publicada en el repositorio, y cualquiera podía
fabricarse un token para el usuario que quisiera. Fallar al arrancar es preferible a funcionar
inseguro.

**Prueba.** `jwt-secret.spec.ts` cubre el ayudante (ausente, vacío, solo espacios, 31, 32, y
que el mensaje no filtra el valor). `auth.module.spec.ts` prueba lo que importa de verdad: que
`Test.createTestingModule({ imports: [PrismaModule, AuthModule] })` con `PrismaService`
sustituido por un doble **no compila** sin la variable, ni con una cadena de 31. El doble de
Prisma es lo que mantiene la prueba unitaria: `compile()` instancia proveedores pero no llama a
`onModuleInit`, así que nunca se abre una conexión; y `AuthModule` a solas tampoco compilaría,
porque `UsersService` necesita el `PrismaService` global.

Los dos consumidores se prueban **por separado a propósito**: hay dos tests que sustituyen uno
al otro (`JwtStrategy` por un doble en uno; `JWT_MODULE_OPTIONS`, el testigo de `@nestjs/jwt`,
en el otro), de modo que el rechazo solo puede venir del consumidor bajo prueba. Sin eso, un
`??` repuesto en **un solo** fichero dejaba la suite en verde con el secreto de firma público
—lo señaló la revisión, y era cierto—. Comprobado por mutación **fichero a fichero, ejecutada
por el orquestador**: mutar solo `auth.module.ts` tumba únicamente el test de la fábrica de
`JwtModule`; mutar solo `jwt.strategy.ts` tumba únicamente el de `JwtStrategy`; restaurados,
66/66 en verde.

**Cómo revertir.** Un commit propio. Revertirlo devuelve el valor por defecto y vuelve a hacer
opcional la variable; no toca autorización, ni el esquema, ni `apps/web`.

---

## 2026-09-01 — Antideriva: la regla de documentación pasa a comprobarla una máquina (tarea 1.17e)

**Qué.** `scripts/check-docs.mjs` (ya existía, sin enganchar) entra en `pnpm verify`, y se
arreglan sus 16 hallazgos: cinco citas al fichero de despliegue ya borrado, con la marca de
escape puesta donde la mención es legítima —explican que se borró—, sin tocar nada donde es
un registro fechado del plan de julio (excluido entero, con su motivo, en el propio script);
varias rutas abreviadas sin `features/` corregidas, y una base nueva (`packages/shared`) para
que el propio `dist/index.js` de `package.json` resuelva. Se añade
`scripts/update-estado.mjs`, que regenera un bloque delimitado en `docs/00-INDEX.md` (commit,
rama, conteo de unitarias por declaración) y falla en modo `--check` si alguien lo edita a
mano; `00-INDEX.md` deja de llevar estado escrito por una persona junto al mapa de
documentos. Las unitarias pasan a tener como fuente única ese bloque generado;
`08-pruebas.md` enlaza en vez de repetirlas. `docs/04-convenciones.md` gana dos reglas: toda
revisión comprueba cada afirmación de la documentación del cambio contra el código, y un
fichero no mezcla tipos de documento. CI gana los pasos `check:docs` y `check:estado`, que
antes solo corrían en el gancho local.

**Por qué.** Siete afirmaciones de la documentación contradijeron el código en una sola
sesión; lo mecánicamente comprobable ya tenía script pero nada lo obligaba a pasar.

**Cómo revertir.** Un commit propio; revertirlo quita `check:docs`/`check:estado` de
`verify` y de CI, restaura el estado escrito a mano en `00-INDEX.md` y borra
`scripts/update-estado.mjs`. No toca `apps/` ni `packages/`.

---

## 2026-09-01 — Web: ajustes de campaña y miembros en la pantalla (tarea 1.17d · B1 + B2, última de 1.17)

**Qué.** Los hallazgos B1 y B2 de `06-pendientes.md`, cerrados del todo: la API de editar/
borrar campaña y expulsar/salir (1.17a) existía pero ninguna pantalla la ofrecía.
`CampaignSettings.tsx` y `MembersPanel.tsx` (nuevos, montados en la pestaña "Resumen" de
`CampaignDetailPage.tsx`, la única sección que este brief tocó de ese fichero) añaden el
formulario de editar nombre/descripción, borrar la campaña, expulsar a un jugador y salirse
—el DM nunca ve "Salir": ve el motivo que da el servidor—, todo deshabilitado con el motivo
visible en pantalla mientras el rol no se conoce, nunca escondido. Borrar campaña y salir
navegan a `/` con `useNavigate`, no `window.location`. `DeleteButton.tsx` gana dos props
opcionales (`label`, `confirmLabel`) para poder decir "Expulsar"/"Salir de la campaña" en vez
de "Borrar" sin tocar ninguno de sus otros usos. Con esto entran las cuatro subtareas de la
1.17 — ver [06-pendientes.md](./06-pendientes.md) y [00-INDEX.md](./00-INDEX.md).

**Pruebas.** Unitarias nuevas en `pages/__tests__/CampaignDetailPage.test.tsx` (incluidas,
en una segunda ronda de revisión, dos que montan la lista de campañas real para probar que
salir y renombrar actualizan "/" sin recargar dentro del `staleTime` de producción — un
`reload()` de Playwright no puede probar esa invalidación de caché, así que no basta con el
recorrido de navegador) y un recorrido nuevo de Playwright en `campana.spec.ts` (dos sesiones
de navegador), con comprobación por mutación. El recuento vive solo en
[08-pruebas.md](./08-pruebas.md).

**Cómo revertir.** Un commit propio; revertirlo deja la API de 1.17a sin ninguna pantalla que
la consuma, como antes de esta tarea — sin pérdida de datos.

---

## 2026-09-01 — Web: etiquetas visibles, filtro por etiqueta y búsqueda por nombre (tarea 1.17c · A2 + C1)

**Qué.** Los hallazgos A2 y C1 de `06-pendientes.md`: las etiquetas de una entidad se
guardaban y no las leía nadie salvo el propio campo de edición (`EntityEditor.tsx`), y no
había búsqueda ni filtro en ninguna pantalla. `EntityTab` (dentro de
`CampaignDetailPage.tsx`) ahora pinta las `tags` de cada fila (nada si la ficha no tiene
ninguna) y monta `EntityFilterBar` (`features/entities/EntityFilterBar.tsx`, nuevo) encima de
la lista: un `<input type="search">` con etiqueta "Buscar" (subcadena, insensible a
mayúsculas con `toLocaleLowerCase("es")`) y un botón por cada etiqueta presente en la lista
ya cargada de esa pestaña (deduplicadas y ordenadas), conmutable con `aria-pressed`. Varias
etiquetas seleccionadas exigen todas (Y lógico). El filtrado en sí vive en una función pura
y exportable, `filterEntities` (`features/entities/filter.ts`), separada del componente por
la misma razón que `body.ts`: para no disparar `react-refresh/only-export-components` con un
segundo export en un `.tsx`. Con algún filtro activo aparece un contador "N de M" y un botón
"Quitar filtros"; si el filtro no deja nada, el mensaje es "Ningún elemento coincide con el
filtro.", distinto del "Sin elementos." que ya existía para una lista genuinamente vacía.

**Es un filtro de cliente, nunca control de acceso**: opera sobre una lista que el servidor
ya filtró por `canView` y solo puede quitar de la vista filas que la persona ya podía ver.
Detalle y la razón completa en [04-convenciones.md](./04-convenciones.md).

**Alcance deliberado.** El brief acotaba el trabajo a `EntityTab` para no invadir la zona de
`overview` que 1.17d edita en paralelo: `SessionsTab` y `CharactersTab` (mismo fichero) se
quedan sin buscador — C1 se cierra solo para las siete pestañas de entidades, ver
[06-pendientes.md](./06-pendientes.md).

**Un defecto real, encontrado y arreglado durante la propia tarea, no por el brief**:
`EntityTab` no se remonta solo porque cambie su prop `type` — es la misma posición del árbol
con el mismo componente, así que React reutiliza la instancia entre pestañas de entidad. Sin
`key={tab.type}` en la llamada (`CampaignDetailPage.tsx`), el nuevo estado de filtro (y ya
antes, sin que nada lo notara, `creating`/`editing`) se colaba de una pestaña a otra: escribir
"strahd" en NPCs seguía filtrando la lista de Lugares al cambiar de pestaña. Confirmado con
una comprobación de RTL desechable antes de corregirlo, y cubierto ahora con una prueba
permanente.

**Pruebas.** Unitarias nuevas de `filterEntities` en `features/entities/__tests__/filter.test.ts`,
y de pantalla en `pages/__tests__/CampaignDetailPage.test.tsx` (etiquetas pintadas en la fila,
buscar reduce filas, una etiqueta reduce filas, dos etiquetas exigen las dos, "Quitar
filtros" restaura la lista, mensaje de cero-resultados correcto, y el filtro no se cuela
entre pestañas). Un recorrido de Playwright nuevo en `campana.spec.ts`: crea dos NPCs con
etiquetas distintas, filtra por una, comprueba con `toHaveCount(0)` que el otro desaparece de
verdad del DOM, y que "Quitar filtros" lo devuelve. **Comprobación por mutación**: se rompió
a mano `filterEntities` para que siempre devolviera la lista completa sin filtrar: el
recorrido nuevo falló exactamente en el `toHaveCount(0)` esperado, los otros siete siguieron
en verde, y se restauró. El recuento vive solo en [08-pruebas.md](./08-pruebas.md), la fuente
única; no se repite aquí.

**Cómo revertir.** Un commit propio; revertirlo deja `entity.tags` de nuevo sin más lector
que `EntityEditor.tsx` y ninguna pantalla con búsqueda ni filtro — sin pérdida de datos,
porque el filtro nunca escribió nada.

---

## 2026-09-01 — Web: el cuerpo Markdown de las fichas (tarea 1.17b · A1)

**Qué.** El hallazgo P0 de `06-pendientes.md`: `Entity.body` existía en el modelo y en el
esquema compartido, pero `EntityEditor.tsx` nunca lo pintaba ni lo mandaba — la wiki era un
índice sin páginas. Forma explícita en `entity.schema.ts`
(`entityBodySchema = { format: z.literal("markdown"), text: z.string().max(50000) }`), campo
"Texto" en el editor con conmutador Editar/Vista previa, y `Markdown.tsx`
(`react-markdown@9`, sin `remark-gfm` ni `rehype-raw`) como único punto del proyecto que
renderiza Markdown. Detalle completo de la forma, cómo se vacía y por qué difiere de
`Session.notes` en [05-datos.md](./05-datos.md).

**Pruebas.** Unitarias de esquema nuevas en `packages/shared/src/entity.schema.test.ts`,
e2e de API nuevas en `entities.e2e-spec.ts` (formato inválido → 400, texto > 50000 → 400, ida
y vuelta idéntica), RTL nuevas en `EntityEditor.test.tsx`, y un recorrido de Playwright nuevo
en `campana.spec.ts`, comprobado por mutación (se quitó a mano la clave `body` del payload, el
recorrido falló donde tocaba, se restauró y volvió a verde). El recuento vive solo en
[08-pruebas.md](./08-pruebas.md), la fuente única; no se repite aquí.

**Cómo revertir.** Un commit propio; revertirlo deja `Entity.body` en el modelo pero de nuevo
sin pantalla que lo escriba o lo lea — ninguna fila tiene datos que perder porque, antes de
esta tarea, ninguna escritura real llegó a producirse.

---

## 2026-09-01 — API: editar/borrar campaña y expulsar/salir (tarea 1.17a)

**Qué.** Los hallazgos B1 y B2 del contraste de 1.17 (`06-pendientes.md`) decían que una
campaña no se podía editar ni borrar, y que un miembro no se podía expulsar ni salirse — la
API no tenía esos endpoints. Esta tarea es solo la mitad de API: **`apps/web` no se toca**,
así que B1/B2 siguen abiertos hasta 1.17d.

1. **`packages/shared/src/campaign.schema.ts`**: `updateCampaignSchema =
   createCampaignSchema.partial()`. `description` sigue sin `.nullable()` — vaciarla se hace
   mandando `""`, la misma trampa ya pagada en 1.13.
2. **`MembershipService.removeMember(campaignId, actorId, targetUserId)`**
   (`apps/api/src/campaigns/membership.service.ts`): un único método cubre expulsar y
   salirse, distinguidos solo por si `targetUserId === actorId`. Un DM no puede salirse de su
   propia campaña (hay que borrarla) ni ser expulsado. El borrado va en una transacción que
   limpia también las `EntityVisibilityGrant` de esa persona en la campaña — retirar acceso
   es el argumento del producto, y una concesión huérfana lo devolvería si reingresara.
   **Lo que no se borra**: los personajes que posee y las entidades que creó se quedan en la
   campaña (detalle completo en [05-datos.md](./05-datos.md)).
3. **`CampaignsService`**: `update` (requiere DM, escribe solo las claves presentes),
   `remove` (requiere DM, un `delete` de una línea porque el esquema ya cascadea todo) y
   `removeMember` (delega en `MembershipService`). Los tres emiten su evento
   (`campaign.updated`, `campaign.deleted`, `campaign.member.removed`).
4. **`CampaignsController`**: `PATCH /campaigns/:id`, `DELETE /campaigns/:id`,
   `DELETE /campaigns/:id/members/:userId` — este último sirve para expulsar y para salirse;
   deliberadamente no hay ruta `/members/me` (en Nest `:userId` capturaría el literal `me`
   según el orden de declaración).

**Pruebas.** Unitarias nuevas con Prisma simulado en `membership.service.spec.ts` y
`campaigns.service.spec.ts`, y e2e nuevas contra Postgres real en `campaigns.e2e-spec.ts` y
`members.e2e-spec.ts` — el recuento vive solo en [08-pruebas.md](./08-pruebas.md), la fuente
única; no se repite aquí. Incluida la prueba de cascada real que crea una campaña con
entidad, enlace, comentario, concesión, sesión, personaje e invitación, la borra, y comprueba
con `prisma.*.count()` que las siete tablas quedan en 0 — es la prueba que justifica que
`remove` sea un `delete` de una línea.

**Cómo revertir.** Un solo commit; `git revert` quita los tres endpoints, el método de
`MembershipService`, el esquema `updateCampaignSchema` y las pruebas. No hay migración nueva.

---

## 2026-09-01 — Cierre de sesión: auditoría de seguridad y alineación de la documentación

**Qué.** Se audita la seguridad del sistema a petición del autor y se escribe
`superpowers/specs/2026-09-01-endurecimiento-seguridad-design.md` con los siete hallazgos, su
evidencia y el orden de arreglo — será la **tarea 1.18**, en sesión aparte. Y se alinea la
documentación entera, que había empezado a contradecirse.

**Lo que la auditoría encontró.** Bien cubiertos: inyección SQL (cero SQL crudo), XSS (cero
`innerHTML`), validación de entrada, argon2, autorización en el servidor y ausencia de secretos
en el código. Faltan siete cosas, y una es **Crítica**: `JWT_SECRET` tiene un valor por defecto
escrito en el código, en dos sitios, así que un despliegue al que se le olvide la variable
firmaría tokens con una cadena **que está en el repositorio público**. Además, 29
vulnerabilidades en dependencias de producción sin que CI audite, sin límite de peticiones, sin
cabeceras de seguridad, CORS abierto —y además innecesario, porque nginx hace de proxy—, y **ni
pantalla de 404 ni red de errores**: una URL inventada da pantalla en blanco.

**La alineación, y por qué hacía falta.** Los conteos de pruebas vivían repetidos en cuatro
documentos y ya se habían desincronizado: el `00` decía 106, el `04` decía 66 y el `08` decía
166, cuando eran **167**. Tres cifras distintas y las tres falsas. Ahora
[08-pruebas.md](./08-pruebas.md) es la **fuente única** y los demás enlazan en vez de copiar.

Es la cuarta vez en la jornada que un documento afirma algo que el código no hace: pasó con el
401 de `/auth/me` en 1.15, con la lección falsa sobre `useMutation` en 1.14, con el motivo
"visible" que era un tooltip en 1.16, y ahora con los conteos. **Un dato repetido en cuatro
sitios es un dato que va a mentir en tres**, y por eso la regla queda escrita donde se aplica.

**Cómo revertir.** Solo añade documentación; `git revert` del commit no toca código ni pruebas.

---

## 2026-09-01 — Borrar desde la interfaz (tarea 1.16)

**Qué.** La carencia que más se notaba usando la herramienta: desde la web no se podía borrar
casi nada, aunque la API ya supiera hacerlo. Ahora sí, con confirmación en pantalla y sin
esconder botones.

1. **Botón "Borrar" en modo edición de los tres editores** (entidad, sesión, personaje), con
   confirmación **en la propia pantalla** — `apps/web/src/components/DeleteButton.tsx`, un
   componente pequeño y compartido, nunca `window.confirm` (incómodo de probar en jsdom y en
   Playwright, y aquí la prueba importa más que en ningún otro sitio). Reutiliza el mismo
   `readOnly`/`readOnlyReason` que el editor ya recibía para editar: borrar y editar están
   gateados por la misma regla del servidor en los tres recursos (`entities.service.ts` y
   `characters.service.ts`: DM o creador/dueño vía `requireEditable`;
   `sessions.service.ts`: DM vía `requireDM`), así que no hace falta calcular un permiso
   aparte — deshabilitado con el motivo a la vista, nunca escondido, igual que 1.15.
2. **La confirmación de entidad dice qué se lleva la cascada real** (`schema.prisma`:
   `EntityLink` en ambas direcciones, `EntityVisibilityGrant` y `Comment`, los tres
   `onDelete: Cascade`), con números reales de comentarios y concesiones cuando ya están
   cargados — comparten clave de consulta con `CommentThread` y con el detalle de la entidad,
   así que no hay petición extra. El número de enlaces no se muestra: `/entities/:id/links`
   solo lista los salientes visibles para quien mira, no los entrantes de otras entidades, y
   mostrar un número parcial habría sido peor que no mostrarlo. Sesión y personaje no tienen
   hijos en cascada, así que su aviso es solo "no se puede deshacer".
3. **`LinksPanel.tsx` y `CommentThread.tsx` dejan de pintar "Quitar"/"Borrar" sin mirar
   permiso** — el hueco que 1.15 dejó declarado a propósito. "Quitar" se deshabilita para
   quien no es DM ni creó la entidad (`links.service.ts:75`); "Borrar" para quien no es DM ni
   el propio autor del comentario (`comments.service.ts:65`); los dos con el motivo visible.
4. **Dos bugs reales encontrados por el recorrido de navegador nuevo, invisibles a cualquier
   prueba con espías:**
   - Las cinco llamadas `DELETE` de la web (las tres nuevas más `deleteLink`/`deleteComment`,
     que llevaban el defecto latente desde que existen) no mandaban cuerpo; `apiFetch`
     (`lib/api.ts`) manda siempre `Content-Type: application/json`, y Fastify rechaza esa
     combinación con 500 ("Body cannot be empty…") — el mismo error que 1.14 encontró en las
     invitaciones. Arreglado enviando `JSON.stringify({})` en las cinco.
   - La cascada de `EntityLink` en ambas direcciones deja el `linksKey`/`commentsKey`
     (`features/links/hooks.ts`, `features/comments/hooks.ts`) de una **entidad distinta** a
     la borrada sin invalidar — nadie puede nombrar esa clave de antemano porque no se sabe
     qué otras entidades enlazaban a la que se borra. `useDeleteEntity`
     (`features/entities/hooks.ts`) invalida ahora por predicado sobre la raíz `"entities"`,
     más ancho de lo estrictamente necesario pero suficiente para cubrir cualquier entidad.
5. **`apps/web/e2e/campana.spec.ts`** gana la prueba que exige el brief: crea dos NPCs, enlaza
   el primero con el segundo, comenta en el segundo, lo borra confirmando en pantalla,
   comprueba que desaparece de la lista, y **reabre el panel de enlaces del primero** para
   comprobar que el enlace hacia el segundo ya no aparece — la cascada contra Postgres real,
   no un mock. El mismo recorrido de sesión/personaje borra también un personaje y una sesión
   (con una cancelación) contra la API real.

**Por qué.** Era la primera carencia de "Antes de la primera partida"
(`docs/06-pendientes.md`): en una partida se crean cosas mal, y sin borrado se quedan para
siempre. Construida encima de 1.15 (`useMyRole`, `readOnly`/`readOnlyReason`), que dejó la web
sabiendo quién la usa.

**Cómo revertir.** `git revert` del commit de esta tarea. No toca `apps/api` ni
`packages/shared` — los cinco `DELETE` del servidor ya existían y seguían probados antes de
empezar. Sin migraciones de base de datos.

**Verificación.** `pnpm verify`: 167 unitarias (shared 10, api 40, web 117), build/lint/formato
limpios. `pnpm --filter @dnd/api test:e2e`: 20/20, sin tocar. `pnpm --filter @dnd/web e2e`:
6/6 (las 5 anteriores más la nueva de cascada).

---

## 2026-09-01 — Arreglos de la revisión de identidad y permisos (tarea 1.15-fix)

**Qué.** Dos Críticos, dos Importantes y un Menor de la revisión independiente de 1.15.

1. **La fila de una entidad, sesión o personaje volvía a abrir siempre** (Crítico). 1.15
   deshabilitaba la fila cuando el usuario no podía editar, confundiendo "editar" con "ver": la
   fila es la única vista de detalle que existe (el editor es el único consumidor de
   `useEntity`/`useSession`/`useCharacter`, y `LinksPanel`/`CommentThread` solo se pintan
   dentro de él). `EntityEditor.tsx`, `SessionEditor.tsx` y `CharacterEditor.tsx` ganaron un
   prop `readOnly`/`readOnlyReason`: campos e inputs deshabilitados, Guardar deshabilitado con
   su motivo, pero enlaces y comentarios siguen pintándose y siendo usables sin condición —
   nunca estuvieron gateados por permiso de edición en el servidor
   (`comments.service.ts`/`links.service.ts` solo exigen `canView`/membresía).
   `CampaignDetailPage.tsx` deja de poner `disabled` en las tres filas y en su lugar decide
   `readOnly` al abrir el editor.
2. **`AuthGate` dejaba la pantalla en blanco para siempre tras un token caducado** (Crítico).
   Devolvía `<Navigate to="/login" replace/>` **en lugar de** sus hijos, montado **por fuera**
   de `<Routes>` (`App.tsx`): `<Routes>` —que contiene `/login`— nunca se renderizaba, así que
   la URL cambiaba pero la pantalla se quedaba vacía. `AuthGate.tsx` ya no redirige nunca —
   solo dispara `useAuthRehydration` y renderiza siempre sus hijos; `ProtectedRoute` (que ya
   redirigía a `/login` sin token) es quien lo hace ahora. La prueba nueva monta `<App/>` real
   en vez de `AuthGate` suelto dentro de una `<Route>` — la topología anterior sí lo desmontaba
   al navegar y por eso nunca vio el defecto.
3. **Cualquier fallo de red o del servidor cerraba la sesión, no solo un 401** (Importante).
   `apiFetch` (`lib/api.ts`) ganó `ApiError`, que propaga el `status` real; `hooks.ts` solo
   cierra la sesión si `err instanceof ApiError && err.status === 401`. El mensaje legible de
   1.14 sigue igual, ahora dentro de `ApiError` en vez de `Error`.
4. **Un solo fallo al listar los miembros hacía que un DM legítimo se leyera a sí mismo como
   no-DM** (Importante). `useMyRole` (`features/campaigns/members.ts`) expone `isError` (nunca
   tratado como "no soy miembro") y `retry()`; `CampaignDetailPage.tsx` e `InvitePanel.tsx`
   enlazan `retry()` a un botón "Reintentar" junto al "Comprobando permisos…".
5. **La inestabilidad de `invites.e2e-spec.ts`/`members.e2e-spec.ts` no estaba anotada**
   (Menor). Ambas construían `dm${Date.now()}@b.com`/`pl${Date.now()}@b.com` — resolución de
   milisegundo, colisión posible entre workers de Jest. Arreglado con un sufijo aleatorio
   además de `Date.now()`; ficha en [06-pendientes.md](./06-pendientes.md), que también anota
   el mismo patrón (sin arreglar) en las demás suites e2e.

**Por qué.** Los dos Críticos los verificó el propio autor del brief en el código antes de
encargar la tarea. El primero rompía el movimiento central del producto (revelar algo a la
mesa); el segundo dejaba a cualquiera que volviera pasados los 7 días del JWT
(`auth.module.ts`) sin formulario de acceso.

**Prohibido y respetado.** No se tocó ningún guardia del servidor (`canView`, `requireDM`,
`requireMember`, `requireEditable`); `/auth/me` no se tocó más allá de lo ya hecho en 1.15; el
mensaje legible de `apiFetch` (1.14) no se perdió; no se desactivó ninguna prueba, ni se
silenció ningún aviso, ni se subió ningún `timeout`; no hubo commits intermedios ni push.

**Verificación.** `pnpm verify`: build + lint + formato + **135 unitarias** (shared 10, api
40, web 85) en verde. `pnpm --filter @dnd/api test:e2e`: **20 e2e** en verde (9 suites).
`pnpm --filter @dnd/web e2e`: **5 recorridos** en verde. `invitacion.spec.ts` se amplió con un
NPC `PLAYERS` (`Gundren Rockseeker`, con un comentario del DM ya puesto) que el jugador abre y
lee tras unirse: comprueba que la fila está `toBeEnabled()`, que el campo Nombre precarga el
valor real y está `toBeDisabled()`, que Guardar está deshabilitado con su motivo, que el
comentario del DM es visible, y que el jugador puede publicar el suyo propio y verlo aparecer
— la comprobación que le faltaba al recorrido: antes la única entidad del DM era `DM_ONLY`, así
que el jugador solo veía "Sin elementos." y nunca existía una fila visible-pero-no-editable
que abrir.

**Cómo revertir.** `git revert` del commit de la tarea. `AuthGate.tsx` vuelve a redirigir con
`<Navigate>`; `apiFetch` vuelve a lanzar `Error` sin `status`; `useMyRole` pierde `isError` y
`retry`; las tres filas (`CampaignDetailPage.tsx`) y los tres editores pierden `readOnly` y
vuelven a `disabled` en la fila.

---

## 2026-09-01 — La interfaz sabe quién es quien la usa (tarea 1.15)

**Qué.** `/auth/me` (único cambio permitido en `apps/api` para esta tarea) devuelve ahora
`{ id, email, displayName }` en vez de solo `{ id, email }` —`UsersService.findById` es
nuevo—, con su unitaria (`auth.controller.spec.ts`, `users.service.spec.ts`) y su e2e
(`auth.e2e-spec.ts`: displayName correcto, y 401 sin token). En la web, `AuthGate` +
`useAuthRehydration` (`apps/web/src/features/auth/`) piden ese endpoint una vez, al arrancar,
cuando hay token en `localStorage` pero no hay usuario en memoria — `auth.store.ts` ganó
`setUser` para esto —, sin bloquear el pintado (`ProtectedRoute` sigue mirando solo el token);
si `/auth/me` devuelve 401, cierra la sesión y redirige a `/login`. `useMyRole`
(`features/campaigns/members.ts`) cruza el `id` ya conocido con
`GET /campaigns/:id/members` para responder "¿soy DM o jugador aquí?", con un tercer estado
explícito de "aún no lo sé" mientras carga cualquiera de los dos. Con eso, cuatro pantallas
dejan de mentir: crear/editar sesión (solo DM), editar personaje (dueño o DM), editar entidad
(DM o creador) y generar invitación (solo DM) se **deshabilitan con una explicación visible**
en vez de ofrecer una acción que el servidor iba a rechazar con 403 — elegido sobre ocultar
porque un botón oculto hace pensar que la función no existe. Mientras el rol es
"aún no lo sé", también se deshabilita: ni se muestra activo (ofrecería algo que puede acabar
en 403) ni se oculta (parpadearía al llegar la respuesta real). Las filas de sesión, personaje
y entidad que el usuario no puede editar dejan de comportarse como botón de editar (dos fichas
de P3 cerradas).

**Por qué.** `auth.store.ts` guardaba el token pero no el usuario; tras cualquier recarga la
web no sabía ni quién era ni qué rol tenía, así que ningún botón podía ocultarse ni
deshabilitarse por permiso. Detectado en la revisión de 1.12a, bloqueaba dos fichas de P3
desde entonces y estaba explícitamente anotado como "antes de la primera partida" en
[06-pendientes.md](./06-pendientes.md).

**Esto es honestidad de la interfaz, no seguridad.** `canView`, `requireDM`, `requireMember`
y `requireEditable` (`apps/api/src/common/visibility.ts` y cada servicio) no se tocaron: si
todo el código de esta tarea desapareciera, el servidor seguiría rechazando exactamente igual.

**Fuera de alcance a propósito.** Los botones "Quitar" (`LinksPanel.tsx`) y "Borrar"
(`CommentThread.tsx`) tienen el mismo problema y no se tocaron — el brief pedía exactamente
cuatro superficies (sesiones, personajes, entidades, invitaciones); `useMyRole` queda
disponible para resolverlos del mismo modo cuando se aborden.

**Verificación.** `pnpm verify`: build + lint + formato + **128 unitarias** (shared 10, api
40, web 78) en verde. `pnpm --filter @dnd/api test:e2e`: **20 e2e** en verde (uno nuevo: 401
sin token en `/auth/me`). `pnpm --filter @dnd/web e2e`: **5 recorridos** en verde —
`invitacion.spec.ts` se amplió para comprobar, sobre el DOM real, que el jugador recién unido
ve "Nuevo" en Sesiones **deshabilitado** con el motivo "Solo el DM puede crear o editar
sesiones.", y que el DM, en su propia sesión de navegador, sí puede crear una.

**Cómo revertir.** `git revert` del commit de la tarea. `apps/api`: revertir
`auth.controller.ts`, `users.service.ts` y sus pruebas deja `/auth/me` como antes
(`{ id, email }`). `apps/web`: quitar `AuthGate` de `App.tsx` devuelve a `ProtectedRoute` solo;
borrar `features/auth/` y `useMyRole` (`features/campaigns/members.ts`) y revertir
`CampaignDetailPage.tsx`/`InvitePanel.tsx` deja los cuatro botones sin gatear, como antes.

---

## 2026-09-01 — Cierre de la construcción de la fase 1

**Qué.** Con la tarea 1.14 y sus arreglos, **la fase 1 queda construida**: el mundo, las
sesiones, los personajes y las invitaciones se manejan enteros desde el navegador, con los
cinco niveles de visibilidad comprobados de punta a punta. Se añade
[09-primera-partida.md](./09-primera-partida.md) —el guion de la sesión real, lo que todavía no
se puede hacer y qué anotar mientras se juega— y una sección "Antes de la primera partida" en
[06-pendientes.md](./06-pendientes.md) que prioriza lo que se nota en la mesa.

**Por qué.** La fase no se cierra por tener el código: se cierra por haberla usado. El plan lo
exige y la sesión real es lo único que puede decir qué falta de verdad para la fase 2, cuyo
plan a propósito no está escrito todavía.

**Dónde quedó la verificación.** `pnpm verify` en verde: build, ESLint, Prettier y **106
pruebas unitarias** (shared 10, api 37, web 59), aplicado por `.githooks/pre-commit`. Más **19
e2e de API** contra Postgres real y **5 recorridos de navegador** en Chromium, incluido el de
dos sesiones simultáneas que comprueba sobre el DOM que un jugador **no ve** una entidad
`DM_ONLY`. Al empezar la jornada eran 54 unitarias, cero recorridos de navegador y `pnpm lint`
fallaba con *"eslint no se reconoce"*.

### Lo que enseñaron las revisiones, y que vale más que el código entregado

Las **cuatro** revisiones independientes de la jornada salieron con hallazgos; **ninguna
limpia**. Tres eran pérdida de datos o acceso indebido, y ninguna la habría encontrado una
prueba existente:

- Editar una entidad `SPECIFIC_PLAYERS` **borraba todas sus concesiones**, siempre y en
  silencio, dejándola invisible para toda la mesa. Llevaba días anotado en el ledger como
  *"hueco conocido, aceptable para el MVP"*: la ficha subestimaba un fallo determinista.
- Vaciar las notas de una sesión **no las borraba**: el formulario cerraba como si hubiera
  guardado y el texto seguía publicado.
- Una invitación huérfana en `localStorage` **metía en la campaña al siguiente que iniciara
  sesión** en ese navegador, quemando el enlace del jugador legítimo.

**Tres reglas de proceso salieron de ahí, y están escritas donde se aplican:**

1. **Correr una suite que no llega al código nuevo no es evidencia.** La regla de Playwright
   de [08-pruebas.md](./08-pruebas.md) falló en su primer uso porque el encargo decía *correr*
   el e2e, no *extenderlo*: pasó en verde sin ejecutar una línea de lo nuevo. Desde entonces
   cada encargo nombra **qué recorrido debe ejercer el cambio**.
2. **El informe de quien implementa no es evidencia.** Dos veces afirmó una cobertura que no
   existía —una de ellas, que el recorrido ejercía un `PATCH` que nunca se ejecutaba en un
   navegador—. La salida se comprueba aparte, siempre.
3. **En un arreglo de pérdida de datos, se reintroduce el fallo a mano** y se mira la prueba en
   rojo. Se hizo en las tres últimas tareas; en la última, quitar la limpieza del cierre de
   sesión y la caducidad de la invitación tumbó una prueba cada uno.

También se **retiró una lección falsa** de esta misma documentación: afirmaba que
`useMutation` se rompe con el modo estricto de React, cuando lo comprobable era otra cosa. Una
lección falsa en los documentos es peor que ninguna, porque la siguiente tarea la obedece.

**Cómo revertir.** Nada que revertir: este cierre solo añade documentación. El código de la
fase son los commits `1c2d31f`…`5a49912`, cada tarea el suyo.

---

## 2026-09-01 — Arreglos de la revisión del flujo de invitación (1.14-fix)

**Qué.** Una revisión independiente de 1.14 encontró un **Crítico** verificado en el código:
una invitación pendiente quedaba en `localStorage` para siempre — nada la borraba si el
invitado no volvía (`logout()` solo quitaba `dnd_token`; no había caducidad) — y **cualquier**
autenticación posterior en ese navegador la leía y navegaba a `/join/:token`, donde la
aceptación se disparaba sola al montar sin pedir confirmación. En una mesa con un portátil
compartido, el siguiente que iniciara sesión ahí —otro jugador, el DM— acababa dentro de la
campaña como `PLAYER` sin pulsar nada, y el token quedaba quemado: el invitado legítimo
recibía "Invalid or already-used invite".

**Arreglo 1 (el Crítico), con sus tres partes:**

1. **`/join/:token` ya no acepta al montar.** Con sesión activa, la página muestra una
   confirmación ("Estás a punto de unirte a una campaña con esta invitación.") y espera un
   clic en "Unirse a la campaña" (`JoinPage.tsx`). La guarda `attempted = useRef(false)` sigue
   ahí, sin tocar — ahora protege el clic explícito de un doble clic rápido en vez del efecto
   de montaje bajo StrictMode.
2. **`logout()` borra la invitación pendiente** (`auth.store.ts`), igual que borra
   `dnd_token`.
3. **La invitación pendiente caduca a los 5 minutos** (`PENDING_INVITE_TTL_MS`,
   `features/invites/api.ts`): el guardado ahora lleva un sello de tiempo
   (`{ token, savedAt }` en vez del token suelto) y `peekPendingInvite()` descarta y borra la
   entrada si ya pasó el plazo. Cinco minutos alcanza para completar un login o un registro
   corto sin tener que volver a pegar el enlace, y es corto a propósito: quien se aleja de un
   portátil compartido en la mesa no debería dejarle a la siguiente persona una invitación
   utilizable pasado ese rato. Una entrada con formato antiguo (token suelto, sin `savedAt`,
   de antes de este cambio) se trata como caducada.

**Arreglo 2 (Importante).** Mismo origen: antes, quien abriera el enlace ya autenticado lo
consumía aunque solo quisiera mirarlo — el caso típico es el DM comprobando su propio enlace
antes de mandarlo. Lo cierra el clic explícito del arreglo 1, y la pantalla de confirmación
dice explícitamente que aceptar consume el enlace. `apps/web/e2e/invitacion.spec.ts` ahora
comprueba este caso: el DM visita su propio enlace, ve la confirmación, pulsa "Cancelar" sin
aceptar, y el mismo enlace **sigue funcionando** cuando el jugador lo usa después.

**Arreglo 3 (Importante).** `LoginPage.tsx`/`RegisterPage.tsx` seguían desviando a
`/join/...` mientras existiera la clave en `localStorage`, sin distinguir una invitación
reciente de una de hace semanas ya usada. Lo cierra la caducidad del arreglo 1: expirada la
entrada, `peekPendingInvite()` devuelve `null` y el login/registro navegan a `/` como
siempre. Se añadió la prueba que faltaba: `LoginPage.test.tsx` (y, por simetría,
`RegisterPage.test.tsx`) comprueban que sin invitación pendiente el flujo normal navega al
listado.

**Arreglo 4 (Importante).** La guarda `attempted` no la protegía ninguna prueba unitaria:
`JoinPage.test.tsx` usaba `toHaveBeenCalledWith`, que no cuenta invocaciones, y
`setupTests.ts` no probaba nada bajo `<React.StrictMode>`. Se añadieron las tres pruebas que
faltaban (todas vistas en rojo antes del arreglo correspondiente):
- `JoinPage` bajo `<React.StrictMode>`, dos clics rápidos en "Unirse a la campaña" →
  `acceptInvite` se llama una sola vez.
- Tras un intento de aceptar (éxito o error), `peekPendingInvite()` es `null`.
- `LoginPage` sin invitación pendiente navega a `/`.

Y se corrigió, en su versión de entonces, la prueba de `InvitePanel.test.tsx` que comprobaba
el párrafo estático "una sola persona" ya pintado siempre, sin depender de ninguna
interacción — pasaba por construcción (la cita de línea de esta entrada ya no corresponde: el
fichero se ha reescrito desde entonces). Se
quitó y se sustituyó por dos pruebas que sí dependen del estado: el aviso de "no anula el
anterior" (arreglo 6) solo aparece tras generar un enlace, y el mensaje de error traducido
(arreglo 8) solo aparece cuando `createInvite` falla.

**Arreglo 5 (Menor).** `JoinPage.tsx` no invalidaba la consulta de campañas al aceptar: un
jugador que ya había cargado "Mis campañas" podía tardar hasta 30 s
(`staleTime`, `lib/queryClient.ts`) en verla ahí. Ahora invalida `campaignsKey`
(`features/campaigns/hooks.ts`) justo antes de navegar a la campaña.

**Arreglo 6 (Menor).** Generar un enlace nuevo no anula el anterior en el servidor —no hay
revocación—, y `InvitePanel.tsx` no lo decía. Ahora, una vez hay un enlace en pantalla,
aparece un aviso explícito de que generar otro no invalida los anteriores. La revocación de
verdad necesita API que no existe hoy: fichada en [06-pendientes.md](./06-pendientes.md), sin
tocar `apps/api`.

**Arreglo 7 (Menor).** Corrección de una lección falsa que este mismo documento y
`08-pruebas.md` habían dejado: "la suscripción de `useMutation` se rompe con montaje +
StrictMode" no está demostrado como regla general — ver la nota de corrección en la entrada
de 1.14 más abajo y en [08-pruebas.md](./08-pruebas.md).

**Arreglo 8 (Menor).** Los dos mensajes de error conocidos del servidor
("Invalid or already-used invite", "DM role required") llegaban en inglés a una interfaz en
español, justo a alguien que acaba de entrar por un enlace sin más contexto.
`translateInviteError` (`features/invites/api.ts`) traduce esos dos casos exactos y deja
pasar cualquier otro mensaje tal cual, sin inventar uno que tape la causa real.

**Prohibido, respetado.** No se tocó `apps/api` ni `packages/shared` — la caducidad y
revocación del token en el servidor quedan en [06-pendientes.md](./06-pendientes.md). No se
quitó la guarda `attempted`. La aserción `DM_ONLY` del e2e sigue exactamente igual.

**Pruebas.** TDD: cada prueba nueva se vio en rojo por el comportamiento que le falta al
código, no por fichero ausente — confirmado corriendo `vitest run` contra la implementación
anterior antes de escribir cada arreglo. Unitarias nuevas o reescritas: `api.test.ts` en
`features/invites/__tests__/` (8, nuevo — expiración de la invitación pendiente y
`translateInviteError`), `JoinPage.test.tsx` (6, reescrito para el flujo de clic explícito),
`auth.store.test.ts` (+1, logout borra la invitación pendiente), `LoginPage.test.tsx` y
`RegisterPage.test.tsx` (+1 cada uno), `InvitePanel.test.tsx` (4, una prueba estática
quitada, dos nuevas dependientes de estado). Total: **106 unitarias** (shared 10, api 37, web
59). `apps/web/e2e/invitacion.spec.ts` se actualizó para el clic explícito del jugador y para
el caso del DM que abre su propio enlace sin unirse por accidente; las 5 suites de e2e siguen
verdes.

**Revertir.** `git revert` del commit de esta tarea. No toca `apps/api` ni `packages/shared`;
no hay migración que deshacer.

---

## 2026-08-31 — Flujo de invitación en la interfaz (1.14)

**Qué.** Última tarea de construcción de la fase 1: hasta ahora no había forma de meter a un
jugador en una campaña desde el navegador.

- `features/invites/api.ts` + `hooks.ts` — `createInvite`/`acceptInvite` contra
  `POST /campaigns/:id/invites` y `POST /invites/:token/accept` (API sin tocar); solo
  `useCreateInvite` (mutación) en `hooks.ts` — ver el porqué de que no haya
  `useAcceptInvite` más abajo. `api.ts` también guarda el token de invitación pendiente en
  `localStorage` (`savePendingInvite`/`peekPendingInvite`/`clearPendingInvite`), junto a
  `dnd_token`, para que sobreviva a un login/registro.
- `features/invites/InvitePanel.tsx` — lado DM, montado en la pestaña Resumen de
  `CampaignDetailPage.tsx`. Un botón genera la invitación; el enlace completo
  (`origen + /join/token`) aparece en un `<input readOnly>` seleccionable con su propia
  etiqueta, y un botón de copiar. Si `navigator.clipboard.writeText` falla (permiso
  bloqueado), se muestra el fallo y **el enlace sigue en pantalla** — nunca un "copiado" que
  mienta. Generar la invitación es solo del DM en el servidor (`requireDM`); el botón se
  muestra a todo el mundo igual que en 1.13, porque `auth.store.ts:15` sigue sin conocer el
  id del usuario tras recargar — es el 403 del servidor el que corrige a quien no debería
  pulsarlo.
- `pages/JoinPage.tsx` — ruta `/join/:token`, deliberadamente fuera de `ProtectedRoute`
  (`App.tsx`) porque "sin sesión" es uno de los tres caminos que tiene que cubrir por sí
  sola: sin sesión guarda el token pendiente y muestra enlaces a iniciar sesión o
  registrarse; con sesión llama a aceptar el token de la URL y navega a
  `/campaigns/<campaignId>` con el id que **devuelve el servidor**; token inválido o ya usado
  muestra el mensaje legible de `lib/api.ts` con salida al listado de campañas.
- `pages/LoginPage.tsx` y `pages/RegisterPage.tsx` — tras autenticar, si hay una invitación
  pendiente guardada, navegan a `/join/<token>` en vez de al listado: la invitación se
  completa sola, sin que el jugador tenga que volver a pegar el enlace.

**Dos defectos reales, cazados solo por Playwright contra la API real** (las unitarias de
componente simulan `features/invites/api.ts` entero y no los ejercitan):

1. `createInvite`/`acceptInvite` mandaban `POST` sin cuerpo. `apiFetch` (`lib/api.ts`)
   siempre añade `Content-Type: application/json`, y Fastify rechaza esa combinación con 500
   ("Body cannot be empty…") antes de llegar al controlador. Arreglado enviando
   `JSON.stringify({})` — cambio solo en `apps/web`.
2. La primera versión de `JoinPage.tsx` disparaba la aceptación con `useMutation`
   (`useAcceptInvite`) dentro de un `useEffect` de montaje. Contra la API real, con
   `React.StrictMode` (`main.tsx`) montando el componente dos veces en desarrollo, el `201`
   volvía del servidor (confirmado con logs: `RESPONSE: 201 …/accept`) pero ninguna llamada
   a `onSuccess` ni ningún nuevo render con `isSuccess: true` llegaba a producirse — la
   pantalla se quedaba en "Aceptando invitación…" para siempre, con la invitación ya
   aceptada en la base de datos. Se comprobó también con un segundo enfoque (efecto separado
   observando `accept.isSuccess`/`accept.data` en vez de un callback ligado a la llamada de
   `mutate()`) y el bloqueo persistía igual, así que la causa no era el callback puntual sino
   la suscripción de `useMutation` en sí bajo ese patrón concreto (montaje + StrictMode).
   Arreglado quitando `useMutation` de esta ruta: `JoinPage.tsx` llama `acceptInvite`
   (`api.ts`) directamente y guarda el resultado con `useState`, ajeno al ciclo de vida de
   react-query. `useAcceptInvite` se quitó de `hooks.ts` por quedarse sin nadie que lo use;
   `useCreateInvite` (el botón del DM, disparado por clic, no por montaje) no tiene este
   problema y se queda igual.

   **Corrección (revisión de 1.14-fix, 2026-09-01):** el párrafo de arriba generaliza más de
   lo que se comprobó. Lo que hace seguro el código de hoy contra la doble invocación del
   efecto de montaje es la ref `attempted = useRef(false)`, que se añadió a la vez que se
   quitó `useMutation` — el experimento nunca aisló las dos variables. Con esa misma guarda,
   la versión con `useMutation` habría dejado de disparar una segunda aceptación igual: la ref
   corta la segunda llamada antes de que le importe si la primera se está siguiendo con una
   mutación o con `useState`. "La suscripción de `useMutation` se rompe con montaje +
   StrictMode" **no es una regla general del proyecto** — es una generalización no
   demostrada a partir de un síntoma real (el `201` sin `isSuccess` visible), y no debe
   tratarse como lección para tareas futuras. Ver la entrada de 1.14-fix más abajo.

**Pruebas.** TDD: cada prueba se vio roja por comportamiento (elemento/texto/navegación que
no existía, capturado con `vitest run` antes de escribir la implementación), no por fichero
ausente — el detalle línea a línea vive en el informe de la tarea (fuera de `docs/`; ver el
ledger `.superpowers/sdd/progress.md`). Unitarias nuevas: `InvitePanel.test.tsx` (3),
`JoinPage.test.tsx` (3), `LoginPage.test.tsx` y `RegisterPage.test.tsx` (1 cada una, el caso
"resume la invitación pendiente") — 8 pruebas nuevas, 91 unitarias en total (shared 10, api
37, web 44).
Playwright: `apps/web/e2e/invitacion.spec.ts`, primera suite del proyecto con dos
`BrowserContext` (DM y jugador, cookies y `localStorage` independientes); lee el enlace de
invitación con `inputValue()` sobre el campo real de la pantalla en vez de construirlo a
mano, y comprueba a la vez que la lista de NPCs del jugador dice "Sin elementos." y que el
NPC `DM_ONLY` del DM tiene `toHaveCount(0)` — la comprobación que la fase llevaba debiendo
desde que se instaló Playwright.

**Documentación.** `08-pruebas.md` (estado 91/19/5, recorrido nuevo documentado con los dos
defectos que cazó, "lo que falta cubrir" reducido a accesibilidad/responsive/rendimiento),
`06-pendientes.md` (cierra el flujo de invitación; abre que el token ahora es visible para
el usuario sin caducar ni poder revocarse; `InvitePanel.tsx` añadido a la lista de botones
que no se ocultan por rol), `00-INDEX.md` (fase 1 con la construcción completa, pendiente de
uso real en mesa).

**Revertir.** `git revert` del commit de esta tarea. No toca `apps/api` ni
`packages/shared`; no hay migración que deshacer.

---

## 2026-08-31 — Editores de sesión y personaje (1.13)

**Qué.** `SessionsTab` y `CharactersTab` (`CampaignDetailPage.tsx`) eran de solo lectura;
ganan botón "Nuevo" y sus filas abren el editor correspondiente en modo edición, igual que la
pestaña de entidades:

- `features/sessions/SessionEditor.tsx` — título, fecha/hora opcional (`<input
  type="datetime-local">`, convertida a ISO al enviar), notas opcionales y visibilidad.
  `features/sessions/api.ts`/`hooks.ts` ganan `createSession`/`updateSession` y sus
  mutaciones; `Session` gana el campo `notes` que ya devolvía el servidor pero el tipo no
  declaraba.
- `features/characters/CharacterEditor.tsx` — nombre, raza, clase, nivel (convertido a
  `Number(...)`, nunca la cadena cruda del `<input type="number">`) y biografía, más
  visibilidad. `features/characters/api.ts`/`hooks.ts` ganan `createCharacter`/
  `updateCharacter` y sus mutaciones; `Character` gana el campo `bio`.
- Los dos siguen la convención `api.ts` + `hooks.ts` + componente + `__tests__` en ficheros
  separados de `features/links` y `features/comments`, y la lección de la tarea anterior: la
  edición pasa el objeto ya cargado por la lista (sin `useEntity` porque ni `Session` ni
  `Character` tienen datos ocultos como `grants`) y cada mutación fallida pinta su error en
  el formulario en vez de fallar en silencio.
- **Selector de visibilidad recortado a `PUBLIC`/`PLAYERS`/`OWNER_DM`/`DM_ONLY`**, sin
  `SPECIFIC_PLAYERS` (inerte en los dos modelos). Justificación completa en
  [05-datos.md](./05-datos.md).
- **Playwright**: nuevo recorrido en `apps/web/e2e/campana.spec.ts` que crea una sesión
  `DM_ONLY` y un personaje `PUBLIC` desde sus pestañas, comprueba que aparecen en su lista
  con lo que corresponde, y reabre los dos en modo edición para comprobar la precarga —
  título/notas de la sesión, raza/clase/nivel/biografía del personaje— contra la API real.
  Antes de esta tarea ningún recorrido visitaba `SessionsTab` ni `CharactersTab`; ver
  [08-pruebas.md](./08-pruebas.md).

**Arreglos de la revisión independiente (2026-08-31, tarea 1.13-fix), sobre el mismo trabajo
sin commitear.** Tres hallazgos Importantes y dos Menores:

1. **Vaciar un campo opcional en edición no lo borraba, en silencio.**
   `SessionEditor.tsx` y `CharacterEditor.tsx` construían el `PATCH` con propagación
   condicional (`...(trimmedX ? { x: trimmedX } : {})`), correcto para crear pero no para
   editar: si el usuario borraba el contenido de un campo, la clave se omitía del `PATCH` y
   el servicio (`if (input.x !== undefined) data.x = ...`, tanto en `sessions.service.ts`
   como en `characters.service.ts`) dejaba el valor viejo tal cual. El editor se cerraba como
   si hubiera guardado y el dato seguía en la base. Arreglado enviando la cadena vacía en modo
   edición (`notes`, `race`, `class`, `bio` — ninguno tiene `min` en el esquema). **Excepción
   que se documenta, no se arregla:** `scheduledAt` es `z.coerce.date()` sin `.nullable()`, así
   que "quitar la fecha de una sesión" no es expresable contra la API de hoy sin tocar
   `packages/shared`/`apps/api` — ver [06-pendientes.md](./06-pendientes.md).
2. **`OWNER_DM` en una sesión no significaba lo que decía.** `sessions.service.ts` pasa
   `createdById: ""` a `canView`, así que la comparación de `OWNER_DM` es falsa para
   cualquier jugador, y `visibility.ts` ya devuelve `true` para cualquier DM antes de mirar
   la visibilidad: en una sesión, `OWNER_DM`, `SPECIFIC_PLAYERS` y `DM_ONLY` producían
   exactamente el mismo conjunto de espectadores. Se quitó `OWNER_DM` del selector de
   `SessionEditor.tsx` (se queda en `CharacterEditor.tsx`, donde `ownerId` sí lo hace
   literal). Ver [05-datos.md](./05-datos.md) para la corrección del párrafo que lo
   justificaba con un razonamiento circular.
3. **El recorrido de Playwright nunca guardaba una edición.** El paso de sesión pulsaba
   "Cancelar" tras comprobar la precarga, y el de personaje terminaba en la aserción de
   precarga sin pulsar "Guardar": `updateSession` y `updateCharacter` no se ejecutaban ni una
   vez en un navegador real, pese a que el informe de 1.13 afirmaba que sí. Arreglado para
   que los dos bloques guarden de verdad y comprueben el resultado en la lista, y para que el
   paso de sesión cubra el arreglo 1 de punta a punta: vacía las notas, guarda, reabre y
   comprueba contra la API real que siguen vacías.
4. **Menor.** Un valor de visibilidad guardado que el `<select>` no ofrece (p. ej.
   `SPECIFIC_PLAYERS` por curl o siembra) dejaba el desplegable en blanco sin explicación.
   Ahora se añade como opción extra, marcada como "valor guardado, no seleccionable aquí".
5. **Menor.** Faltaba la prueba que ata el arreglo 1 (vaciar un campo en edición envía la
   cadena vacía) en los dos editores, y `CharacterEditor.test.tsx` nunca afirmaba el payload
   completo de `updateCharacter`. Las dos se añadieron, vistas en rojo antes del arreglo. Se
   dejó constancia, con comentario en el fixture y ficha en
   [06-pendientes.md](./06-pendientes.md), de que la prueba de precarga de la fecha de sesión
   solo cuadra porque el fixture tiene los segundos a cero.

**Por qué.** Cierra el hueco que dejaban abierto 1.8/1.9 (API) y P1 de
[06-pendientes.md](./06-pendientes.md): la API de sesiones y personajes existía y estaba
probada, pero no había forma de crearlos o editarlos desde la web.

**Qué queda abierto, a propósito.** Ni `SessionsTab` ni `CharactersTab` ocultan el botón de
edición según permiso (crear/editar sesión es solo del DM; editar personaje, del dueño o el
DM) — mismo bloqueante que las entidades y los enlaces/comentarios: la web no conoce su
propio id de usuario tras recargar (`auth.store.ts:15`). No hay UI de borrado, aunque la API
la soporte: el brief pedía creación y edición, no borrado.

**Cómo revertir.** `git revert` del commit de esta tarea. Sin migraciones ni cambios en
`apps/api` o `packages/shared`: solo web y documentación.

---

## 2026-08-31 — Editor de entidades: se arregla la pérdida de datos silenciosa

**Qué.** Cinco arreglos sobre el editor de entidades (commit `7714833`), encontrados en su
revisión independiente:

1. **Crítico.** Editar una entidad `SPECIFIC_PLAYERS` sin tocar la selección de jugadores
   mandaba `specificPlayerIds: []`, y el servicio lo interpretaba como "borra todas las
   concesiones y no crees ninguna" (`entities.service.ts:112-119`). Se arregló con precarga
   real: `useEntity` (nuevo hook, `features/entities/hooks.ts`) pide el detalle —que ya traía
   `grants`— solo en modo edición, y siembra la selección una vez llega. Mientras el detalle
   no ha llegado, `specificPlayerIds` no se manda (guarda de la carrera: si se pulsa Guardar
   en ese hueco, no se destruye nada).
2. El `fieldset` "Jugadores con acceso" mostraba todas las casillas vacías al editar, aunque
   hubiera concesiones vivas. Se cae solo con el arreglo 1; lleva su propia prueba porque
   afirma sobre lo que se ve, no sobre el payload.
3. Un jugador que creaba una entidad heredaba el `DM_ONLY` por defecto del modelo y su
   entidad desaparecía (invisible incluso para él). El formulario de creación arranca ahora
   en `OWNER_DM` — una línea en `EntityEditor.tsx`, sin tocar `canView` ni los valores por
   defecto del esquema o de Prisma. Ver [05-datos.md](./05-datos.md).
4. Un error del servidor (400 de Zod, 403) se pintaba como JSON crudo dentro del modal.
   `lib/api.ts` ahora extrae un mensaje legible (`fieldErrors`/`formErrors` de Zod
   concatenados, o `message` si es una cadena) y solo cae al texto crudo si el cuerpo no es
   JSON entendible.
5. `useMembers` se pedía siempre al abrir el editor, aunque la visibilidad nunca fuera
   `SPECIFIC_PLAYERS`, y un fallo o una carga en curso dejaba el `fieldset` vacío —el mismo
   estado, visualmente, que "cero concesiones". Ahora solo se pide cuando la visibilidad lo
   necesita (`useMembers(campaignId, { enabled })`, extensión mínima y compatible hacia atrás
   de `features/campaigns/members.ts`) y `isLoading`/`isError` tienen su propio texto.

**Por qué.** El arreglo 1 no era un riesgo eventual: era determinista. Abrir cualquier entidad
`SPECIFIC_PLAYERS`, corregir una coma del nombre y guardar destruía el 100 % de sus
concesiones, siempre, sin aviso — la entidad quedaba en `SPECIFIC_PLAYERS` con cero
concesiones, que nadie salvo el DM ve, y la lista seguía pintando la misma insignia.

**Pruebas.** 6 nuevas (`EntityEditor.test.tsx`: arreglos 1, 2, 3 y la carrera del arreglo 1,
más la guarda del camino "quitar SPECIFIC_PLAYERS" que ya funcionaba y no tenía prueba;
`lib/__tests__/api.test.ts`: arreglo 4, tres casos). Las 6 se vieron en rojo antes del arreglo
correspondiente. La prueba de creación existente no se tocó.

**Verificación.** `pnpm verify` limpio (build + lint + formato + 62 unitarias: shared 10, api
37, web 15) y `pnpm --filter @dnd/web e2e` en verde (2/2) — se comprobó explícitamente que la
prueba que selecciona `DM_ONLY` a mano seguía pasando tras cambiar el valor inicial del
selector.

**No arreglado, dado de alta en [06-pendientes.md](./06-pendientes.md):** las filas de la
lista de entidades son botón de editar aunque el servidor vaya a devolver 403;
`auth.store.ts:15` deja `user: null` tras recargar; falta `key` en `EntityTab` al cambiar de
pestaña; el modal no tiene `role="dialog"` ni cierra con Escape.

**Cómo revertir.** `git revert` del commit: devuelve `EntityEditor.tsx`, `features/entities/
{api,hooks}.ts`, `features/campaigns/members.ts` y `lib/api.ts` a su estado anterior. No toca
`apps/api` ni `packages/shared` — no hay migración que revertir.

---

## 2026-08-31 — Enlaces y comentarios en el editor de entidades (1.12b), y su revisión
(1.12b-fix)

**Qué.** `LinksPanel` y `CommentThread`, montados dentro de `EntityEditor` solo en modo
edición (`isEdit && entity`): panel de enlaces con selector de destino y etiqueta opcional,
hilo de comentarios con nombre de autor resuelto contra `useMembers`. El selector de destino
usa `useAllEntities` (`fetchAllEntities`, sin filtro `type`) porque un enlace puede apuntar a
cualquier tipo de entidad, no solo al de la pestaña activa.

**Por qué falló la primera revisión.** El único e2e de Playwright que existía entonces
(`campana.spec.ts`) pulsaba `Nuevo` y guardaba: nunca pulsaba la fila de una entidad ya creada,
así que nunca activaba `isEdit`. Como los dos paneles solo se pintan en ese modo, **ningún
navegador había pintado jamás `LinksPanel` ni `CommentThread`**, y el e2e pasó en verde sin
ejecutar una sola línea del código nuevo. `docs/08-pruebas.md` regla 3 describe exactamente
este fallo.

**Los arreglos de la revisión independiente (1.12b-fix), en el mismo commit:**

1. **El borrado de un enlace o un comentario ajeno fallaba en silencio.**
   `deleteLink.mutate(l.id)` / `deleteComment.mutate(c.id)` no tenían `onError`; el servidor sí
   rechazaba con 403 (`links.service.ts:75`, `comments.service.ts:65`) pero la interfaz no
   cambiaba nada, así que un jugador que pulsaba "Borrar" en un comentario ajeno no veía ni
   mensaje ni cambio. Arreglado reutilizando el `error` que ya existía para el camino de
   añadir/publicar, con `mutate(id, { onError: ... })`.
2. **El selector de destinos de enlace quedaba obsoleto hasta 30 s.** `allEntitiesKey` es una
   rama distinta de `entitiesKey(campaignId, type)` (`features/entities/hooks.ts`), y las mutaciones de
   crear/actualizar entidad solo invalidaban la segunda; con `staleTime: 30_000`
   (`lib/queryClient.ts`) tampoco se refrescaba al montar. Un DM que creaba una entidad y
   abría otra para enlazarla no la veía en el desplegable durante medio minuto. Arreglado
   invalidando también `allEntitiesKey(campaignId)` en `useCreateEntity` y `useUpdateEntity`.
3. **El e2e verde no probaba nada nuevo** (visto arriba). Se añadió el recorrido que faltaba a
   `campana.spec.ts`: crea dos NPCs, abre uno en modo edición, comprueba que los dos paneles
   se pintan, enlaza el NPC con el otro y ve el enlace en la lista, publica un comentario y lo
   ve con su texto — contra la API real, sin mocks.
4. **El desplegable ofrecía destinos ya enlazados**, y volver a elegirlo chocaba contra
   `@@unique([fromId, toId, label])` (`schema.prisma:100`) sin que `links.service.create`
   comprobara duplicados antes: 500 en crudo o fila repetida. Arreglado excluyendo del
   desplegable lo que ya está en `links.data`, además de la propia entidad. De paso se cerró
   una prueba semivacía (`LinksPanel.test.tsx`) que metía la entidad propia en el resultado de
   `fetchAllEntities` sin afirmar nunca que no apareciera como opción.
5. **Las pruebas de `EntityEditor` en modo edición disparaban `fetch` reales.** Los cuatro
   casos de edición ahora montan `LinksPanel` y `CommentThread`, que llaman a `fetchLinks`,
   `fetchAllEntities` y `fetchComments`; ninguno estaba espiado en `EntityEditor.test.tsx`, así
   que pasaban por `retry: false` convirtiendo el fallo real en un `isError` que nadie miraba.
   Arreglado espiando los tres fetchers en ese fichero.
6. `CommentThread` llama a `useMembers(campaignId)` sin `enabled`, a diferencia del
   `EntityEditor`, que lo hace perezoso a propósito. **Se dejó así, deliberadamente**: el hilo
   necesita los nombres para atribuir comentarios y se pinta siempre en modo edición; comparte
   clave de consulta con el picker de jugadores, así que sigue siendo una sola petición, no
   dos. Documentado con un comentario en `CommentThread.tsx`.

**No arreglado a propósito.** Los botones "Quitar"/"Borrar" se pintan en todas las filas sin
mirar permiso: ocultarlos con criterio necesita que la web conozca su propio identificador de
usuario, y `auth.store.ts:15` todavía lo pierde al recargar. Mismo bloqueante que la fila de
edición de `CampaignDetailPage.tsx`. Ver [06-pendientes.md](./06-pendientes.md).

**Pruebas.** 5 nuevas vistas en rojo antes de su arreglo: borrado con error en `LinksPanel` y
en `CommentThread` (fix 1), exclusión del desplegable en `LinksPanel` (fix 4, más la aserción
que faltaba en la prueba semivacía existente), y dos de `features/entities/__tests__/hooks.test.tsx` (nuevo
fichero) que comprueban `isInvalidated` en `allEntitiesKey` tras crear y tras actualizar (fix
2). El fix 5 no añade una prueba en rojo propia — espiar un fetcher no cambia el resultado de
una prueba que ya pasaba por `retry: false` — así que se declara aquí en vez de fingir un rojo
que no existió.

**Verificación.** `pnpm verify` limpio (build + lint + formato + 71 unitarias: shared 10, api
37, web 24) y `pnpm --filter @dnd/web e2e` en verde (3/3): las dos suites anteriores más el
recorrido nuevo de enlaces y comentarios, que sí ejecuta `LinksPanel` y `CommentThread` en un
navegador real.

**Cómo revertir.** `git revert` del commit: devuelve `LinksPanel.tsx`, `CommentThread.tsx`,
`features/entities/hooks.ts`, `campana.spec.ts` y los ficheros de prueba tocados a su estado anterior.
No toca `apps/api` ni `packages/shared`.

---

## 2026-08-31 — Playwright: la primera prueba que abre un navegador

**Qué.** Playwright con Chromium en `apps/web`: `playwright.config.ts`, especificaciones en
`apps/web/e2e/`, scripts `e2e` y `e2e:ui`, y un trabajo `e2e-browser` aparte en CI que sube el
informe como artefacto cuando falla. La configuración levanta sola los dos servidores —la API
**compilada** (`start:prod`, como en producción) y Vite haciendo de proxy de `/api`— así que
la prueba recorre la misma cadena que un usuario. El `include` de vitest se acotó a `src/`
para que los dos corredores no se disputen los `.spec.ts`.

Cubierto: **registro → crear campaña → crear un NPC con etiquetas y visibilidad → verlo en su
pestaña**, y **salir cierra la sesión** y volver a mano a la ruta protegida devuelve a
`/login`.

**Por qué.** Era la P1 tras cerrar el linter, y `08-pruebas.md` ya llevaba escritas sus reglas
esperando la herramienta: jsdom no pinta ni navega, así que nada cubría sesión, rutas ni
pintado.

**Evidencia de que las pruebas sirven, no solo de que pasan.** Se rompió a propósito la guarda
de autenticación (`ProtectedRoute` dejando pasar sin token) y se corrieron las dos suites: las
**7 pruebas de componente siguieron en verde** y **el e2e de sesión falló** con su captura. La
guarda se restauró y los dos e2e volvieron a pasar. Es el mismo defecto que en english-log
llegó dos veces a producción con toda la suite verde.

**Cómo revertir.** `git revert` del commit: quita la configuración, las especificaciones, los
scripts y el trabajo de CI, y devuelve a vitest su `include` por defecto. Los binarios del
navegador quedan en la caché del usuario (`~/AppData/Local/ms-playwright`) y se borran a mano
si molestan.

---

## 2026-08-31 — ESLint, Prettier y gancho de pre-commit: el nivel pasa a N1 real

**Qué.** ESLint 9 con configuración plana única en la raíz (`eslint.config.mjs`), Prettier
con `.prettierrc.json` y `.prettierignore` (Markdown excluido: la documentación se escribe a
mano), `pnpm verify` ampliado a `build && lint && format:check && test`, y
`.githooks/pre-commit` que lo ejecuta y bloquea el commit. El gancho se conecta solo desde el
`prepare` de la raíz vía `scripts/install-git-hooks.mjs`, escrito para **no fallar nunca sin
`.git`**, porque las imágenes Docker se construyen desde una copia sin repositorio. CI deja
de omitir el lint y añade el chequeo de formato.

**Por qué.** Era la P1 de `06-pendientes.md` y la única excepción declarada en
`04-convenciones.md`: el proyecto no podía exigir N1 sin linter desde la fase 0.

**Los 15 errores de la primera pasada se arreglaron corrigiendo el código, no las reglas:**

- Diez cuerpos de controlador tipados como `any` pasaron a los tipos de `@dnd/shared`
  (`RegisterInput`, `CreateEntityInput`, `UpdateSessionInput`…). El pipe de Zod ya garantizaba
  la forma; el `any` solo la escondía del compilador.
- `updateSessionSchema` y `updateCharacterSchema` estaban **definidos en el controlador**
  mientras el servicio redefinía a mano su `Partial<...>`: dos declaraciones de la misma
  forma. Se mudaron a `@dnd/shared`, que es donde la convención dice que vive la forma de los
  datos, y ambos las importan.
- Tres `require("supertest")` dentro del cuerpo de un test pasaron a un `import` normal.
- Un `ForbiddenException` importado y nunca usado, fuera.
- Los ficheros de configuración CommonJS (`jest.config.js`) declaran su entorno en la
  configuración de ESLint en vez de llevar un comentario que silencie la regla.

Prettier reformateó 57 ficheros de código. Ningún cambio de conducta.

**Evidencia.** `pnpm verify` ✅ (build + lint + formato + 54 unitarias) y
`pnpm --filter @dnd/api test:e2e` ✅ 19 en 9 suites, corridos después del cambio de tipos.

**Cómo revertir.** `git revert` del commit devuelve `any` a los controladores, los esquemas
de actualización al controlador, y `verify` a `build && test`; borra la configuración de
ESLint y Prettier y el gancho. Para desconectar solo el gancho sin revertir nada:
`git config --unset core.hooksPath`.

---

## 2026-08-31 — Se adopta la estructura de documentación numerada

**Qué.** Se crean `docs/00-INDEX.md` y `01`–`08` describiendo lo que el repositorio **es
hoy**, no lo que debería ser. `docs/DEPLOY.md` <!-- docs-lint-ignore --> se elimina y su contenido pasa, traducido y
ampliado con el estado real, a `03-despliegue.md`. `CLAUDE.md` y `AGENTS.md` de la raíz
quedan como punteros cortos. Se añade el script `pnpm verify`.

**Por qué.** El repositorio no tenía `04-convenciones.md`, así que **no declaraba nivel de
verificación**, y `~/.claude/dev-rules.md` exige uno. Al levantar el estado real apareció lo
que el nivel habría destapado antes: **ESLint no está instalado** y `pnpm lint` falla en los
tres paquetes desde la fase 0. Queda declarado como excepción (**N1 incompleto**) y abierto
como P1, en vez de seguir implícito.

**Línea base medida ese día, no prometida:** `pnpm build` ✅ · `pnpm test` ✅ 54 (shared 10,
api 37, web 7) · `pnpm --filter @dnd/api test:e2e` ✅ 19 en 9 suites contra Postgres real ·
`pnpm lint` ❌ *"eslint no se reconoce"*.

**Cómo revertir.** `git revert` del commit: borra `docs/00`–`08`, restaura `docs/DEPLOY.md` <!-- docs-lint-ignore -->
y quita el script `verify`. No toca código de aplicación ni pruebas.

---

## 2026-07-02 → 2026-08-31 — Fase 1: núcleo de campaña

**API completa.** Esquema y migración `campaign_core`; esquemas Zod compartidos; el helper
`canView` con su matriz de 5×6 probada; campañas y `MembershipService`; invitaciones;
entidades con filtro de visibilidad y concesiones; enlaces wiki; comentarios; sesiones
(gestionadas por el DM); personajes (dueño o DM); y el listado de miembros que alimenta el
selector de jugadores de la web.

**Web en curso.** Lista de campañas con creación; detalle con pestañas de entidades,
sesiones y personajes; editor de entidades con etiquetas, visibilidad y selección de
jugadores concretos (commit `7714833`, con su arreglo de pérdida de concesiones en
`1d27a52`); panel de enlaces y hilo de comentarios dentro del modo edición del editor de
entidades (tarea 1.12b), montados como componentes propios (`LinksPanel`, `CommentThread`)
solo cuando la entidad ya existe. El selector de destino de un enlace pide **todas** las
entidades de la campaña con una sola llamada (`useAllEntities`, sin filtro `type`), en vez
de siete listas por tipo: el endpoint ya aceptaba `type` como opcional
(`entities.controller.ts`) y un enlace puede apuntar a cualquier tipo. Quedan los editores
de sesión y personaje, y el flujo de invitación.

Los límites aceptados a conciencia de esta fase están en
[05-datos.md](./05-datos.md) y abiertos en [06-pendientes.md](./06-pendientes.md).

**Cómo revertir.** Cada tarea es un commit propio en `main`; el ledger da el identificador
de cada una. La migración `20260702215016_campaign_core` es la que introduce todas las
tablas de la fase.

---

## 2026-07-02 — Fase 0: cimientos

Monorepo pnpm, NestJS + Fastify + Prisma, React + Vite, `@dnd/shared`, autenticación con
argon2 y JWT, Sentry, Dockerfiles de API y web, CI en GitHub Actions y el procedimiento de
despliegue en Coolify. Ambas imágenes construyen y `node dist/src/main.js` arranca en modo
producción.

Correcciones de la fase que siguen vigentes y explican decisiones raras del repositorio
(las tres están detalladas en [02-entorno.md](./02-entorno.md)): el `&` de la carpeta rompe
`nest --watch` en Windows; `@dnd/shared` se publica a `dist` **y** se aliasa a `src` en Vite;
y `packageManager` queda fijado a pnpm 10.32.1.

**Deuda que nació aquí:** ESLint no se configuró y CI omitía el lint. **Cerrado el
2026-08-31** — ver la entrada "ESLint, Prettier y gancho de pre-commit" de esa fecha, arriba.
