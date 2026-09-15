# Historial — Desbordes (2026-09-13)

**Una entrada de `07-historial.md` movida entera el 2026-09-15**, al escribir la línea de los
efectos de mesa: el fichero estaba en 992 de sus 1000 líneas y esta era la entrada completa más
antigua. No se reescribe.

---

## Desbordes (2026-09-13) — cerrada en rama, sin fusionar ni desplegar

Qué — rama `desbordes/antes-del-paso-3` sobre `807f752` (reglas de la mesa), **11 commits**: D-CF-67
(`c34fa62`), plan (`826b2ff`), la prueba gráfica (`197eb65`), `ui/PanelFlotante` con la migración
del panel de ataque y del menú «…» del elenco (`c87080d`), la traza de «Comp.» (`0d73882`), cuatro
olas de arreglo y la documentación. Spec: `docs/superpowers/specs/2026-09-13-desbordes-design.md`.
**Recortada por el autor a mitad** (vía `d-d-plataform-93`): de «auditoría + prueba genérica de todas
las pantallas + cierre con suite entera y revisión» a «solo arreglo + reconocimiento visual de lo
arreglado». Lo que quedó:

- **Auditoría en navegador** (Tarea 0, Playwright con la semilla demo, sin arreglar nada): **tres
  desbordes reales** — la lista de objetivos al atacar (§2.1 de la spec, 71 px recortados por el
  `overflow-x-auto` de la tabla de ataques), **uno nuevo**: el menú «…» de una fila del elenco en la
  mesa (79 px, recortado por el carril scrollable), y la traza de la casilla «Comp.» 8 px fuera de la
  ventana. El §2.2 (traza fuera del borde de la casilla) **ya estaba arreglado** el 2026-09-12.
- **`apps/web/e2e/desbordes.spec.ts`**: la medida genérica «nada se sale» (dos reglas, exclusiones y
  la excusa del scroll legítimo; ver `08-pruebas.md`), acotada a los tres casos con `test.fail()`
  hasta su arreglo y una captura por caso en `apps/web/e2e-resultados/desborde-*.png`.
- **`ui/PanelFlotante`**: portal al `body`, posición fija desde el disparador (encima si no cabe
  debajo, nunca fuera de la ventana), `Escape` (anidado en el ataque), clic fuera, foco y su
  devolución. Migrados `TirarAtaqueBoton` y `MenuDeAcciones`; `PanelDeTirada` no (la auditoría no
  lo midió fuera). Regla nueva en `04-convenciones.md`: un `absolute` dentro de un `overflow-*` no
  es una opción.
- **La traza de «Comp.»**: `min-w-0` en la fila y el `li` de traza (el mínimo por contenido de
  flex/grid era la causa), el importe arriba a la derecha sin pisar el texto, y **la casilla crece
  mientras su traza está abierta** (`min-w-[6rem] w-auto max-w-[14rem]`), con las palabras enteras.

Lo que cazó el reconocimiento visual y no la prueba — la prueba mide «no se sale», no «se lee»:
el portal nacía con `visibility: hidden` hasta posicionarse y **se tragaba el foco del primer ítem
del menú** (`teclado.spec.ts` lo cazó; dos olas: no robar el foco, y `opacity: 0` en vez de
`hidden`); el importe de la traza **pisaba** el texto envuelto; y luego el texto **partía palabras**.
Cuatro olas sobre el mismo implementador, cada una mirando la captura.

Lateral: **la semilla demo estaba rota desde D-CF-66** (el jugador fijaba su nivel → 403); la
arregla `197eb65` (el nivel lo pone el token de la DM). La rama `reglas-de-la-mesa` sola sigue con
la semilla rota: se cura al fusionar esta detrás.

Verificado: `desbordes.spec.ts` 3/3 con sus capturas; `inventario`, `furia`, `teclado`, `combate`,
`tirada`, `hoja`, `hoja-pestanas`, `espacios`, `tokens-contrast` en verde tras el portal; `pnpm
verify` en cada commit. **Sin suite entera ni revisión de rama, por el recorte.** Ledger en
`.superpowers/sdd/2026-09-13-desbordes/`.

Revertir — `git revert` de los commits de la rama; ninguna migración. **No se ha fusionado ni
desplegado**: la fusión la decide el autor.
