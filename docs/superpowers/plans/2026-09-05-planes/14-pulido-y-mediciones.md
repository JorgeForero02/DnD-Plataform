# Plan 14 · Pulido y mediciones (U1 · U3 · U8 · U9 · U2 · U7 · R1 · C6-4)

**Objetivo en una frase:** cerrar las fichas de interfaz que llevan abiertas desde el 2026-09-02 y
**volver a medir las que hablan de una pantalla que ya no existe**.

**Tamaño:** cuatro commits. **Solo `apps/web/src`**, salvo U3, que es servidor.

> **Lee esto antes que nada:** varias de estas fichas describen **la mesa y los diálogos de antes de
> la Ola 0**. `Dialog` era un cuadro centrado y ahora es un cajón; la mesa vivía en `AppShell` y ya
> no. **Medir primero, arreglar después.** Al menos una de ellas puede estar ya cerrada.

---

## 14.1 · R1 · Volver a medir el arrastre — **esto va primero**

**Por qué:** el editor de reglas tiene arrastre y **no se sabe si funciona**. El diagnóstico escrito
dice que un `<div draggable>` trivial **dentro del diálogo** tampoco arrastra y **fuera** sí, y
concluye: *«es del contexto, no de la pieza»*.

**Y ese contexto ya no existe.** La Ola 0 convirtió `Dialog` de cuadro centrado con `max-h-[85vh]` a
**cajón lateral a altura completa**. Es **justo la variable que el dato culpaba**. Es D-OP-19, que
decía literalmente que R1 se vuelve a medir cuando el carril gráfico reemplace el diálogo.

**Cómo se mide, en este orden y sin saltarse pasos:**
1. Un `<div draggable>` trivial **dentro del cajón nuevo**: ¿dispara `dragstart`?
2. Si **sí** → el arrastre real, con ratón paso a paso. Si funciona, **R1 se cierra** y con ella la
   desviación **C3-4** («Bloques de reglas abre lectura y no el editor con arrastre»).
3. Si **no** → sigue vivo, y ahora hay un sospechoso nuevo: el atrapa-foco del cajón. Anótalo con lo
   medido y **no lo arregles dentro de este plan**.

**La ruta de teclado y pulsación sigue siendo la única que se puede afirmar** hasta que esto dé un
resultado. No la quites.

## 14.2 · Las cuatro de honestidad

**U8 · Cerrar con cambios sin guardar no avisa.** `Escape`, el clic fuera y «Cancelar» **descartan lo
escrito sin preguntar**. Con el cuerpo de una ficha dentro, eso es perder trabajo. El aviso solo debe
salir **si hay cambios**: uno que salta siempre se aprende a ignorar en dos días.

**U9 · `disabled` en vez de `aria-disabled`.** Confirmado el 2026-09-05: **cero usos de
`aria-disabled` en toda la web**. Un botón `disabled` **sale del recorrido de teclado**, así que
quien navegue con teclado o lector **no lo encuentra y no se entera de por qué no puede**. La regla
del proyecto ya dice que se deshabilita **con el motivo visible**; esto es la otra mitad.

**U1 · Las sesiones no tienen página de lectura.** Fichas y personajes sí; una sesión se sigue
abriendo en su formulario. Es **la pantalla que la crónica necesita** — y con `Session.recap` como
columna (plan 02) hay algo real que leer.

**U3 · Buscar solo mira el nombre.** Buscar dentro del texto **exige hacerlo en el servidor**: el
filtro de pantalla solo ve lo que ya se trajo. Confirmado: **cero** búsquedas por cuerpo en
`entities.service.ts`. **Y el resultado pasa por `canView`**, o buscar se convierte en un oráculo
sobre fichas que no puedes ver — el mismo defecto que el plan 03 arregla en el ataque.

## 14.3 · Las dos de forma

**U2 · La columna de secciones desaparece bajo 768 px y nada la sustituye.** Se llega a una sección
por URL pero **no se puede navegar**. **Vuelve a medirlo**: la navegación cambió entera con el reseño
—de diecinueve destinos a seis— y puede que el problema sea otro.

