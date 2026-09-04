import type { Role, Visibility } from "@dnd/shared";

export interface Viewer {
  userId: string;
  role: Role | null;
  isAdmin: boolean;
}

export interface ViewableResource {
  visibility: Visibility;
  createdById: string;
  grantedUserIds: string[];
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
