import type { Role, Visibility } from "@dnd/shared";
import { loVeLaMesa } from "@dnd/shared";

// **`loVeLaMesa` se movió a `@dnd/shared` (fix round 3, Task 26)**: la web necesitaba la misma
// pregunta para sembrar un selector y no podía importar de aquí, así que copiarla a mano habría
// sido reimplementar la matriz de visibilidad por segunda vez — lo que la regla que no se negocia
// prohíbe. Se re-exporta desde aquí, sin cambiar su firma, para que ningún import existente en la
// API (`activities.service.ts`, `character-sheet.service.ts`, `encounters.service.ts`) tenga que
// tocarse: siguen escribiendo `import { loVeLaMesa } from "../common/visibility"` y funciona
// igual, con la única fuente de verdad ahora en `@dnd/shared`.
export { loVeLaMesa };

export interface Viewer {
  userId: string;
  role: Role | null;
  isAdmin: boolean;
  /**
   * El nombre legible de quien pregunta, cuando ya se ha ido a buscar su fila de `User` de
   * todos modos (B3). Opcional porque los `viewerFor` que cada servicio se escribe por su
   * cuenta no lo rellenan, y no tienen por qué: solo lo usa quien ya tiene el `Viewer` en la
   * mano y necesita citar a esa persona en un registro.
   */
  displayName?: string;
}

export interface ViewableResource {
  visibility: Visibility;
  createdById: string;
  grantedUserIds: string[];
}

/**
 * El adaptador de «una fila con sus concesiones» al `ViewableResource` que pide `canView`.
 *
 * Vivía escrito inline en doce sitios —tres de ellos en `entities.service.ts` (reclasificar,
 * `laAudienciaCrecio` y revelar), más `links.service.ts`, `campaigns.service.ts`,
 * `campaign-items.service.ts` (dos), `comments.service.ts`, `inventory/common/resolve-item.ts`,
 * `notifications.service.ts` (dos) y `sessions.service.ts`— con la misma forma exacta
 * (`visibility`, `createdById`, `grantedUserIds: grants.map(...)`), una copia extraída
 * (Task 22) y reescrita inline otra vez después (Task 33) sin que nada lo impidiera. Es el
 * mismo riesgo que la regla de oro ya nombra para `canView`: el día que una gane un campo y
 * las otras no, empiezan a decidir cosas distintas sin que ninguna prueba lo note. Aquí, junto
 * a `canView`, es el único sitio que hay que tocar (Low #12, revisión final de
 * `ficha/tanda-2-a-5`).
 *
 * Dos sitios se quedan fuera a propósito porque su fila no tiene esta forma exacta: en
 * `rules-engine.service.ts` (aplicar reglas) la `visibility` viene del EFECTO de la regla, no de
 * la entidad; en `campaign-items.service.ts` (bajar visibilidad) la `visibility` es la que se
 * está proponiendo, no la que ya tiene la fila. Envolver esos dos en el adaptador escondería que
 * están mirando una visibilidad distinta a la de `entity`/`prospectivo`.
 */
export function comoRecursoVisible(entidad: {
  visibility: Visibility;
  createdById: string;
  grants: { userId: string }[];
}): ViewableResource {
  return {
    visibility: entidad.visibility,
    createdById: entidad.createdById,
    grantedUserIds: entidad.grants.map((g) => g.userId),
  };
}

export function canView(viewer: Viewer, resource: ViewableResource): boolean {
  if (viewer.isAdmin) return true;
  if (viewer.role === "DM") return true;
  if (viewer.role === null) return false;

  switch (resource.visibility) {
    case "PUBLIC":
    case "PLAYERS":
      return true;
    case "SPECIFIC_PLAYERS":
      return resource.grantedUserIds.includes(viewer.userId);
    case "OWNER_DM":
      return resource.createdById === viewer.userId;
    case "DM_ONLY":
      return false;
    default:
      return false;
  }
}

