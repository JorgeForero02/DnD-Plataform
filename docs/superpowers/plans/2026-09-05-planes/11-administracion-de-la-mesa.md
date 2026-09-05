# Plan 11 · La administración de la mesa (D2 · D3b · A3-invitaciones)

**Objetivo en una frase:** que una mesa se pueda administrar de verdad — cambiar el papel de alguien,
y ver, caducar y revocar las invitaciones que se han repartido.

**Tamaño:** dos commits. **Dependencias:** ninguna. **Toca `apps/api` y `apps/web`.**

**Sale de la auditoría de la cola larga (2026-09-05), confirmado midiendo**, no leyendo la ficha.

---

## Lo que hay hoy, contado ruta por ruta

`campaigns.controller.ts` tiene: crear, listar, ver, **listar miembros** (`:id/members`), editar la
campaña, borrarla y **expulsar a un miembro** (`DELETE :id/members/:userId`).

`invites.controller.ts` tiene **exactamente dos rutas**: crear y aceptar.

**Lo que falta, y es lo que hace que una mesa real duela:**

| | Qué falta | Qué pasa hoy |
|---|---|---|
| **D2** | **Cambiar el papel de un miembro.** No hay `PATCH .../members/:userId` | **El rol es inmutable de por vida.** No se puede invitar a un segundo DM ni ascender a nadie. Para cambiarlo hay que expulsar y reinvitar, **perdiendo su vínculo con sus personajes** |
| **D3b** | **Listar y revocar invitaciones.** No hay `GET` ni `DELETE` | Se generan **a ciegas y valen para siempre**. Nadie sabe cuántos enlaces vivos hay ni puede matar uno que se filtró |
| **A3** | **Usos máximos y caducidad** | Cada enlace es de un solo uso por decisión declarada, pero **no caduca nunca** |

Y hay una consecuencia que ya está escrita en la propia pantalla: el panel de invitación advierte de
que **generar otro enlace no anula los anteriores**. Ese aviso existe **porque no se puede revocar**.
Cuando esto entre, **el aviso cambia**, y hay que acordarse de cambiarlo o pasará a mentir.

## 11.1 · El papel de un miembro

**Ruta:** `PATCH /campaigns/:id/members/:userId` con `{ role }`, **solo DM**.

**Tres reglas que no son opcionales:**
1. **No puede quedarse la campaña sin ningún DM.** Degradarse a uno mismo siendo el último DM es un
   **409 con su motivo**, no un 403 — no es que no puedas, es que dejaría la mesa huérfana.
2. **El cambio deja rastro.** Es un cambio de permisos: va al registro. Sin suceso, un DM puede
   ascender a alguien y nadie lo sabrá nunca.
3. **Nadie se asciende a sí mismo**: solo un DM cambia papeles, y **eso ya lo impide** exigir DM.
   Escríbelo en una prueba igualmente.

**En la pantalla**, en el panel de miembros que ya existe: un selector por fila, **deshabilitado con
su motivo visible** cuando no se puede —es el criterio de honestidad del resto de esa pantalla— y
nunca escondido.

## 11.2 · Las invitaciones se ven, caducan y se revocan

**Rutas:** `GET /campaigns/:id/invites` (solo DM) y `DELETE /invites/:id` (solo DM).

**El listado tiene que decir la verdad completa de cada enlace:** cuándo se creó, **si se usó y
quién**, si ha caducado, y si sigue vivo. Un listado que solo diga «3 invitaciones» no sirve para
nada.

**Caducidad:** columna `expiresAt DateTime?` en `Invite`. **Nulable**, y `null` = no caduca, para no
invalidar de golpe los enlaces ya repartidos. El valor por defecto de los nuevos lo decide el DM al
generarlos; propón **siete días** y deja cambiarlo.

**Y `accept` tiene que mirar la caducidad**, no solo `usedAt`. Si no, la columna es decorado.

> **La respuesta de un enlace caducado y la de uno inventado deben ser la misma.** Si difieren, el
> mensaje dice si un token existió alguna vez, que es información que no le debemos a nadie. Es el
> mismo criterio del 404 del oráculo de la CA (plan 03).

