# Desbordes — lo que se dibuja fuera de donde cabe

> Escrito el 2026-09-13 por el controlador con el autor, tras reproducir en producción (`6d2b2ca`,
> con la sesión del DM) que **elegir objetivo al atacar funciona y no se ve**. Pedido del autor,
> literal: «hay muchos otros desplegables con los que le pasa», «pido auditoría de todos los
> lugares donde pase y solo pruebas gráficas y verify, nada de todo completo». **Proceso: D-CF-65**
> (es una tanda de arreglos antes del paso 3), con la salvedad de abajo.
>
> Lo que dice «hoy» se comprobó en el navegador contra producción y abriendo los ficheros sobre
> `main` (`27304e1`).

---

## 1 · Qué se pide, en una frase

Que **nada que se despliega o se explica se dibuje fuera de su sitio**: un panel flotante se ve
entero por encima de lo que lo rodea, y un texto cabe en su casilla o la casilla crece — en toda la
aplicación, no solo donde el autor lo ha visto — y **una sola prueba de navegador** que lo mida en
todas partes para que no vuelva a pasar con el siguiente desplegable.

## 2 · Lo que hay hoy, medido

### 2.1 · El caso reproducido: elegir objetivo al atacar

Hoja del Bandido (PNJ del DM) → pestaña Ataques → icono de tirada del arma → «Atacar», con la
sesión `IN_PROGRESS` y el encuentro `ACTIVE` (4 combatientes):

| Medida | Valor |
|---|---|
| `aria-expanded` del botón «Atacar» | pasa de `false` a `true` → el botón **sí** sabe que hay combate |
| Lista `[aria-label^="Objetivo del ataque"]` | **existe**, con tres opciones: `[demo] Brann · Aliado`, `[demo] Sylas · Aliado`, `[demo] Klarg · Enemigo` |
| Envoltorio de la tabla (`AtaquesYLanzamiento.tsx:192`, `overflow-x-auto`) | `overflow: auto/auto`, **68 px de alto de cliente**, `scrollHeight` 803 |
| Panel del ataque (`TirarAtaqueBoton.tsx:286`, `absolute … z-30`) | 740 px de alto, **dentro** de ese envoltorio; al abrirse, el envoltorio hace scroll interno (`scrollTop` 733) y por la casilla asoma solo el final («Tirar daño») |
| `document.elementFromPoint` sobre la lista | **no** devuelve la lista: está tapada/recortada |

Conclusión: **ni servidor ni lógica de combate fallan**. Falla que un contenedor con `overflow`
distinto de `visible` recorta a sus hijos posicionados en absoluto — en las dos direcciones,
aunque solo se pidiera recorte horizontal. `jsdom` no maqueta, por eso 1 601 unitarias en verde no
lo vieron; es la misma lección del borde partido (`04-convenciones.md`, reglas de interfaz).

### 2.2 · El segundo caso, visto por el autor

Casillas de valores derivados de la cabecera de la hoja (CA / INIC. / VEL. / PG / COMP.): la traza
desplegada («BASE Clase de Armadura del manual») **envuelve fuera del borde** de la casilla, que
tiene ancho fijo. Es la otra mitad del mismo problema: texto que no cabe en una caja que no crece.

### 2.3 · Inventario de sospechosos (grep, 2026-09-13; NO es la auditoría, es su punto de partida)

Contenedores que recortan (`overflow-(x-)?(auto|hidden|scroll)`, 18 usos en 13 ficheros):
`AuthLayout`, `CampaignOverview`, `ArchivoDePersonajes`, `AtaquesYLanzamiento`, `TiraDeIniciativa`,
`PanelCarga`, `BandejaDeAvisos`, `CabeceraDeEscena`, `elenco/FichaDeElenco`, `MesaDeSesion`,
`taller/mundo/DetalleDeFicha`, `CampaignDetailPage`, `ui/Ornament`.

Paneles posicionados en absoluto con `z-` (4 ficheros): `TirarAtaqueBoton`, `rolls/PanelDeTirada`,
`taller/mundo/AnilloDeVecinos`, `ui/Dialog`. **No hay ningún `createPortal` en la web.** Y el
menú «…» del elenco, el selector de audiencia, los `<details>` de traza y los `<select>` nativos
también son desplegables: entran en la auditoría aunque el grep no los liste.

## 3 · Lo que se decide aquí

