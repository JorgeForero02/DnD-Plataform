# Historial archivado — la bandeja de avisos (2026-09-05, plan 12 · 12.2)

**Movida entera y sin reescribir el 2026-09-08**, al llegar `docs/07-historial.md` a 988 de sus
1000 líneas y no caber la entrada del reconocimiento de ese día. Era la entrada completa más
antigua del fichero. Su hito se queda arriba, en `07-historial.md`.

> **Y la casualidad merece constar, porque es la lección del día en que se archivó.** Esta es la
> entrada que documenta la entrega de la bandeja de avisos, y ese mismo 2026-09-08 hubo que
> corregir la fila de `notifications` de `docs/01-arquitectura.md`, que seguía diciendo *«es API
> sin pantalla — esta fila prometía “bandeja de avisos” y no hay ninguna»* y remitía a una ficha
> `A1-avisos` que ya no existía en `docs/06-pendientes.md`. **El historial contaba la entrega y el
> documento de estado seguía negándola**, durante tres días, en el mismo repositorio. Ver
> `pendientes-cerrados-2026-09-08-reconocimiento.md`.

---

## La bandeja de avisos: el servidor llevaba desde 2A.14 hablando solo (2026-09-05, plan 12 · 12.2)

**Qué.** `apps/api/src/notifications/` existía **entero** —tabla, servicio y dos rutas— y **ningún
fichero de `apps/web/src` lo mencionaba**: nadie veía un aviso nunca. Es el patrón que este
proyecto ha cerrado en falso cuatro veces —servidor hecho, nadie que lo use—, y ahora tiene
pantalla: `apps/web/src/features/notifications/`, montada en el chrome junto al conmutador de tema.

**Con tres cosas y ninguna más**, que es lo que el plan pedía:

- **Cuántas sin leer, y si son cero no hay distintivo.** Un cero con globo es ruido y además miente
  sobre que haya algo que atender. El número va también en el nombre accesible del botón, porque un
  lector de pantalla no ve un círculo.
- **La lista, cada aviso con su enlace al sitio donde pasó.** Y si a un aviso le falta el sujeto, se
  pinta **sin enlace**: llevar a un 404 es peor que no llevar a ninguna parte.
- **Marcar leído y marcar todo leído.** Abrir un aviso **es** leerlo, y solo se marca si hacía
  falta: una petición por cada clic en algo ya leído es ruido contra el servidor.

**Lo que NO hace: borrar.** Un aviso leído se apaga; el historial se queda.

**Y dos decisiones que no se ven:**

- **La frase de cada aviso se escribe una vez** (`vocabulario.ts`), con un `Record` **exhaustivo**
  por tipo: un tipo nuevo en `@dnd/shared` sin frase aquí **no compila**, en vez de asomar su
  enumeración en la bandeja de alguien. Es la regla que ya falló tres veces en una mañana.
- **La bandeja se monta en dos sitios y es el mismo componente.** La mesa vive fuera de `AppShell`
  y no hereda la cabecera; dos bandejas serían dos contadores, y uno de los dos acabaría mintiendo.

**Medido en el navegador** con dos contextos (`apps/web/e2e/bandeja-de-avisos.spec.ts`), incluido lo
que `jsdom` no puede decir: que el distintivo **no tapa** «Cuenta» y que el panel **cabe en la
ventana**. Y con siete pruebas de pantalla en `features/notifications/__tests__/`.

**Y otro rojo ajeno arreglado por el camino**: `apps/web/e2e/invitacion.spec.ts` exigía
`aria-disabled` en un **campo de formulario**. Lo que U9 cambió fueron los **botones** —un botón
apagado tiene algo que explicar al pulsarlo; un `input` no—, y el barrido dejó ahí una aserción que
ya no describía la pantalla.

**Cómo revertirlo.** `git revert` del commit. Los avisos siguen escribiéndose en el servidor: lo
que desaparece es la puerta para verlos.
