# Archivo — La mesa a 390 px: demostrada, no arreglada (2026-09-07, ficha P2 de estrecho)

Movida entera desde `docs/07-historial.md` el 2026-09-13, al escribir la línea de la Tarea 9 del
pulido (`dice[]` por dado): el fichero volvía a quedar por encima de 1000 tras el primer corte de
la noche y esta era la entrada completa más antigua. Sin reescribir.

---

## La mesa a 390 px: demostrada, no arreglada (2026-09-07, ficha P2 de estrecho)

`e2e/mesa-en-estrecho.spec.ts` mide lo que era sospecha desde el paseo del 2026-09-05: el borde
derecho de las «Herramientas del DM» cae en **550 px dentro de una ventana de 390**, y **la página
no lo delata** —ni barra horizontal ni vertical—, que es por lo que nada lo cazaba. **No se arregla
aquí, y esa es la entrega**: el apilado evidente mete el panel dentro y **gira el corte 90°** —el
elenco queda en 16 px de alto con cabecera de 36—, así que se revirtió y la medida 6 impide que ese
arreglo falso vuelva a colar. Falta una **decisión del autor** entre tres salidas, en
[06-pendientes.md](../06-pendientes.md). **Revertir**: borrar la prueba; no hay código que deshacer.
