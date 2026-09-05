# Plan 05 · El color de cada personaje (decisión D3)

**Objetivo en una frase:** que cada personaje tenga **su** color, elegido por su jugador, y que ese
mismo color sirva para la voz en el hilo y para el retrato en el elenco.

**Tamaño:** una migración y dos commits (servidor, luego web). **Dependencias:** ninguna, pero
**toca `packages/shared`**, así que **no corre en paralelo** con el plan 03.

**Decisión del autor:** *«esto es importante y es diferenciador… o sea aleatorio a algo de la paleta
o lo escoja el jugador»*, delegando la elección. **Elegido: lo escoge el jugador, con un valor por
defecto ya puesto.**

---

## Por qué esto arregla dos fichas con un campo

Son el mismo problema con el mismo arreglo:

- **C1-2 · el color de voz colisiona.** Hoy `colorDeVoz(id)` (`hilo/tipo-de-mensaje.ts:124`) es una
  huella del `actorUserId` sobre **cuatro** tonos. Con cinco personas, dos comparten color y **nadie
  puede arreglarlo**.
- **C2-8 · el retrato es cobre para todos**, porque `p.retrato` **no existe en el modelo**.

**Y está medido que con tokens no se arregla:** el inventario de tinta legible da **cinco** voces
como techo físico (`--text`, `--copper-text`, `--accent-text`, `--danger-text`, `--warning-text`) y
**cuatro** como techo defendible — gastar `--warning-text` como voz **quema el ámbar de «cuidado»**.
`--muted` está reservado a «esto está apagado». Así que el arreglo **no es una paleta más grande: es
un dato**.

## La decisión, y por qué no aleatorio puro

**Aleatorio significa que dos personajes pueden salir iguales y nadie puede arreglarlo**, que es
exactamente la queja de origen. Con elección, el choque **se resuelve en un clic**.

- **Por defecto: determinista a partir del `id` del personaje.** El mismo personaje, el mismo color,
  siempre — entre recargas, navegadores y personas. Nadie tiene que elegir para empezar a jugar.
- **Lo cambia su jugador** desde la hoja. **Y el DM puede cambiar el de cualquiera de su mesa** — es
  quien ve el conjunto y quien nota el choque.

## El modelo

`Character.color String?` — **nulable a propósito**: `null` significa «no lo he elegido, dame el por
defecto». Un valor escrito significa «lo elegí yo», y **eso no se pisa nunca** con un recálculo.

**Vocabulario cerrado, no un hexadecimal.** El campo guarda una **clave** de una lista corta
(`copper`, `accent`, `danger`, `sage`, `plum`…), no `#c07d46`. Tres motivos:
1. **Los temas.** El mismo color tiene que verse bien en Oscuro, Claro y Lectura; un hexadecimal
   fijado por un jugador en oscuro será ilegible en el pliego de vitela.
2. **Contraste.** Una clave se puede medir una vez; un hexadecimal libre no.
3. **Es la regla del proyecto**: ningún valor de enumeración llega a la pantalla, y su forma legible
   se escribe una vez por dominio.

**Hay que ampliar la paleta de voces**, y ahí sí hace falta trabajo de tokens: hoy hay cuatro
defendibles. Se añaden tokens de voz **nuevos y solo para esto** —no se reutilizan los que ya
significan otra cosa—, medidos en los tres temas. **Ocho es un buen techo**: más de ocho voces en una
mesa no se distinguen aunque el token exista.

## Pasos

**Servidor (commit 1)**
1. `Character.color String?` + migración. Sin valor por defecto en la base: el defecto es del
   cálculo, no de la columna.
2. Vocabulario de colores en `packages/shared` —la lista cerrada y su nombre legible en español— y
   validación en el esquema de actualización del personaje: **solo claves de la lista**.
3. Autorización: **el dueño del personaje o el DM**. Ni el resto de jugadores, ni un miembro
   cualquiera. Se comprueba en el servidor.
4. El color viaja en lo que ya devuelve al personaje; **no hagas un endpoint nuevo**.

**Web (commit 2)**
5. Tokens de voz nuevos en `tokens.css`, con sus contrastes **medidos en los tres temas** y anotados
   en el propio fichero, como ya se hizo con `--warning`.
6. `colorDeVoz` cambia de firma: recibe **el personaje**, no el `actorUserId`. Si tiene `color`, ese;
   si no, la huella **del id del personaje** sobre la lista nueva.
7. **El retrato del elenco usa la misma función.** Un solo sitio decide el color de alguien.
8. Selector en la hoja: los colores como **muestras pulsables con su nombre**, no un desplegable de
   claves. Y **marca cuál está en uso por otro personaje de la mesa** —no lo prohíbas: avisa—.

## Pruebas

**Servidor:** un jugador cambia el color de **su** personaje ✅ · el de otro ❌ (403) · el DM cambia
el de cualquiera de su campaña ✅ · una clave fuera de la lista ❌ (400).

