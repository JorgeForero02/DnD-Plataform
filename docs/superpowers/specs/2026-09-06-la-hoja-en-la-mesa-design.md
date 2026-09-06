# La hoja en la mesa — pestañas, retrato y objetos que se manejan

> Escrito el 2026-09-06 a partir de dos capturas del autor —la hoja de personaje y la pantalla de
> trueque de *Divinity: Original Sin 2*— y de lo que pidió al verlas: **retrato en vez de maniquí**,
> **pestañas**, y **una lista de objetos con acciones a mano, tipo Final Fantasy**, con «usar»,
> «equipar» y compañía.
>
> **Todo lo que dice «hoy» se comprobó abriendo el fichero**, el 2026-09-06 sobre `08dca5f`.

---

## 1 · Qué se pide, en una frase

Que la hoja **quepa en una pantalla y se maneje sin salir de ella**: los cinco números que se
consultan en mitad de un turno siempre a la vista, el resto repartido en pestañas, y los objetos en
una lista densa donde cada fila ofrece lo que se puede hacer con ella.

**Lo que NO se pide, y el autor lo dijo explícitamente:** ni maniquí con ranuras dibujadas, ni un
icono por objeto. **La rejilla de iconos de la captura queda fuera** — y más abajo está medido por
qué es cara.

---

## 2 · Lo que ya existe, y es casi todo

| Pieza | Estado real |
|---|---|
| **Pestañas** | `apps/web/src/ui/Tabs.tsx` — primitiva del proyecto, con dos disposiciones (tira y lateral), iconos opcionales y grupos. **Ya la usan** el bestiario, las crónicas, el editor de entidades y el taller del DM |
| **Retrato** | `Retrato`, en `features/sessions/elenco/FichaDeElenco.tsx:306`. Pinta **la inicial del personaje en su propio color**, y hay prueba de que ese color coincide con su voz en el hilo. **Es el retrato acordado** mientras no haya almacenamiento |
| **Filtros** | `ui/FilterChip.tsx`, ya en uso en el bestiario (`PanelDeBestiario.tsx:340`) |
| **Los cinco números** | la tira fija de `HojaCalculada` — CA, iniciativa, velocidad, PG y competencia, **con su traza detrás** |
| **Las once ranuras** | `equipSlotSchema`: manos, armadura, cabeza, cuello, capa, dos anillos, manos, pies y «otro». **El dato está aunque no se dibuje el maniquí** |
| **Peso y carga** | por objeto, total, tope y aviso de sobrecarga |
| **Las acciones sobre un objeto** | equipar con ranura, quitar, sintonizar, mover entre los tres sitios y consumir — **todas existen en el servidor y todas se usan ya** |

**O sea que esto es en su mayor parte una redisposición de piezas construidas**, no una funcionalidad
nueva. Eso es lo que lo hace barato y lo que decide su tamaño.

---

## 3 · Lo que NO existe, y hay que decidir qué se hace

### 3.1 · Ningún objeto tiene imagen — y la salida evidente no sirve

**Cero campos de icono en `item.schema.ts`.** Y la tentación es copiarlos de Foundry, que sí los
tiene… salvo que apunta a assets **del núcleo de Foundry**, no del sistema `dnd5e`:

```
img: icons/weapons/ammunition/arrows-barbed-white.webp
icons/equipment/chest/…    87 objetos
icons/weapons/swords/…     81 objetos
icons/consumables/potions/… 57 objetos
```

**Esos ficheros no están en el clon y su licencia no permite sacarlos de Foundry.** Lo que sí trae el
clon son **unos 30 SVG de Game-Icons.net** (`icons/LICENSE`), en **CC BY 3.0** y CC0 — reutilizables
citando autor.

**Decisión del autor, 2026-09-06: no hay imágenes de objeto, y no las va a haber.** Ni en la
lista, ni en el inventario, ni **en la tienda cuando exista**. La referencia no es la rejilla de
*Divinity* sino la lista de *Final Fantasy*: **nombre, cantidad y sus acciones**, en texto.

Eso zanja el problema entero en vez de administrarlo: no hay licencia que revisar, no hay
ochocientas piezas de arte que conseguir, y **no hay una rejilla que se lea peor que una lista**
mientras el arte no llegue. Si algún día se quisiera una pista visual, sería **un dibujo por TIPO**
—quince siluetas, no ochocientas— y entraría como decisión nueva, no como deuda de esta.

