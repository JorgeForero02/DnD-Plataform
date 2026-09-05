import { apiFetch } from "../../lib/api";

export interface Invite {
  id: string;
  campaignId: string;
  token: string;
  role: string;
  createdAt: string;
  usedAt: string | null;
  /** `null` = no caduca (plan 11, ficha A3). Los enlaces de siempre se comportan igual que ayer. */
  expiresAt: string | null;
}

/**
 * **Una fila del listado de invitaciones** (plan 11, ficha D3b).
 *
 * **No trae el token entero**, solo su cola: un listado se enseña, y con el token completo
 * cualquiera que mire por encima del hombro se lleva una invitación.
 */
export interface InviteRow {
  id: string;
  createdAt: string;
  usedAt: string | null;
  /** Quién la usó, por su nombre. `null` si nadie. */
  usedByName: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  role: string;
  tokenTail: string;
  estado: "VIVA" | "USADA" | "REVOCADA" | "CADUCADA";
}

export interface AcceptedInvite {
  campaignId: string;
  role: string;
}

// Both endpoints take no input, but apiFetch (lib/api.ts) always sends
// "Content-Type: application/json", and Fastify's body parser rejects a request that
// declares that content type with no body at all ("Body cannot be empty when content-type is
// set to 'application/json'") before the request ever reaches the controller. Only the
// Playwright run against the real API caught this — the unit tests mock this module, so they
// never exercise apiFetch. An explicit empty object satisfies the parser without apps/api
// having to change (out of scope for this task).
export function createInvite(campaignId: string, expiresInDays?: number): Promise<Invite> {
  return apiFetch<Invite>(`/campaigns/${campaignId}/invites`, {
    method: "POST",
    // Sin `expiresInDays` el enlace **no caduca**, que es como se han comportado todos hasta hoy.
    body: JSON.stringify(expiresInDays === undefined ? {} : { expiresInDays }),
  });
}

/** Los enlaces repartidos, con su estado. Solo el DM (el servidor responde 403 al resto). */
export function fetchInvites(campaignId: string): Promise<InviteRow[]> {
  return apiFetch<InviteRow[]>(`/campaigns/${campaignId}/invites`);
}

/** **Revocar**: mata el enlace sin fingir que alguien lo usó. */
export function revokeInvite(inviteId: string): Promise<{ revoked: true }> {
  return apiFetch(`/invites/${inviteId}`, { method: "DELETE" });
}

export function acceptInvite(token: string): Promise<AcceptedInvite> {
  return apiFetch<AcceptedInvite>(`/invites/${token}/accept`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

// A player who isn't logged in yet can't accept an invite (the endpoint requires a JWT), so
// JoinPage.tsx has to remember the token across a login/register round trip. It goes in the
// same place session state already lives (localStorage, next to auth.store.ts's "dnd_token"),
// and gets cleared the moment it's consumed — either by an accept attempt (success or not), by
// whichever of LoginPage/RegisterPage reads it to resume the join, or by logout() (same place
// that clears "dnd_token"). Colocated here, not in JoinPage.tsx, because four call sites
// (JoinPage, LoginPage, RegisterPage, auth.store.ts) all need it.
//
// It also expires. Nothing used to delete it if the visitor never came back — not logout(),
// not a timer, nothing — so a pending invite left on a shared browser sat there forever, and
// the next unrelated login on that machine auto-resumed it (JoinPage.tsx used to accept on
// mount with no confirmation). PENDING_INVITE_TTL_MS bounds how long that leftover key can act:
// 5 minutes is enough to click through a login or a short registration form without re-pasting
// the link, and short enough that walking away from a shared table laptop doesn't hand the
// pending invite to whoever logs in next. A stamp travels with the token so peekPendingInvite
// can tell a fresh save from a stale one and self-clear past the deadline.
const PENDING_INVITE_KEY = "dnd_pending_invite_token";
export const PENDING_INVITE_TTL_MS = 5 * 60 * 1000;

interface StoredPendingInvite {
  token: string;
  savedAt: number;
}

export function savePendingInvite(token: string): void {
  const entry: StoredPendingInvite = { token, savedAt: Date.now() };
  localStorage.setItem(PENDING_INVITE_KEY, JSON.stringify(entry));
}

export function peekPendingInvite(): string | null {
  const raw = localStorage.getItem(PENDING_INVITE_KEY);
  if (!raw) return null;
  let entry: StoredPendingInvite;
  try {
    entry = JSON.parse(raw) as StoredPendingInvite;
  } catch {
    // Written by an older version of this code (a bare token string, no timestamp): treat as
    // expired rather than trust it forever.
    clearPendingInvite();
    return null;
  }
  if (Date.now() - entry.savedAt > PENDING_INVITE_TTL_MS) {
    clearPendingInvite();
    return null;
  }
  return entry.token;
}

export function clearPendingInvite(): void {
  localStorage.removeItem(PENDING_INVITE_KEY);
}

// The two known error messages the server sends for this flow (invites.controller.ts /
// membership.service.ts) are in English; the rest of the interface is Spanish
// (docs/04-convenciones.md), and whoever reads this just arrived from a link with no other
// context. Translate only what's recognized — anything else passes through untouched rather
// than hiding the real cause behind an invented message.
const KNOWN_INVITE_ERRORS: Record<string, string> = {
  "Invalid or already-used invite": "La invitación no es válida o ya se ha usado.",
  "DM role required": "Solo el DM de la campaña puede hacer esto.",
};

export function translateInviteError(message: string): string {
  return KNOWN_INVITE_ERRORS[message] ?? message;
}
