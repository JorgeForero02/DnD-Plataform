import { useState } from "react";
import { Link } from "react-router-dom";
import type { Session } from "./api";
import { useAllEntities } from "../entities/hooks";
import { useGameClock } from "../game-clock/hooks";
import { useGameLog, useMinutoActual } from "./hooks";
import { duracionDesde } from "./vocabulario";
import { lugarDeLaEscena, momentoDeLaCampana } from "./escena";
import { IconoEnJuego, IconoLugar, IconoAyuda } from "./iconos";
import { useMembers } from "../campaigns/members";
import { fieldControlClass } from "../../ui/Field";
import { ThemeToggle } from "../../ui/ThemeToggle";
import { BandejaDeAvisos } from "../notifications/BandejaDeAvisos";
import { IconoFlechaIzquierda, IconoLuna, IconoSol } from "../../ui/Iconos";
import { Dialog } from "../../ui/Dialog";

// Task 3 (plan 3A.3) — **la banda única de la mesa.**
//
// Funde dos piezas que el prototipo del autor pinta en una sola fila —`BandaDeMesa` (volver a la
// campaña, la duración, «Ver como», los avisos, el tema) y `CabeceraDeEscena` (el título de la
// escena, su lugar en cobre, el reloj de la campaña)— porque hasta hoy vivían apiladas: dos
// cabeceras encima de la pantalla donde se juega, exactamente el defecto que Ola 0 ya corrigió una
// vez para la cabecera de aplicación y la banda. Aquí es la misma corrección, un nivel más abajo.
//
// **El `<header aria-label="Estado de la mesa">` no cambia de nombre.** Es lo único que sostiene a
// toda la suite de e2e que mide la mesa (`mesa-mide.spec.ts`, `tablero-en-la-mesa.spec.ts`,
// `desbordes.spec.ts`…): siguen viendo el mismo `banner`, así que ninguna de ellas se toca por
// esto. Lo que sí desaparece es el `<section aria-label="La escena">` de al lado: su contenido
// entra en esta misma fila, y los recorridos que lo usaban como señal de «hemos llegado a la mesa»
// pasan a usar la banda — `grep` de «La escena»/«Escena actual»/«En la escena» en `apps/web/e2e` y
// `apps/web/src` antes de tocar nada, como manda el contrato.
//
// **Lo que el prototipo (`prototipo-1280.png`) NO pinta y aquí se conserva de todas formas: los
// presentes.** La fila superior de la maqueta no trae la lista de nombres que `CabeceraDeEscena`
// mostraba bajo el título — probablemente porque su captura no tenía datos que enseñar ahí, no
// porque la información sobre — así que se deja como una segunda línea que solo aparece **con
// datos** (mismo patrón `empty:hidden` que ya usa el resto de la mesa): no ocupa sitio cuando no
// hay nada que decir, y no se pierde la única prueba que demuestra que la asistencia declarada
// llega a nombrarse en la escena.
//
// **Lo que SÍ se deja caer, y es una decisión de este carril**: la eyebrow «Escena actual» / «La
// mesa, en reposo» que `CabeceraDeEscena` pintaba encima del título. El prototipo no la trae, y
// fundidas las dos piezas en una fila no hay sitio para una tercera línea de rótulo que no añade
// nada que el propio título y el «N en la mesa» de al lado no digan ya. El título en reposo pasa a
// decir literalmente «La mesa, en reposo» — la frase que antes solo llevaba la eyebrow — así que
// la información no desaparece, se dice una vez en vez de dos.

/** El modo del centro de la mesa (Task 5 lo consume): con o sin el tablero. */
export type ModoDeLaMesa = "tablero" | "cronica";

function claveDeModo(campaignId: string): string {
  return `mesa:modo:${campaignId}`;
}

/**
 * Lee el modo guardado para esta campaña. `try/catch`: `localStorage` puede lanzar en modo
 * privado o con el almacenamiento bloqueado, y un conmutador que revienta el montaje de la mesa
 * por esto sería mucho peor que uno que simplemente no recuerda la elección.
 */
export function leerModoDeLaMesa(campaignId: string): ModoDeLaMesa {
  try {
    const guardado = localStorage.getItem(claveDeModo(campaignId));
    return guardado === "cronica" ? "cronica" : "tablero";
  } catch {
    return "tablero";
  }
}

/** Guarda el modo elegido. Mismo `try/catch` que la lectura, y por el mismo motivo. */
export function guardarModoDeLaMesa(campaignId: string, modo: ModoDeLaMesa): void {
  try {
    localStorage.setItem(claveDeModo(campaignId), modo);
  } catch {
    // Nada que hacer: la elección de esta sesión de navegador no se recuerda, y no es un error
    // que el jugador tenga que ver.
  }
}

