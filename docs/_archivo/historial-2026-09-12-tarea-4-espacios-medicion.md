# Historial archivado — Tarea 4 del pulido: `e2e/espacios.spec.ts`, la pasada de medición (2026-09-12, tres rondas)

**Movida entera** el 2026-09-13, al escribir la ronda de arreglo 2 de la Task 10 del pulido
(anexo #8, el radio de ventaja): el fichero seguía por encima de 1000 y era la entrada completa
más antigua. Su hito se queda en `07-historial.md`.

---

## Tarea 4 del pulido: `e2e/espacios.spec.ts`, la pasada de medición (2026-09-12, tres rondas)

Qué — anexo #17, y cierra la medida de #6 y #8. Estado final de `medirHermanas(raiz)`, tras dos
rondas de arreglo sobre el commit original: mide **toda tarjeta** de la pestaña —
`section[aria-label]` (`TarjetaDeHoja`) y `[data-tarjeta]` (la caja pequeña que se apila junto a
una `TarjetaDeHoja` en vez de ir dentro: Percepción pasiva, Dados de golpe, Salvaciones de
muerte) — no solo los hijos directos de `[data-pestana]`. Ronda 1 medía `:scope > *`, y la
mutación de prueba del controlador (`gap-[10rem]` bajo «Ficha», en `Rasgos.tsx`) seguía en
verde: el hueco de 160px vivía DENTRO de un hijo directo (una sub-rejilla que apila Ficha +
Personalidad), invisible desde fuera. Cinco pruebas corren a 1280px sobre `[data-pestana]` de
Números, Rasgos, Recursos, Estado y **Ataques** (ronda 3: mismo `lg:grid-cols-2 items-start` de
dos tarjetas que las demás) contra `HUECO_MAX_PX=48` / `DESNIVEL_MAX_PX=24` (nota de diseño de la
Tarea 0, § 7); Objetos y Conjuros se quedan fuera — Objetos tiene su propia rejilla de
inventario con panel de detalle sticky, medida por la prueba del anexo #6 de más abajo, y
Conjuros solo se monta para quien lanza conjuros, que el guerrero de esta suite no. **Desnivel:
una tarjeta con otra tarjeta debajo en su misma columna queda exenta** (la columna, no la
tarjeta, llena la fila) — en Números eso exime a Salvaciones (que desde la ronda 3 crece con
`flex-1` para repartirse el alto sobrante con Percepción pasiva, dejándola pegada al final de la
columna en vez de flotando con un hueco debajo) y a las tarjetas que abren un apilado en
Rasgos/Recursos/Estado. Lo que sí se compara: la última tarjeta de cada columna (o la única),
agrupadas por techo compartido (`|y diff| < 4`); ninguna fila se descarta (la ronda 2 traía un
descarte de «la fila más baja, salvo que sea la única» que nunca llegaba a ejecutarse con el
contenido real de hoy, y se quitó en la ronda 3 en vez de dejarlo como lógica muerta). Una sexta
prueba abre la pestaña Objetos con doce objetos dados por la API (mismo atajo que
`inventario.spec.ts`) y comprueba que el panel `aside "detalle del objeto"` (sticky de la Tarea
2) se pega justo bajo la banda fija tras desplazar — **con cota de arriba y de abajo** desde la
ronda 3 (antes solo comprobaba que no se solapara; sin la cota de arriba, un `--banda-fija-alto`
roto que reportara siempre 0 habría dejado pasar el detalle a 16px de la banda sin que nada lo
notara), leyendo `--space-4` resuelto a píxeles por el propio navegador y no por el texto del
token (`1rem`, no `16px`, es lo que devuelve `getPropertyValue` de una variable CSS). Las dos
últimas pruebas escriben una expresión inválida y comprueban que el alto de la tarjeta de tirar
no cambia — en la pantalla «Dados» y en el cajón «La mesa tira» (extra al brief, del
controlador). Los helpers de registro/campaña/personaje son copias literales de `hoja.spec.ts` —
los e2e no comparten módulo hoy, anotado así en el propio fichero.

**Los tres defectos reales que la medida encontró y se arreglaron en la misma tanda**:
1. (ronda 1) el detalle de Objetos se metía 60px bajo la banda fija — la banda ahora reporta su
   alto real por `ResizeObserver` (`Cabecera.tsx` → `onAlto` → `HojaCalculada.tsx` → variable
   `--banda-fija-alto` → `DetalleDeObjeto.tsx`), en vez de que el sticky sumara solo el escalón
   de `AppShell`;
2. (ronda 1) 42px de desnivel en Números — `items-stretch` a página, igualando el alto de las
   tres columnas (a mesa sigue en `items-start`);
3. (ronda 3) ese `items-stretch` estiraba el envoltorio invisible de la columna del medio, no
   sus dos tarjetas: Percepción pasiva seguía con su alto natural y dejaba un hueco vacío bajo
   ella. La tarjeta Salvaciones (`className="flex-1"`) es la que ahora crece para llenar ese
   sobrante — la corrección visible, no solo el envoltorio.

Por qué — Tarea 4 del
[plan de pulido](../superpowers/specs/2026-09-12-pulido-antes-del-paso-3-design.md), cierra el
anexo #17 y las medidas de #6 y #8; revertir — `git revert` de los cuatro commits de esta tarea,
en orden inverso (`695d200`, luego el de esta tercera ronda, que quita `ataques` de la lista,
`flex-1` de Salvaciones e `items-stretch` de `Ataques.tsx`, y las dos cotas nuevas de la prueba
de Objetos; después `8cca54d`; por último el commit original de la Tarea 4).