1. **Un solo componente de panel flotante** (`ui/PanelFlotante` o el nombre que encaje con `ui/`),
   que se monta en un **portal al `body`** (o `position: fixed`) con la posición calculada desde el
   rectángulo del disparador, con `role`, `aria-expanded`, `Escape`, clic fuera y devolución del
   foco — lo que `TirarAtaqueBoton` ya hace a mano, una sola vez. **Todo desplegable propio lo
   usa.** Un `absolute` dentro de un `overflow-*` deja de ser una opción: si la auditoría encuentra
   uno, se migra.
2. **Un texto que no cabe hace crecer su caja o envuelve dentro, nunca se sale.** Para las casillas
   de la cabecera: ancho mínimo por contenido o la traza como bloque debajo, pero dentro del borde.
   Decide el implementador con la regla; no se mide a ojo.
3. **La comprobación es UNA prueba de navegador genérica**, `apps/web/e2e/desbordes.spec.ts`: recorre
   las pantallas principales, abre cada desplegable que encuentre y afirma que **ningún elemento
   visible se sale del rectángulo de su ancestro recortador más cercano ni de la ventana**
   (`boundingBox` frente al `boundingBox` del primer ancestro con `overflow` ≠ `visible`, y
   `scrollWidth`/`scrollHeight` de ese ancestro frente a su cliente cuando el desplegable está
   abierto). Los `<select>` nativos quedan fuera (los pinta el sistema). Con `test.fail()` fijando
   cada caso conocido hasta que se arregle, como ya hace `mesa-en-estrecho`.
4. **Proceso (salvedad a D-CF-65, pedida por el autor):** las tareas de esta tanda **no escriben
   unitarias ni mutación** — un desborde no se puede probar sin maquetar—; cada tarea cierra con
   `pnpm verify` limpio (las unitarias existentes siguen pasando) y con **la prueba gráfica**
   (`desbordes.spec.ts` sobre las pantallas que tocó) en verde. El cierre de la tanda es el de
   D-CF-65 sin la revisión Opus de rama entera: la suite Playwright entera una vez, y una revisión
   acotada al componente nuevo y a los dos ficheros más tocados. Se declara como enmienda de
   D-CF-65 en `decisiones.md` y `04-convenciones.md`, en el primer commit.

## 4 · Las tareas

| # | Qué | Cierra |
|---|---|---|
| 0 | **Auditoría**: abrir en el navegador (Playwright, con la semilla demo) cada pantalla y cada desplegable, anotar en el ledger **una línea por desborde** con fichero:línea, ancestro que recorta y medida (px fuera). Sale la lista real, no el grep de §2.3. **No arregla nada.** | La lista que gobierna las tareas 2–3 |
| 1 | `desbordes.spec.ts` genérica (§3.3), con `test.fail()` por cada línea de la tarea 0 | Roja donde toca, verde en el resto |
| 2 | `ui/PanelFlotante` + migrar `TirarAtaqueBoton` (elegir objetivo se ve) y el resto de paneles de la lista | Los `test.fail()` de paneles pasan a verde |
| 3 | Casillas de cabecera y cualquier otro texto que se sale (lista de la tarea 0) | Los `test.fail()` de texto pasan a verde |
| 4 | Cierre: suite Playwright entera una vez, revisión acotada, docs (08-pruebas: la prueba nueva y qué cubre; 06: nada abierto o lo que quede con su medida; 07: una línea) | Rama lista para que el autor decida la fusión |

Tamaño: 2–4 horas de agente. Si la tarea 0 encuentra más de ~10 desbordes de texto, la 3 se parte
por pantalla; los de panel los resuelve la 2 de golpe por construcción.

## 5 · Lo que NO hace

- No toca lógica de combate, objetivos, audiencia ni servidor: **todo eso funciona** (§2.1).
- No rediseña ningún panel: mismo contenido, mismo sitio visual, solo que ahora se ve entero.
- No añade zoom al `iframe` del tablero (pedido aparte del autor, se decide después de probar
  CozyVTT) ni la inyección de estilos en el tablero (vive en el servidor, no en este repo).
- No hace la mesa a 390 px (ficha propia con `test.fail()` en `mesa-en-estrecho`).

## 6 · Orden

Después de **reglas de la mesa** (en cierre el 2026-09-13) y **antes de puerta de efectos**: es
corta, cierra un defecto que el DM ve cada vez que ataca con un PNJ, y su prueba genérica protege
a las dos tandas siguientes.
