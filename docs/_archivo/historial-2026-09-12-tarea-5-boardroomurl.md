# Historial — Tarea 5 del pulido: `Campaign.boardRoomUrl` (2026-09-12, C1 bis)

**Una entrada de `07-historial.md` movida entera el 2026-09-13**, al escribir la línea de la
tarea 11 del pulido («el hilo habla de personajes»): el fichero estaba en 979 de sus 1000 líneas
y esta era la entrada completa más antigua. No se reescribe.

---

## Tarea 5 del pulido: `Campaign.boardRoomUrl` (2026-09-12, C1 bis)

Qué — la partida de PlanarAlly (`tablero.supportive.pro/game/<nombre>`) que la mesa enmarcará
(spec del tablero § 2 ter). Migración escrita a mano
(`20260912120000_campaign_board_room_url`, `ADD COLUMN "boardRoomUrl" TEXT`), aplicada con
`migrate deploy` contra el Postgres de Docker y el cliente regenerado; el contrato
(`packages/shared/src/campaign.schema.ts`) solo acepta `http(s)` hasta 500 caracteres —el valor va
a un `src` de `<iframe>`, y `javascript:` no es una sala—, `null` la quita y ausente no la toca
(mismo patrón que `encumbranceVariant`, D-CF-16). El servicio (`campaigns.service.ts#update`) la
escribe solo si viaja; se acepta al crear y desde ajustes —el mismo defecto de MEDIA-2 con
`encumbranceVariant` reapareció con este campo en la revisión y se cerró igual—. La web
añade un bloque «Sala del tablero» bajo el interruptor de sobrecarga en `CampaignSettings.tsx`,
con Guardar/Quitar explícitos sobre el mismo `PATCH /campaigns/:id`; solo el DM puede escribir, y
el servidor lo exige (`requireDM`), no el botón deshabilitado.

Ronda de revisión (mismo día) — dos Important, los dos contra el propio boceto del brief: el
botón «Guardar la sala» se deshabilitaba con el campo vacío, contra
`docs/04-convenciones.md:460` («el botón de guardar nunca se deshabilita»); ahora un campo vacío
se explica con el error del `Field` y no llama al PATCH, y «Quitar la sala» ya no vacía el input
antes de la respuesta —si el PATCH falla, lo tecleado se queda—. Y `campaigns.service.ts#create`
tiraba `boardRoomUrl` en silencio pese a que el contrato la acepta desde el alta —el mismo defecto
de MEDIA-2 que ya se había cerrado una vez con `encumbranceVariant`—; ahora se persiste también
al crear.

Por qué — el tablero es autohospedado y cada mesa tiene su propia partida; la URL vive en la
campaña, no en código ni en variable de entorno, porque cada DM la pega una vez desde su PlanarAlly
y la mesa la usa desde ahí en adelante (fuera de esta tarea: la propia pantalla de la mesa que la
consume).

Evidencia — e2e de API (`campaigns.e2e-spec.ts`): el DM guarda y lee la URL, un jugador miembro
recibe 403, `javascript:alert(1)` da 400 y `null` la borra, y un `POST` con `boardRoomUrl` la
persiste desde el alta — 22/22 en verde. Mutación: quitar el `refine` del `http(s)` hace fallar
el caso de `javascript:` (200 en vez de 400) — confirma que la prueba depende de esa línea, no
de la forma del contrato. Unitarias web (RTL, 7 en total): el DM ve «Sala del tablero», pulsa
Guardar y el PATCH lleva `boardRoomUrl`; con sala guardada aparece «Quitar la sala» y manda
`null`; Guardar con el campo vacío no llama al PATCH y muestra el error; si «Quitar la sala»
falla, el input conserva su valor. `pnpm verify` en verde.

**Revertir:** migración inversa `DROP COLUMN "boardRoomUrl"` (descrita en la cabecera del SQL) y
quitar el bloque `SalaDelTablero` de `CampaignSettings.tsx`, la línea del servicio y el campo del
contrato y del esquema de Prisma.