## Pruebas

**Servidor:** ascender a DM ✅ · degradar al último DM → **409** · un jugador intentando cambiar
papeles → **403** · el cambio **escribe su suceso** · listar invitaciones solo DM · **revocar mata el
enlace**: aceptarlo después da el mismo error que uno inventado · un enlace caducado **no se acepta**.

**e2e (el que de verdad demuestra D2):** el DM asciende a un jugador, **y ese jugador puede ya hacer
algo que antes le daba 403**. Ascender sin comprobar que el permiso cambió es probar la escritura,
no la función.

**Web:** el selector aparece deshabilitado con motivo cuando no se puede · el listado pinta los
cuatro estados · revocar quita la fila.

**Mutación:** quita la comprobación de «último DM» y comprueba que su prueba se pone roja; quita la
de caducidad en `accept` y lo mismo.

## Guía de revisión

- [ ] **No se puede dejar la mesa sin DM**, y el error es 409 con motivo.
- [ ] El cambio de papel **está en el registro**.
- [ ] El enlace revocado y el inventado dan **la misma respuesta**.
- [ ] `expiresAt` es nulable y **los enlaces viejos siguen valiendo**.
- [ ] `accept` mira **caducidad y uso**, no solo uso.
- [ ] **El aviso de «generar otro no anula los anteriores» se ha reescrito**, o ahora miente.
- [ ] La autorización se comprueba en el servidor; el selector escondido no es control de acceso.

## Trampas

- **Expulsar y reinvitar no es equivalente a ascender**: se pierde el vínculo del miembro con sus
  personajes. Es la razón por la que esta ficha importa más de lo que parece.
- **`Invite` ya tiene `usedAt`.** Revocar **no es marcarlo como usado**: un enlace revocado y uno
  gastado son dos hechos distintos y el listado tiene que distinguirlos.
- **Cuidado con el papel del creador de la campaña**: revisa que no se pueda degradar por un camino
  lateral.

## Commits

```
feat(api,web): a member's role can change, and the table can never be left without a DM
feat(api,web): invitations can be listed, expired and revoked
```

## Definición de terminado

`pnpm verify` verde, e2e corrido, las dos mutaciones probadas, **el aviso del panel de invitaciones
reescrito**, y D2, D3b y A3 anotadas en el maestro.


---

## Avance — lo escribe quien ejecuta este plan

> **Obligatorio, y se escribe MIENTRAS se trabaja, no al final.** Si la sesión se queda sin contexto
> o muere, **esto y el prompt de arranque son lo único que sabe la siguiente**. Una línea por paso,
> con su commit. Nada de memoria: `fichero:línea` o no cuenta.

| Estado | Cuándo | Qué |
|---|---|---|
| ✅ hecho | 2026-09-06 | **11.1 · El papel de un miembro (D2).** `MembershipService.changeRole` (`apps/api/src/campaigns/membership.service.ts:52`) con el 409 del último DM; módulo nuevo `apps/api/src/members/` para poder escribir el suceso sin ciclo. Suceso `MEMBER_ROLE_CHANGED` + migración `20260906050001_member_role_changed_event/`. Web: selector por fila en `apps/web/src/features/campaigns/MembersPanel.tsx:115`. **Commit `bf1b1c9`** |
| ✅ hecho | 2026-09-06 | **11.2 · Las invitaciones (D3b, A3).** Columnas `expiresAt`, `revokedAt` y `usedById` (migraciones `20260906050000_member_role_and_invite_lifecycle/` y `20260906050002_invite_used_by/`). `list`, `revoke` y `estadoDeInvitacion` en `apps/api/src/invites/invites.service.ts`. Web: `apps/web/src/features/invites/ListaDeInvitaciones.tsx` y el selector de caducidad en `InvitePanel.tsx`. **El aviso reescrito.** **Commit `bf1b1c9`** |
| ✅ | 2026-09-06 | **EL PLAN 11 ESTÁ CERRADO**, con `apps/api/test/administrar-la-mesa.e2e-spec.ts` (9 verdes) y las **dos** mutaciones probadas. |

