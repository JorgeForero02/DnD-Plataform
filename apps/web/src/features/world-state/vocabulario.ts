import type { ChangeSetMemberInput } from "@dnd/shared";

// **Ningún valor de enumeración llega a la pantalla** (docs/04-convenciones.md). `memberType`
// viaja como `user`/`character`/`entity`, y esas tres palabras no son español ni significan
// nada para quien dirige una mesa.

type MemberType = ChangeSetMemberInput["memberType"];

export const NOMBRE_TIPO_DE_MIEMBRO: Record<MemberType, string> = {
  user: "Una persona de la mesa",
  character: "Un personaje",
  entity: "Una ficha del mundo",
};

/** El mismo nombre, corto, para la lista de miembros de un conjunto. */
export const NOMBRE_TIPO_DE_MIEMBRO_CORTO: Record<MemberType, string> = {
  user: "persona",
  character: "personaje",
  entity: "ficha",
};

export const TIPOS_DE_MIEMBRO: MemberType[] = ["user", "character", "entity"];
