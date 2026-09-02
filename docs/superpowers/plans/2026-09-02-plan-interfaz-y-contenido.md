# Plan — la ronda de interfaz y contenido (2026-09-02)

**Qué es esto.** El autor pidió una ronda de cambios de interfaz, primero tres cosas y luego una
lista larga. Dos de las tres primeras están entregadas; el resto se organiza aquí **antes** de
tocar nada más, porque el trabajo restante no cabe en una tanda y varias piezas se pisan entre sí
si se hacen a la vez sin fronteras.

Este documento manda sobre el orden. Lo que no está aquí, no se hace.

---

## 0 · Estado al escribir este plan

| Encargo | Estado | Commit |
|---|---|---|
| Pantalla de sesión de juego | ✅ entregado | `086e7fe` |
| El jugador no escribe ni ve el mundo | ✅ entregado | `32c595c` |
| Dejar de llamarse «fichas» + formulario por tipo | ✅ entregado | `32c595c` |
| **Hoja de personaje dinámica** | ⏳ **empezada y parada** | — |
| Editor de bloques + tutorial | ⏳ no empezado | — |
| Línea de tiempo ramificada | ⏳ no empezado | — |
| Enlaces con utilidad | ⏳ no empezado | — |
| Hoja rasgada / vitela mejor | ⏳ no empezado | — |
| Documentos y cuaderno del DM | ⏳ no empezado | — |
| Más razas y clases | ⛔ **bloqueado por licencia** | — |
| Auditoría e2e final | ⏳ al final, la pide el autor | — |

**Lo único suelto en el árbol** es `apps/web/src/features/character-sheet/EdicionEnSitio.tsx`:
las primitivas de edición en el sitio, escritas y sin usar todavía. Es la base de H1 y se queda.

### Lo que ya está investigado y no hay que volver a investigar

Cuatro informes del 2026-09-02, con enlaces y con lo que **no** se pudo verificar declarado:

1. **Hoja de personaje** — anatomía de la hoja clásica, las cinco zonas intocables, reglas de
   edición en el sitio con fuente (Primer de GitHub, GitLab), y las trampas de D&D Beyond,
   Roll20, Foundry y Tidy5e. **Disposición elegida: cabecera fija + dos columnas.**
2. **Editor por bloques** — veredicto **lista, no lienzo**, con la evidencia de Godot (0,5 % de
   adopción, retirado), Construct, IFTTT y el módulo de automatización más usado de Foundry. Más
   los diez fallos documentados de las reglas disparador-acción (CHI 2019, 153 participantes).
3. **Vitela y cuaderno del DM** — técnicas de borde rasgado con su coste, el número de opacidad
   del grano, el modo oscuro con papel, y la comparativa de editores enriquecidos. **Elegido:
   TipTap con Markdown como formato almacenado, y Excalidraw (MIT) para dibujo.**
4. **Contenido abierto** — verificado sobre los PDF oficiales: **el SRD 5.2 añade cero clases y
   cero subclases**, y el artificiero no está en ninguno.

---

## 1 · Las decisiones que bloquean, y son del autor

Ninguna de las tres se puede tomar desde el código. Las tareas que dependen de ellas están
marcadas ⛔ más abajo.

### D1 · Contenido que no es del SRD (bloquea C1–C3)

El catálogo actual es **el SRD 5.1 íntegro**: 9 razas, 4 subrazas, 12 clases, 12 subclases. No
falta nada por descuido — es el tamaño del SRD. El artificiero **no está en ningún SRD abierto** y
sus reglas no se pueden reproducir. Tres salidas, y hay que elegir:

- **(a) Editor de contenido por campaña.** El DM mete lo que quiera. Es lo único que resuelve «el
  artificiero» de verdad, ya está medio arquitecturado (`ContentRef` admite `CAMPAIGN`), y es lo
  que hizo Fight Club 5e para sobrevivir a su cese y desistimiento.
- **(b) A5ESRD** (Level Up, CC BY 4.0): 13 clases, 44 arquetipos, y un artificiero propio. Es un
  **sistema paralelo**, no se mezcla con el 5.1 en un mismo personaje.
- **(c) SRD 5.2**: goliat y orco, 3 trasfondos, 16 dotes. **Cero clases nuevas.** Cuesta un
  segundo catálogo y un cambio de esquema por dos especies.

**Recomendación: (a) primero, (b) después si se quiere volumen, (c) solo cuando se quieran las
reglas de 2024.** Y aparte, barato y sin decisión: adoptar la **traducción oficial al español**
del SRD, que existe y estamos traduciendo a mano.

### D2 · Editor de documentos (bloquea E1–E3)

Adoptar **TipTap** manteniendo **Markdown como formato almacenado** es la única versión reversible
de esta decisión: si el editor se pudre o cambia de licencia, quedan los ficheros. Guardar el JSON
propio del editor es el camino de Notion, cuya exportación está documentada como rota.

