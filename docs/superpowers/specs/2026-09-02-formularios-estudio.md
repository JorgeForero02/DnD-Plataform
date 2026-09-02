# Diseño de formularios — informe · 2026-09-02

> **Qué es esto.** El estudio (NN/g, GOV.UK, USWDS, Adam Silver, Material 3, Polaris,
> Atlassian) del que salieron los cambios de formularios del reseño: la visibilidad como radios
> con explicación, el diálogo más ancho para el markdown, y los botones pegados al fondo.
> Lo que **no** entró está en [06-pendientes](../../06-pendientes.md) como U8 y U9.
>
> Se conserva en el repositorio porque sus conclusiones se citan en decisiones tomadas, y un
> razonamiento cuya fuente vive en el borrador de una sesión es un razonamiento que nadie puede
> volver a comprobar.

---

Fecha: 2026-09-02. Fuentes primarias consultadas: Nielsen Norman Group (NN/g), GOV.UK Design
System, U.S. Web Design System (USWDS), Adam Silver (*Form Design Patterns* y su blog), Material
3, Shopify Polaris, Atlassian Design System (y sistemas emparentados: Carbon, PatternFly,
Designsystemet, HashiCorp Helios), más práctica documentada de Linear y Notion.

Contexto aplicado en cada sección: Field (etiqueta + control + error + pista, con
`aria-describedby`), Button (primary/secondary/ghost/danger), Dialog, Panel; validación Zod;
regla de contraste 4,5:1 texto / 3:1 interfaz medida en navegador.

---

## 1. Etiquetas: arriba, al lado, o flotantes

**Regla general: etiqueta siempre visible, encima del campo.** GOV.UK y USWDS —diseñados para
formularios de gobierno con la audiencia más amplia posible— usan por defecto etiqueta encima del
campo, en una sola columna. Es el patrón con menos ambigüedad y el que mejor escala a pantallas
estrechas sin recalcular anchos de columna.

**Placeholders no son etiquetas.** NN/g es explícito: los placeholders desaparecen en cuanto el
usuario escribe, así que en el momento de revisar o corregir el dato ya no hay ninguna pista
visible de qué pedía el campo; además el contraste bajo típico de un placeholder ya roza el
mínimo de legibilidad, y en un campo relleno automáticamente (autofill) el placeholder nunca se ve.
Su recomendación es usar el placeholder solo para información *suplementaria* dentro de un campo
que ya tiene etiqueta visible (un formato de ejemplo, por ejemplo), nunca como sustituto de la
etiqueta (NN/g, *Placeholders in Form Fields Are Harmful*).

**Etiquetas flotantes: rechazadas por NN/g y por la práctica de patrones densos.** Nacen ocupando
la posición del placeholder y luego migran arriba y encogen; mientras están en esa posición
intermedia se confunden con el propio valor del campo, y cuando encogen su contraste y tamaño
tienden a caer por debajo de lo legible. NN/g las considera "problemáticas" y solo preferibles a
usar *únicamente* un placeholder — nunca preferibles a una etiqueta fija fuera del campo cuando hay
espacio en pantalla (NN/g, *Placeholders in Form Fields Are Harmful*; UX Movement, *Why Infield
Top-Aligned Labels Beat Floating Labels*, cita este mismo hallazgo con capturas del defecto
visual).