**U7 · El ornamento no se puede apagar.** La cuadrícula y el horizonte se pintan siempre. No se
mueven, así que `prefers-reduced-motion` no aplica, **pero sí molesta a quien lee con dificultad**.
Un interruptor en la cuenta, persistente. **Y déjalo listo para D-OP-24**, la capa de ambiente
pixelada, que va a necesitar el mismo interruptor.

## 14.4 · C6-4 · Los PG temporales de un PNJ

`NpcEnLaMesa.tempHp` **se pinta y nunca se ha visto con datos**: ninguna pantalla los concede, así
que siempre llega 0. Falta **el gesto**: dárselos a un PNJ desde la mesa.

Y con las reglas delante, que aquí importan:
> *«Healing can't restore temporary hit points, and they can't be added together. If you have
> temporary hit points and receive more of them, you decide whether to keep the ones you have or to
> gain the new ones.»*

Así que el gesto **no suma**: pregunta cuál se queda. Y **se pintan aparte**, nunca sumados a los
actuales — como ya hace `PanelDeBestiario.tsx:260`.

## Pruebas

**R1:** el resultado de la medición, escrito **con su número y su fecha**, gane o pierda.
**U8:** con cambios avisa; **sin cambios no avisa** (esta es la que se olvida).
**U9:** el botón deshabilitado **sigue siendo alcanzable con Tab** y anuncia su motivo.
**U1:** la página de lectura pinta la crónica **filtrada por su visibilidad**.
**U3:** buscar por una palabra del cuerpo la encuentra · **y no encuentra una ficha que no puedes
ver** — esta es la prueba importante.
**U7:** apagado el ornamento, **no se pinta**, y el ajuste sobrevive a recargar.
**C6-4:** dar temporales a un PNJ los pinta aparte · dar unos nuevos **pregunta**, no suma.

**Mutación:** quita el `canView` de la búsqueda y comprueba que su prueba se pone roja.

## Guía de revisión

- [ ] **R1 se midió antes de tocar nada**, y el resultado está escrito.
- [ ] Si R1 funciona, **C3-4 se cierra con ella** y se dice.
- [ ] El aviso de cambios sin guardar **no salta cuando no hay cambios**.
- [ ] `aria-disabled` **con motivo anunciado**, y el botón sigue en el recorrido de teclado.
- [ ] La búsqueda por cuerpo **es del servidor** y pasa por `canView`.
- [ ] U2 se **volvió a medir** en el navegador, no se dio por buena.
- [ ] El interruptor de ornamento **persiste** y queda listo para D-OP-24.
- [ ] Los temporales **no se suman** y se pintan aparte.
- [ ] Una sola tanda de Playwright, y **mata tus procesos al terminar**.

## Trampas

- **`jsdom` no maqueta.** U2 y U7 **no se pueden probar en RTL**: van a Playwright con medidas
  numéricas.
- **Un aviso de «cambios sin guardar» mal hecho es peor que ninguno.** Si compara objetos por
  referencia saltará siempre y la gente aprenderá a descartarlo sin leer.
- **`aria-disabled` no impide pulsar**: hay que ignorar el clic a mano, o el botón hará lo que dice
  que no puede hacer.
- **La búsqueda en el cuerpo es un vector de fuga.** Sin `canView`, un jugador confirma la existencia
  de una ficha `DM_ONLY` buscando una palabra que solo está en ella.

## Commits

```
test(web): measure the rules editor drag again, now that the dialog is a drawer
feat(web): closing with unsaved changes asks, and disabled buttons stay reachable
feat(api,web): search looks inside the body, filtered by canView
feat(web): the ornament has a switch, and an NPC can be given temporary hit points
```

## Definición de terminado

`pnpm verify` verde, Playwright corrido, la mutación de la búsqueda probada, **el resultado de R1
escrito gane o pierda**, y las siete fichas anotadas en el maestro con lo que se midió.


---

## Avance — lo escribe quien ejecuta este plan

> **Obligatorio, y se escribe MIENTRAS se trabaja, no al final.** Si la sesión se queda sin contexto
> o muere, **esto y el prompt de arranque son lo único que sabe la siguiente**. Una línea por paso,
> con su commit. Nada de memoria: `fichero:línea` o no cuenta.

