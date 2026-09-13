import { Link } from "react-router-dom";
import type { Session } from "./api";
import { useMinutoActual } from "./hooks";
import { duracionDesde } from "./vocabulario";
import { IconoEnJuego } from "./iconos";
import { useMembers } from "../campaigns/members";
import { fieldControlClass } from "../../ui/Field";
import { ThemeToggle } from "../../ui/ThemeToggle";
import { BandejaDeAvisos } from "../notifications/BandejaDeAvisos";
import { IconoFlechaIzquierda } from "../../ui/Iconos";

// **Ola 0 (2026-09-04) — la banda superior de la mesa, fina.**
//
// Sustituye a dos piezas apiladas que la auditoría señaló como el defecto más visible del
// armazón: la cabecera de la aplicación con sus migas de pan **y** la banda de estado de la
// sesión, una encima de la otra, ocupando la parte alta de la pantalla donde se juega.
//
// La maqueta pone ahí **una sola línea**: volver a las crónicas, el nombre de la campaña, cuánto
// lleva la sesión, y el conmutador de tema (`prototipo/src/features/BandaDeEstado.tsx:67-79`, que
// era el último punto abierto del §1 de la auditoría).
//
// **Lo que NO se copia de la maqueta, y por qué.** La maqueta trae ahí un conmutador
// «Jugador / DM» que cambia lo que se pinta. Aquí eso sería mentira: **`canView` en el servidor
// decide qué llega**, y esta pantalla solo enseña lo que recibió. Lo que sí hay —y es lo
// contrario— es «ver el registro como» otro jugador: el servidor vuelve a filtrar con **otro
// espectador**, así que el DM pasa a ver **menos**, nunca más.
//
// **La asistencia se declara, no se detecta.** La cifra sale de `Session.attendance`, que alguien
// rellenó al empezar. Si nadie la declaró se dice, en vez de inventar un número contando miembros.

export function BandaDeMesa({
  campaignId,
  nombreDeCampana,
  sesion,
  esDm,
  comoUsuario,
  onComoUsuario,
}: {
  campaignId: string;
  nombreDeCampana: string | undefined;
  sesion: Session | null;
  esDm: boolean;
  comoUsuario: string;
  onComoUsuario: (v: string) => void;
}) {
  // El minuto solo corre mientras hay sesión: sin ella no hay duración que refrescar.
  const ahora = useMinutoActual(Boolean(sesion));
  const { data: miembros } = useMembers(campaignId);
  const cuantos = sesion?.attendance?.length ?? null;

  return (
    <header
      aria-label="Estado de la mesa"
      className="flex shrink-0 flex-wrap items-center gap-x-s3 gap-y-s2 border-b border-muted bg-surface px-s4 py-s2"
    >
      {/* Anexo #18 — salir de la mesa vuelve a la CAMPAÑA que se estaba jugando, a su pestaña
          Sesiones, no a la lista entera: «Tus crónicas» era la primera miga y mandaba a cero.
          `?seccion=sessions` es el mismo enlace que ya usa `MesaDeSesion.tsx` para «Entrar a la
          mesa» — `CampaignDetailPage.tsx` lo resuelve a esa pestaña. */}
      <Link
        to={`/campaigns/${campaignId}?seccion=sessions`}
        className="inline-flex min-w-0 items-center gap-s1 font-title text-chrome-md text-text transition-colors hover:text-accent-text"
      >
        <IconoFlechaIzquierda className="h-4 w-4 shrink-0 text-muted" />
        <span className="truncate">{nombreDeCampana ?? "Campaña"}</span>
      </Link>
      <span aria-hidden="true" className="h-4 w-px bg-muted/40" />
      <Link
        to="/"
        className="font-chrome text-chrome-sm text-muted transition-colors hover:text-text"
      >
        Tus crónicas
      </Link>

      {sesion ? (
        <p className="flex min-w-0 items-center gap-s2 font-data text-chrome-xs text-accent-text">
          <IconoEnJuego className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate">{sesion.title}</span>
          <span className="text-muted">
            · {duracionDesde(sesion.startedAt, ahora)} ·{" "}
            {cuantos === null
              ? "asistencia sin declarar"
              : cuantos === 1
                ? "1 en la mesa"
                : `${cuantos} en la mesa`}
          </span>
        </p>
      ) : (
        <p className="font-chrome text-chrome-xs text-muted">En reposo</p>
      )}

      <div className="ml-auto flex items-center gap-s3">
        {esDm && (
          <label className="flex items-center gap-s2 font-chrome text-chrome-xs text-muted">
            {/* **El rótulo no se parte en tres líneas.** Con «Ver el registro como» escrito
                entero, la banda lo envolvía a tres renglones y empujaba el resto de la fila —a
                1280 px y peor a 390—. Lo cazó un paseo de uso, no una prueba: `jsdom` no maqueta.
                Se acorta lo VISIBLE y **el nombre accesible se queda entero**, que es lo que lee
                quien no ve la banda. */}
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
        {/* La mesa vive **fuera de `AppShell`**, así que no hereda la cabecera ni su bandeja. Y
            es justo donde más falta hace enterarse de algo sin salir a buscarlo, así que la
            bandeja entra aquí también, al lado del conmutador de tema — el mismo componente, no
            una segunda versión: dos bandejas serían dos contadores y uno acabaría mintiendo. */}
        <BandejaDeAvisos />
        <ThemeToggle variante="en-banda" />
      </div>
    </header>
  );
}
