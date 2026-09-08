# Pendientes cerrados — archivados el 2026-09-07 (el formulario de entrega)

**Congelado. Nada de aqui se edita.** Es la ficha P2-2, cerrada el 2026-09-07: el DM ya puede
redactar lo que entrega una fila de una tabla de la casa sin pasar por un `curl`.

Continua a
[`pendientes-cerrados-2026-09-07-tanda-b.md`](./pendientes-cerrados-2026-09-07-tanda-b.md).

**La regla, sin criterio de nadie:** lo tachado sale, lo abierto se queda, y cada ficha se mueve
**entera** — nunca se resume. Los identificadores **no se reciclan**.

**Lo que esta ficha enseño, y por eso se guarda: construir una funcionalidad por los dos extremos
esconde lo que falta EN MEDIO.** El servidor sabia guardar la entrega y resolverla al tirar, y la
pantalla sabia enseñarla y darla; las dos mitades estaban probadas. Lo que nadie habia mirado es
que **la web ni siquiera declaraba el campo**, asi que el unico gesto que tocaba las dos —abrir el
formulario y guardar— lo borraba. El plan del botin se declaro terminado sobre una tabla sembrada
por `curl`, y sembrar por `curl` es exactamente lo que impide descubrir esto.

---

### ~~P2-2 · La `entrega` de una fila solo se puede escribir por API~~ (2026-09-07) — CERRADA, y de paso destapó un borrado

> **Cerrada el 2026-09-07.** La entrega se redacta desde la pantalla, en un **panel propio por fila** —la fila ya lleva tres campos y una entrega es una lista de objetos más cinco monedas; en línea, a 390 px, no cabe— con el botón diciendo **sin abrirse** si esa fila entrega algo. Objetos y monedas conviven, porque el `.refine` del esquema solo prohíbe que la entrega esté vacía. Los topes son los del esquema y hay una prueba que los compara.
>
> **Y al abrirla apareció un borrado que nadie había visto: editar una tabla se llevaba su botín.** `DmTableEntry` no declaraba `entrega` en la web, el servidor sí la manda, y editar reemplaza las filas enteras —`DmTablesService.update` hace `deleteMany` y las vuelve a crear—, así que abrir el formulario de la tabla sembrada por `curl` y pulsar «Guardar cambios» la vaciaba. Iba primero, con su prueba en rojo antes.
>
> **No se escribió un segundo selector de catálogo.** `SelectorDeObjeto` no encaja —es un formulario de «añadir al inventario»: exige `characterId`, muta al confirmar, no devuelve nada, y ofrece 9999 unidades donde el esquema para en 999—. Se reutiliza su capa de datos; extraer un selector de verdad reutilizable toca dos pantallas más y queda dicho en el historial, **sin ficha**.
>
> Lo que decide que está terminado es el recorrido de navegador: sembrar desde la pantalla, tirar, **y editar y volver a tirar**. Mutado por los dos lados: quitar la línea que se lleva la entrega tumba las dos pruebas de componente **y** el recorrido; quitar el campo del tipo no tumba ninguna y solo rompe `pnpm build` — el tipo lo defiende el type-check, el comportamiento lo defienden las dos líneas que lo transportan.

**Abierto, ninguna tarea del plan lo encargó.** `entregaSchema` (`packages/shared/src/dm-table.schema.ts`)
valida objetos y monedas al escribir, y el servidor las resuelve al tirar
(`docs/05-datos.md`), pero el formulario de crear/editar una tabla de la casa
(`apps/web/src/features/dm-tables/`) no tiene ningún campo para redactar una `entrega`. La
funcionalidad está construida por los dos extremos —escribir por HTTP y leer resuelta en la
pantalla— y le falta el primer eslabón: hoy la única forma de sembrar una fila con `entrega` es un
`curl` directo a la API, y la definición de terminado del plan botín solo es alcanzable sobre una
tabla sembrada así.