### 3.2 · No hay ningún menú contextual en toda la aplicación

**Cero `onContextMenu`.** Sería el primero, y eso es exactamente lo que este proyecto tiene
identificado como zona de riesgo: **superficie sin precedente, donde no hay patrón que copiar**.

**Y tiene un problema que no es de gusto: a 390 px no hay clic derecho.** Todas las pantallas de
este proyecto se miden a ese ancho.

**Cómo se resuelve, y no cuesta más:** cada fila lleva un botón **«…»** que abre el menú —ratón,
dedo y teclado—, y **el clic derecho es un atajo encima**, no la única puerta. Mismo menú, dos
formas de llegar.

### 3.3 · No hay dónde guardar un retrato

**No existe subida de ficheros en ninguna parte del proyecto**: ni `multipart`, ni almacenamiento
de imágenes, ni un campo de avatar. Guardar una imagen es un trabajo aparte —dónde viven los
ficheros, cuánto pesan, quién los ve— y **no entra aquí**.

**Decisión del autor, 2026-09-06: mientras no haya almacenamiento, el retrato es la INICIAL del
personaje.** Y eso **ya está hecho y probado**: `Retrato`
(`features/sessions/elenco/FichaDeElenco.tsx:306`) pinta la primera letra del nombre **en el color
propio del personaje**, que decide `vozDePersonaje` —la misma función que colorea su voz en el
hilo—, y hay una prueba de que el retrato y la voz del mismo personaje coinciden.

Así que aquí no se construye un marcador nuevo: **se reutiliza ese componente, más grande**. Cuando
haya almacenamiento, la imagen entra en el mismo hueco y la inicial se queda como reserva para quien
no suba ninguna.

---

## 4 · La disposición

```
┌─ retrato ──┐   ┌──────────────── pestañas ─────────────────┐
│            │   │  Números · Objetos · Ataques · Recursos   │
│  nombre    │   │  Estado · Rasgos                          │
│  clase Nv  │   ├───────────────────────────────────────────┤
│            │   │  Daga                    ×2   0,5 kg   …  │
└────────────┘   │  Poción de curación      ×3   0,3 kg   …  │
  CA 16 · INIC +3 · VEL 30 · PG 24/24 · COMP +2               │
```

**Los cinco números de combate se quedan FUERA de las pestañas**, donde están hoy. No es
conservadurismo: son lo que se consulta en mitad de un turno, y esconderlos detrás de una pestaña
obliga a cambiar de vista **mientras alguien te está atacando**. Su tira fija ya existe y ya se
comporta bien dentro y fuera de un cajón — se arregló el 2026-09-06.

**Las pestañas salen de las tarjetas que la hoja ya tiene** (`HojaCalculada`), agrupadas:

| Pestaña | Qué recoge hoy |
|---|---|
| **Números** | Características · Salvaciones · Habilidades |
| **Objetos** | Inventario · carga · monedas |
| **Ataques** | el cuadro de ataques y lanzamiento |
| **Recursos** | Recursos y descansos · Puntos de golpe |
| **Estado** | Condiciones activas · Modificadores temporales · Velocidad y sentidos |
| **Rasgos** | Ficha · Rasgos y aptitudes · Competencias · Personalidad |

**Qué pestaña se abre por defecto es una decisión**, y va abajo.

---

## 5 · La fila de objeto, y su menú

**Una fila es: nombre · cantidad · peso · dónde está · el botón «…».** Sin imagen, sin cuadrícula.

El menú ofrece **solo lo que el servidor ya sabe hacer**, y cada entrada con su consecuencia dicha:

| Entrada | Qué hace | Ya existe |
|---|---|---|
| **Equipar** | abre el selector de mano si el objeto tiene ranura | `PATCH .../inventory/:id` con `slot` |
| **Quitar** | vuelve a la mochila | ídem |
| **Sintonizar / dejar de sintonizar** | con su tope de tres | ídem |
| **Guardar** / **Llevar encima** | mueve entre los tres sitios | ídem |
| **Consumir** | lo gasta y aplica lo que declare | `consume` |
| **Dar a…** | elige destinatario | **llega con el plan del botín**, no antes |

**«Vender» NO entra**, y no por olvido: no hay comercio, y un menú que ofrece vender sin vender es
la clase de promesa falsa que este proyecto lleva un día entero corrigiendo. Cuando entre, entra por
su propia pantalla — ver la sección 7.

