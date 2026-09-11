# La hoja a página completa — pestañas laterales, columnas y detalle de objeto

> Escrito el 2026-09-11 con el autor, en cinco preguntas y un enfoque elegido. **Adapta** la spec
> [la hoja en la mesa](./2026-09-06-la-hoja-en-la-mesa-design.md) (Divinity: retrato, pestañas,
> lista de objetos con acciones) a la hoja **fuera de la mesa**: la de `CharacterDetailPage`, que
> tiene ancho de sobra y se abre más para leer que para pegar. Las dos specs se implementan
> **juntas y con un solo componente** — es la decisión del enfoque (§3).
>
> Lo que dice «hoy» se comprobó abriendo los ficheros el 2026-09-11 sobre la rama
> `ficha/tanda-2-a-5` (`2fb8eae`). Los nombres de fichero y línea son de ese momento.

---

## 1 · Qué se pide, en una frase

Que la hoja a página completa **sea más completa que la de la mesa y ocupe bien el ancho, sin ser
molesta ni difícil de leer**: cabecera fija con lo que cambia el turno, pestañas laterales, y cada
pestaña repartida en columnas en vez de una lista larga de tarjetas.

**Lo que dijo el autor, literal, y decide el reparto:** «ataques es para ver el detalle de estos,
porque la idea es que los ataques se vean en la mesa junto al personaje, así como acciones y
demás; de hecho esto es lo que hace actualmente». La hoja no compite con la mesa: **la mesa pega,
la hoja explica.**

## 2 · Lo que hay hoy

| Pieza | Estado real |
|---|---|
| **La hoja** | `features/character-sheet/HojaCalculada.tsx` (469 líneas): una columna de ~20 `TarjetaDeHoja` en rejilla `lg:grid-cols-2` (y `-3` abajo). Se hace scroll y se busca |
| **Dónde se monta** | `pages/CharacterDetailPage.tsx:144` (página, `puedeEditar` calculado); `sessions/MesaDeSesion.tsx:462` (diálogo «Tu hoja», `size="xl"`); `sessions/elenco/MandosDeCombatiente.tsx:170` (cajón del DM). **Los tres montan el mismo componente** |
| **Pestañas** | `ui/Tabs.tsx`, `layout="strip" \| "sidebar"`, iconos y grupos. Ya en bestiario, crónicas, editor y taller |
| **Retrato** | `Retrato` en `sessions/elenco/FichaDeElenco.tsx:346`: inicial en el color del personaje (decisión del 2026-09-06) |
| **Identidad editable** | `IdentidadEditable.tsx` (`FichaEditable`, `Caracteristicas`) |
| **Los cinco números** | la tira fija de `HojaCalculada` (CA, iniciativa, velocidad, PG, competencia), con traza |
| **Inventario** | `features/inventory/` (1155 líneas): `PaginaDeInventario`, `FilaObjeto`, `ZonaDeObjetos`, `PanelCarga`, `PanelMonedas`, `ElegirMano`, `ConfirmarSoltar`, `SelectorDeObjeto` |
| **Dar a…** | `sessions/elenco/DarObjeto.tsx` — **ya existe** (plan del botín). La spec del 09-06 exigía reutilizarlo y no construir otro |
| **Filtros** | `ui/FilterChip.tsx` |
| **Espacios de conjuro** | `spellSlots` en la hoja (`character-sheet/api.ts:119`); conjuros reales: paso 3 |
| **Pestaña en la URL** | precedente en `pages/CampaignDetailPage.tsx:622` con `useSearchParams` |

**Casi todo es redisposición de piezas construidas.** Lo nuevo de verdad son tres ficheros:
la cabecera, el detalle de objeto y la lista única de acciones de objeto.

## 3 · Enfoque elegido: una `HojaCalculada`, dos disposiciones

De tres enfoques (una hoja con dos disposiciones · dos componentes que comparten tarjetas · solo
la página ahora), el autor eligió el primero. Razón: **un solo sitio para el reparto de pestañas,
la forma de datos y «quién puede editar»**. Dos componentes es la duplicación
`FichaDePnj`/`FichaDeElenco` que ya llegó a 95 líneas antes de extraerse; «solo la página» dejaba
la spec del 09-06 abierta por tercera vez.

```
HojaCalculada({ campaignId, characterId, puedeEditar, disposicion })
  ├─ Cabecera            (siempre)
  ├─ Tabs layout=sidebar | strip   (según disposicion)
  └─ pestanas/<Activa>   ({ hoja, puedeEditar, disposicion })
```