**Aplicado al proyecto:** el primitivo `Field` ya asume etiqueta fija + pista + error — es la
elección correcta, no hay que introducir animación de flotado en ningún formulario nuevo. La única
decisión pendiente es la posición etiqueta-arriba (recomendado, universal) frente a
etiqueta-al-lado (aceptable solo en formularios muy cortos y muy repetitivos, tipo tabla de
ajustes, donde la alineación en columna ayuda a comparar valores — no es el caso de "Nombre / Texto
/ Etiquetas / Visibilidad").

---

## 2. Anchura de los campos: que mida lo que pide

GOV.UK lo formula sin rodeos: *"el ancho de un campo de texto debe hacer pensar al usuario en la
respuesta que se espera, no solo en el propio campo"* — un input de ancho completo para un campo
que solo admite un código postal transmite la señal equivocada, sugiere que hay que escribir mucho
más de lo que realmente cabe (GOV.UK Design System, componente *Text input*). El sistema define
anchos fijos en caracteres para casos con longitud conocida (código postal, teléfono) y deja fluido
(100% del contenedor) el resto.

Aplicado al catálogo de campos del proyecto:

- **Nombre** (corto, longitud acotada): ancho fijo o `max-width` moderado (~40-60 caracteres),
  nunca ancho completo del diálogo — un campo que ocupa todo el ancho para un nombre de PJ o de
  entidad sugiere erróneamente que se espera una frase larga.
- **Texto markdown** (largo, multilínea): ancho completo del contenedor, con altura ajustable o
  varias filas visibles; aquí sí se justifica ocupar todo el espacio porque el contenido es largo
  por naturaleza.
- **Etiquetas** (lista corta de tokens): ancho completo pero de una sola línea de altura visual, ya
  que el contenido son fragmentos cortos, no prosa.
- **Visibilidad** (select de 5 opciones con texto corto): ancho ajustado al texto de la opción más
  larga, no ancho completo — un select de ancho completo con una palabra dentro deja un vacío que
  no comunica nada.
- **Fecha** (si aparece en sesiones): ancho fijo acorde al formato (dd/mm/aaaa), igual que GOV.UK
  trata los campos de fecha como tres inputs cortos en fila, no uno largo.

**Por qué importa:** el ancho es una señal de affordance silenciosa — le dice al usuario, antes de
leer nada, cuánto se espera que escriba. Descuidarlo no rompe la funcionalidad pero añade fricción
de lectura en cada formulario del sistema.

---

## 3. Agrupación y ritmo

**Fieldset/legend para grupos con significado semántico**, no solo visual. La técnica WCAG H82 y
la práctica documentada (Tetralogical, *Foundations: grouping forms with fieldset and legend*;
GOV.UK Accessibility blog) coinciden: cuando varios controles responden a una sola pregunta —el
caso típico es un grupo de radios, o "Visibilidad" + su selección de jugadores condicionada—, el
agrupamiter debe declararse en el marcado (`fieldset`/`legend` o `role="group"` con
`aria-labelledby`), no solo con espaciado en CSS, porque un lector de pantalla no infiere una
relación que solo existe visualmente.

**Espaciado como jerarquía, no como decoración.** La práctica documentada de UI densa (guías de
densidad de Material/MUI y análisis de Linear) usa una escala de espaciado consistente en múltiplos
de 4 u 8 px: espacio pequeño y uniforme *entre* campos del mismo grupo, espacio mayor *entre*
grupos, y un filete (`border-top` sutil) o un salto de sección con título solo cuando el formulario
mezcla temas claramente distintos (por ejemplo, "Datos" vs "Visibilidad y jugadores" en un mismo
diálogo). Para un formulario de 4-5 campos como los del proyecto (Nombre, Texto, Etiquetas,
Visibilidad), un único bloque sin subtítulos internos es preferible: subdividir en secciones un
formulario de cinco campos añade jerarquía donde no hace falta.

**Regla práctica para el proyecto:** un solo ritmo de espaciado vertical entre `Field`s dentro de
un mismo diálogo; reservar el filete/sección con título para diálogos que crezcan (p. ej. si
"ajustes de campaña" agrupase datos generales + jugadores + peligro/borrado en una sola pantalla,
ahí sí conviene una sección "Zona de peligro" separada visualmente, patrón habitual en GitHub y
Atlassian para acciones destructivas).

---

## 4. Errores: dónde, cuándo y cómo se anuncian

**Colocación:** el error va pegado al campo que lo causa. NN/g es tajante — colocar el mensaje
lejos del campo obliga al usuario a sostener el error en memoria de trabajo mientras busca el
campo; el mensaje debe aparecer inmediatamente adyacente, típicamente debajo del control (NN/g,
*10 Design Guidelines for Reporting Errors in Forms*). El primitivo `Field` ya resuelve esto con
`aria-describedby` apuntando al nodo de error — es el patrón correcto, solo hay que asegurarse de
que el error real (mensaje de Zod) sustituye o se añade a la pista, no la tapa silenciosamente.

**Cuándo validar:** Adam Silver, tras revisar la investigación disponible y su propia práctica, es
explícito en contra de la validación mientras se escribe (*live validation*): el primer carácter
de un campo que exige una longitud mínima ya dispara error, interrumpiendo al usuario antes de que
termine de responder. Su recomendación operativa: **validar al enviar** el formulario como caso
general, y como mucho validar al perder el foco (`blur`) del campo cuando el coste de esperar al
envío es alto (Adam Silver, blog y *Form Design Patterns*; USWDS coincide: en formularios largos
conviene combinar validación en línea con el resumen, pero nunca disparar el error antes de que el
usuario haya tenido ocasión de completar el campo).

**Resumen de errores arriba:** tanto Adam Silver como USWDS coinciden en que el patrón robusto es
**resumen arriba + mensaje individual junto a cada campo**, no uno u otro por separado. El resumen
da una vista global inmediata (importante para quien navega con teclado o lector de pantalla y no
quiere recorrer todo el formulario a tientas); el mensaje individual da el contexto en el sitio
donde se corrige. Cada entrada del resumen debe ser un enlace que mueve el foco al campo
correspondiente (USWDS, *Foundations: form validation and error messages* vía Tetralogical). NN/g
añade que el foco debe moverse al resumen (o anunciarse vía región `aria-live`) al fallar el envío,
para que quien usa lector de pantalla se entere de que algo ha ido mal sin tener que "descubrirlo"
navegando campo a campo.

**Anuncio a lector de pantalla:** `aria-invalid="true"` en el campo con error, `aria-describedby`
enlazando al texto del error (ya presente en `Field`), y el resumen de errores dentro de una región
que reciba foco o `aria-live="assertive"` al aparecer — nunca depender solo de color para señalar el
error (NN/g y USWDS, ambos citan el requisito WCAG de no usar color como único indicador).

**Aplicado al proyecto:** los diálogos actuales (crear/editar ficha, sesión, personaje) son cortos
—4-5 campos—, así que un resumen de errores es más discutible ahí (el coste de construirlo puede
superar el beneficio con tan pocos campos, donde el error individual junto al campo ya es visible
sin scroll). Donde sí se justifica con fuerza es en **registro** y **ajustes de campaña**, formularios
de pantalla completa con más campos y más probabilidad de que el usuario no vea todos los errores
a la vez.

---

## 5. Ayudas y pistas

La pista (hint) va **entre la etiqueta y el control**, nunca después del control ni solo como
tooltip — así la lee quien usa lector de pantalla antes de llegar al campo, y así la ve quien usa
navegación visual antes de escribir, evitando que tenga que corregir después de haber escrito ya
algo incorrecto (patrón consistente en GOV.UK, USWDS y en el propio `Field` del proyecto, que ya
sitúa la pista junto a la etiqueta con `aria-describedby`).

**Cuándo estorban:** una pista que repite lo que la etiqueta ya dice ("Nombre — escribe el
nombre") no aporta nada y añade ruido visual permanente; una pista de una frase larga cambia el
ritmo vertical del formulario. La pista se reserva para lo que la etiqueta no puede comunicar por sí
sola: formato esperado (p. ej. "separa las etiquetas con comas"), límites no evidentes (longitud
máxima), o una aclaración de dominio (qué implica cada nivel de visibilidad, si el nombre del nivel
no basta). Si la aclaración es larga o solo relevante en el momento de elegir, mejor un tooltip o
un texto de ayuda contextual junto al control específico (p. ej. junto al select de Visibilidad)
que hinchar la pista de todos los campos por igual.

---

## 6. Botones: orden, posición, "Cancelar" y acción destructiva

**No hay un único orden universal — hay una convención de plataforma, y lo que importa es la
consistencia dentro del propio producto.** NN/g documenta el histórico desacuerdo Windows
(OK a la izquierda, Cancel a la derecha) vs macOS/web moderna (Cancel a la izquierda, la acción
que avanza —OK/Guardar— a la derecha) y concluye que ninguna es objetivamente superior; lo que sí
es un error es mezclar los dos órdenes dentro de la misma aplicación (NN/g, *OK-Cancel or
Cancel-OK? The Trouble With Buttons*). La práctica dominante en diseño web moderno (Material 3,
Atlassian, Carbon, PatternFly, Designsystemet) es: **acción primaria a la derecha, secundaria/
cancelar a su izquierda**, siguiendo el orden de lectura y el hábito de "avanzar hacia la derecha".

**Reglas de sistemas de diseño actuales, con las que el proyecto ya es consistente al tener
primary/secondary/ghost/danger:**
- Exactamente un botón primario por diálogo; representa la acción principal (Material 3 /
  Atlassian).
- El botón secundario ("Cancelar") es visualmente más discreto (secondary o ghost, nunca del mismo
  peso que el primario) — así el ojo va directo a la acción esperada.
- **Acción destructiva:** cuando la acción del diálogo es en sí destructiva (confirmar borrado), el
  botón destructivo ocupa la posición del primario (a la derecha), pero el **foco inicial al abrir
  el diálogo se pone en Cancelar, nunca en el botón destructivo** — así una pulsación accidental de
  Enter no borra nada (patrón citado por Atlassian/Forge y por UX Psychology, *How to design
  better destructive action modals*).
- Si Borrar convive con Guardar/Cancelar en el mismo diálogo de edición (como en los formularios
  del proyecto), la práctica más segura es separar Borrar del par Guardar/Cancelar —a la izquierda
  del diálogo o en su propia zona, no pegado a Guardar— para que un usuario que aprieta por hábito
  el botón de la derecha no encuentre "Borrar" ahí.

**"Cancelar" — qué debe hacer:** cerrar el diálogo sin aplicar ningún cambio, siempre disponible,
nunca deshabilitado ni con estado de carga (solo el primario refleja el estado de envío).

---

## 7. Diálogos modales: cuándo sí, cuándo no, tamaño, foco y cambios sin guardar

**Cuándo son adecuados:** NN/g recomienda modal para (a) advertencias importantes que pueden
perder trabajo del usuario o tener consecuencias irreversibles, y (b) pedir un dato imprescindible
para continuar un flujo que el propio usuario inició. Recomienda **no** usar modal para información
no esencial ni relacionada con la tarea en curso (NN/g, *Modal & Nonmodal Dialogs: When (& When
Not) to Use Them*). Crear/editar una ficha del mundo, una sesión o un personaje encaja bien en modal
porque es una acción iniciada por el usuario con datos que se pueden perder; una pantalla de
ajustes de campaña completa, en cambio, encaja mejor como pantalla propia (como ya está planteado
en el proyecto) porque no es una interrupción puntual sino un lugar al que se navega.

**Tamaño:** los sistemas de diseño maduros (Carbon, PatternFly) definen tamaños discretos con
altura máxima fija, y cuando el contenido supera esa altura, **el cuerpo hace scroll interno
mientras cabecera y pie permanecen fijos** — así los botones Guardar/Cancelar siempre están
visibles sin tener que hacer scroll hasta el final. Aplica directamente al formulario con markdown
+ vista previa, que puede crecer bastante: el diálogo debe tener una altura máxima razonable con
scroll interno del cuerpo, footer de botones fijo.

**Foco:** al abrir, el foco inicial va al primer elemento interactivo del diálogo (o al título si
no hay un campo obviamente "primero"); mientras está abierto, el foco queda atrapado dentro
(`focus trap`) y no debe poder escapar por Tab hacia el contenido de detrás (NN/g). Al cerrar, el
foco vuelve al elemento que abrió el diálogo — el `Dialog` del proyecto debería garantizar esto si
no lo hace ya.

**Escape y cierre accidental con cambios sin guardar:** la práctica extendida (NN/g sobre
confirmación, Atlassian/Forge sobre modales) es que Escape y el clic fuera del diálogo cierran sin
guardar cuando el formulario está limpio, pero si hay cambios sin guardar, el cierre (por Escape,
por click fuera, o por el propio Cancelar) debe interceptarse con una confirmación breve ("¿Descartar
cambios?") en vez de perder el trabajo en silencio — es el mismo principio que justifica usar un
modal en primer lugar (evitar pérdida de trabajo). Aplicado al proyecto: los diálogos de crear/
editar (con Texto markdown, que puede llevar minutos escribir) son justo el caso donde esta
protección importa más; un diálogo de confirmación de borrado, en cambio, no tiene "cambios sin
guardar" que proteger y puede cerrar sin preguntar dos veces.

---

## 8. Campos especiales: select vs radios; selección múltiple de personas

**Select vs radios, con cinco opciones con significado (visibilidad):** GOV.UK fija el umbral con
más claridad — grupo de radios (o checkboxes) cuando hay **menos de cuatro** opciones; select
cuando hay **cuatro o más**. Con cinco niveles de visibilidad, el umbral cae justo del lado del
select según esa regla, pero el criterio de GOV.UK no es solo el conteo: es también cuánto espacio
en pantalla se puede dedicar y si todas las opciones deben ser visibles a la vez para que el
usuario compare antes de decidir. Con visibilidad —una decisión de la que depende quién ve el
contenido, y donde una opción despliega un sub-control (selección de jugadores)— hay un argumento
fuerte a favor de **radios en vez de select** pese al conteo: los radios muestran las cinco
opciones simultáneamente, sin exigir un clic extra para desplegar y comparar, lo que reduce el
riesgo de elegir una visibilidad equivocada por no haber leído las demás opciones antes de decidir.
Es un caso en el que "significado de la elección" pesa más que el conteo mecánico de GOV.UK — el
propio umbral de GOV.UK es una guía por defecto, no una regla absoluta, y su racional (visibilidad
simultánea de las opciones para decisiones donde el usuario debe comparar) apunta aquí a radios.
**Recomendación:** grupo de radios verticales, con la opción que despliega la selección de
jugadores mostrando ese sub-control inline justo debajo de sí misma cuando está marcada (patrón de
"revelado progresivo" estándar, evita un segundo diálogo o un salto de foco).

**Selección múltiple de personas:** el patrón contrastado para elegir varias personas de una lista
que puede crecer es el **combobox con multi-selección** (ARIA 1.2 Combobox + Listbox pattern),
documentado en detalle por Shopify Polaris: un campo de texto que al escribir filtra la lista de
opciones en un popover, y las personas ya elegidas quedan representadas como chips/tags editables
dentro o junto al campo, removibles individualmente (Polaris, *Combobox* y *Autocomplete*). Para
una campaña de D&D con un puñado de jugadores (probablemente menos de diez), una alternativa más
simple y perfectamente válida es una lista de checkboxes con los nombres de los jugadores —menos
componente que construir, y GOV.UK avala checkboxes para selección múltiple de una lista corta y
estable—; el combobox con chips solo se justifica si el número de jugadores por campaña puede
crecer mucho o si hace falta buscar por nombre.

---

## 9. Estados: cargando, enviando, deshabilitado con motivo, solo lectura

**No usar `disabled` puro salvo que sea imprescindible.** Un botón con el atributo HTML `disabled`
deja de recibir foco por teclado, así que un usuario que navega con Tab nunca llega a saber que ese
control existe ni por qué está inactivo (css-tricks, *Making Disabled Buttons More Inclusive*;
Adrian Roselli, *Don't Disable Form Controls*). La alternativa recomendada es **`aria-disabled="true"`**:
el control sigue siendo enfocable y anunciado por el lector de pantalla como deshabilitado, y puede
llevar un texto (tooltip, pista o mensaje junto al campo) que explique *por qué* está inactivo — no
basta con que se vea gris, hay que decir el motivo ("Completa el nombre para guardar").

**Estado de envío/carga en el botón primario:** al enviar, el botón cambia a un estado visual de
carga (spinner + texto tipo "Guardando…") y se marca `aria-disabled` (no `disabled`) para no perder
el foco ni romper la navegación; se añade una región `aria-live` oculta visualmente que anuncie el
cambio de estado ("Guardando perfil…", "Guardado") para quien no ve el spinner (bekk.christmas,
*Making an accessible loading button*). Mientras se envía, el resto de campos puede quedar
de solo lectura pero visibles con su valor, no ocultos ni vaciados.

**Solo lectura:** un campo de solo lectura debe distinguirse visualmente de uno editable (menos
contraste de fondo, sin foco de "campo activo") pero seguir cumpliendo el contraste mínimo de texto
—4,5:1— porque sigue siendo información que hay que poder leer, no un elemento decorativo.

---

## 10. Densidad: herramienta de uso intensivo vs formulario de alta ocasional

La diferencia documentada entre Linear/Notion y un formulario de registro de una web de consumo no
está en romper las reglas de accesibilidad o de claridad, sino en **la escala de espaciado y en
cuánto se apoya en aprendizaje repetido del usuario**. El análisis del rediseño de Linear señala
que ajustaron sidebar, tabs, cabeceras y paneles para reducir ruido visual manteniendo alineación
consistente, no para meter más controles sin criterio (Linear, *How we redesigned the Linear UI*).
La práctica general de UI densa referenciada usa una escala de espaciado de 4-8-12 px en vez de
16-24 px, y asume una audiencia que usa la herramienta muchas horas y memoriza atajos y
posiciones, así que puede permitirse controles más pequeños y más juntos sin sacrificar
usabilidad para *esa* audiencia — el trade-off es aceptable precisamente porque no es la primera
vez que la ven.

**Aplicado al proyecto:** hay dos contextos bien distintos que ya están implícitos en el encargo:

- **Pantallas de acceso/registro/cuenta**: la audiencia las usa poco, sin aprendizaje previo —
  aquí corresponde el espaciado "normal" (16-24 px), etiquetas grandes, ayuda generosa, exactamente
  las reglas de GOV.UK/USWDS descritas arriba sin recortar nada.
- **Diálogos de crear/editar ficha, sesión, personaje, y la pantalla de ajustes de campaña**: el
  DM y los jugadores los van a abrir muchas veces por sesión de juego. Aquí se puede aplicar una
  densidad más cercana a Linear/Notion — espaciado vertical más ajustado entre campos, controles
  algo más compactos— **sin tocar el tamaño de fuente del texto de error/ayuda por debajo de lo que
  garantiza 4,5:1**, y sin eliminar las etiquetas visibles ni el hint cuando aporta información real.
  La densidad reduce espaciado y tamaño de elementos decorativos, nunca el contraste ni la
  presencia de la etiqueta — esa es la línea que no hay que cruzar al "comprimir" un formulario.

---

## Cambios concretos priorizados

1. **Añadir estado `aria-disabled` + motivo visible al botón Guardar en vez de `disabled` puro** —
   hoy un usuario con teclado/lector de pantalla puede perder el control sin saber por qué está
   inactivo. Coste: bajo.
2. **Confirmar cierre de diálogo si hay cambios sin guardar** (Escape, click fuera, Cancelar) en
   los diálogos con campo de Texto markdown — evita perder minutos de redacción por un clic
   accidental. Coste: medio.
3. **Separar visualmente el botón Borrar del par Guardar/Cancelar** en los diálogos de edición, y
   poner el foco inicial en Cancelar cuando el diálogo es de confirmación de borrado — evita
   borrados accidentales por hábito de "botón de la derecha". Coste: bajo.
4. **Revisar el ancho de los campos Nombre y Visibilidad para que no ocupen el 100% del diálogo** —
   hoy probablemente heredan el ancho completo del formulario; su contenido es corto y el ancho
   completo transmite una expectativa equivocada. Coste: bajo.
5. **Cambiar el select de Visibilidad por un grupo de radios verticales** con revelado progresivo
   de la selección de jugadores bajo la opción marcada — cinco opciones con significado se
   comparan mejor todas visibles a la vez que ocultas en un desplegable. Coste: medio.
6. **Asegurar scroll interno del cuerpo del diálogo con footer de botones fijo** cuando el
   markdown+preview crece — hoy si el diálogo tiene altura fija sin scroll interno, Guardar/Cancelar
   pueden quedar fuera de la vista. Coste: bajo-medio.
7. **Añadir resumen de errores accesible arriba del formulario en Registro y en Ajustes de
   campaña** (no en los diálogos cortos de 4-5 campos, donde no aporta tanto) — mejora crítica para
   navegación por teclado/lector de pantalla en los formularios más largos. Coste: medio.
8. **Confirmar que la validación se dispara al enviar (o como mucho al perder foco), nunca al
   teclear** — si algún campo ya valida en `onChange` con Zod, cambiarlo a validar en submit/blur
   para no interrumpir al usuario a mitad de frase. Coste: bajo (probablemente ya es así, verificar).
9. **Auditar que ningún placeholder sustituye a una etiqueta** en los formularios existentes y que
   los placeholders que queden sean solo ejemplos de formato, no la única pista del campo. Coste:
   bajo.
10. **Aplicar una escala de espaciado más compacta (densidad "herramienta") a los diálogos de
    crear/editar** sin tocar tamaño de texto de error/ayuda ni el contraste — mejora el ritmo de
    uso repetido del DM sin sacrificar accesibilidad. Coste: medio.
11. **Revisar que el foco vuelva al elemento que abrió el diálogo al cerrarlo**, y que quede
    atrapado dentro mientras está abierto — comprobar si el primitivo `Dialog` ya lo garantiza.
    Coste: bajo (si falta, medio).
12. **Para la selección de jugadores, usar lista de checkboxes en vez de combobox con chips**
    mientras el número de jugadores por campaña sea pequeño — menos componente que mantener, mismo
    resultado de accesibilidad; reservar el combobox para si esa lista puede crecer mucho. Coste:
    bajo (ya construido probablemente vía checkboxes o similar; verificar).

---

## Fuentes citadas

- Nielsen Norman Group — [Placeholders in Form Fields Are Harmful](https://www.nngroup.com/articles/form-design-placeholders/)
- Nielsen Norman Group — [10 Design Guidelines for Reporting Errors in Forms](https://www.nngroup.com/articles/errors-forms-design-guidelines/)
- Nielsen Norman Group — [Modal & Nonmodal Dialogs: When (& When Not) to Use Them](https://www.nngroup.com/articles/modal-nonmodal-dialog/)
- Nielsen Norman Group — [Confirmation Dialogs Can Prevent User Errors](https://www.nngroup.com/articles/confirmation-dialog/)
- Nielsen Norman Group — [OK-Cancel or Cancel-OK? The Trouble With Buttons](https://www.nngroup.com/articles/ok-cancel-or-cancel-ok/)
- Nielsen Norman Group — [Button States: Communicate Interaction](https://www.nngroup.com/articles/button-states-communicate-interaction/)
- GOV.UK Design System — [Text input](https://design-system.service.gov.uk/components/text-input/)
- GOV.UK Design System — [Radios](https://design-system.service.gov.uk/components/radios/) / [Checkboxes](https://design-system.service.gov.uk/components/checkboxes/)
- GOV.UK Accessibility blog — [Using the fieldset and legend elements](https://accessibility.blog.gov.uk/2016/07/22/using-the-fieldset-and-legend-elements/)
- USWDS (designsystem.digital.gov) — [Validation](https://designsystem.digital.gov/components/validation/) y análisis vía Tetralogical, [Foundations: form validation and error messages](https://tetralogical.com/blog/2024/10/21/foundations-form-validation-and-error-messages/)
- Adam Silver — blog y *Form Design Patterns* (validación al enviar/blur, resumen + inline combinados)
- UX Movement — [Why Infield Top-Aligned Labels Beat Floating Labels](https://uxmovement.com/forms/infield-top-aligned-labels-floating-labels/)
- Shopify Polaris — [Combobox](https://polaris-react.shopify.com/components/selection-and-input/autocomplete) (patrón ARIA combobox + listbox para multi-selección)
- Atlassian Design System / Forge — [Modal](https://developer.atlassian.com/platform/forge/ui-kit/components/modal/) (botón primario único, danger en posición primaria, foco en Cancelar)
- UX Psychology — [How to design better destructive action modals](https://uxpsychology.substack.com/p/how-to-design-better-destructive)
- css-tricks — [Making Disabled Buttons More Inclusive](https://css-tricks.com/making-disabled-buttons-more-inclusive/)
- Adrian Roselli — [Don't Disable Form Controls](http://adrianroselli.com/2024/02/dont-disable-form-controls.html)
- bekk.christmas — [Making an accessible loading button](https://www.bekk.christmas/post/2023/24/accessible-loading-button)
- Linear — [How we redesigned the Linear UI (part II)](https://linear.app/now/how-we-redesigned-the-linear-ui)
- Material 3 / Carbon / PatternFly / Designsystemet / HashiCorp Helios — convenciones de orden y tamaño de botones y modales (consultadas de forma agregada en la búsqueda de patrones de diálogo)