| Estado | Cuándo | Qué |
|---|---|---|
| ✅ hecho | 2026-09-06 | **14.1 · R1 remedida, y va primero como pide el plan.** `apps/web/e2e/arrastre-dentro-del-cajon.spec.ts:85` repite el experimento original —el mismo `<div draggable>` trivial, dentro y fuera— y da **`dragstart` FUERA: SÍ · DENTRO: SÍ**. `apps/web/e2e/reglas-arrastrar.spec.ts` pasa sus **ocho**. Ficha tachada en `docs/06-pendientes.md:402` y comentario rehecho en `apps/web/src/features/sessions/dm/HerramientasDeNarracion.tsx:40`. **Commit `912ff52`** |
| ✅ hecho | 2026-09-06 | **14.2a · U8 + U9.** U8: `apps/web/src/ui/Dialog.tsx` acepta `hayCambiosSinGuardar` y **las tres salidas** pasan por `pedirCierre`; lo monta `apps/web/src/features/entities/EntityEditor.tsx` comparando valores. U9: `apps/web/src/ui/Button.tsx` pone `aria-disabled` y guarda el `onClick`; igual en `features/links/LinksPanel.tsx:222` y `features/comments/CommentThread.tsx:80`. Pruebas nuevas en `ui/__tests__/Button.test.tsx` y `ui/__tests__/Dialog.test.tsx`. **Commit `6ef8c03`** |
| ✅ hecho | 2026-09-06 | **14.2b · U3 · buscar dentro del cuerpo.** Servidor hecho: `listEntitiesQuerySchema` en `packages/shared/src/entity.schema.ts:8`, `EntitiesService.list` y `coincideElTexto` en `apps/api/src/entities/entities.service.ts`, ruta en `entities.controller.ts:38`. Web hecha: `features/entities/api.ts:26`, `hooks.ts:26`, `filter.ts` (deja de filtrar por texto) y `pages/CampaignDetailPage.tsx:215`. **Commit `9ae58df`**, con `apps/api/test/buscar-en-el-cuerpo.e2e-spec.ts` (6 verdes) y la **mutación probada**: sin `canView`, 4 de 6 rojas. |
| ✅ hecho | 2026-09-06 | **14.3 · U2 remedida y U7.** U2: `apps/web/e2e/navegar-en-estrecho.spec.ts:35` da **7 destinos alcanzables a 375 px** — el problema de la ficha ya no existe, lo arregló el reseño. U7: `apps/web/src/ui/ornamento.ts`, `features/auth/AjusteDeOrnamento.tsx` montado en `pages/AccountPage.tsx`, y los dos adornos de `ui/Ornament.tsx` dejan de pintarse. Medido en `apps/web/e2e/ornamento.spec.ts`. **Commit `bfddc6d`** |
| ✅ hecho | 2026-09-06 | **14.4 · C6-4.** `apps/web/src/features/bestiario/DarTemporales.tsx`, montado en la fila del PNJ. **No suma y pregunta cuál se queda**; para poder cumplir la regla del SRD hizo falta `setHpSchema.tempHpEleccion` (`packages/shared/src/character-sheet.schema.ts`) y su rama en `apps/api/src/characters/character-sheet.service.ts:1333`. **Commit `bfddc6d`** |
| ✅ hecho | 2026-09-06 | **14.2c · U1.** `apps/web/src/pages/SessionDetailPage.tsx` en `/campaigns/:id/sesiones/:sessionId` (`apps/web/src/App.tsx:101`), enlazada desde la lista (`pages/CampaignDetailPage.tsx:438`). `fetchSession`/`useSession` en `features/sessions/`. Medido en `apps/web/e2e/leer-una-sesion.spec.ts` con dos contextos. **Commit `a06e4b2`** |
| ✅ | 2026-09-06 | **EL PLAN 14 ESTÁ CERRADO**: R1 remedida, U8, U9, U3, U2 (por remedición), U7, C6-4 y U1. |

**Leyenda:** ⬜ sin empezar · 🟨 en marcha · ✅ hecho · ⛔ bloqueado (di por qué y qué descartaste).

**Lo que decidí por los cuatro pasos** (qué no cuadraba · qué elegí · por qué es duradero · la
fuente si la hubo):