/**
 * **La audiencia de jugadores de un recurso, como conjunto de verdad.** El DM se deja fuera a
 * propósito: lo ve todo siempre, así que incluirlo no distingue nada.
 *
 * Existe porque **los cinco niveles NO forman una fila**. Es tentador ordenarlos
 * `DM_ONLY < OWNER_DM < SPECIFIC_PLAYERS < PLAYERS < PUBLIC` y comparar índices —así se escribió
 * la primera versión de «¿subió la visibilidad?»— y es falso:
 *
 *   · `OWNER_DM` la ve **el creador**.
 *   · `SPECIFIC_PLAYERS` la ven **los concedidos**, que pueden ser ninguno y pueden no incluir al
 *     creador.
 *
 * Ninguno de los dos contiene al otro. Un índice decía que pasar de `OWNER_DM` a
 * `SPECIFIC_PLAYERS` **con la lista vacía** era «revelar», y no lo es: la ficha pasa de verla una
 * persona a no verla nadie. Lo cazó la revisión de cierre del 2026-09-04.
 */

export type AudienciaDeJugadores = { tipo: "todos" } | { tipo: "algunos"; ids: Set<string> };

export function audienciaDeJugadores(recurso: ViewableResource): AudienciaDeJugadores {
  switch (recurso.visibility) {
    case "PUBLIC":
    case "PLAYERS":
      return { tipo: "todos" };
    case "SPECIFIC_PLAYERS":
      return { tipo: "algunos", ids: new Set(recurso.grantedUserIds) };
    case "OWNER_DM":
      return { tipo: "algunos", ids: new Set([recurso.createdById]) };
    case "DM_ONLY":
    default:
      return { tipo: "algunos", ids: new Set() };
  }
}

/**
 * ¿Hay **alguien nuevo** que ahora puede ver esto y antes no? Eso, y no otra cosa, es «revelar».
 *
 * Se responde comparando los conjuntos, así que el par incomparable de arriba sale bien sin
 * tratarlo como caso especial: de `OWNER_DM` a `SPECIFIC_PLAYERS` sin conceder a nadie **no
 * crece**, y de `SPECIFIC_PLAYERS` a `OWNER_DM` **sí crece** si el creador no estaba concedido —
 * que es la primera vez que él la ve, y es correcto anunciarlo.
 */
export function laAudienciaCrecio(antes: ViewableResource, despues: ViewableResource): boolean {
  const a = audienciaDeJugadores(antes);
  const d = audienciaDeJugadores(despues);

  if (d.tipo === "todos") return a.tipo !== "todos";
  if (a.tipo === "todos") return false;
  for (const id of d.ids) if (!a.ids.has(id)) return true;
  return false;
}

/**
 * **Cómo se marca un suceso QUE HABLA DE una cosa, para que lo vea exactamente su audiencia**
 * (D-OP-12, 2026-09-05).
 *
 * Existe porque **un suceso no tiene dueño propio**: `GameEventsService` evalúa `canView` con
 * `createdById: actorUserId`, o sea **quien hizo la acción**. Copiar sin más la visibilidad del
 * objeto sale mal justo en el nivel que más importa: archivar un personaje `OWNER_DM` escribía un
 * suceso `OWNER_DM` cuyo «creador» era **el DM que archivó**, así que **el dueño del personaje no
 * lo veía nunca**. El aviso de que se han llevado tu personaje no llegaba a ti.
 *
 * La traducción es exacta, no una aproximación:
 *
 * - `OWNER_DM` sobre una cosa significa «su dueño y el DM». Nombrar al dueño en
 *   `SPECIFIC_PLAYERS` da **ese mismo conjunto**, porque el DM lo ve todo siempre.
 * - `SPECIFIC_PLAYERS` se pasa tal cual, con las concesiones que la cosa tenga **en este momento**
 *   — se guardan al escribir y no se resuelven al leer, porque el registro cuenta lo que pasó.
 * - Los otros tres niveles no nombran a nadie y viajan sin lista.
 *
 * Vive aquí, junto a `canView`, porque es un trozo de la misma matriz: la regla que no se negocia
 * dice que nadie la reimplementa por su cuenta.
 */
export function audienciaDeSuceso(recurso: ViewableResource): {
  visibility: Visibility;
  grantedUserIds: string[];
} {
  switch (recurso.visibility) {
    case "OWNER_DM":
      return { visibility: "SPECIFIC_PLAYERS", grantedUserIds: [recurso.createdById] };
    case "SPECIFIC_PLAYERS":
      return { visibility: "SPECIFIC_PLAYERS", grantedUserIds: [...recurso.grantedUserIds] };
    default:
      return { visibility: recurso.visibility, grantedUserIds: [] };
  }
}
