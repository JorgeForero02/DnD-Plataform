import { useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { SessionNoteKind, Visibility } from "@dnd/shared";
import type { Session } from "./api";
import type { GameEventRow } from "./log-api";
import { useCurrentSession, useGameLog, useMinutoActual, useStampNote } from "./hooks";
import { ICONO_SELLO, NOMBRE_SELLO, SELLOS_EN_ORDEN, duracionDesde } from "./vocabulario";
import {
  IconoBuscar,
  IconoElenco,
  IconoEnJuego,
  IconoRegistro,
  IconoPuntosDeGolpe,
} from "./iconos";
import { horaDe, lineaDeLog, selloDeSuceso } from "./linea-de-log";
import { useMembers, useMyRole } from "../campaigns/members";
import type { Member } from "../campaigns/members";
import { useCharacters } from "../characters/hooks";
import type { Character } from "../characters/api";
import { descriptorDePersonaje } from "../characters/descriptor";
import { useCharacterSheet, useChangeHp, useConditions } from "../character-sheet/hooks";
import { nombreCondicion } from "../character-sheet/vocabulario";
import { useAllEntities } from "../entities/hooks";
import { useAuthStore } from "../../store/auth.store";
import { Button } from "../../ui/Button";
import { fieldControlClass } from "../../ui/Field";
import { Badge } from "../../ui/Badge";
import { EmptyState } from "../../ui/Collection";

// La mesa: la pantalla que se mira mientras se juega.
//
// Tres paneles, y el reparto sale de la investigación de once VTT: **quién está** a la izquierda,
// **qué pasa** en el centro, **qué consulto** a la derecha. Shard Tabletop es el único producto
// que hace algo así y el único que cierra la sesión de verdad.
//
// La crítica que esto ataca aparece en todos los foros y no es «le falta algo»: es **el DM con
// quince pestañas abiertas**. Por eso el panel de consulta trae el mundo aquí en vez de mandarte
// a otra pantalla, y por eso «revelar» es un botón de mesa y no un formulario de configuración:
// si para enseñar un lugar hay que ir a cambiar un desplegable, en mitad de la partida no se hace.
//
// **Adoptado de la maqueta (2026-09-02):** el mismo reparto de tres columnas, pero cada una
// dentro de una tarjeta con su cabecera en vez de tres listas sueltas flotando sobre el fondo; una
// **banda de estado** arriba que dice de un golpe qué sesión es, cuánto lleva y cuánta gente hay; y
// sobre todo un **elenco con datos**: retrato, quién lleva el personaje, puntos de golpe con su
// barra y las condiciones activas. Antes el elenco decía un nombre y la palabra «sin personaje».
//
// **Lo que NO se copia de la maqueta, y por qué.** La maqueta trae un conmutador «Ver como DM /
// Jugador» que cambia lo que se pinta. Aquí eso sería mentira: **`canView` en el servidor decide
// qué llega**, y esta pantalla solo enseña lo que recibió. Lo que sí hay —y es lo contrario— es
// «ver el registro como» otro jugador: el servidor vuelve a filtrar con **otro espectador**, así
// que el DM pasa a ver **menos**, nunca más.

export function MesaDeSesion({ campaignId }: { campaignId: string }) {
  const { data: sesion, isLoading } = useCurrentSession(campaignId);
  const { role } = useMyRole(campaignId);
  const esDm = role === "DM";
  // «Ver como»: el DM elige por los ojos de quién mira. El servidor sigue filtrando por canView.
  const [comoUsuario, setComoUsuario] = useState<string>("");

  const { data: log } = useGameLog(campaignId, {
    sessionId: sesion?.id,
    as: esDm && comoUsuario ? comoUsuario : undefined,
  });

  if (isLoading) {
    return <p className="font-chrome text-chrome-sm text-muted">Buscando la sesión…</p>;
  }
  if (!sesion) {
    return (
      <EmptyState title="No hay ninguna sesión en curso">
        Cuando el DM empiece una sesión desde la pestaña «Sesiones», esta pantalla se llena sola y
        aparece la barra de «en juego» en toda la campaña.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-s4">
      <BandaDeEstado
        campaignId={campaignId}
        sesion={sesion}
        esDm={esDm}
        comoUsuario={comoUsuario}
        onComoUsuario={setComoUsuario}
      />
      <div className="grid items-start gap-s4 lg:grid-cols-[18rem_minmax(0,1fr)_18rem]">
        <Elenco campaignId={campaignId} asistencia={sesion.attendance} esDm={esDm} />
        <Registro
          campaignId={campaignId}
          eventos={log?.events ?? []}
          esDm={esDm}
          comoUsuario={comoUsuario}
        />
        <Consulta campaignId={campaignId} esDm={esDm} />
      </div>
    </div>
  );
}

/**
 * La tarjeta de la mesa: una cabecera con su icono y su filete, y el cuerpo debajo.
 *
 * Es lo que la maqueta hace y la versión anterior no: los tres paneles eran tres listas sueltas
 * sobre el mismo fondo, sin nada que dijera dónde termina uno y empieza el siguiente. Con un
 * elenco de cinco y un registro largo, las tres columnas se leían como una sola.
 */
function PanelDeMesa({
  titulo,
  icono,
  accion,
  etiqueta,
  children,
  className = "",
}: {
  titulo: string;
  icono: ReactNode;
  accion?: ReactNode;
  etiqueta: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={etiqueta}
      className={`flex min-w-0 flex-col rounded-radius-sm border border-muted bg-surface ${className}`}
    >
      <div className="flex items-center gap-s2 border-b border-muted px-s3 py-s2">
        <span className="text-copper-text">{icono}</span>
        <h2 className="min-w-0 flex-1 truncate font-chrome text-chrome-sm font-semibold text-text">
          {titulo}
        </h2>
        {accion}
      </div>
      <div className="min-w-0 p-s3">{children}</div>
    </section>
  );
}

/**
 * La banda de estado: qué sesión, cuánto lleva y cuánta gente hay, en una línea.
 *
 * La maqueta lo pone ahí arriba porque es lo primero que se mira al volver a la pestaña después
 * de veinte minutos. **La asistencia se declara, no se detecta**: aquí no hay conexiones en vivo
 * y esta cifra sale de `Session.attendance`, que alguien rellenó al empezar. Si nadie la declaró
 * se dice, en vez de inventar un número contando miembros.
 */
function BandaDeEstado({
  campaignId,
  sesion,
  esDm,
  comoUsuario,
  onComoUsuario,
}: {
  campaignId: string;
  sesion: Session;
  esDm: boolean;
  comoUsuario: string;
  onComoUsuario: (v: string) => void;
}) {
  const ahora = useMinutoActual(true);
  const { data: miembros } = useMembers(campaignId);
  const cuantos = sesion.attendance?.length ?? null;

  return (
    <section
      aria-label="Estado de la sesión"
      className="flex flex-wrap items-center gap-x-s3 gap-y-s2 rounded-radius-sm border border-copper bg-surface px-s4 py-s3"
    >
      <IconoEnJuego className="h-2.5 w-2.5 shrink-0 text-copper-text" />
      <h2 className="min-w-0 font-title text-chrome-lg leading-none text-text">{sesion.title}</h2>
      <p className="font-data text-chrome-xs text-muted">
        en juego · {duracionDesde(sesion.startedAt, ahora)} ·{" "}
        {cuantos === null
          ? "asistencia sin declarar"
          : cuantos === 1
            ? "1 en la mesa"
            : `${cuantos} en la mesa`}
      </p>
      <div className="flex-1" />
      {esDm && (
        <label className="flex items-center gap-s2 font-chrome text-chrome-xs text-muted">
          Ver el registro como
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
    </section>
  );
}

/**
 * Quién está en la mesa, con lo que hace falta saber de cada uno mientras se juega.
 *
 * La asistencia **se declara**, no se deduce: los VTT saben quién está porque hay un socket
 * abierto y aquí no lo hay. Quien no vino se nombra igualmente, apagado y al pie — que alguien
 * falte es información de la partida, no un hueco.
 *
 * **La lista sale de los personajes, no de los miembros**, que es el cambio que trae la maqueta:
 * lo que se mira treinta veces por sesión son los puntos de golpe y las condiciones, y esos son
 * del personaje. El nombre de quien lo lleva va debajo, como en «La mesa entera».
 */
function Elenco({
  campaignId,
  asistencia,
  esDm,
}: {
  campaignId: string;
  asistencia: { userId: string; characterId?: string }[] | null;
  esDm: boolean;
}) {
  const { data: miembros } = useMembers(campaignId);
  const { data: personajes } = useCharacters(campaignId);
  const miId = useAuthStore((s) => s.user?.id);

  const declarados = asistencia ? new Set(asistencia.map((a) => a.characterId)) : null;
  // Sin asistencia declarada se enseñan todos los personajes que el servidor dejó ver: es lo
  // único honesto, porque no hay dato que diga quién vino.
  const enMesa = declarados
    ? (personajes ?? []).filter((p) => declarados.has(p.id))
    : (personajes ?? []);
  const nombreDe = new Map((miembros ?? []).map((m: Member) => [m.userId, m.displayName]));
  const vinieron = new Set((asistencia ?? []).map((a) => a.userId));
  const ausentes = asistencia
    ? (miembros ?? []).filter((m) => !vinieron.has(m.userId))
    : ([] as Member[]);

  return (
    <PanelDeMesa etiqueta="En la mesa" titulo="Elenco" icono={<IconoElenco className="h-4 w-4" />}>
      {!asistencia && (
        <p className="mb-s2 font-chrome text-chrome-xs text-muted">
          Nadie declaró quién vino al empezar la sesión.
        </p>
      )}
      {enMesa.length === 0 ? (
        <p className="font-chrome text-chrome-xs text-muted">
          Ningún personaje en la mesa todavía.
        </p>
      ) : (
        <ul className="flex flex-col gap-s2">
          {enMesa.map((p) => (
            <FichaDeElenco
              key={p.id}
              campaignId={campaignId}
              personaje={p}
              dueno={nombreDe.get(p.ownerId)}
              puedeCambiarPg={esDm || p.ownerId === miId}
            />
          ))}
        </ul>
      )}
      {ausentes.length > 0 && (
        <p className="mt-s3 border-t border-muted pt-s2 font-chrome text-chrome-xs text-muted">
          No vinieron: {ausentes.map((m) => m.displayName).join(", ")}.
        </p>
      )}
    </PanelDeMesa>
  );
}

/**
 * Un personaje en la mesa: retrato, quién lo lleva, puntos de golpe y condiciones.
 *
 * **Cada ficha pide su hoja y sus condiciones por separado**, y eso es a propósito: son los dos
 * endpoints que ya existen, los dos filtran por `canView` en el servidor, y un personaje que un
 * jugador no puede ver ni siquiera llega a esta lista. Una consulta por personaje en una mesa de
 * cinco es barata; inventar un endpoint agregado sería tocar la API para ahorrar cuatro peticiones.
 */
function FichaDeElenco({
  campaignId,
  personaje,
  dueno,
  puedeCambiarPg,
}: {
  campaignId: string;
  personaje: Character;
  dueno?: string;
  puedeCambiarPg: boolean;
}) {
  const { data: hoja } = useCharacterSheet(campaignId, personaje.id);
  const { data: condiciones } = useConditions(campaignId, personaje.id);
  const cambiarPg = useChangeHp(campaignId, personaje.id);

  const actual = hoja?.hp.current ?? null;
  const maximo = hoja?.hp.max ?? null;
  const descriptor = descriptorDePersonaje(personaje);

  return (
    <li className="rounded-radius-sm border border-muted bg-bg p-s2">
      <div className="flex items-center gap-s2">
        <Retrato nombre={personaje.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-title text-chrome-md leading-tight text-text">
            {personaje.name}
          </p>
          <p className="truncate font-data text-chrome-xs text-muted">
            {[descriptor, `Nivel ${personaje.level}`].filter(Boolean).join(" · ")}
          </p>
          {dueno && (
            <p className="truncate font-chrome text-chrome-xs text-muted">Lo lleva {dueno}</p>
          )}
        </div>
      </div>

      <BarraDePuntosDeGolpe nombre={personaje.name} actual={actual} maximo={maximo} />

      {puedeCambiarPg && maximo !== null && (
        // Dos golpes, no un formulario. La corrección exacta se hace en la hoja, con su control
        // de concurrencia; aquí solo está el gesto que se repite treinta veces por sesión.
        <div className="mt-s2 flex items-center gap-s2">
          {[-5, 5].map((delta) => (
            <Button
              key={delta}
              type="button"
              variant="ghost"
              className="px-2 py-0.5 font-data text-chrome-xs"
              disabled={cambiarPg.isPending}
              onClick={() => cambiarPg.mutate({ delta })}
              aria-label={`${delta < 0 ? "Quitar" : "Dar"} ${Math.abs(delta)} puntos de golpe a ${personaje.name}`}
            >
              {delta < 0 ? `−${Math.abs(delta)}` : `+${delta}`}
            </Button>
          ))}
          {cambiarPg.isError && (
            <span role="alert" className="font-chrome text-chrome-xs text-danger-text">
              No se pudo.
            </span>
          )}
        </div>
      )}

      <ul className="mt-s2 flex flex-wrap gap-1.5">
        {(condiciones ?? []).length === 0 ? (
          <li className="font-chrome text-chrome-xs text-muted">Sin condiciones</li>
        ) : (
          (condiciones ?? []).map((c) => (
            <li
              key={c.id}
              className="rounded-radius-sm border border-warning px-1.5 py-0.5 font-chrome text-chrome-xs text-warning-text"
            >
              {nombreCondicion(c.key)}
              {c.level !== null && ` ${c.level}`}
            </li>
          ))
        )}
      </ul>
    </li>
  );
}

/**
 * El retrato.
 *
 * Todavía no hay imágenes en el modelo, así que la inicial hace de retrato — igual que en la
 * maqueta. **La inicial es texto, no un icono**: la regla que prohíbe los glifos prohíbe usarlos
 * *como dibujo*, y aquí la letra ES el dato. `aria-hidden` porque el nombre entero está al lado.
 */
function Retrato({ nombre }: { nombre: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-copper bg-surface font-title text-chrome-md text-copper-text"
    >
      {nombre.trim().charAt(0).toUpperCase()}
    </span>
  );
}

/**
 * Los puntos de golpe, con su barra.
 *
 * **El color no es el único portador**: la cifra «42/58» dice lo mismo que la barra, y el ancho
 * lo dice una tercera vez. La barra cambia de tono por debajo de un tercio porque en la mesa eso
 * es lo que se mira de reojo, pero quien no distinga los tonos lee la fracción igual.
 *
 * El ancho va en estilo en línea porque es un valor **calculado**, no una decisión de diseño: no
 * hay clase de Tailwind para «el 72,4 % de la vida que le queda a este personaje».
 */
function BarraDePuntosDeGolpe({
  nombre,
  actual,
  maximo,
}: {
  nombre: string;
  actual: number | null;
  maximo: number | null;
}) {
  if (actual === null || maximo === null || maximo <= 0) {
    return (
      <p className="mt-s2 font-chrome text-chrome-xs text-muted">Sin puntos de golpe en la hoja.</p>
    );
  }
  const proporcion = Math.max(0, Math.min(1, actual / maximo));
  const tono = actual === 0 ? "bg-danger" : proporcion <= 1 / 3 ? "bg-warning" : "bg-accent";

  return (
    <div className="mt-s2">
      <p className="flex items-center justify-between gap-s2 font-data text-chrome-xs text-text">
        <span className="flex items-center gap-1 text-muted">
          <IconoPuntosDeGolpe />
          PG
        </span>
        <span>
          {actual}/{maximo}
        </span>
      </p>
      <div
        role="img"
        aria-label={`${nombre}: ${actual} de ${maximo} puntos de golpe`}
        className="mt-1 h-1.5 w-full overflow-hidden rounded-radius-sm border border-muted bg-surface"
      >
        <div className={`h-full ${tono}`} style={{ width: `${(proporcion * 100).toFixed(1)}%` }} />
      </div>
    </div>
  );
}

/**
 * El registro en vivo, y debajo lo que se usa para escribirlo.
 *
 * Es el centro de la pantalla porque es la partida. De la maqueta se toma la forma de la línea:
 * **el chip de la clase a la izquierda**, la frase en la voz del mundo, y quién y a qué hora
 * debajo en cifras. Antes era hora · frase · marca de visibilidad en una sola línea, y con
 * cuarenta sucesos no se distinguía un combate de una tirada sin leerlos todos.
 *
 * **Los sellos los pone cualquier miembro**, no solo el DM: un registro que solo escribe el DM se
 * queda vacío, y es la crítica más repetida a estas herramientas.
 */
function Registro({
  campaignId,
  eventos,
  esDm,
  comoUsuario,
}: {
  campaignId: string;
  eventos: GameEventRow[];
  esDm: boolean;
  comoUsuario: string;
}) {
  const { data: miembros } = useMembers(campaignId);
  const sellar = useStampNote(campaignId);
  const [texto, setTexto] = useState("");
  const [soloDm, setSoloDm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nombreDe = new Map((miembros ?? []).map((m: Member) => [m.userId, m.displayName]));

  const poner = async (kind: SessionNoteKind) => {
    setError(null);
    try {
      await sellar.mutateAsync({
        kind,
        text: texto.trim() || undefined,
        visibility: soloDm ? "DM_ONLY" : "PLAYERS",
      });
      setTexto("");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <PanelDeMesa
      etiqueta="Registro de la sesión"
      titulo="Registro en vivo"
      icono={<IconoRegistro className="h-4 w-4" />}
    >
      {esDm && comoUsuario && (
        <p className="mb-s2 rounded-radius-sm border border-copper px-s2 py-1 font-chrome text-chrome-xs text-copper-text">
          Estás viendo lo que ve ese jugador. No es una simulación: el servidor filtra igual que
          para él, así que ves <strong>menos</strong>, nunca más.
        </p>
      )}

      {/* Con nombre accesible a propósito: los seis botones de sellar repiten los mismos
          nombres que los chips de las líneas, así que sin una lista que se pueda nombrar una
          prueba no distingue «el chip dice Hallazgo» de «hay un botón de Hallazgo». Esa
          confusión dejó pasar una mutación real. */}
      <ol aria-label="Sucesos de la sesión" className="flex flex-col">
        {eventos.length === 0 && (
          <li className="font-chrome text-chrome-sm text-muted">
            Todavía no ha pasado nada en esta sesión.
          </li>
        )}
        {eventos.map((e) => {
          const sello = selloDeSuceso(e.payload);
          return (
            <li
              key={e.id}
              className="flex items-start gap-s2 border-b border-muted py-s2 last:border-b-0"
            >
              {sello ? (
                <span className="mt-0.5 shrink-0 rounded-radius-sm border border-copper px-1.5 py-0.5 font-data text-chrome-xs text-copper-text">
                  {NOMBRE_SELLO[sello]}
                </span>
              ) : (
                // Un hueco del mismo ancho que no dice nada: las líneas sin chip se alinean con
                // las que sí lo tienen en vez de quedar dentadas.
                <span aria-hidden="true" className="mt-0.5 w-s6 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-world text-[length:var(--text-world-sm)] leading-snug text-text">
                  {lineaDeLog(e.payload)}
                </p>
                <p className="mt-0.5 font-data text-chrome-xs text-muted">
                  {nombreDe.get(e.actorUserId) ?? "Alguien"} · {horaDe(e.createdAt)}
                </p>
              </div>
              <Badge visibility={e.visibility} />
            </li>
          );
        })}
      </ol>

      <div className="mt-s3 border-t border-muted pt-s3">
        <div className="flex flex-wrap items-center gap-1.5">
          {SELLOS_EN_ORDEN.map((kind) => {
            const Icono = ICONO_SELLO[kind];
            return (
              <Button
                key={kind}
                type="button"
                variant="ghost"
                className="flex items-center gap-1.5 px-2 py-1 text-chrome-xs"
                disabled={sellar.isPending}
                onClick={() => void poner(kind)}
              >
                <Icono className="h-4 w-4" />
                {NOMBRE_SELLO[kind]}
              </Button>
            );
          })}
        </div>
        <div className="mt-s2 flex flex-wrap items-center gap-s2">
          <input
            aria-label="Qué anotar"
            placeholder="…y en dos palabras, qué pasó"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className={`${fieldControlClass} min-w-0 flex-1`}
          />
          <label className="flex items-center gap-1.5 font-chrome text-chrome-xs text-muted">
            <input
              type="checkbox"
              checked={soloDm}
              onChange={(e) => setSoloDm(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            Solo el DM
          </label>
        </div>
        {error && (
          <p role="alert" className="mt-1 font-chrome text-chrome-xs text-danger-text">
            {error}
          </p>
        )}
      </div>
    </PanelDeMesa>
  );
}

/**
 * El mundo, aquí, sin cambiar de pantalla. Y el botón de revelar.
 *
 * **Revelar es un verbo de sesión, no configuración.** Es el patrón que ejecutan todos los VTT
 * («Show Players» de Foundry, arrastrar al retrato en Fantasy Grounds) y no un ajuste que se
 * cambia en un formulario. Aquí se apoya en la misma matriz de visibilidad de siempre: subir el
 * nivel de la ficha deja además su rastro en el log.
 *
 * **Este buscador es de cliente y no es control de acceso**: opera sobre una lista que el
 * servidor ya filtró por `canView`, y solo puede quitar de la vista filas que quien mira ya tenía
 * derecho a ver.
 */
function Consulta({ campaignId, esDm }: { campaignId: string; esDm: boolean }) {
  const { data: entidades } = useAllEntities(campaignId);
  const [busqueda, setBusqueda] = useState("");
  const encontradas = (entidades ?? []).filter((e) =>
    e.name.toLowerCase().includes(busqueda.trim().toLowerCase()),
  );

  return (
    <PanelDeMesa
      etiqueta="Consulta del mundo"
      titulo="Consulta del mundo"
      icono={<IconoBuscar className="h-4 w-4" />}
    >
      <input
        aria-label="Buscar en el mundo"
        placeholder="Buscar sin salir…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className={fieldControlClass}
      />
      <ul className="mt-s2 flex flex-col">
        {encontradas.slice(0, 12).map((e) => (
          <li
            key={e.id}
            className="flex items-center justify-between gap-s2 border-b border-muted py-1.5 last:border-b-0"
          >
            {/* `Link`, no `<a href>`: un enlace crudo recarga la aplicación entera y se pierde
                el estado de la mesa —lo escrito a medias en el registro, el «ver como», la
                caché— justo en mitad de la partida. */}
            <Link
              to={`/campaigns/${campaignId}/entidades/${e.id}`}
              className="block min-w-0 flex-1 truncate font-chrome text-chrome-sm text-accent-text hover:underline"
            >
              {e.name}
            </Link>
            <Badge visibility={e.visibility as Visibility} />
          </li>
        ))}
        {busqueda && encontradas.length === 0 && (
          <li className="font-chrome text-chrome-xs text-muted">Nada con ese nombre.</li>
        )}
      </ul>
      {esDm && (
        <p className="mt-s2 font-chrome text-chrome-xs text-muted">
          Abre una entrada para revelarla a la mesa desde su propia pantalla.
        </p>
      )}
    </PanelDeMesa>
  );
}
