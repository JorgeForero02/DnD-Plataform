import { z } from "zod";

// Tarea 2A.9 — la subida de nivel.
//
// **Esquema provisional, fuera de `@dnd/shared`.** El encargo de esta tarea prohíbe tocar
// `packages/shared/**`; si hiciera falta un esquema nuevo, tocaba definirlo aquí y reportarlo
// para que se mueva. Este es ese caso: una sola consulta, de un solo endpoint, que no comparte
// nada con otro módulo todavía. Cuando 2A.10 (la pantalla) necesite este contrato desde la web,
// es candidato a `@dnd/shared`.
//
// **`roll` se coacciona igual que `unreadOnly` en `notification.schema.ts`**: un valor de
// consulta HTTP es siempre texto, y `z.coerce.boolean()` es el patrón ya establecido en este
// proyecto para ese caso. Ausente = la media fija, que es el valor por defecto que pide la
// tarea (la mayoría de las mesas no tira PG al subir de nivel).
export const levelUpPreviewQuerySchema = z.object({
  roll: z.coerce.boolean().optional(),
});

export type LevelUpPreviewQuery = z.infer<typeof levelUpPreviewQuerySchema>;