**Lo que hay que aceptar antes de empezar:** una prueba de ida y vuelta (`MD → editor → MD`) sobre
el contenido real, **con diff vacío como criterio**. Si el diff no es vacío, ese diff es la pérdida
futura, medida en vez de supuesta.

### D3 · Alcance de la línea de tiempo (bloquea T2)

La investigación recomienda la propuesta intermedia: grafo con el tiempo como eje, **generado
desde el log y las sesiones que ya existen**, y lo único que el DM escribe a mano es **el camino
que no se tomó** — que es lo único que el sistema no puede deducir. Falta decir si eso basta o se
quiere también la cronología del mundo (fecha ficticia por suceso), que es **dato que alguien
teclea, sesión a sesión, para siempre**, y la trampa nº 1 documentada de estas herramientas.

---

## 2 · Las tareas

Cada tarea lleva **su frontera de ficheros**, que es lo que permite repartirlas sin que se pisen.
La regla que ya funcionó hoy: **el orquestador escribe migraciones, contratos compartidos y
cableado; los agentes trabajan dentro de su carpeta.**

### Bloque H — la hoja de personaje *(el encargo original nº 2)*

| # | Tarea | Frontera | Depende |
|---|---|---|---|
| **H1** | **Edición en el sitio.** Los dos botones de «Editar» desaparecen. Números y desplegables se guardan al salir del campo o al elegir; el texto libre, con botón pegado. Error en línea conservando lo tecleado. Lo derivado **no** lleva afordancia, y esa ausencia significa «edita su causa» | `features/character-sheet/EdicionEnSitio.tsx` *(ya escrito)*, `EditorFicha.tsx` *(se borra)*, `HojaCalculada.tsx` | — |
| **H2** | **La fórmula de una línea**, siempre visible bajo cada valor derivado: «10 + 2 Destreza». Sale de la misma traza, así que no puede discrepar. Y el chevron `▾`/`▸` pasa a SVG dibujado, que hoy incumple la regla de iconos | `features/character-sheet/Traza.tsx` | — |
| **H3** | **Cabecera fija + dos columnas.** CA / Iniciativa / Velocidad / PG / competencia arriba, siempre visibles al desplazar. Izquierda: características → salvaciones → habilidades, **en ese orden y sin tocar**, porque la contigüidad *es* la explicación. Derecha: lo accionable. **Hueco reservado para el inventario de 2B** | `features/character-sheet/HojaCalculada.tsx` | H1, H2 |
| **H4** | **La hoja en vitela.** Cabecera en cromado (se opera), cuerpo en vitela (se lee). La misma línea separa las dos pieles, los dos patrones de guardado y las dos formas de usar la hoja | `features/character-sheet/*.tsx`, `ui/tokens.css` | H3 |
| **H5** | **Cada paso de la traza enlaza a su causa editable.** «+2 por Destreza» lleva el foco a la casilla de Destreza. La traza deja de ser solo explicación y pasa a ser la navegación de la edición | `features/character-sheet/Traza.tsx`, `HojaCalculada.tsx` | H3 |
| **H6** | **Un solo camino de edición.** Hoy hay dos: `EditorFicha` (características) y `CharacterEditor` (nombre, bio, visibilidad). El segundo se absorbe en la hoja | `pages/CharacterDetailPage.tsx`, `features/characters/CharacterEditor.tsx` | H1 |

**Criterio de aceptación del bloque:** ningún botón «Editar» en la hoja; cada valor derivado con
su fórmula visible y su traza desplegable; **una prueba de navegador que mida el contraste de la
vitela en los dos temas**, porque `jsdom` no maqueta.

### Bloque R — el editor de reglas *(el encargo original nº 3)*

| # | Tarea | Frontera | Depende |
|---|---|---|---|
| **R1** | **Cajas en carriles.** Se arrastra desde una paleta a tres ranuras fijas (CUANDO / SI / ENTONCES). Sin cables y sin posición libre: la ranura **es** la conexión, así que el «error invisible» —una caja que parece conectada y no lo está— no puede existir. Forma y color distintos por parte, que es la lección de Blockly | `features/rules/**` | — |
| **R2** | **Los avisos que la literatura pide.** Con nuestro vocabulario cerrado se pueden detectar tres de los diez fallos documentados: *reversión ausente* («nadie deshace esta marca»), *conflicto de prioridad* (dos reglas sobre lo mismo, y en qué orden) y *bucle*. Marcar la regla y **proponer el arreglo** | `features/rules/**`, y el detector en `apps/api/src/rules-engine/` | R1 |
| **R3** | **El tutorial.** Nada de tour de bienvenida: no se recuerdan y se saltan. Burbujas contextuales **que no se pueden cerrar y se cierran solas al hacer la acción** — el único patrón que le funcionó a Blockly tras tres intentos fallidos. Y **plantillas clonables** en el estado vacío, porque el análisis de 224 590 reglas de IFTTT dice que la gente duplica las de otros | `features/rules/**` | R1 |
| **R4** | **Distinguir suceso de estado en la propia caja.** Es el malentendido nº 1 medido: la gente no separa «ocurrió algo» de «algo es verdad» | `features/rules/**`, `packages/shared/src/rules-engine.schema.ts` | R1 |

