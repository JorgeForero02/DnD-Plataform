import type { NotificationType } from "@dnd/shared";
import type { NotificationRow } from "./api";

// Plan 12 · 12.2 — **la forma legible de un aviso, escrita UNA vez.**
//
// Ningún valor de enumeración llega a la pantalla (regla vinculante de `docs/04-convenciones.md`,
// y el fallo que apareció tres veces en una sola mañana: `(LOCATION)`, `PUBLIC`, `Nuevo LOCATION`).
// Aquí se decide qué dice cada aviso y a dónde lleva, y todo lo demás lo importa.

/** Lo que el payload puede traer, mirado con cuidado: es JSON del servidor, no un tipo. */
function texto(payload: Record<string, unknown>, clave: string): string | null {
  const valor = payload[clave];
  return typeof valor === "string" && valor.length > 0 ? valor : null;
}

/**
 * **El `Record` es exhaustivo a propósito.** Un tipo de aviso nuevo en `@dnd/shared` sin frase aquí
 * **no compila**, en vez de asomar su enumeración en la bandeja de alguien.
 */
const FRASE: Record<NotificationType, (fila: NotificationRow) => string> = {
  CAMPAIGN_MEMBER_JOINED: () => "Alguien se ha sentado a tu mesa.",
  ENTITY_CREATED: (f) => {
    const nombre = texto(f.payload, "entityName");
    return nombre ? `Ficha nueva en el mundo: ${nombre}.` : "Hay una ficha nueva en el mundo.";
  },
  ENTITY_REVEALED: (f) => {
    const nombre = texto(f.payload, "entityName");
    return nombre ? `Se ha revelado ${nombre}.` : "Se ha revelado una ficha del mundo.";
  },
  COMMENT_ADDED: (f) => {
    const nombre = texto(f.payload, "entityName");
    // **El cuerpo del comentario no viaja en el aviso** —el hilo tiene su propia puerta—, así que
    // esta frase no puede citarlo ni aunque quisiera. Dice **que** se comentó, y lleva allí.
    return nombre ? `Han comentado ${nombre}.` : "Han comentado una ficha.";
  },
  SESSION_STARTED: (f) => {
    const titulo = texto(f.payload, "sessionTitle");
    return titulo ? `Ha empezado «${titulo}».` : "Ha empezado una sesión.";
  },
  SESSION_SCHEDULED: (f) => {
    const titulo = texto(f.payload, "sessionTitle");
    const cuando = texto(f.payload, "scheduledAt");
    const fecha = cuando
      ? new Date(cuando).toLocaleDateString("es", { day: "numeric", month: "long" })
      : null;
    const que = titulo ? `«${titulo}»` : "una sesión";
    return fecha ? `Hay ${que} en el calendario: ${fecha}.` : `Hay ${que} en el calendario.`;
  },
  RULE_PROPOSAL: () => "Alguien propone una regla para la mesa.",
  RULE_NOTIFY: (f) => {
    const mensaje = texto(f.payload, "message");
    return mensaje ?? "Una regla de la mesa tiene un aviso para ti.";
  },
};

/**
 * **A dónde lleva un aviso.** Cada uno lleva al sitio donde pasó: es una de las tres cosas que la
 * bandeja hace, y sin ella la lista solo cuenta lo que ya pasó sin dejarte llegar.
 *
 * `null` cuando el aviso no tiene campaña —no debería ocurrir con los tipos de hoy—, y entonces la
 * fila se pinta sin enlace en vez de inventarse un destino que dé 404.
 */
const DESTINO: Record<NotificationType, (fila: NotificationRow, campana: string) => string | null> =
  {
    CAMPAIGN_MEMBER_JOINED: (_f, c) => `/campaigns/${c}?seccion=settings`,
    ENTITY_CREATED: (f, c) => (f.subjectId ? `/campaigns/${c}/entidades/${f.subjectId}` : null),
    ENTITY_REVEALED: (f, c) => (f.subjectId ? `/campaigns/${c}/entidades/${f.subjectId}` : null),
    COMMENT_ADDED: (f, c) => (f.subjectId ? `/campaigns/${c}/entidades/${f.subjectId}` : null),
    SESSION_STARTED: (f, c) => (f.subjectId ? `/campaigns/${c}/sesiones/${f.subjectId}` : null),
    SESSION_SCHEDULED: (f, c) => (f.subjectId ? `/campaigns/${c}/sesiones/${f.subjectId}` : null),
    RULE_PROPOSAL: (_f, c) => `/campaigns/${c}?seccion=rules`,
    // Sin ficha, sesión ni regla propia a la que apuntar (`RULE_NOTIFY` no lleva `subjectId`):
    // sin destino no se finge uno, y la fila se pinta sin enlace.
    RULE_NOTIFY: () => null,
  };

export function fraseDeAviso(fila: NotificationRow): string {
  return FRASE[fila.type](fila);
}

export function destinoDeAviso(fila: NotificationRow): string | null {
  if (!fila.campaignId) return null;
  return DESTINO[fila.type](fila, fila.campaignId);
}

/** «hace un momento», «hace 3 h», «el 12 de septiembre». Lo corto es lo que se lee de un vistazo. */
export function cuandoFue(iso: string, ahora = new Date()): string {
  const minutos = Math.floor((ahora.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutos < 1) return "hace un momento";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `hace ${dias} ${dias === 1 ? "día" : "días"}`;
  return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "long" });
}