- **14.1 · LA PRIMERA PASADA DE LA REMEDICIÓN DIO UN CONTROL FALSO, y por poco lo doy por bueno.**
  La sonda se añadía al final del `body` y en la página de campaña caía fuera de la vista: el
  control salió «fuera: NO» por **geometría**, no por contexto — y eso habría «confirmado» el
  diagnóstico viejo por el motivo equivocado. Con `position: fixed` en los dos casos, mide. Queda
  escrito porque una medición con el control roto es peor que ninguna.
- **14.1 · C3-4 NO se cierra montando el editor en el cajón, y esto es una decisión.** El plan dice
  que si R1 funciona, C3-4 «se cierra con ella **y se dice**». Lo que desaparece es **la premisa**:
  el comentario de `HerramientasDeNarracion.tsx` decía «no se monta el editor aquí mientras el dato
  no se rehaga», y el dato está rehecho. Lo que queda es una decisión de pantalla —qué quiere el DM
  en mitad de la mesa—, no de datos: consultar qué reglas escuchan es de juego, escribir una regla
  es preparación. **Montarlo es posible desde hoy y es una tanda con su ficha, no una línea aquí.**
- **14.1 · Se midió con el cajón de «Consulta del mundo», no con el de reglas**, y da igual: es **el
  mismo componente `Dialog`**, y lo que se mide es el contexto del cajón, no su contenido. Se eligió
  ese porque está disponible con la mesa en reposo, sin montar una sesión entera.
- **U9 · El arreglo va en el `Button` compartido, un solo sitio para toda la aplicación**, más los
  **dos** botones crudos que también apagan con motivo. **Los campos de formulario conservan
  `disabled` de verdad**, y es deliberado: un `<input>` apagado no tiene motivo que leer al tabular,
  y `aria-disabled` no impediría escribir en él. No es media medida: es que la ficha habla de
  controles con motivo, y un campo no lo es.
- **U9 · `aria-disabled` no impide pulsar, así que el `onClick` sale antes**, en el propio `Button`.
  Sin eso el botón haría exactamente lo que dice que no puede hacer — peor que el problema original.
  Y `preventDefault` corta además el `submit` de un botón dentro de un formulario.
- **U9 · Una de las 76 aserciones destapó algo real.** `waitFor(() => expect(boton)
  .not.toBeDisabled())` empezó a pasar **al instante**, porque el atributo ya no existe nunca, y el
  clic salía **antes** de que el rol se resolviera. La espera miraba la señal equivocada desde
  siempre; ahora mira `aria-disabled`.
- **U8 · Las tres salidas pasan por la misma puerta.** Si una sola se saltara la pregunta, bastaría
  con rozarla para perder lo escrito, y sería justo la que nadie prueba. Hay una prueba que recorre
  las tres.
- **U8 · «Hay cambios» se decide comparando VALORES**, no con una bandera de «he tecleado»: la
  plantilla de una ficha nueva no cuenta, y escribir y borrar tampoco. Un aviso que salta siempre se
  descarta sin leer en dos días. **La prueba que se olvida —sin cambios NO pregunta— está escrita.**
- **U8 · El aviso vive DENTRO del cajón**, no en un segundo superpuesto: dos capas apiladas se
  pelean por el atrapa-foco, que es justo el defecto que `Dialog` existe para no tener.
- **U3 · El orden de los dos filtros ES la seguridad.** Primero `canView`, después el texto. Al
  revés, buscar sería un **oráculo**: una palabra que solo está en una ficha `DM_ONLY` la delataría.
  Es el mismo defecto que el plan 03 cerró en el ataque, y por eso el e2e comprueba **que NO
  encuentra**, no solo que encuentra.
- **U3 · El texto se compara en el servicio y no en la consulta**, y no es pereza: `body` es `Json`
  —lo que solo se pinta puede ser Json—, filtrarlo en Prisma pediría SQL crudo y **perdería el
  `include` de las concesiones que `canView` necesita**. Esa consulta **ya traía todas las filas** de
  la campaña para poder aplicar `canView`, así que comparar aquí **no añade ni una lectura**. El día
  que haya miles de fichas lo que cambia es paginar la consulta entera.
- **U3 · `filterEntities` deja de filtrar por texto en el navegador.** Dejar una segunda comparación
  del nombre habría dado **dos filtros para lo mismo**, con el de aquí ignorando el cuerpo; el día
  que discreparan ganaría el que menos sabe. Las etiquetas se quedan: se resuelven sobre lo que ya
  está en pantalla.
