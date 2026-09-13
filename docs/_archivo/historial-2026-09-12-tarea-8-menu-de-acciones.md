# Archivo — Tarea 8 del pulido: `MenuDeAcciones` y la fila del elenco (2026-09-12)

Movida entera desde `docs/07-historial.md` el 2026-09-13, al insertar las entradas de las tareas
12–14 del pulido (el fichero seguía en 1002 de 1000 tras los dos primeros archivados del mismo
corte). Era la entrada completa más antigua.

---

## Tarea 8 del pulido: `MenuDeAcciones` y la fila del elenco (2026-09-12, C2 #1)

Qué — `ui/MenuDeAcciones.tsx`, nuevo: el menú «…» genérico que la regla de
`docs/04-convenciones.md` ya nombraba (`ACCIONES_VISIBLES` = 2, D-CF-59). Consume `IconoMenu`
(Tarea 7); `<AccionDeMenu>` trae `id`, `rotulo`, `icono?`, `onSelect`, `disabled?`, `motivo?`
(leído por `aria-describedby`) y `tono?`. Teclado completo: flechas mueven el foco entre ítems
con vuelta al principio/final, Home/End al primero/último, Enter/Espacio seleccionan, Escape
cierra y devuelve el foco al botón, Tab lo cierra sin devolverlo, y un clic fuera también lo
cierra. Se abre hacia donde mide que hay sitio (`medirSitio`, costura de prueba documentada en
la firma — no una prop de producto).

