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
      // **`Content-Type` solo cuando hay cuerpo que declarar.**
      //
      // Fastify rechaza con 400 —«Body cannot be empty when content-type is set to
      // 'application/json'»— cualquier POST que anuncie JSON y no mande nada, y esto lleva
      // mordiendo desde la tarea 1.14: **dieciocho llamadas de este repositorio arrastran el
      // rodeo `body: JSON.stringify({})`** con su comentario explicándolo, una por una, desde
      // que un recorrido de Playwright lo destapó por primera vez (`features/invites/api.ts`:
      // «Only the Playwright run against the real API caught this»).
      //
      // Lo que hace 2.5.6 es **arreglar la causa en vez de pagar el peaje diecinueve veces**: los
      // dos endpoints nuevos sin cuerpo —pasar turno, terminar el combate— fueron los primeros
      // que no copiaron el rodeo, y volvieron a caer en el mismo 400. Los veintiún rodeos que
      // quedaban ya se quitaron: ahora una llamada sin cuerpo simplemente no pasa `body`.
      //
      // Y el motivo por el que solo lo ve el navegador sigue en pie: **supertest no pone la
      // cabecera si no hay `.send()`**, así que los e2e de API pasan en verde sobre el camino
      // roto. Es la clase de defecto que solo caza `pnpm --filter @dnd/web e2e`.
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(readableErrorMessage(text) || `Request failed: ${res.status}`, res.status);
  }
  // **204 no trae cuerpo, y `res.json()` revienta contra un cuerpo vacío.** Hasta la tarea 8
  // (2026-09-05, iniciativa y bando) ningún endpoint de este proyecto contestaba 204 — el
  // cancelar un combate (`DELETE .../encounters/:id`, tarea 4) es el primero, y es el primero
  // que consume la web. Sin este guardián, cancelar un combate desde el navegador lanzaba
  // `SyntaxError: Unexpected end of JSON input` aunque el servidor hubiera hecho exactamente lo
  // que se le pidió — el fallo era del cliente leyendo su propio éxito como un error.
  //
  // **Quien llama a un endpoint 204 tiene que tipar `T` como `void`** (ver `cancelEncounter`,
  // `features/encounters/api.ts`): esto devuelve `undefined`, y pedir aquí un tipo con campos
  // obligatorios compila pero miente en tiempo de ejecución — el objeto que promete no existe.
  if (res.status === 204) return undefined as T;
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