- **U3 · Los dos estados vacíos se deciden ahora por el FILTRO, no por `data.length`.** Con el
  servidor buscando, una lista vacía puede significar «aquí no hay nada» **o** «tu búsqueda no
  encuentra nada», y son dos situaciones que no pueden decir lo mismo.
- **U3 · Los dobles de las pruebas de pantalla honran `q`.** Un doble que lo ignorase haría pasar en
  verde una pantalla que no manda la palabra.
- **U2 · SE CIERRA MIDIENDO, NO ARREGLANDO, y esa era la mitad del punto del plan.** A 375 px hay
  **siete destinos alcanzables sin URL**, todos visibles y pulsables. La ficha describía una columna
  de secciones que **ya no existe**: la sustituyó el reseño. Medir primero evitó «arreglar» algo que
  llevaba semanas arreglado.
- **U7 · No se usa `prefers-reduced-motion`.** Habla de **movimiento** y esto no se mueve: usarla
  habría apagado el adorno a quien pidió otra cosa y dejado sin opción a quien lo necesita. Es una
  decisión de la persona, y se guarda **en este navegador**, como el tema, porque quien lo necesita
  lo necesita en el dispositivo donde le molesta.
- **U7 · Deja de pintarse, NO se esconde con CSS**, y eso obligó a un `useSyncExternalStore`: el
  tema lo resuelve el CSS y nadie repinta, pero esto es una decisión de React. Con una lectura
  suelta del atributo, **apagarlo lo cambiaba y la cuadrícula seguía en pantalla**. Lo cazó el
  navegador, no `jsdom`.
- **U7 · `OrnamentRule` NO se apaga.** Es un filete con un rótulo dentro: estructura del texto, no
  adorno. Apagarla dejaría secciones sin separar, que es un problema de lectura.
- **C6-4 · El servidor decidía por quien recibía los temporales, y eso es media regla.** Se quedaba
  con el mayor por su cuenta: acierta casi siempre y **quita la elección que el SRD da** —*«you
  decide whether to keep the ones you have or to gain the new ones»*—. Hay efectos que interesa
  cambiar por otros más pequeños porque duran más. Ahora la decisión viaja (`tempHpEleccion`), y sin
  el campo se conserva el comportamiento de siempre para no cambiar de significado a nadie.
- **U1 · La página NO reimplementa el filtro de la crónica.** El servidor ya borra **las dos**
  columnas —el texto y su nivel— cuando quien mira no puede verla, y borrar solo el texto habría
  dicho «hay una crónica que no puedes leer», que ya es información. La pantalla pinta lo que llega:
  una segunda comprobación aquí sería una segunda verdad con menos datos.
- **U1 · El nivel de la crónica se enseña APARTE del de la sesión**, porque pueden no coincidir:
  saber a quién se le está contando algo importa antes de contarlo.
- **U1 · El enlace se añade junto a los controles y no sustituye la fila.** Quien la abre para
  corregir la fecha sigue queriendo el formulario; cambiar el destino de la fila habría arreglado
  una cosa rompiendo otra.
- **C6-4 · El botón se apaga hasta que la hoja llega.** Fijar PG es concurrencia optimista y exige
  la `version`; sin ese candado el botón se dejaba pulsar y **no hacía nada en silencio**, que es
  peor que estar apagado. **Lo cazó su propia prueba.**

**Lo siguiente exacto, si me quedo aquí:**

**Solo queda U1**, que es lo único del plan 14 sin hacer:

- **U1 · la sesión no tiene página de lectura.** Las fichas y los personajes sí; una sesión se sigue
  abriendo en **su formulario**, que es la pantalla de editarla y no la de leerla. Con
  `Session.recap` como columna (plan 02) ya hay algo real que leer, y la crónica es lo que la mesa
  repasa entre partidas. La página tiene que pintar **filtrada por su visibilidad**, como la de una
  ficha del mundo.

> **Aviso de fechas, para quien lea esto:** todo lo de esta tanda está fechado **2026-09-06** y el
> reloj del entorno dice **2026-09-05**. La noche cruzó la medianoche en la sesión anterior y las
> fechas se escribieron consistentes entre sí; **no se han reescrito a mano** porque cambiar unas y
> no otras sería peor que la incoherencia actual. Lo decide el autor.
