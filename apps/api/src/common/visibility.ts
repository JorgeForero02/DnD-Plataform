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
