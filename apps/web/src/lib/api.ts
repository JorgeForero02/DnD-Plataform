import type { AuthResponse, LoginInput, RegisterInput } from "@dnd/shared";
import { useAuthStore } from "../store/auth.store";

const BASE = "/api";

// Carries the real HTTP status alongside the readable message from 1.14, so a caller can
// tell "the server said no, specifically 401" from "something else went wrong" without
// parsing the message string. features/auth/hooks.ts is the first consumer: only a 401
// means the token itself is invalid — a 500, a 502 from Vite's dev proxy, or a network
// failure (which never reaches this class at all — see below) do not.
export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(readableErrorMessage(text) || `Request failed: ${res.status}`, res.status);
  }
  return res.json() as Promise<T>;
}

// The API answers errors as JSON (ZodValidationPipe's { fieldErrors, formErrors } or Nest's
// plain { message }). Dumping that body straight into an Error() puts raw JSON in the UI
// (see docs/06-pendientes.md). This turns it into a readable sentence when it can, and falls
// back to the original text otherwise — never inventing a message that hides the real cause.
function readableErrorMessage(body: string): string | null {
  if (!body) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return body;
  }
  if (parsed && typeof parsed === "object") {
    const { message } = parsed as { message?: unknown };
    if (typeof message === "string") return message;
    if (message && typeof message === "object") {
      const { fieldErrors, formErrors } = message as {
        fieldErrors?: Record<string, string[]>;
        formErrors?: string[];
      };
      const parts = [...Object.values(fieldErrors ?? {}).flat(), ...(formErrors ?? [])];
      if (parts.length > 0) return parts.join(" ");
    }
  }
  return body;
}

export function login(input: LoginInput): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function register(input: RegisterInput): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
