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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateDisplayNameInput = z.infer<typeof updateDisplayNameSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export interface AuthResponse {
  token: string;
  user: { id: string; email: string; displayName: string };
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}
