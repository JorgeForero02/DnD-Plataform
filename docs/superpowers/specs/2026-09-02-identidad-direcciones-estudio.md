# Direcciones visuales estudiadas — informe · 2026-09-02

> **Qué es esto.** Las tres direcciones que se estudiaron antes de elegir. La elegida y su
> porqué están en [la especificación de identidad](./2026-09-02-identidad-visual-design.md);
> esto es el material del que salió, incluidas las dos direcciones **descartadas**, que se
> conservan para que la decisión se pueda revisar en lugar de repetirse.

---

Informe de investigación para rediseñar la identidad visual de la plataforma, hoy en el
aspecto por defecto de cualquier generación por IA (crema `#F4F1EA`, verde bosque, tipografía
del sistema). Objetivo: algo que lea como medieval sin caer en pergamino de cliché, que
funcione como herramienta de trabajo usada horas seguidas, en claro y oscuro, con contraste
verificable.

---

## 1. Qué dice la investigación

### 1.1 Tipografías de Google Fonts: medieval sin letra gótica ni Papyrus

La letra gótica/blackletter (la que usa la edición original de **Mörk Borg**, con más de cien
tipografías distintas y una estética deliberadamente "deathpunk" e ilegible) comunica
"medieval" al instante pero es **inutilizable en una interfaz de trabajo**: mala legibilidad
en pantalla, mala a tamaños pequeños, y asociada a fantasía barata o metal. Papyrus comunica
"genérico antiguo" sin especificidad de época. Ninguna de las dos sirve aquí. La vía real —la
que usan los libros de rol bien maquetados hoy— es la serif humanista o de transición, que
evoca manuscrito/imprenta antigua sin sacrificar legibilidad:

**Para títulos y cabeceras (display, se usa en tamaño grande, poco texto corrido):**
- **Cinzel** / **Cinzel Decorative** — mayúsculas de inspiración romana grabada en piedra;
  funciona para el nombre de la campaña, portadas de sesión, hitos. No usar en párrafos: es
  solo mayúsculas y pierde peso en cuerpos de texto.
- **Marcellus** — variante más contenida y moderna de la misma familia de inscripción romana;
  mejor comportamiento en interfaz (cabeceras de sección, nombres de personaje) que Cinzel
  porque tiene minúsculas propias y menos "grito".
- **Fraunces** — serif de contraste variable con un punto "old-style" pero dibujado para
  pantalla (variable font, ejes de peso/óptica/inclinación). Es la opción con más rango:
  puede ir desde casi clásica hasta con carácter, sin perder legibilidad en tamaños medianos.
- **Cormorant** / **Cormorant SC** — muy elegante, muy fino; sirve para acentos puntuales
  (versalitas de un encabezado, una cita), nunca para bloques largos: a pesos ligeros baja de
  4.5:1 con facilidad.

**Para cuerpo de texto (descripciones de entidades, notas de sesión, lectura larga):**
- **Literata** — diseñada por Google explícitamente para lectura prolongada en pantalla
  (nació para Google Play Books). Es la apuesta más segura para cuerpo: pensada para el caso
  de uso exacto que tiene esta plataforma.
- **EB Garamond** — revival abierto del garamond clásico; es el que de verdad se usa en
  maquetación de libros de rol y de ficción por su calidez sin ser decorativo. Cuidado: a
  pesos regulares y tamaños pequeños puede quedar corto de contraste — usar 16px+ o el peso
  medium.
- **Crimson Pro** / **Spectral** — alternativas de cuerpo con más peso disponible (Spectral
  llega a 7 pesos con itálicas a juego), más cómodas si se necesita una familia con más
  variantes tipográficas (negrita, semibold) para jerarquía dentro del propio cuerpo.
- **Alegreya** — nace para libros, tiene compañera sans-serif de la misma familia
  (Alegreya Sans) para UI; sus itálicas son marcadas y angulosas, hay que probarlas antes de
  comprometerse porque pueden leer "más fantasía" de lo que conviene a una herramienta.

**Para dato/tabla (estadísticas, atributos, fechas, IDs, código de invitación de campaña):**
- **JetBrains Mono** / **IBM Plex Mono** — monoespaciadas modernas, hechas para lectura
  técnica prolongada, no para "ambientación": es la fuente que rompe con el resto y le dice al
  ojo "esto es un dato, no prosa". Es exactamente el recurso que le falta a la interfaz actual
  para distinguir narrativa de tabla de estadísticas.

