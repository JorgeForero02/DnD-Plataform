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