export function BandaUnica({
  campaignId,
  nombreDeCampana,
  sesion,
  esDm,
  comoUsuario,
  onComoUsuario,
  presentes,
  hayTablero,
  modo,
  onModo,
}: {
  campaignId: string;
  nombreDeCampana: string | undefined;
  sesion: Session | null;
  esDm: boolean;
  comoUsuario: string;
  onComoUsuario: (v: string) => void;
  presentes: string[];
  hayTablero: boolean;
  modo: ModoDeLaMesa;
  onModo: (modo: ModoDeLaMesa) => void;
}) {
  // El minuto solo corre mientras hay sesión: sin ella no hay duración que refrescar.
  const ahora = useMinutoActual(Boolean(sesion));
  const { data: miembros } = useMembers(campaignId);
  const cuantos = sesion?.attendance?.length ?? null;

  // El lugar y el reloj se leen del registro y del reloj de LA CAMPAÑA, no de la sesión en curso:
  // la escena sobrevive a la sesión, y revelar una ficha no lleva `sessionId`. Ver `escena.ts`
  // para el porqué completo — no cambia con esta tarea, solo cambia dónde se pinta.
  const { data: entidades } = useAllEntities(campaignId);
  const { data: reloj } = useGameClock(campaignId);
  const { data: log } = useGameLog(campaignId);
  const lugar = lugarDeLaEscena(log?.events ?? [], entidades ?? []);
  const momento = momentoDeLaCampana(reloj?.seconds ?? 0);
  const Astro = momento.esNoche ? IconoLuna : IconoSol;

  const [atajosAbiertos, setAtajosAbiertos] = useState(false);

  return (
    <header
      aria-label="Estado de la mesa"
      className="flex shrink-0 flex-wrap items-center gap-x-s3 gap-y-s2 border-b border-muted bg-surface px-s4 py-s2 lg:flex-nowrap"
    >
      {/* Anexo #18 — salir de la mesa vuelve a la CAMPAÑA que se estaba jugando, a su pestaña
          Sesiones, no a la lista entera.

          Fix round 1 — **`shrink-0` desde aquí hasta el atajo de teclado, a propósito.** La
          regla del ruling es «una sola cosa se encoge»: el título de la escena. Todo lo demás
          —este enlace, el separador, «Tus crónicas», la duración, el reloj, el conmutador, el
          atajo— mantiene su ancho natural en `lg:flex-nowrap`; si no fueran `shrink-0`, el
          navegador los encogería a todos un poco en vez de dejar que el título (que SÍ sabe
          truncarse con puntos suspensivos) absorba el hueco que falta. */}
      <Link
        to={`/campaigns/${campaignId}?seccion=sessions`}
        className="inline-flex shrink-0 items-center gap-s1 font-title text-chrome-md text-text transition-colors hover:text-accent-text"
      >
        <IconoFlechaIzquierda className="h-4 w-4 shrink-0 text-muted" />
        <span className="truncate">{nombreDeCampana ?? "Campaña"}</span>
      </Link>
      <span aria-hidden="true" className="h-4 w-px shrink-0 bg-muted/40" />
      <Link
        to="/"
        className="shrink-0 whitespace-nowrap font-chrome text-chrome-sm text-muted transition-colors hover:text-text"
      >
        Tus crónicas
      </Link>

      {/* El título de la escena, con su lugar en cobre al lado. Sin lugar revelado, no se
          inventa uno: docs/04-convenciones.md lo prohíbe explícitamente.

          Fix round 1 (D-CF-148) — **`flex-1 min-w-0` en el envoltorio, `min-w-0` también en el
          `<p>`.** Es la ÚNICA pieza de la banda que se encoge: todo lo demás es `shrink-0`, así
          que este `div` es quien absorbe el hueco que sobra o falta. El `<p>` necesita su PROPIO
          `min-w-0` —no basta con el del padre— porque es un ítem de flex de ESTE `div`
          (`items-baseline`), y un ítem de flex tiene `min-width: auto` por defecto (el mismo
          defecto de `min-h-0` que gobierna toda la mesa, en el eje horizontal): sin él, `truncate`
          nunca se activa y el título simplemente desborda. El `title` nativo del navegador es el
          reemplazo de lo que se pierde al truncar — pasar el ratón por encima dice el nombre
          entero sin abrir nada. */}
      <div className="flex min-w-0 flex-1 items-baseline gap-s2">
        <p
          className="min-w-0 truncate font-title text-chrome-md text-text"
          title={sesion ? sesion.title : "La mesa, en reposo"}
        >
          {sesion ? sesion.title : "La mesa, en reposo"}
        </p>
        {lugar && (
          <Link
            to={`/campaigns/${campaignId}/entidades/${lugar.id}`}
            // Fix round 1 — **primer sacrificio si no cabe: el lugar se oculta por debajo de
            // `xl` (1280 px)** y reaparece de ahí para arriba, que es literalmente el ruling.
            className="hidden shrink-0 whitespace-nowrap font-chrome text-chrome-xs text-copper-text underline-offset-4 hover:underline xl:inline"
          >
            {lugar.nombre}
          </Link>
        )}
      </div>

      {sesion && (
        <p className="flex shrink-0 items-center gap-s2 whitespace-nowrap font-data text-chrome-xs text-accent-text">
          <IconoEnJuego className="h-2.5 w-2.5 shrink-0" />
          <span className="text-muted">
            {duracionDesde(sesion.startedAt, ahora)} ·{" "}
            {/* Fix round 1 — **segundo sacrificio si no cabe: la asistencia.** Sobrevive un
                ancho más que el lugar (se oculta un paso más tarde, en `lg`, no en `xl`) porque
                es la mitad de este `<p>` que el ruling nombra explícitamente como la segunda en
                caer — la duración («386h 6m») se queda siempre, es la mitad que de verdad
                importa para saber si la sesión sigue viva. */}
            <span className="hidden lg:inline">
              {cuantos === null
                ? "asistencia sin declarar"
                : cuantos === 1
                  ? "1 en la mesa"
                  : `${cuantos} en la mesa`}
            </span>
          </span>
        </p>
      )}

      {/* El reloj de la campaña, siempre — también en reposo, que es cuando más se pregunta
          «¿por dónde va el tiempo del mundo?». */}
      <div className="flex shrink-0 items-center gap-s1 whitespace-nowrap font-data text-chrome-xs text-muted">
        <Astro className="h-4 w-4 text-copper-text" aria-hidden="true" />
        <span className="text-text">{momento.hora}</span>
        <span>
          {momento.dia}, {momento.esNoche ? "de noche" : "de día"}
        </span>
      </div>

      {/* El conmutador del centro (Task 5 lo consume). Solo existe con sala guardada: sin
          tablero no hay nada entre lo que elegir. */}
      {hayTablero && (
        <div
          role="radiogroup"
          aria-label="Modo de la mesa"
          className="flex shrink-0 items-center gap-s1 whitespace-nowrap rounded-radius-md border border-muted/30 bg-bg p-s1"
        >
          {(
            [
              ["tablero", "Con tablero"],
              ["cronica", "Sin tablero"],
            ] as [ModoDeLaMesa, string][]
          ).map(([valor, etiqueta]) => {
            const puesto = modo === valor;
            return (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={puesto}
                onClick={() => onModo(valor)}
                className={[
                  "rounded-radius-sm px-s2 py-s1 font-chrome text-chrome-xs transition-colors",
                  puesto
                    ? "bg-accent/10 text-accent-text"
                    : "text-muted hover:bg-muted/20 hover:text-text",
                ].join(" ")}
              >
                {etiqueta}
              </button>
            );
          })}
        </div>
      )}

      {/* Atajos: la lista de teclas que de verdad existen (MesaDeSesion.tsx), no más. */}
      <button
        type="button"
        onClick={() => setAtajosAbiertos(true)}
        aria-label="Atajos de teclado"
        title="Atajos de teclado"
        className="shrink-0 rounded-radius-sm p-s1 text-muted transition-colors hover:text-text"
      >
        <IconoAyuda className="h-4 w-4" />
      </button>
      <Dialog open={atajosAbiertos} onClose={() => setAtajosAbiertos(false)} title="Atajos">
        <dl className="space-y-s2 font-chrome text-chrome-sm text-text">
          {[
            ["N", "Tu hoja"],
            ["I", "Tu bolsa"],
            ["M", "Consulta del mundo"],
            ["D", "Los dados"],
            ["Esc", "Cerrar lo que esté abierto"],
          ].map(([tecla, que]) => (
            <div key={tecla} className="flex items-center gap-s3">
              <dt className="w-10 shrink-0 rounded-radius-sm border border-muted bg-bg px-s2 py-s1 text-center font-data text-chrome-xs text-muted">
                {tecla}
              </dt>
              <dd>{que}</dd>
            </div>
          ))}
        </dl>
      </Dialog>

      <div className="ml-auto flex items-center gap-s3">
        {esDm && (
          <label className="flex items-center gap-s2 font-chrome text-chrome-xs text-muted">
            <span className="whitespace-nowrap">Ver como</span>
            <select
              aria-label="Ver el registro como"
              value={comoUsuario}
              onChange={(e) => onComoUsuario(e.target.value)}
              className={fieldControlClass}
            >
              <option value="">yo (DM)</option>
              {(miembros ?? [])
                .filter((m) => m.role !== "DM")
                .map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.displayName}
                  </option>
                ))}
            </select>
          </label>
        )}
        <BandejaDeAvisos />
        <ThemeToggle variante="en-banda" />
      </div>

      {/* Los presentes: solo con datos, y en su propia línea — el prototipo no le reserva sitio
          en la fila principal, pero la información no desaparece. */}
      {presentes.length > 0 && (
        <p className="flex w-full flex-wrap items-center gap-x-s2 gap-y-s1 font-chrome text-chrome-xs text-muted">
          <IconoLugar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>En la escena:</span>
          {presentes.map((nombre) => (
            <span
              key={nombre}
              className="rounded-radius-sm border border-muted/40 px-s2 py-s1 text-text"
            >
              {nombre}
            </span>
          ))}
        </p>
      )}
    </header>
  );
}
