import type { AuthResponse } from "@dnd/shared";
import { apiFetch } from "../../lib/api";

// Same shape auth.schema.ts's AuthResponse already carries for register/login — this is the
// same user, just fetched fresh instead of returned inline with a token.
export function fetchMe(): Promise<AuthResponse["user"]> {
  return apiFetch<AuthResponse["user"]>("/auth/me");
}
