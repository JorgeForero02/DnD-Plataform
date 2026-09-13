# Historial archivado — Tarea 14 del pulido: filtros del catálogo de objetos (2026-09-13, anexo #21)

**Movida entera** el 2026-09-13, al escribir la entrada de hito «Pulido antes del paso 3» (Tarea
15, cierre de la tanda). Su resumen se queda en `07-historial.md`.

---

## Tarea 14 del pulido: filtros del catálogo de objetos (2026-09-13, anexo #21)

Qué — `CampaignItemsCatalogPage.tsx` solo filtraba por el texto del buscador; con un catálogo
mixto (objetos propios de la campaña + SRD) no había forma de acotar por tipo de objeto ni por
origen, a diferencia del bestiario, que ya tiene sus chips. Dos filas nuevas de `FilterChip`
dentro de `Toolbar` (`ui/Collection.tsx`, igual que `PanelDeBestiario.tsx`): una por `ItemKind`
—«Todos» + `TIPOS_DE_OBJETO.map(...)` con `NOMBRE_TIPO`— y otra por origen —«De todas partes» /
«Del catálogo» / «De la campaña», con `esDelSrd(id)` decidiendo el segundo grupo. El filtrado es
de cliente, nunca control de acceso: la lista que llega ya viene filtrada por `canView` en el
servidor. El `EmptyState` de «ningún objeto se llama así» pasa a nombrar también los filtros
cuando hay alguno activo.

Por qué — el anexo #21 lo pedía por paridad con el bestiario, que ya resolvió el mismo problema
con el mismo patrón de chips.

Evidencia — unitarias nuevas (anexo #21): con 1 objeto propio + 2 del SRD, pulsar «Arma» deja 2
filas y pulsar además «De la campaña» deja 1 («Daga de la casa»); y el `EmptyState` nombra los
filtros cuando no hay coincidencia. e2e (`inventario.spec.ts`, el recorrido que ya crea un objeto
propio y lo distingue del SRD — no hay fichero dedicado al catálogo): tras crear «Farol de
marea», pulsar «Armadura» deja «Cota de malla» (SRD) y quita «Daga» (SRD, arma) — no corrido en
esta sesión, a cargo del orquestador. Mutación: quitar la condición de `tipo` del filtro hace
fallar las dos unitarias nuevas (restaurado con `cp`).

**Revertir:** en `CampaignItemsCatalogPage.tsx`, quitar los dos `useState` de `tipo`/`origen`, sus
condiciones en el filtro y los dos `<Toolbar>` de `FilterChip`; devolver el `EmptyState` a su
texto sin mencionar filtros; quitar la unitaria y el e2e nuevos.

