# Identidad visual — «Sala de guerra» · 2026-09-02

**Encargo del autor.** *"quiero una identidad buena decente algo manejable y comodo"*,
*"que evoque medival y modernidad"*, y sobre el tono, textualmente: *"me gusta pero quiero
matices de las otras dos opciones, algo que muestre esto es digital pero que evoque época"*.

**Traducción a una decisión.** La aplicación tiene **dos pieles, y es a propósito**:

- **El cromado** —menús, listas, formularios, todo lo que se **opera**— es digital, oscuro,
  denso y sobrio. Es una herramienta de trabajo y se usa durante horas.
- **El contenido del mundo** —la ficha de un NPC, el texto de una misión, lo que se **lee**—
  se sirve sobre una superficie cálida de vitela, como un documento dentro de la herramienta.

Esa frontera es la idea de todo el sistema. Un panel de ajustes nunca es pergamino; el
cuerpo de una entidad nunca es un formulario.

## Por qué esta dirección y no las otras dos

Se estudiaron tres. **«Cartulario iluminado»** (pergamino de arriba abajo) se descartó: es
justo el tópico que el autor ya rechazó al ver la aplicación en crema, y una textura
constante estorba a las tres horas. **«Grimorio de bolsillo»** era sobria y correcta, pero
poco memorable. **«Sala de guerra»** evoca la época por **cartografía y grabado** —la mesa
de mapas, el compás, el filete— y no por pergamino, así que llega al mismo sitio por un
camino que nadie ha gastado.

> **Lo que hay que evitar, dicho explícitamente:** crema `#F4F1EA` + serif de alto contraste
> + acento terracota, y negro con verde ácido. Son los dos aspectos por defecto de las
> interfaces generadas. El estado actual de la aplicación es exactamente el primero, y por eso
> se lee como plantilla.

## Paleta

**Tema oscuro (por defecto):**

| Papel | Nombre | Hex |
|---|---|---|
| Fondo | pizarra naval | `#10171C` |
| Superficie (tarjetas, menús) | pizarra media | `#1A2329` |
| Texto principal | niebla | `#DCE3E6` |
| Texto secundario y borde | acero claro | `#7C8B93` |
| Acento primario | cobre claro | `#C97D46` |
| Acento secundario | azul señal | `#4A9BB8` |

**Tema claro:**

| Papel | Nombre | Hex |
|---|---|---|
| Fondo | papel de mapa | `#E6E9EC` |
| Superficie | niebla de mapa | `#D7DCDF` |
| Texto principal | tinta naval | `#16232B` |
| Texto secundario y borde | acero | `#4C5D66` |
| Acento primario | cobre (versión segura para texto) | `#8F5228` |
| Acento secundario | azul cartográfico | `#1F5C73` |

**La superficie de vitela** —solo para el cuerpo del mundo— se define aparte y **debe
existir en los dos temas**: cálida y clara sobre tema claro, cálida y apagada sobre tema
oscuro, nunca un rectángulo blanco quemando en una pantalla nocturna.

> **Los contrastes no se declaran, se miden.** `apps/web/e2e/tokens-contrast.spec.ts` ya
> compone el alfa y comprueba 4,5:1 en texto y 3:1 en interfaz, en los dos temas. Cada color
> nuevo entra por ahí o no entra. Si alguno no pasa, **se cambia el color**, nunca el umbral.

## Tipografía — tres voces, una por trabajo

| Papel | Tipografía | Dónde |
|---|---|---|
| Título | **Marcellus** | Nombres de campaña y de entidad, encabezados de sección. Es capital romana: evoca lo grabado sin ser gótica ilegible |
| Interfaz | **Public Sans** | Menús, botones, etiquetas, formularios, listas. Neutra, densa, hecha para leerse pequeña |
| Mundo | **EB Garamond** | Solo el cuerpo del contenido: la descripción de un NPC, el texto de una misión. Es la voz del manual |
| Dato | **IBM Plex Mono** | Números y tablas: características, CA, puntos de golpe, dados. Cifras que se alinean |

Las cuatro están en Google Fonts, que es lo único que el proyecto puede cargar, y cada una
lleva su pila de reserva. **Cuatro es el techo**: una quinta voz no aporta y cuesta peso.

## Ornamento — la regla

Se permite lo que **el grabado** haría y **la impresión** puede: filete fino, versalita,
capitular en la primera letra del cuerpo del mundo, y una regla ornamental como separador de
secciones. Se prohíbe la textura de fondo generalizada, el borde con bisel, la sombra
pronunciada y cualquier adorno que no sobreviva a 300 filas en pantalla.

**Cada ornamento tiene que decir algo.** Un filete separa; una versalita clasifica; una
capitular marca dónde empieza el mundo. Adorno que no informa, se quita.

## La visibilidad es parte de la identidad

Los cinco niveles son el rasgo diferencial del producto y hoy se muestran como una insignia
más, con el mismo peso que una etiqueta cualquiera (hallazgo B5 de la auditoría). En este
sistema **la visibilidad tiene su propio lenguaje visual**, constante en toda la aplicación,
y lo secreto se lee de un vistazo sin que el DM tenga que pararse a mirar.

**Presentarlo mejor no es controlarlo:** `canView` en el servidor sigue siendo el dueño
único de quién ve qué. La interfaz solo pinta lo que el servidor ya decidió.
