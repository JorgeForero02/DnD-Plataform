# Historial archivado — las dos entradas del 2026-09-03 y del 2026-09-04 que ya no cabían

> **Movidas enteras el 2026-09-05, sin reescribir ni resumir una línea**, cuando
> [`07-historial.md`](../07-historial.md) llegó a 413 de sus 400 líneas por las cinco entradas del
> plan 03. El procedimiento está en la cabecera de ese fichero y solo tiene dos salidas legítimas:
> archivar moviendo entero, o cambiar el tope como decisión declarada. **Esto es la primera.**
>
> Lo de aquí era cierto el día que se escribió y lo sigue siendo como registro: **no describe el
> sistema de hoy**.

## Lo comprobado EN PRODUCCIÓN al desplegar la fase 2D (2026-09-03)

---

## La documentación, auditada contra lo que hay (2026-09-04)

**Pedido por el autor al cerrar la jornada, y encontró cinco desajustes y un hallazgo de producto.**
Los controles automáticos (`check:docs`, `check:estado`, `check:historial`) estaban los tres en
verde: lo que se les escapa es exactamente lo que se buscó a mano.

- **`08-pruebas.md` decía 268 e2e de API y 106 de navegador**; las cifras reales, vueltas a medir,
  son **269 y 108**. El documento avisa de que ese par se escribe a mano porque solo lo sabe el
  corredor, y es justo el que se queda atrás.
- **`00-INDEX.md` contaba «las cinco decisiones de la fase 2.5»**: son **diez**, y las **once del
  reseño de la mesa** no se contaban en ninguna parte.
- **`00-INDEX.md` abría con «toda la fase 2 está en producción»** sin decir que la 2.5 y el reseño
  entero están en `main` y **sin desplegar**. Lo mismo en `03-despliegue.md`, que decía «EN
  PRODUCCIÓN desde el 2026-09-02» y no que producción va por detrás.
- **`01-arquitectura.md` no tenía el módulo `encounters`** — el único de la API que faltaba, con
  dos endpoints añadidos este mismo día—, ni nombraba `concentration/`, ni la capa de combate de
  `apps/web/src/features/encounters/`.

**Y debajo de un fallo de prueba había algo real.** Al remedir los e2e, `pnj-en-la-mesa` salió
rojo: comprobaba que la CA de un statblock `DM_ONLY` no llega al jugador con
`JSON.stringify(...).not.toContain("17")`, y el cuerpo lleva `createdAt` en ISO — **entre las 17:00
y las 18:00 la hora contenía «17»**. Once horas de cada doce pasaba. Ahora recorre **cada valor**
del árbol con su tipo, y lleva su control.

Al mirar ese cuerpo se vio lo que la prueba **no** comprobaba: **las seis características del
statblock `DM_ONLY` y los PG exactos sí llegan al jugador**, en la misma respuesta que dice «los
números de este PNJ no son públicos». Ficha **P1** abierta con la evidencia y las dos salidas
posibles; **no se cambia el comportamiento sin el autor**, porque las dos son decisiones suyas.

**Revertir:** un commit; solo documentación y una prueba.

---
