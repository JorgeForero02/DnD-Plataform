// Reseño 2026-09-02 — audit finding A1. The entry screens said "Invalid credentials" in an
// interface CLAUDE.md requires to be in Spanish, because the message came straight off the
// API and nothing translated it. This is the same pattern AccountPage and InvitePanel already
// use (translateAccountError, translateInviteError), applied to the two screens that never
// got it.
//
// Deliberately a lookup of the messages the API can actually produce, not a guess at the
// shape of every future error: anything unrecognised is passed through rather than replaced
// by a friendly lie about what went wrong.

const MENSAJES: { patron: RegExp; texto: string }[] = [
  {
    patron: /invalid credentials/i,
    texto: "Correo o contraseña incorrectos.",
  },
  {
    patron: /email already in use|unique constraint/i,
    texto: "Ya hay una cuenta con ese correo.",
  },
  {
    // ThrottlerException: "Too Many Requests" never tells a person the one thing they need —
    // that waiting fixes it.
    patron: /too many requests|throttler/i,
    texto: "Demasiados intentos seguidos. Espera un minuto y vuelve a probar.",
  },
  {
    patron: /failed to fetch|networkerror|load failed/i,
    texto: "No se ha podido contactar con el servidor. Comprueba tu conexión.",
  },
];

export function traducirErrorDeAcceso(e: unknown): string {
  const mensaje = e instanceof Error ? e.message : String(e);
  const encontrado = MENSAJES.find((m) => m.patron.test(mensaje));
  return encontrado ? encontrado.texto : mensaje;
}