### Bloque T — la línea de tiempo

| # | Tarea | Frontera | Depende |
|---|---|---|---|
| **T1** | **Prototipo tirable** con Mermaid `gitGraph` de la campaña real, para enseñar la forma antes de gastar semanas. Una tarde | `apps/web/src/pages/` (una ruta temporal) | — |
| **T2** ⛔ | **El grafo de campaña.** React Flow + dagre. Se genera solo: espina dorsal desde las sesiones, círculos desde las misiones, bifurcaciones desde los sellos «Decisión». El DM solo escribe **el camino no tomado**. Re-colocar es **un botón**, nunca un efecto; lo que el humano mueve queda anclado; la anotación se guarda **por identificador, jamás por coordenadas** | `features/timeline/**` (nuevo), migración del orquestador | D3, T1 |

### Bloque L — los enlaces

| # | Tarea | Frontera | Depende |
|---|---|---|---|
| **L1** | **Retroenlaces.** Hoy `listFor` filtra solo por `fromId`: si Corvin «vive en» la Torre, al abrir la Torre **Corvin no aparece**. En un wiki el retroenlace es el 80 % del valor | `apps/api/src/links/`, `features/links/` | — |
| **L2** | **El enlace lleva a alguna parte.** `LinksPanel` pinta el destino como texto plano: no hay ni un enlace real en el panel de enlaces | `features/links/LinksPanel.tsx` | L1 |
| **L3** | **Etiquetas de relación con sentido**, sugeridas por tipo, en vez de texto libre siempre | `features/links/`, `features/entities/plantillas.ts` | L1 |

### Bloque E — documentos y cuaderno del DM

| # | Tarea | Frontera | Depende |
|---|---|---|---|
| **E0** ✅ | **La prueba de ida y vuelta.** `MD → TipTap → MD` sobre el contenido real, diff vacío como criterio. **Hecha: veredicto abajo.** | `scripts/` | D2 |
| **E1** ⛔ | **El editor enriquecido**, con la barra **fuera del papel**, en la piel oscura. Markdown sigue siendo el formato almacenado | `features/entities/`, `ui/` | E0 |
| **E2** ⛔ | **Bloque secreto** (`:::dm`). Y la parte que no es de interfaz: **el servidor lo borra del documento antes de enviarlo**. Ocultar un bloque no es control de acceso, igual que esconder un botón no lo es | `apps/api/src/entities/`, `packages/shared/` | E1 |
| **E3** ⛔ | **Dibujo incrustado** con Excalidraw (MIT; tldraw dejó de ser abierto en 2025 y exige licencia comercial). Patrón de Obsidian: **escena JSON editable + SVG sincronizado**, dos artefactos, para que el dibujo siga significando algo si el editor desaparece | `features/entities/`, almacenamiento | E1 |

**Veredicto de E0 (2026-09-02) — sí, con condiciones.** `scripts/e0-tiptap-roundtrip.mjs`
somete 28 casos al viaje `MD → TipTap → MD`, incluidas las plantillas reales de
`plantillas.ts` y el bloque secreto `:::dm`. Con las extensiones puestas
(`node scripts/e0-tiptap-roundtrip.mjs --completo`): **0 casos pierden palabras y 0
revientan**; los que difieren lo hacen normalizando (`*` → `-`, `_x_` → `*x*`, la
contrabarra de salto duro → dos espacios), y **todos son estables**, es decir, el segundo
viaje ya no cambia nada. Una normalización estable es aceptable; una que siga moviéndose
en cada guardado no lo sería, y por eso el script comprueba las dos vueltas y no una.

**La condición, y es la que muerde:** sin registrar `TableKit`, `Image`, `TaskList` y
`TaskItem`, TipTap **se come tablas, imágenes y listas de tareas en silencio** — sin error,
sin aviso: el Markdown entra con la tabla y sale sin ella. Corriendo el script sin
`--completo`, que es el `StarterKit` pelado, salen **4 casos con pérdida de palabras**,
entre ellos el documento largo del DM. Por eso E1 no puede montar el editor con la
configuración por defecto, y por eso el script se queda en el repositorio: es la prueba
que hay que volver a pasar el día que alguien toque las extensiones.

