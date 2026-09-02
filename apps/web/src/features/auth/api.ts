import type { AuthResponse, ChangePasswordInput, UpdateDisplayNameInput } from "@dnd/shared";
import { apiFetch } from "../../lib/api";

// Same shape auth.schema.ts's AuthResponse already carries for register/login — this is the
// same user, just fetched fresh instead of returned inline with a token.
export function fetchMe(): Promise<AuthResponse["user"]> {
  return apiFetch<AuthResponse["user"]>("/auth/me");
}

// Task 1.18b — the account screen. auth.controller.ts's PATCH /auth/me returns the same
// AuthUser shape as GET, so AccountPage can push the fresh displayName straight into
// auth.store.ts's setUser without a second round trip.
export function updateDisplayName(input: UpdateDisplayNameInput): Promise<AuthResponse["user"]> {
  return apiFetch<AuthResponse["user"]>("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// PATCH /auth/password requires the current password (verified server-side with argon2, a 401
// "Current password is incorrect" if it doesn't match — auth.service.ts) and invalidates every
// token issued before the change (User.passwordChangedAt). Reacting to a successful change is
// the caller's job (AccountPage.tsx): this function does not touch auth.store.ts itself, the
// same way login()/register() in lib/api.ts don't either.
export function changePassword(input: ChangePasswordInput): Promise<{ success: true }> {
  return apiFetch<{ success: true }>("/auth/password", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