**Web:** un personaje con `color` pinta ese · sin `color`, el determinista · **dos llamadas seguidas
para el mismo personaje dan el mismo color** (es lo que hace útil el defecto) · el retrato y la voz
del mismo personaje **son el mismo color** — esta es la prueba que impide que se separen otra vez.

**Contraste:** los tokens nuevos entran en `tokens-contrast.spec.ts`, que ya mide los existentes.
**Ninguna voz nueva se acepta sin su medición.**

**Mutación:** haz que el defecto ignore el `color` guardado y comprueba que **la prueba del color
elegido se pone roja**. Es el fallo que de verdad duele: elegir y que no se respete.

## Guía de revisión

- [ ] El campo es **nulable** y `null` significa «dame el por defecto», no «negro».
- [ ] Se guarda una **clave**, nunca un hexadecimal.
- [ ] La autorización se comprueba **en el servidor**: esconder el selector no es control de acceso.
- [ ] `colorDeVoz` tiene **un solo consumidor de la lógica**: la voz y el retrato llaman al mismo.
- [ ] Ningún token de voz reutiliza `--warning-text` ni `--muted`.
- [ ] Los tokens nuevos tienen su contraste **medido y escrito**, en los tres temas.
- [ ] El selector **avisa** de un color ya usado y **no lo prohíbe**.
- [ ] El por defecto es estable: mismo personaje, mismo color, en dos sesiones distintas.

## Trampas

- **La huella tiene que ser del `id` del PERSONAJE, no del usuario.** Hoy es del `actorUserId`, y por
  eso los dos personajes de un mismo jugador salen iguales.
- **Cambiar la lista de colores cambia todos los defectos.** Quien no haya elegido verá otro color el
  día que añadas uno. Es aceptable **una vez**; después, la lista se congela. Dilo en el commit.
- **El tema de Lectura es papel.** Un color que canta sobre pizarra puede desaparecer sobre vitela:
  mídelo ahí también, no solo en oscuro.
- **No pongas el color en `CampaignMember`.** El dato es del personaje: un jugador con dos personajes
  quiere dos voces.

## Commits

```
feat(api): a character owns its colour, and only its player or the DM may change it
feat(web): the thread and the cast read one colour per character, chosen not guessed
```

## Definición de terminado

`pnpm verify` verde, contraste medido y anotado, la mutación probada, **una captura de la mesa con
tres personajes de tres colores** para el autor, y D3 anotada como aplicada en el maestro.


---

## Avance — lo escribe quien ejecuta este plan

> **Obligatorio, y se escribe MIENTRAS se trabaja, no al final.** Si la sesión se queda sin contexto
> o muere, **esto y el prompt de arranque son lo único que sabe la siguiente**. Una línea por paso,
> con su commit. Nada de memoria: `fichero:línea` o no cuenta.

| Estado | Cuándo | Qué |
|---|---|---|
| ✅ hecho | 2026-09-06 | **Servidor (pasos 1-4).** Columna `Character.color String?` (`apps/api/prisma/schema.prisma:502`) con migración `apps/api/prisma/migrations/20260906020000_character_color/`. Lista cerrada `CHARACTER_COLORS` + `characterColorSchema` en `packages/shared/src/character.schema.ts:20`, colgada de `createCharacterSchema` como `.nullable().optional()`. Escritura en `apps/api/src/characters/characters.service.ts:121`. Documentado en `docs/05-datos.md`. **Commit `1aba8b2`** |
| ✅ hecho | 2026-09-06 | **Web (pasos 5-8).** Cuatro tokens de voz nuevos en `apps/web/src/ui/tokens.css:56` (en los **cinco** bloques de tema) y en `apps/web/tailwind.config.js:45`. Función única `vozDePersonaje` en `apps/web/src/dominio/voces.ts`; `colorDeVoz` **borrado** de `apps/web/src/features/sessions/hilo/tipo-de-mensaje.ts:99`. La voz la pinta `hilo/MensajeDelHilo.tsx:196` y el retrato `elenco/FichaDeElenco.tsx:333`, los dos con la misma función. Selector nuevo en `apps/web/src/features/characters/SelectorDeColor.tsx`, montado en `AjustesDePersonaje.tsx:139`. **Commit `14bbd44`** |
| ✅ hecho | 2026-09-06 | **Las 24 mediciones, en el navegador.** `apps/web/e2e/tokens-contrast.spec.ts:241` mide las ocho voces sobre `--bg` y sobre `--surface` en los tres temas. Peor caso **4.85:1** (cobre sobre fondo claro) contra 4.5 exigido; las cuatro nuevas van de 5.78 a 10.02. Los números están anotados en `tokens.css` y coinciden con la salida. |
| ✅ hecho | 2026-09-06 | **Mutación probada.** Con el defecto ignorando el `color` guardado, `apps/web/src/dominio/__tests__/voces.test.ts` da 2 rojas: «lo elegido manda» (`expected 'arena' to be 'tinta'`) y «el retrato y la voz son el mismo color». Restaurado, 7/7 verdes. |
| ✅ | 2026-09-06 | **EL PLAN 05 ESTÁ CERRADO.** D3 anotada como aplicada en `docs/decisiones.md:140`. Captura para el autor en `apps/web/e2e-resultados/mesa-tres-colores.png`, mirada: Sivrin arena, Bran salvia, Elara ciruela. |

