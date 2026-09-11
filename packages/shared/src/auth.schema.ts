import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  displayName: z.string().min(1).max(50),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const updateDisplayNameSchema = z.object({
  displayName: z.string().min(1).max(50),
});

// Password RECOVERY (forgotten password) is out of scope — it needs an email service that
// doesn't exist. This is a change of the *current* password by the account owner, always
// re-verified against the current one before accepting the new one.
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

/**
 * Reinicio de contraseña **por un administrador** (ficha D8, decisión D-CF-18, 2026-09-10). No hay
 * servicio de correo y no se quiere: la mesa son cinco amigos y el autor es administrador. Pone una
 * temporal; la persona entra con ella y la cambia por `changePasswordSchema`. El servidor caduca
 * los tokens anteriores del afectado igual que en un cambio propio.
 */
export const adminPasswordResetSchema = z.object({
  email: z.string().email(),
  temporaryPassword: z.string().min(8).max(100),
});
export type AdminPasswordResetInput = z.infer<typeof adminPasswordResetSchema>;

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateDisplayNameInput = z.infer<typeof updateDisplayNameSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  /** Solo para que la pantalla sepa qué ofrecer (el reinicio de contraseñas); la autorización
   * la comprueba el servidor en `AdminGuard`, nunca este campo. */
  isAdmin: boolean;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}