**Reglas que gobiernan este menú**, todas ya vinculantes:

- **Un gesto que retira o reclasifica dice su CONSECUENCIA y deja rastro.** «Soltar» no es «quitar».
- **Esconder una entrada no es control de acceso**: la puerta es `requireOwnerOrDM` en el servidor.
  El menú de un personaje ajeno no se pinta, y aun así el servidor rechaza.
- **Ningún valor de enumeración llega a la pantalla**: ni `EQUIPPED` ni `OFF_HAND` — la forma
  legible se importa del vocabulario que ya existe.
- **Una opción con significado no se esconde en un desplegable**: el selector de mano son radios
  con su frase, como ya es hoy.

---

## 6 · Los filtros

Con `FilterChip`, que ya existe y ya se usa en el bestiario. **Cuatro que sirven de verdad en una
mesa:**

- **Dónde está**: equipado · encima · guardado.
- **Qué es**: arma · armadura · consumible · lo demás.
- **Sintonizados**, porque el tope de tres es una decisión que se consulta.
- **Buscar por nombre**, que ya funciona en el selector de objetos y se reutiliza.

**Un filtro es de cliente y nunca control de acceso** — es regla escrita, y aquí es literal: filtrar
la bolsa no esconde nada de nadie.

---

## 7 · El trueque, para cuando llegue

El autor mandó también la pantalla de trueque de *Divinity*: **dos inventarios enfrentados, lo que
se ofrece en el medio, y un botón de aceptar.** No entra ahora —no hay comercio— pero **queda
descrito para que la lista de arriba no se diseñe de espaldas a él**:

- es **una pantalla propia**, no un menú de fila: intercambiar es una conversación entre dos
  bolsas, y una fila no puede representar eso;
- reutiliza **la misma fila** de la sección 5, en dos columnas;
- y el «aceptar» es **una sola operación**, no un goteo de movimientos sueltos — o cambian las dos
  bolsas o no cambia ninguna.

**Lo que esta spec deja preparado para eso**: que la fila sea un componente con su acción a un lado
y no un trozo de tabla pegado al inventario propio.

---

## 8 · Cuándo se hace, y por qué no ahora

**Después del paso 2 y del botín.** Los dos tocan `apps/web/src/features/character-sheet/` y
`features/inventory/`, que son exactamente los ficheros de esta spec: sería el tercer agente en el
mismo sitio, y hoy ya se perdió trabajo así una vez.

**Y hay una dependencia real, no solo de calendario:** «Dar a…» sale del plan del botín. Si esta
pantalla se hace antes, el menú nace con un hueco que hay que volver a abrir.

---

## 9 · Lo que puede salir mal

| Riesgo | Señal | Qué hacer |
|---|---|---|
| **El menú no se puede abrir con el dedo** | a 390 px no hay clic derecho | el botón «…» es la puerta; el clic derecho, un atajo |
| **Pestañas que esconden lo urgente** | alguien cambia de pestaña en mitad de un turno | los cinco números viven fuera de las pestañas |
| **Un menú que ofrece lo que no existe** | «Vender» sin comercio | solo entra lo que el servidor ya hace |
| **La lista se queda sin sitio a 390 px** | nombre, cantidad, peso y botón en una línea | se mide con `boundingBox()`, no se supone |
| **Perder la traza al compactar** | los números sin su explicación | la tira fija conserva su «de dónde sale» |

---

## 10 · Qué decide el autor

1. **¿Qué pestaña abre por defecto?** Recomendado: **Números**, que es lo que se mira más veces por
   sesión. La alternativa razonable es **Ataques** si la hoja se usa sobre todo en combate.
2. **¿Las pestañas son tira arriba o columna lateral?** `Tabs` hace las dos. Recomendado: **tira**
   dentro de la mesa —hay poco ancho— y **lateral** en la hoja a página completa.

> **Dos preguntas que estaban aquí ya no lo están, porque el autor las contestó el 2026-09-06**: no
> hay imágenes de objeto —tampoco en la tienda— y el retrato es la inicial del personaje mientras no
> exista almacenamiento.

## Definición de terminado del diseño

Está terminado cuando el autor apruebe la disposición, el reparto de pestañas, y las dos reglas que
lo gobiernan: **los cinco números no entran en ninguna pestaña**, y **el menú solo ofrece lo que el
servidor ya sabe hacer**. Su plan por tareas se escribe cuando el paso 2 y el botín hayan soltado
esos ficheros.