**Leyenda:** ⬜ sin empezar · 🟨 en marcha · ✅ hecho · ⛔ bloqueado (di por qué y qué descartaste).

**Lo que decidí por los cuatro pasos** (qué no cuadraba · qué elegí · por qué es duradero · la
fuente si la hubo):

- **La lista cerrada va en `shared`; el nombre legible NO.** El plan pedía las dos cosas en
  `packages/shared`, y eso choca con lo que el plan 07 acababa de declarar: `shared` dice **qué
  forma tienen los datos**, y el español de pantalla vive en `apps/web/src/dominio/`
  (`docs/01-arquitectura.md`). Se parte en dos: la enumeración en
  `packages/shared/src/character.schema.ts`, los rótulos en `apps/web/src/dominio/`. **Manda la
  convención escrita, no la línea del plan** — y queda dicho aquí para que no parezca un descuido.
- **Las ocho claves son palabras españolas** (`tinta`, `cobre`, `senal`, `brasa`, `salvia`,
  `ciruela`, `indigo`, `arena`), no los nombres de los tokens (`accent`, `danger`…). Un jugador
  elige «brasa», no «danger»; y atar la clave guardada al nombre de un token de la interfaz haría
  que renombrar un token corrompiera datos ya escritos. `senal` e `indigo` van sin tilde **porque
  son claves**, no texto.
- **`!== undefined`, no *truthy*.** Con `if (input.color)` nadie podría volver al color de por
  defecto: `null` es un valor legítimo y distinto de ausente. **Es la mutación que se probó** — con
  el *truthy* puesto, el e2e de «deshacer la elección» se pone rojo.
- **Sin endpoint nuevo, y la autorización sale gratis.** `requireEditable` ya es «dueño o DM», que
  es exactamente la regla que pedía el plan. Un endpoint aparte habría sido una segunda puerta a la
  que mantener la misma matriz.

- **Las ocho claves no bastan: el hilo no sabe quién habla.** El registro guarda el **usuario** que
  actuó, no el personaje, así que «colorear por el personaje» no era un cambio de firma, era una
  resolución. Está escrita en `HiloDeSesion.tsx:114-146` con tres reglas: (1) si el suceso es
  **sobre** un personaje, ese; (2) si no, y el actor lleva **un solo** personaje vivo, ese; (3) si
  lleva dos o más, **ninguno** y la huella cae sobre su `actorUserId`. Elegir por él pintaría a un
  personaje con el color de su hermano, que es peor que un color sin dueño. Los archivados cuentan
  para (1) —un suceso viejo sigue siendo suyo— y no para (2).
- **`colorDeVoz` se borra, no se deja como envoltorio.** Una función que siga aceptando un `id`
  suelto permite volver a colorear por el usuario sin que nadie lo note. En su sitio queda un
  comentario que dice adónde se fue y por qué.
- **El retrato del elenco pierde su borde de cobre fijo** y pasa a `border-current`, que es el color
  del personaje. Era la otra mitad del mismo defecto —el borde también decía «cobre para todos»— y
  dejarlo habría dado un retrato con dos colores.
- **Lo que se cuenta como «color en uso» incluye los de por defecto.** Un choque se ve igual de feo
  lo haya elegido alguien o le haya tocado, así que el aviso mira `colorDePersonaje` y no
  `character.color`. Los archivados no cuentan: no están en la mesa.
- **Una clave que ya no existe cae al defecto en vez de romper.** Es dato viejo de una lista
  anterior, no un error; sigue habiendo un color y sigue siendo suyo. Con prueba.
- **`CharacterRow` también declara `color`.** El servidor ya mandaba la fila entera; sin declararlo,
  la hoja no podía pasar el personaje a `vozDePersonaje` sin inventarse el campo. Es el mismo
  descuido que tuvo `archivedAt` hasta el plan 06 — el campo viajaba y el tipo lo callaba.

**Lo siguiente exacto, si me quedo aquí:**

- ~~Cuatro tokens de voz **nuevos**~~ en `apps/web/src/ui/tokens.css` (salvia, ciruela, índigo, arena),
  en los **tres** bloques de tema, y sus contrastes medidos en `apps/web/e2e/tokens-contrast.spec.ts`.
  ~~Las otras cuatro voces reutilizan `--text`, `--copper-text`, `--accent-text` y `--danger-text`.~~
- ~~Después: `colorDeVoz` pasa a recibir el personaje, el retrato del elenco llama a la misma
  función, y el selector de muestras en la hoja que **avisa** —no prohíbe— de un color ya usado.~~
- **Todo hecho. Nada pendiente en este plan.** Lo siguiente es el plan 08.