- `disposicion: "pagina"` — `CharacterDetailPage`. `Tabs layout="sidebar"`; cada pestaña a 2-3
  columnas; Objetos con panel de detalle.
- `disposicion: "mesa"` — los dos diálogos de la mesa. `Tabs layout="strip"`; una columna; la fila
  de objeto con menú «…».

`HojaCalculada.tsx` se parte: queda como el que carga datos, decide la pestaña activa y orquesta
(**menos de 150 líneas**); las tarjetas se mueven a `character-sheet/pestanas/{Numeros, Objetos,
Ataques, Recursos, Estado, Rasgos, Conjuros}.tsx` y la cabecera a `character-sheet/Cabecera.tsx`.
**Ninguna tarjeta se reescribe** — se importa desde donde está.

## 4 · La cabecera fija

Vive fuera de las pestañas, en cualquier disposición. De arriba abajo y de izquierda a derecha:

```
┌─ retrato ──┐  Elara  · Maga 5 · Alta elfa                 [Subir nivel]  [2 elecciones]
│     E      │  CA 16 · INIC +3 · VEL 30 · PG 24/24 · COMP +2
└────────────┘  ● Envenenada  ● Concentrando (Escudo de fe)
```

| Zona | Componente | Cuándo |
|---|---|---|
| Retrato | `Retrato` (inicial en su color) | siempre |
| Nombre, clase/subclase, raza, nivel | `FichaEditable` en modo compacto; **formas legibles** del vocabulario, nunca claves | siempre |
| Los cinco números con traza | la tira fija actual, tal cual | siempre |
| Condiciones activas | `Condiciones` en modo chip (solo lectura aquí; se gestionan en Estado) | si hay alguna |
| Avisos | `BotonSubirNivel`, `EleccionesPendientes` (contador), `AvisoDeDm`, `Avisos` | solo si hay algo que avisar |

**Regla:** los cinco números **no entran en ninguna pestaña** (heredada del 09-06). Y la cabecera
**no lleva controles de daño**: el autor descartó «PG editables en la cabecera» — mete botones en
la banda de lectura; el daño se aplica en Recursos (página) o en el cajón de la mesa.

En «mesa» la misma cabecera se apila en dos filas; en 390 px las condiciones pasan a una línea
con scroll horizontal propio (única excepción a «el cuerpo no scrollea de lado»).

## 5 · Las siete pestañas

Orden de la barra = orden de esta tabla. **Números abre por defecto** (decisión del autor,
contesta la pregunta 1 del §10 de la spec del 09-06).

| Pestaña | Tarjetas que recoge (todas existen) | A página: columnas |
|---|---|---|
| **Números** | `Caracteristicas` · Salvaciones · Habilidades · `PercepcionPasiva` y pasivos | 3: características \| salvaciones + pasivos \| habilidades |
| **Objetos** | `PaginaDeInventario` (zonas, carga, monedas) + filtros | 2: lista \| detalle del seleccionado (§6) |
| **Ataques** | `AtaquesYLanzamiento` · `CompetenciasConArmas` | 2: ataques \| competencias |
| **Recursos** | `PuntosDeGolpe` · `DadosDeGolpe` · `SalvacionesDeMuerte` · `RecursosYDescansos` · `Actividades` | 2: PG + dados + muerte \| recursos + actividades |
| **Estado** | `ModificadoresTemporales` · `Condiciones` (completa, con gestión) · `VelocidadYSentidos` · `Anulaciones` | 2: modificadores + condiciones \| velocidad + anulaciones |
| **Rasgos** | `RasgosYAptitudes` · `FichaEditable` (resto de la ficha) · `Personalidad` | 2: rasgos \| ficha + personalidad |
| **Conjuros** | espacios por nivel (`spellSlots`, `spellSlotResetOn`) + `EmptyState` «La lista de conjuros llega con el paso 3» | 1 |

**Conjuros solo se pinta si el personaje lanza.** Criterio: `spellSlots.length > 0` **o** un rasgo
de `features` que conceda un conjuro racial (hoy `subrace.elfHigh.cantrip`; el tiefling y el
gnomo de las rocas cuando el catálogo los tenga). Un guerrero no ve la pestaña. **Si ese criterio
resulta frágil al implementarlo, el servidor emite `castsSpells: boolean` en la hoja** y la
pantalla lo lee; se decide en la tarea, no aquí. El paso 3 llena esta pestaña **sin mover nada**
(su plan ya la asume: `2026-09-08-paso-3…md:304`).