**Leyenda:** ⬜ sin empezar · 🟨 en marcha · ✅ hecho · ⛔ bloqueado (di por qué y qué descartaste).

**Lo que decidí por los cuatro pasos** (qué no cuadraba · qué elegí · por qué es duradero · la
fuente si la hubo):

- **EL SUCESO NO CABÍA EN `campaigns`, Y NO ES UN DETALLE.** `GameEventsModule` **importa**
  `CampaignsModule` —su controlador necesita la membresía para filtrar—, así que inyectar
  `GameEventsService` en `CampaignsService` habría creado un ciclo que Nest solo resuelve con
  `forwardRef`, y este proyecto ya declaró por escrito que eso es **esconder el ciclo en vez de
  quitarlo** (`game-events.service.ts`, sobre el motor de reglas). Módulo propio
  `apps/api/src/members/`: el grafo se queda dirigido y **la regla de autorización sigue viviendo en
  `MembershipService`**, su dueño único. La URL no cambia por esto.
- **El 409 del último DM cuenta CUÁNTOS QUEDARÍAN, no quién eres.** Mirar «¿es el creador?» habría
  impedido que el creador se bajara después de ascender a otro, que es legítimo y además es
  exactamente el caso que la ficha quiere permitir. Hay prueba de las dos mitades: 409 con uno solo,
  y 200 en cuanto hay dos.
- **La prueba que demuestra D2 no es la escritura, es el PERMISO.** El e2e comprueba que la misma
  persona que recibía **403** al crear una ficha del mundo recibe **201** después del ascenso.
  Comprobar solo que la fila cambió habría probado un `UPDATE`.
- **`usedById` es columna nueva y el plan no la pedía**, pero el plan sí pedía que el listado dijera
  **«si se usó y quién»** — y `usedAt` guarda cuándo, no quién. Sin ella la mitad de la frase era
  imposible. Sin clave foránea a `User`: es dato histórico del enlace, y borrar una cuenta no tiene
  que borrar la invitación que usó.
- **`revokedAt` y no reutilizar `usedAt`**, que era la trampa escrita en el propio plan: marcar como
  «usado» un enlace revocado habría **mentido sobre quién entró en la mesa**.
- **El estado se DERIVA.** Misma regla que el vencimiento de una condición (2C.4): guardarlo sería
  una segunda verdad y obligaría a un barrido que, si no corre, deja vivo un enlace muerto.
- **Un solo `if` y un solo mensaje en `accept`.** Inventado, gastado, revocado y caducado responden
  **byte a byte lo mismo**, y hay una prueba que compara las dos respuestas. Cuatro ramas con cuatro
  mensajes habrían convertido el endpoint en un oráculo de tokens.
- **El listado no devuelve el token entero, solo su cola.** Es una pantalla que un DM abre en una
  mesa con gente al lado; con el token completo, quien mire de reojo se lleva una invitación.
- **«Sin caducidad» sigue existiendo y no está escondida.** El selector propone siete días —que es
  lo que hace una mesa: se invita para el sábado— y deja elegir «sin caducidad», porque es como se
  han comportado todos los enlaces hasta hoy. Cambiar el defecto en silencio habría puesto fecha de
  muerte a la costumbre de la mesa sin pedir permiso.
- **El aviso del panel se reescribió**, que era un punto de la guía de revisión: existía **porque no
  se podía revocar**, así que en cuanto revocar existió pasaba a estar incompleto. Ahora apunta a la
  lista en vez de ser un callejón sin salida, y baja de tono sin cambiar de token.
- **Revocar solo se ofrece sobre lo que aún puede usarse.** Sobre una usada o una caducada sería un
  botón que no cambia nada; el servidor lo aceptaría igual, así que esto es honestidad y no control
  de acceso. Con prueba de las tres exclusiones.

**Lo siguiente exacto, si me quedo aquí:**

- **Nada. El plan 11 está cerrado.** Lo siguiente es el plan 13.
