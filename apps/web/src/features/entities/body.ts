// Tolerant reader: `body` comes straight from the server as `unknown` on the wire (the
// column is `Json?`), so this is the one place that decides what counts as "no text yet"
// instead of trusting the shape. A plain string is accepted too even though nothing writes
// one anymore, in case an older row (or a future non-web writer) put one there directly.
//
// Lives in its own module (not inline in EntityEditor.tsx) so that file keeps exactly one
// export — the component — and doesn't trip react-refresh/only-export-components.
export function bodyToText(body: unknown): string {
  if (typeof body === "string") return body;
  if (
    body &&
    typeof body === "object" &&
    "format" in body &&
    (body as { format: unknown }).format === "markdown" &&
    "text" in body &&
    typeof (body as { text: unknown }).text === "string"
  ) {
    return (body as { text: string }).text;
  }
  return "";
}