**Lanzadores del SRD 5.1**, para que nadie lo diseñe pensando solo en el mago: bardo, clérigo,
druida, hechicero, brujo (magia de pacto) y mago desde nivel 1; paladín y explorador desde
nivel 2 (`spellcastingFromLevel` en `classes.ts`). Caballero arcano y Embaucador arcano **no
están en el SRD 5.1** — fuera. Conjuros raciales: alto elfo (un truco), tiefling, gnomo de las
rocas — sin espacios.

**Pestaña activa en la URL**: `?pestana=objetos`, con `useSearchParams` como hace
`CampaignDetailPage`. Enlazable, sin estado escondido y sin `localStorage` (el autor descartó
«la última que se dejó abierta»). En «mesa» no se persiste: abre siempre en Números.

**Pestañas sin contenido** (p. ej. Estado sin condiciones ni modificadores) **se pintan igual**,
con el `EmptyState` de cada tarjeta: una pestaña que aparece y desaparece según los datos es
navegación que se mueve bajo los pies. Conjuros es la única excepción, y por regla de dominio.

## 6 · Objetos: la fila, el detalle y una sola lista de acciones

```
┌ OBJETOS ───────────────────────────────┬ DETALLE ─────────────────────┐
│ [equipado][encima][guardado] [arma][…] │ Espada larga +1              │
│ 🔍 buscar…            Carga 34/150 lb  │ Arma marcial · versátil      │
│────────────────────────────────────────│ 1d8+1 cortante · 3 lb        │
│ ▸ Espada larga +1    ×1  3 lb  mano    │ Requiere sintonización       │
│   Daga               ×2  1 lb  encima  │ «Una hoja que…»              │
│   Poción de curación ×3  ½ lb  encima  │                              │
│   Cuerda 50 pies     ×1 10 lb  guard.  │ [Quitar] [Sintonizar]        │
│   Monedas  12 po · 30 pp · 4 pc        │ [Guardar] [Dar a…]           │
└────────────────────────────────────────┴──────────────────────────────┘
```

- **La fila** es `FilaObjeto`, la que ya existe: nombre · cantidad · peso · dónde · acción. Sin
  imagen, sin cuadrícula, sin maniquí (excluidos por el autor el 09-06).
- **Las acciones viven una sola vez**, en `inventory/accionesDeObjeto.ts`: una función que, dada
  la fila y la hoja, devuelve la lista `{ id, rotulo, consecuencia, disponible, ejecutar }`. **El
  menú «…» de la mesa y los botones del detalle de la página consumen esa misma lista.** Dos
  pintores, una fuente — es la lección de las tres copias del vocabulario del daño.
- Entradas, y **solo lo que el servidor ya sabe hacer**: equipar (abre `ElegirMano` si procede) ·
  quitar · sintonizar / dejar de sintonizar (tope de tres) · guardar / llevar encima · consumir
  (`consume`, con consecuencia dicha) · **dar a…** montando `sessions/elenco/DarObjeto.tsx`.
  «Vender» **no** entra: no hay comercio.
- **El detalle** (`inventory/DetalleDeObjeto.tsx`, nuevo, solo en «página»): el objeto
  seleccionado con daño o CA, propiedades, peso, descripción, sintonización y sus botones. Con
  nada seleccionado, el primer objeto de la lista filtrada; con la lista vacía, el `EmptyState`.
  En «mesa» no existe: la fila abre el menú «…».
- **Filtros** con `FilterChip`, los cuatro de la spec del 09-06: dónde está · qué es ·
  sintonizados · buscar por nombre. **Un filtro es de cliente y nunca control de acceso.**
- **El trueque** (dos bolsas enfrentadas, §7 del 09-06) sigue fuera. Esta fila y esta lista de
  acciones son las que lo servirán: la fila es un componente con su acción a un lado, no un trozo
  de tabla.

## 7 · Edición y permisos

Nada nuevo, y por eso se dice: `puedeEditar` sigue viniendo de la página (dueño o DM) y el
servidor sigue con `requireOwnerOrDM`. En un personaje ajeno el detalle no pinta botones y el menú
no se pinta — y aun así el servidor rechaza. **Ningún valor de enumeración llega a la pantalla**:
ranuras, zonas, condiciones y niveles de visibilidad pasan por el `vocabulario.ts` de su dominio.

## 8 · Pruebas

