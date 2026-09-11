import { z } from "zod";

// Tarea 2A.9 — la subida de nivel. **Tarea 7 (S12): movido desde
// `apps/api/src/level-up/level-up.schema.ts`.** Aquella tarea lo dejó fuera de `@dnd/shared`
// porque su encargo prohibía tocar este paquete, y anotó que era candidato a moverse en cuanto
// hiciera falta desde otro lado — este es ese momento.
//
// **`roll` se coacciona igual que `unreadOnly` en `notification.schema.ts`**: un valor de
// consulta HTTP es siempre texto, y `z.coerce.boolean()` es el patrón ya establecido en este
// proyecto para ese caso. Ausente = la media fija, que es el valor por defecto que pide la
// tarea (la mayoría de las mesas no tira PG al subir de nivel).
export const levelUpPreviewQuerySchema = z.object({
  roll: z.coerce.boolean().optional(),
});

export type LevelUpPreviewQuery = z.infer<typeof levelUpPreviewQuerySchema>;