Fuentes: [Choosing Fonts For TTRPGs](https://www.hedonic.ink/choosing-fonts-for-ttrpgs/),
[Typewolf — 40 Best Google Fonts](https://www.typewolf.com/google-fonts),
[EB Garamond — Google Fonts specimen](https://googlefonts.github.io/ebgaramond-specimen/),
[Fantasy Medieval Fonts](https://edricstudio.com/fantasy-medieval-fonts/).

### 1.2 Cómo lo resuelven productos reales

- **D&D Beyond** resolvió el modo oscuro tarde y de forma literal: "Underdark Mode" invierte
  fondos blanco/negro manteniendo el resto del sistema, sin rediseñar paleta ni tipografía
  para el contexto nocturno. Lección: el oscuro no es "invertir los colores", es una paleta
  propia con su propio contraste calculado (ver más abajo). ([foro D&D Beyond](https://www.dndbeyond.com/forums/d-d-beyond-general/general-discussion/47132-dndbeyond-dark-theme))
- **Foundry VTT** vive de mods de tema porque el núcleo no impone identidad fuerte; los temas
  de la comunidad con más tracción (Twilight UI, Carolingian UI, Dorako UI) convergen en lo
  mismo: fondo casi negro, tipografía de UI limpia y sin serifs decorativas, acento de color
  único y saturado para estados (selección, daño, curación) — la ambientación vive en el
  contenido (mapas, fichas), no en el chrome de la interfaz. ([Carolingian UI](https://www.patreon.com/posts/customize-vtt-ui-137828947), [PF2e Dorako UI](https://foundryvtt.com/packages/pf2e-dorako-ui))
- **Shadowdark** ganó cuatro ENNIE de oro por maquetación con una fórmula deliberadamente
  anti-ornamento: A5, dos columnas, tipografía de palo (Montserrat) para casi todo, jerarquía
  por tamaño y peso en vez de por decoración, y la ambientación puesta en la ilustración en
  blanco y negro, no en la letra. Es la prueba de que "medieval" puede transmitirse sin una
  sola serif ornamental — mediante disciplina de grid y contención. ([Shadowdark — three-castles / ENNIE](https://en.wikipedia.org/wiki/Shadowdark))
- **Mörk Borg** es el extremo contrario, útil como calibre de "hasta dónde no llegar": paleta
  de negro, blanco, grises, rosa chillón, amarillo y rojo, sin grid, con más de cien
  tipografías incluida blackletter agresiva. Funciona como objeto de diseño gráfico de un
  libro que se lee una vez por sesión; **fallaría por completo** como interfaz que se mira
  durante horas — es diseño para impacto puntual, no para trabajo sostenido. ([The Antagonistic Design of Mörk Borg](https://aavoigt.com/f/the-antagonistic-design-of-m%C3%B6rk-borg))
- **Archives of Nethys** y **Demiplane** no tienen documentación de diseño pública específica,
  pero su patrón visible es el mismo que Foundry: interfaz densa y neutra (tipografía de palo,
  fondo oscuro por defecto, tablas apretadas) con el color reservado a etiquetas de categoría
  (escuela de magia, tipo de daño, rareza) — el color como *sistema de codificación de
  información*, no como decoración.

### 1.3 Paletas: qué usan los manuales modernos, y cómo evitar el gris muerto y el crema tópico

Los manuales de rol bien impresos de la última década (Free League, Kobold Press, Arcane
Library) no usan gris neutro puro ni crema plano: usan **neutros con una temperatura
consistente** — todos los grises de una paleta desviados ligeramente hacia el mismo matiz
(verde-gris frío, marrón-gris cálido, azul-gris naval), nunca grises "sin color" que en
pantalla se leen muertos ni un único tono crema saturado que en pantalla lee genérico. La
receta que funciona:

1. Elegir **una** familia de matiz para todos los neutros (p. ej. verde apagado, o marrón
   cuero, o azul pizarra) y variar solo luminosidad/saturación entre ellos — no mezclar
   familias de gris.
2. El acento no es el color más vistoso de la paleta: es el que aparece **menos**. Un acento
   que se usa en el 80% de los botones deja de leerse como acento y pasa a ser "el color de la
   app", con el mismo problema del verde bosque actual.
3. Dos acentos, no uno: un acento "cálido" para llamadas a la acción / estados positivos y uno
   "frío" para información / estados neutros, evita que todo el color disponible se queme en
   un solo uso.

### 1.4 Textura, filete, capitular y ornamento en interfaces reales

- **Filete** (línea fina que separa secciones, imitando el filete tipográfico de un libro):
  funciona muy bien en interfaz — es barato en atención visual y da estructura sin ambientar
  de más. Es el recurso de "medieval" más seguro para una app de trabajo.
  Es lo que usan tanto Shadowdark como los temas de Foundry orientados a legibilidad.
- **Capitular** (letra inicial grande y decorada en el primer párrafo de un capítulo): funciona
  en un manual impreso porque se lee una vez. En una interfaz con scroll, listas y estados de
  carga, **estorba**: obliga a reservar espacio fijo, se rompe con contenido corto o vacío, y no
  aporta nada la segunda vez que se ve la misma pantalla. Único uso defendible: la portada de
  una campaña o de un personaje, un elemento que se ve poco y con calma, nunca en listados.
- **Textura de papel/pergamino** (grano, manchas, bordes quemados): es la señal más asociada al
  "genérico IA-fantasía" precisamente porque es la más fácil de generar sin criterio. En
  pantalla, además, reduce el contraste real del texto que va encima (aunque el cálculo de
  contraste use el color base, el ojo percibe menos si hay ruido de textura). Si se usa, tiene
  que ser **extremadamente sutil** (opacidad baja, solo en fondos grandes sin texto encima, o
  solo en el tema oscuro donde el ruido es menos visible) — nunca detrás de texto de cuerpo.
- **Ornamento heráldico** (cenefas, escudos, rosetas): funciona como *marca* (logo, favicon,
  pantalla de login) y falla como *sistema* — no escala a 40 filas de una tabla ni a un
  formulario. La regla de Foundry/Shadowdark aplica: ambientación en los puntos de entrada
  (login, portada de campaña, estado vacío), disciplina de grid en el resto.

### 1.5 Señales de "medieval" sin pergamino

De la investigación se extraen señales que el ojo lee como "época antigua/artesanal" sin
necesitar textura ni gótica: **mayúsculas espaciadas para títulos** (imitan grabado/inscripción
— es lo que hace Cinzel/Marcellus), **filetes y dobles filetes** en vez de sombras/gradientes
para separar secciones, **numeración romana o "capítulo N"** en vez de "sección 3", **paleta de
tintas y metales** (tinta, sello de lacre, oro viejo, cobre) en vez de colores planos de marca
tech, **iconografía lineal fina** (una pluma, un sello, una brújula) en vez de iconos
rellenos redondeados, y **jerarquía por tamaño/peso tipográfico marcada**, más cercana a un
libro que a un dashboard SaaS de rejillas iguales.

---

## 2. Advertencia explícita: qué NO hacer

La investigación confirma que existen **dos** clichés de IA generativa reconocibles al
instante, y el aspecto actual de la plataforma cae en el primero:

> "Los tres defaults de diseño de IA son: crema + serif + terracota, negro casi puro + acento
> ácido, o guion editorial de línea fina" — y "sitios con fondos beige/crema, acentos naranja
> óxido, y grandes tipografías serif en cursiva o resaltadas" se han vuelto cliché instantáneo
> por pura repetición del promedio estadístico de los modelos.
> ([Kyle Chayka — The generic style of AI web design](https://kylechayka.substack.com/p/the-generic-style-of-ai-web-design), [925 Studios — AI Slop Design Tells](https://www.925studios.co/blog/ai-slop-design-tells))

Traducido a esta plataforma: **evitar activamente**
1. Fondo crema plano de un solo tono (`#F4F1EA` y variantes muy próximas) combinado con serif
   de alto contraste (tipo Playfair Display) y acento terracota/óxido — es el aspecto actual,
   exactamente el que el autor ha rechazado.
2. Su alternativa igual de trillada: negro casi puro (`#0A0A0A`) con acento verde ácido o
   lima fluorescente — el "modo oscuro por defecto" de cualquier dashboard generado sin
   dirección de arte.
3. Cualquier combinación de las dos anteriores donde el modo oscuro sea literalmente el modo
   claro invertido (el error que cometió D&D Beyond con "Underdark Mode"): el oscuro necesita
   su propia paleta calculada, no una inversión.

Ninguna de las tres direcciones de abajo usa crema plano, terracota, negro puro ni verde
ácido.

---

## 3. Tres direcciones visuales

### Dirección A — "Grimorio de bolsillo"

**En una frase:** un cuaderno de campaña con disciplina de manual OSR moderno — papel frío,
tinta casi negra, un único acento de lacre, cero textura.

**Se parece a:** Shadowdark en su enfoque (grid estricto, tipografía como única portadora de
carácter, ambientación mínima) cruzado con la limpieza de un tema Foundry orientado a
legibilidad (Twilight UI / Dorako UI).

**Tipografías (Google Fonts):**
- Título / cabecera: **Fraunces** (peso semibold-bold, sin cursiva salvo para citas) — nombres
  de campaña, títulos de sesión.
- Cuerpo: **Literata** — descripciones, notas, texto largo. Es la fuente diseñada
  explícitamente para lectura prolongada en pantalla, el caso de uso central de la app.
- Dato / tabla: **JetBrains Mono** — atributos, tiradas, fechas, IDs.

**Textura y ornamento:** ninguno decorativo. Solo filete simple (1px) para separar secciones y
mayúsculas espaciadas (letter-spacing) en las cabeceras de sección como único gesto "grabado".
Sin capitulares, sin cenefas, sin textura de fondo.

**Paleta — tema claro** ("papel ceniza", frío, no crema):
| Rol | Nombre | Hex |
|---|---|---|
| Fondo | papel ceniza | `#E9EBE6` |
| Superficie (tarjetas) | musgo claro | `#DEE1D9` |
| Texto principal | tinta negra | `#1B1D1A` |
| Texto secundario / borde | grafito | `#5B6058` |
| Acento primario | sello de lacre | `#7A2E2E` |
| Acento secundario | verde bosque profundo | `#2E4A3F` |

**Paleta — tema oscuro** ("pizarra nocturna"):
| Rol | Nombre | Hex |
|---|---|---|
| Fondo | pizarra nocturna | `#14161A` |
| Superficie (tarjetas) | pizarra media | `#1E2126` |
| Texto principal | hueso | `#E7E5DD` |
| Texto secundario / borde | niebla de acero | `#8B9099` |
| Acento primario | brasa | `#CC6259` |
| Acento secundario | verde salvia | `#5C8B76` |

**Por qué encaja / no:** es la dirección más segura para una herramienta que se mira horas —
máxima legibilidad, mínima fatiga, el acento de lacre se reserva para acciones destructivas o
estados críticos (nunca se satura). El riesgo es que, sin cuidado en el detalle tipográfico
(letter-spacing, tamaño del filete), pueda leerse como "app neutra con una fuente bonita" y
perder la lectura "medieval" — necesita que el gesto tipográfico (Fraunces + versalitas) esté
bien ejecutado para no desaparecer.

---

### Dirección B — "Cartulario iluminado"

**En una frase:** el manuscrito real, pero con la paleta y el peso tipográfico que un libro de
rol actual usaría — pergamino profundo y oro viejo, no pastel plano ni oro chillón.

**Se parece a:** la maquetación de manuales de Free League o Kobold Press, con el acento
puesto en verde-teal en vez del terracota que define el cliché de IA.

**Tipografías (Google Fonts):**
- Título / cabecera: **Marcellus** para cabeceras normales; **Cinzel** solo en el logotipo y
  en portadas de campaña (mayúsculas, uso puntual).
- Cuerpo: **EB Garamond**, peso *medium* mínimo a 16px+ para no perder contraste a pesos
  finos.
- Dato / tabla: **IBM Plex Mono**.

**Textura y ornamento:** aquí sí hay margen para un filete doble (línea gruesa + fina, como un
marco de página de manual) en cabeceras de sección, y una capitular **solo** en la portada de
campaña o de personaje (nunca en listados ni tablas). Sin textura de grano de papel en ningún
fondo con texto encima; como mucho, una textura extremadamente sutil (2-3% de opacidad) en el
fondo del tema oscuro, nunca en el claro.

**Paleta — tema claro** ("pergamino curado", más saturado y profundo que el crema plano
actual, deliberadamente distinto del cliché):
| Rol | Nombre | Hex |
|---|---|---|
| Fondo | pergamino curado | `#E8DFC7` |
| Superficie (tarjetas) | pergamino sombreado | `#DDD2B0` |
| Texto principal | tinta de roble | `#2B2417` |
| Texto secundario / borde | cuero seco | `#6B6048` |
| Acento primario | oro viejo *(solo UI — ver contraste)* | `#8A6A1E` |
| Acento secundario | verde cartulario | `#1F4A44` |

**Paleta — tema oscuro** ("cuero oscuro"):
| Rol | Nombre | Hex |
|---|---|---|
| Fondo | cuero oscuro | `#171512` |
| Superficie (tarjetas) | cuero medio | `#221F19` |
| Texto principal | vitela | `#EDE4CC` |
| Texto secundario / borde | pergamino gastado | `#A69B7F` |
| Acento primario | oro | `#C9A227` |
| Acento secundario | verde jade | `#4C9186` |

**Por qué encaja / no:** es la dirección con más carácter "medieval" reconocible, y por eso la
que más riesgo tiene de deslizarse hacia el cliché si se ejecuta sin disciplina — la línea
entre "pergamino profundo bien resuelto" y "el mismo crema de siempre pero más oscuro" es
fina. Para que funcione en una sesión de horas, el oro viejo (`#8A6A1E`, 3.8:1) tiene que
quedar **fuera** de texto de cuerpo y limitarse a iconos, bordes activos y etiquetas grandes —
si se usa mal, es la dirección que más fácil falla el contraste.

---

### Dirección C — "Sala de guerra"

**En una frase:** la mesa de mapas de campaña bajo una lámpara — azul pizarra naval y cobre,
sin pergamino, medieval por cartografía y grabado en vez de por textura.

**Se parece a:** el registro visual de un dashboard de datos serio (tipografía de palo,
densidad alta) con el vocabulario cromático de un mapa antiguo y sellos de cera de cobre —
es la dirección más "herramienta" de las tres, la que menos se apoya en ambientación directa.

**Tipografías (Google Fonts):**
- Título / cabecera: **Marcellus** (o Cormorant SC para versalitas de acento puntual).
- Cuerpo / interfaz: **Public Sans** o **IBM Plex Sans** — sans-serif geométrica, muy legible
  a tamaños pequeños, la que sostiene el 90% de la interfaz (formularios, navegación, listas).
- Dato / tabla: **IBM Plex Mono**.

**Textura y ornamento:** cero textura de papel. El único motivo decorativo permitido son
líneas de contorno cartográfico o una brújula/rosa de los vientos muy fina, usadas como
marca de agua de baja opacidad en estados vacíos o en la portada, nunca de fondo bajo texto.
El filete simple estructura las secciones, igual que en la dirección A.

**Paleta — tema claro** ("papel de mapa", frío, azul-gris):
| Rol | Nombre | Hex |
|---|---|---|
| Fondo | papel de mapa | `#E6E9EC` |
| Superficie (tarjetas) | niebla de mapa | `#D7DCDF` |
| Texto principal | tinta naval | `#16232B` |
| Texto secundario / borde | acero | `#4C5D66` |
| Acento primario | cobre *(versión texto-segura)* | `#8F5228` |
| Acento secundario | azul cartográfico | `#1F5C73` |

**Paleta — tema oscuro** ("pizarra naval"):
| Rol | Nombre | Hex |
|---|---|---|
| Fondo | pizarra naval | `#10171C` |
| Superficie (tarjetas) | pizarra media | `#1A2329` |
| Texto principal | niebla | `#DCE3E6` |
| Texto secundario / borde | acero claro | `#7C8B93` |
| Acento primario | cobre claro | `#C97D46` |
| Acento secundario | azul señal | `#4A9BB8` |

**Por qué encaja / no:** es la dirección que mejor soporta densidad de datos (tablas de
personajes, listas de sesiones, formularios largos) porque la sans-serif de interfaz no
compite con la lectura de prosa como sí hacen las serifs de A y B. El coste es que "medieval"
queda más implícito (tipografía de título + paleta + iconografía lineal) y menos inmediato a
primer golpe de vista — si el autor quiere que la ambientación se note nada más entrar, esta
es la dirección que menos lo entrega sin apoyo de ilustración/iconografía cuidada.

---

## 4. Contrastes calculados (WCAG 2.x, fórmula de luminancia relativa)

Umbrales: **4.5:1** texto normal · **3:1** texto grande (≥24px o ≥18.66px negrita) y
elementos de interfaz (bordes, iconos con función). Todos los pares por debajo del umbral de
texto se marcan **UI/large only**.

| Dirección · tema | Par | Ratio | Uso válido |
|---|---|---|---|
| A · claro | texto `#1B1D1A` / fondo `#E9EBE6` | **14.14:1** | texto de cuerpo |
| A · claro | texto secundario `#5B6058` / fondo `#E9EBE6` | **5.37:1** | texto de cuerpo |
| A · claro | acento lacre `#7A2E2E` / fondo `#E9EBE6` | **7.75:1** | texto de cuerpo |
| A · claro | acento verde `#2E4A3F` / fondo `#E9EBE6` | **8.07:1** | texto de cuerpo |
| A · claro | borde `#5B6058` / superficie `#DEE1D9` | **4.87:1** | UI y texto |
| A · oscuro | texto `#E7E5DD` / fondo `#14161A` | **14.36:1** | texto de cuerpo |
| A · oscuro | texto secundario `#8B9099` / fondo `#14161A` | **5.65:1** | texto de cuerpo |
| A · oscuro | acento brasa `#CC6259` / fondo `#14161A` | **4.71:1** | texto de cuerpo |
| A · oscuro | acento salvia `#5C8B76` / fondo `#14161A` | **4.67:1** | texto de cuerpo |
| B · claro | texto `#2B2417` / fondo `#E8DFC7` | **11.56:1** | texto de cuerpo |
| B · claro | texto secundario `#6B6048` / fondo `#E8DFC7` | **4.66:1** | texto de cuerpo |
| B · claro | acento oro viejo `#8A6A1E` / fondo `#E8DFC7` | **3.80:1** | **UI/large only** |
| B · claro | acento verde `#1F4A44` / fondo `#E8DFC7` | **7.45:1** | texto de cuerpo |
| B · oscuro | texto `#EDE4CC` / fondo `#171512` | **14.38:1** | texto de cuerpo |
| B · oscuro | texto secundario `#A69B7F` / fondo `#171512` | **6.61:1** | texto de cuerpo |
| B · oscuro | acento oro `#C9A227` / fondo `#171512` | **7.53:1** | texto de cuerpo |
| B · oscuro | acento jade `#4C9186` / fondo `#171512` | **4.95:1** | texto de cuerpo |
| C · claro | texto `#16232B` / fondo `#E6E9EC` | **13.16:1** | texto de cuerpo |
| C · claro | texto secundario `#4C5D66` / fondo `#E6E9EC` | **5.62:1** | texto de cuerpo |
| C · claro | acento cobre texto-seguro `#8F5228` / fondo `#E6E9EC` | **5.06:1** | texto de cuerpo |
| C · claro | acento azul `#1F5C73` / fondo `#E6E9EC` | **6.07:1** | texto de cuerpo |
| C · oscuro | texto `#DCE3E6` / fondo `#10171C` | **13.93:1** | texto de cuerpo |
| C · oscuro | texto secundario `#7C8B93` / fondo `#10171C` | **5.14:1** | texto de cuerpo |
| C · oscuro | acento cobre claro `#C97D46` / fondo `#10171C` | **5.60:1** | texto de cuerpo |
| C · oscuro | acento azul señal `#4A9BB8` / fondo `#10171C` | **5.74:1** | texto de cuerpo |

**Nota de implementación:** solo dos pares de los 24 no llegan a 4.5:1 —
`#8A6A1E`/`#E8DFC7` (B, oro viejo en claro, 3.80:1) y el cobre original de C antes de
ajustarlo (`#9C5A2E`, 4.40:1, sustituido en la tabla por `#8F5228`, 5.06:1, ya texto-seguro).
El oro viejo de B se queda intencionadamente por debajo de 4.5:1 porque su rol es UI (bordes,
iconos, foco) donde 3:1 basta; si en algún momento se quiere usar como color de texto (un
badge, una etiqueta), hay que oscurecerlo o reservarlo para texto grande en negrita.

---

## 5. Recomendación de lectura

Ninguna dirección es la "correcta" en abstracto — dependen de cuánto peso quiere el autor
para la ambientación frente a la densidad de trabajo:

- Si prima la legibilidad sostenida y el mínimo riesgo de recaer en el cliché → **A**.
- Si el autor quiere que la ambientación se note de inmediato y acepta vigilar el contraste
  del dorado con más cuidado → **B**.
- Si la prioridad es la densidad de datos (tablas, formularios largos) y "medieval" puede
  quedar en la tipografía de título y la paleta, no en la textura → **C**.
