import type {
  AuthResponse,
  ChangePasswordInput,
  ChangePasswordResponse,
  UpdateDisplayNameInput,
  AdminPasswordResetInput,
} from "@dnd/shared";
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
// token issued before the change (User.passwordChangedAt) — INCLUDING the one the caller is
// holding right now. Task 20: the response carries a fresh token (signed to work immediately,
// see auth.service.ts's comment on its explicit `iat`), which is why the return type grew a
// `token`. Reacting to it is still the caller's job (AccountPage.tsx, via auth.store.ts's
// setToken): this function does not touch the store itself, the same way login()/register() in
// lib/api.ts don't either.
export function changePassword(input: ChangePasswordInput): Promise<ChangePasswordResponse> {
  return apiFetch<ChangePasswordResponse>("/auth/password", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// Ficha D8 (D-CF-18): un administrador pone una contraseña temporal a otra cuenta. La pantalla
// solo ofrece el formulario si `/auth/me` dice `isAdmin`; quién puede lo decide el servidor
// (`AdminGuard`), y a quien no puede le contesta 403.
export function adminPasswordReset(input: AdminPasswordResetInput): Promise<{ success: true }> {
  return apiFetch<{ success: true }>("/admin/password-resets", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
