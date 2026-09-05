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
| ⬜ sin empezar | — | — |

**Leyenda:** ⬜ sin empezar · 🟨 en marcha · ✅ hecho · ⛔ bloqueado (di por qué y qué descartaste).

**Lo que decidí por los cuatro pasos** (qué no cuadraba · qué elegí · por qué es duradero · la
fuente si la hubo):

- _(nada todavía)_

**Lo siguiente exacto, si me quedo aquí:**

- _(nada todavía)_