`MandosDeCombatiente.tsx` (siete controles antes, hasta salirse de la tarjeta — anexo #1): solo
«Daño» y «Curar» quedan como botones; «Condición», «Dar…» y «Su hoja» pasan al menú, y
`accionesDeBando` (prop nueva, `AccionDeMenu[]`, `[]` por defecto) se añade al final. `DarObjeto`
gana `controlado?: { abierto; onCerrar }`: con él no pinta su propio botón «Dar» —el ítem del
menú ya lo abre y lo cierra—; sin él (`ResultadoDeTabla.tsx`, botín de una tabla del DM) se
comporta exactamente como antes. `CorregirBando.tsx` gana `useAccionesDeBando(p)`, que devuelve
los mismos tres ítems que su variante de fila usando el mismo `useSetSide`/`BANDOS` — no una
segunda implementación. La fila quedó sustituida por el menú: sus aserciones se movieron a los
`menuitem` con su razón escrita en cada prueba, y el componente de fila, sin consumidor ni
prueba propia, se borró en la ronda de arreglo 3 (abajo). *(Esta frase decía «se queda
intacta, para no borrar su prueba» hasta esa ronda; era falsa: la prueba ya se había movido.)*
`FichaDeElenco`/`FichaDePnj` dejan de montar `<CorregirBando />` aparte y llaman al hook siempre
(valores de repuesto cuando falta encuentro/bando/sesión, por la regla de los hooks), pasando la
lista real al menú solo cuando la misma puerta que antes decidía montar la fila —`conMandos`/
`esDm` + `enCombate` + `bando` + `sessionId` + `encounterId` + `combatanteId`— sigue abierta.

Pruebas — TDD: `MenuDeAcciones.test.tsx` (5), `fireEvent` en vez de `userEvent` porque
`@testing-library/user-event` no es dependencia del paquete (comprobado antes de escribir, no
se añadió). `FichaDeElenco.test.tsx`, `ColumnaElenco.test.tsx` y `DarObjeto.test.tsx`: las
aserciones que buscaban el `group`/botón de fila **cambiaron de camino** (abrir el menú, mirar
sus `menuitem`) y **no se borró ninguna** — dos de ellas necesitaron `findByRole` en vez de
`getByRole` porque los ítems de bando llegan por una consulta más (`useCurrentEncounter`) que
puede resolver después de que el menú ya esté abierto. `DarObjeto.test.tsx` suma tres casos del
modo `controlado`. Mutación: quitar la rama `Escape` de `MenuDeAcciones.tsx` (`cp` de por medio)
puso roja la unitaria del foco; restaurado con `cp`. Unitarias en verde, ninguna desactivada
(el conteo lo escribe el bloque generado de [00-INDEX.md](./00-INDEX.md), no esta línea).

e2e (editados, no corridos por el implementador — los corre el orquestador):
`teclado.spec.ts` gana un recorrido nuevo, el menú por teclado entero (Tab hasta «Más acciones
sobre …», Enter abre y mueve el foco al primer ítem, ArrowDown al segundo, Escape cierra y
devuelve el foco, Enter+Enter selecciona y abre «Condición»). `combate.spec.ts` no citaba
«Condición»/«Dar»/el ojo — no necesitó cambios. `dar-a-un-pnj.spec.ts`: el clic en «Dar» de la
fila pasó a abrir «Más acciones sobre Borin Barbaférrea» y elegir el `menuitem` «Dar…».
`espacios.spec.ts` gana la medida del anexo #1: la fila de mandos de una tarjeta no se sale de
su rectángulo, a 1280×800. `tokens-contrast.spec.ts` gana una superficie: el menú abierto sobre
un combatiente real, en los tres temas.

Documentación — 04 ya nombraba el componente (Tarea 0); se le añadió la línea de qué se plegó
y cuándo. 08: fila nueva `teclado` (no tenía fila propia pese a existir desde antes) y se
corrigió una frase que decía que Playwright no cubría teclado, cuando `teclado.spec.ts` ya
existía; `espacios`, `dar-a-un-pnj` y `tokens-contrast` ganan una frase cada una sobre su
medida/camino nuevos.

Ronda de arreglo 3 (revisión de `1c30fe8..6b54aa4`) — cuatro hallazgos. (1) La medida de
`espacios.spec.ts` era **vacía**: medía el `<div>` de la fila, caja de bloque que nunca sobresale
de su tarjeta; lo que se salía en el anexo #1 eran sus hijos. Ahora mide cada hijo directo contra
el borde de la tarjeta (±1px) y `scrollWidth ≤ clientWidth` en la fila. (2) `useAccionesDeBando`
**tragaba el error** que la fila pintaba con `role="alert"`: devuelve `{ acciones, error }` y
`MandosDeCombatiente` (prop `errorDeBando`) lo pinta bajo la fila; RTL con `setSide` rechazando.
(3) El componente de fila `CorregirBando` **se borró** (sin consumidor ni prueba). (4) «Neutral»
**perdió su frase**: `AccionDeMenu` gana `descripcion?`, leída por `aria-describedby` aparte de
`motivo` (con los dos, se enlazan los dos ids) y pintada FUERA del botón para no entrar en su
nombre; el hook la pone en NEUTRAL. Menores: `activo` se acota si la lista encoge; Escape hace
`stopPropagation` para no cerrar un `Dialog` que lo contenga (D-CF-50). Mutación: sin `error` ni
`descripcion` en el hook, dos unitarias en rojo; restaurado.

Ronda de arreglo 4 (controlador): el arreglo 2 de `espacios.spec.ts` («…La mesa tira», anexo #8)
decía que la carrera era una tipografía tardía de Google Fonts; era falso — la guía de CD
(`useGuiaDeCd`, solo en `PanelDeDadosDeLaMesa.tsx`) llega del servidor después del primer pintado y
suma 33.5 px si la medida se toma antes, así que esa prueba espera ahora a que su primer botón
(«Muy fácil…») esté visible. **Corrección (Tarea 15, 2026-09-13): esta línea decía que «la de la
pantalla «Dados» no monta esa guía y se queda igual» — era falsa desde la ronda 5 de la Tarea 8
(commit `4af7dad`): `PedirTirada`, hermano de `PanelDeDados` bajo el mismo `items-stretch`, monta
la misma guía de CD (`useGuiaDeCd`) y la altura compartida por la fila la arrastra igual, así que
la pantalla «Dados» también necesitó esperar a que «Muy fácil…» esté visible antes de medir.**
