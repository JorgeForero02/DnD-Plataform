# Historial archivado — Tarea 12 del pulido: salir de la mesa vuelve a la campaña (2026-09-13, anexo #18)

**Movida entera** el 2026-09-13, al escribir la entrada de hito «Pulido antes del paso 3» (Tarea
15, cierre de la tanda). Su resumen se queda en `07-historial.md`.

---

## Tarea 12 del pulido: salir de la mesa vuelve a la campaña (2026-09-13, anexo #18)

Qué — la primera miga de `BandaDeMesa.tsx` era «Tus crónicas» y llevaba a `/`, la lista entera de
campañas: salir de una mesa en juego mandaba a cero en vez de a la campaña que se estaba jugando.
Ahora la flecha va con el nombre de la campaña a `/campaigns/:id?seccion=sessions` —el mismo
enlace que `MesaDeSesion.tsx` ya usaba para «Entrar a la mesa», que `CampaignDetailPage.tsx`
resuelve a la pestaña Sesiones— y «Tus crónicas» pasa a miga secundaria, detrás de un filete, sin
perder su enlace a `/`.

Por qué — el anexo #18 lo pedía tal cual: el gesto de «salir» de una pantalla anidada debe volver
al contenedor inmediato, no saltar todos los niveles.

Evidencia — unitaria nueva en `sesion-en-juego.test.tsx` (describe «la banda de la mesa (anexo
#18)»): la primera miga tiene `href="/campaigns/c1?seccion=sessions"` y texto «La mesa», y «Tus
crónicas» sigue apuntando a `/` (15/15 del fichero). e2e nuevo en `sesion.spec.ts`: desde una mesa
en reposo, pulsar el primer enlace de la banda deja la pestaña Sesiones seleccionada (no corrido
en esta sesión, a cargo del orquestador junto a `mesa-mide.spec.ts`). Mutación: devolver `to="/"`
al primer enlace hace fallar la unitaria nueva (restaurado con `cp`). Los recorridos que ya
pulsaban «Tus crónicas» desde la mesa (`campana.spec.ts:590`) siguen valiendo: el enlace existe,
solo cambió su orden.

**Revertir:** en `BandaDeMesa.tsx`, devolver el primer `Link` a `to="/"` con el texto «Tus
crónicas» y el segundo a `to={`/campaigns/${campaignId}`}` con el nombre de la campaña; quitar la
unitaria y el e2e nuevos.