| Capa | Qué demuestra |
|---|---|
| **RTL por pestaña** | cada tarjeta está en su pestaña **y en ninguna otra** (una prueba que recorre las siete y cuenta); Conjuros ausente para un guerrero de nivel 1 y presente para un alto elfo guerrero; la cabecera pinta condiciones y avisos solo cuando los hay; `?pestana=` abre la pestaña pedida y una desconocida cae en Números |
| **RTL de `accionesDeObjeto`** | menú y botones ofrecen **el mismo conjunto**, y «dar a…» desaparece sin sesión; una acción no disponible se muestra marcada, no oculta |
| **Playwright** (regla: pantalla ⇒ navegador) | a 1280: las tres columnas de Números caben sin scroll horizontal (`boundingBox`), el detalle de Objetos queda a la derecha de la lista; a 390 en «mesa»: la tira de pestañas y la fila de objeto no se cortan (`mesa-mide` sigue en verde); `tokens-contrast.spec.ts` visita la hoja con pestañas en los tres temas; `teclado.spec.ts` pasa por las pestañas con `Tab`/`Enter` |
| **Las pruebas existentes de `HojaCalculada`** | se **mueven** a la pestaña que corresponda; ninguna se borra ni se afloja |

## 9 · Lo que puede salir mal

| Riesgo | Señal | Qué hacer |
|---|---|---|
| Pestañas que esconden lo urgente | alguien cambia de pestaña mientras le atacan | los cinco números y las condiciones viven en la cabecera |
| Tres columnas que no caben | a 1024 las habilidades se estrangulan | `minmax(0,1fr)` y pasar a 2 columnas bajo `lg`; se mide, no se supone |
| Dos listas de acciones | alguien añade «consumir» solo al menú | la prueba de igualdad menú/botones enrojece |
| Perder la traza al compactar | un número sin su «de dónde sale» | la tira fija y cada `ValorDerivado` conservan su traza |
| La partición de `HojaCalculada` rompe pruebas | 20 tarjetas cambian de padre | mover cada prueba con su tarjeta, en el mismo commit |
| Un tercer agente en `character-sheet/` e `inventory/` | trabajo perdido por índice compartido | **un implementador por árbol** (regla del proyecto); esta spec no se ejecuta en paralelo con nada que toque esos dos directorios |

## 10 · Lo que esta spec NO hace

- **Imágenes de objeto, maniquí de ranuras, trueque** — excluidos por el autor (09-06 y hoy).
- **Conjuros reales** — paso 3; aquí solo su pestaña con espacios y su hueco declarado.
- **La mesa a 390 px** — el autor quiere un diseño responsive nuevo y buscará referencias; aquí
  solo se garantiza que la hoja en «mesa» no empeore lo que `mesa-mide` ya fija.
- **El diálogo de crear personaje** («solo nombre → directo a la hoja») — se hablará después. Esta
  hoja lo deja preparado: la cabecera edita nombre, raza y clase en sitio, así que «crear = nombre
  → hoja» no necesita más pantalla.

## 11 · Decisiones tomadas hoy (van a `decisiones.md` cuando se ejecute)

| Decisión | Elegido | Descartado |
|---|---|---|
| Disposición a página | pestañas laterales, cada una a 2-3 columnas | tablero con todo visible (denso, sigue con scroll); híbrido núcleo + pestañas (dos patrones) |
| Cabecera | retrato, identidad, cinco números, condiciones, avisos | solo cinco números (una condición pasa desapercibida); PG editables en cabecera (botones en la banda de lectura) |
| Pestaña por defecto | Números | Ataques (la mesa ya los enseña junto al personaje); la última abierta (estado escondido) |
| Detalle de objeto | lista + panel de detalle a la derecha, mismas acciones que el menú | solo menú «…» (desaprovecha el ancho); equipo por ranuras a la derecha |
| Conjuros hoy | pestaña solo para lanzadores, con espacios y hueco declarado | no aparecer hasta el paso 3 (dos mudanzas) |
| Enfoque | una `HojaCalculada` con `disposicion` | dos componentes; solo la página |

## Cuándo se hace

**Después de cerrar la tanda de fichas en curso** (`ficha/tanda-2-a-5`) y **antes del paso 3**,
que asume la pestaña Conjuros hecha: hacerla después obliga a reabrir la hoja dos veces. No
comparte árbol con nada que toque `character-sheet/` o `inventory/`.

## Definición de terminado del diseño

Aprobada por el autor el 2026-09-11 en esta conversación, con las cinco respuestas de §11. Su plan
por tareas se escribe con `writing-plans` cuando la tanda de fichas suelte el árbol.