Las dependencias de TipTap entran como **`devDependencies`** porque hoy su único
consumidor es este script. **E1 tendrá que moverlas a `dependencies`** al importarlas
desde `src/`, o el paquete instalado en producción no las traerá.

### Bloque C — contenido

| # | Tarea | Frontera | Depende |
|---|---|---|---|
| **C0** | **Traducción oficial al español del SRD.** Existe, es CC BY, y la estamos escribiendo a mano. Barato y sin decisión que tomar | `apps/api/src/rules/catalog/` | — |
| **C1** ⛔ | **Procedencia como dato de primera clase.** `ContentRef` distingue `SRD` de `CAMPAIGN` pero no **qué** SRD. Ampliarlo **antes** de meter un segundo cuerpo de contenido: ahora es un campo, después es una migración | `packages/shared/`, `apps/api/src/rules/` | D1 |
| **C2** ⛔ | **Editor de contenido por campaña.** Razas, subrazas, clases y subclases propias. Privadas por defecto, con garantía del usuario en los términos y procedimiento de retirada | `apps/api/src/rules/`, `features/`, migración | C1 |
| **C3** ⛔ | Importar A5ESRD como **sistema paralelo declarado**, si se elige (b) | `apps/api/src/rules/catalog/` | C1, D1 |

### Bloque Q — calidad de vida y cierre

| # | Tarea | Frontera |
|---|---|---|
| **Q1** | Los seis glifos de fuente que incumplen la regla de iconos, incluido el `✓` que la propia regla pone como ejemplo prohibido | `ui/`, `features/` |
| **Q2** | Los errores de Zod salen crudos al usuario (`fieldErrors {"kind":["Required"]}`, «Required» en inglés) | `apps/api/src/common/` |
| **Q3** | La invitación es de un solo uso y no se pueden listar ni revocar: el DM emite códigos a ciegas | `apps/api/src/invites/`, `features/invites/` |
| **Q4** | `ENTITY_REVEALED` viaja con la carga vacía: no dice qué se reveló ni a qué visibilidad, y es el momento dramático de la campaña | `apps/api/src/rules-engine/` |
| **Q5** | La anulación del DM se ve como «+6» sin el motivo que escribió | `features/character-sheet/Traza.tsx` |
| **Q6** | La muerte no deja evento propio: hay que deducirla de un cambio de PG | `packages/shared/`, `apps/api/src/characters/` |
| **Q7** | La CA admite hasta 999 y el modificador de tirada no tiene tope | `packages/shared/` |
| **AUD** | **Auditoría e2e final**, que pide el autor para cerrar | todo |

---

## 3 · El orden, y qué puede ir en paralelo

**Tanda 1 — la hoja** *(el encargo original que quedó a medias)*
H1 → H2 → H3 → H4 → H5 → H6. **Casi todo en serie**: es un solo fichero grande con seis cambios
encadenados, y repartirlo entre agentes costaría más conflictos que tiempo ahorra. **La hago yo.**
En paralelo, sin tocarse:
- Un agente en **L1–L3** (enlaces): `apps/api/src/links/` + `features/links/`.
- Un agente en **Q1 + Q2** (iconos y errores de Zod): `ui/` + `apps/api/src/common/`.

**Tanda 2 — reglas y tiempo**
- Un agente en **R1 + R3 + R4** (el editor de cajas y su tutorial): `features/rules/`.
- Un agente en **T1** (prototipo Mermaid), y **T2** después de que el autor decida D3.
- Yo: **R2**, porque el detector de fallos vive en `apps/api/src/rules-engine/` y ahí no quiero a
  nadie más a la vez.

**Tanda 3 — contenido y documentos**, las dos bloqueadas por decisión del autor.
- **C0** se puede hacer ya, sin decisión.
- **E0** se puede hacer ya: es una prueba, y su resultado es lo que decide si E1 se hace.

**Al final: AUD.**

---

## 4 · Reglas de esta ronda

Las de siempre, más dos que salieron de lo que ha ido pasando hoy:

- **Ningún valor de enumeración llega a la pantalla**, y una clave sin traducir se ve como
  «Sin traducir: X», nunca en silencio.
- **Los iconos se dibujan.** La excepción declarada son los cinco glifos de `ui/Badge.tsx` y
  ninguno más — hoy hay seis que la incumplen (Q1), incluido el `✓` que la regla nombra.
- **Lo que solo se ve maquetado se mide en el navegador.** Y con el fondo real: medir contra
  `document.body` da negro contra negro y deja pasar cualquier cosa. Pasó hoy.
- **Mutación obligatoria por mecanismo.** Si no se pone roja, la prueba no vale — y tres veces hoy
  una mutación destapó una prueba que pasaba por el motivo equivocado.
- **Un commit por tarea**, con la documentación en el mismo commit.
- **Nada de `--no-verify`.** Me lo salté dos veces hoy y no vuelve a pasar.
