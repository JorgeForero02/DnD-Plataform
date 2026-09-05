import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useCurrentSession } from "../features/sessions/hooks";
import { IconoEnJuego } from "../features/sessions/iconos";
import type { EntityType } from "@dnd/shared";
import { useCampaign } from "../features/campaigns/hooks";
import { useMyRole } from "../features/campaigns/members";
import { useAuthStore } from "../store/auth.store";
import { useEntities } from "../features/entities/hooks";
import { EntityEditor } from "../features/entities/EntityEditor";
import { EntityFilterBar } from "../features/entities/EntityFilterBar";
import { filterEntities, type EntityFilterValue } from "../features/entities/filter";
import { useSessions } from "../features/sessions/hooks";
import { SessionEditor } from "../features/sessions/SessionEditor";
import { ControlesDeSesion } from "../features/sessions/ControlesDeSesion";
import type { Session } from "../features/sessions/api";
import { useArchivedCharacters, useCharacters } from "../features/characters/hooks";
import { ArchivoDePersonajes } from "../features/characters/ArchivoDePersonajes";
import { descriptorDePersonaje } from "../features/characters/descriptor";
import { CharacterEditor } from "../features/characters/CharacterEditor";
import { InvitePanel } from "../features/invites/InvitePanel";
import { CampaignSettings } from "../features/campaigns/CampaignSettings";
import { MembersPanel } from "../features/campaigns/MembersPanel";
import { CHECKING_PERMISSIONS, RetryPermissions } from "../features/campaigns/PermissionStatus";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Tabs, type TabItem } from "../ui/Tabs";
import { PanelDeReglas } from "../features/rules/PanelDeReglas";
import { PanelDeBestiario } from "../features/bestiario/PanelDeBestiario";
import { IconoBestiario } from "../features/bestiario/iconos";
import { Dialog } from "../ui/Dialog";
import { AppShell, AppHeader, PageHeader, Breadcrumbs } from "../ui/AppShell";
import { EmptyState } from "../ui/Collection";
import { CampaignOverview } from "../features/campaigns/CampaignOverview";
import { useAllEntities } from "../features/entities/hooks";
import {
  resumenDeCuerpo,
  ROTULO_PLURAL,
  TITULO_NUEVO as NUEVO_POR_TIPO,
} from "../features/entities/resumen";
import { PLANTILLA_POR_TIPO } from "../features/entities/plantillas";
import { CabeceraDeSeccion } from "../features/entities/CabeceraDeSeccion";
import { FilaDeEntidad } from "../features/entities/FilaDeEntidad";
import { IconoDeTipo } from "../features/entities/iconos";
import {
  IconoSesiones,
  IconoPersonajes,
  IconoResumen,
  IconoReglas,
  IconoAjustes,
} from "../features/campaigns/iconosDeSeccion";
import { CampaignItemsCatalogPage } from "../features/campaign-items/CampaignItemsCatalogPage";
import { IconoImpedimenta } from "../features/campaign-items/iconos";
import { PanelDeDados } from "../features/rolls/PanelDeDados";
import { PanelDeTablas } from "../features/dm-tables/PanelDeTablas";
import { IconoTabla } from "../features/dm-tables/iconos";
import { DadoDibujado } from "../features/rolls/DadoDibujado";

type TabConfig =
  | { kind: "overview"; label: string; group?: string }
  | { kind: "world"; label: string; group?: string }
  | { kind: "sessions"; label: string; group?: string }
  | { kind: "characters"; label: string; group?: string }
  | { kind: "rules"; label: string; group?: string }
  | { kind: "bestiary"; label: string; group?: string }
  | { kind: "items"; label: string; group?: string }
  | { kind: "dice"; label: string; group?: string }
  | { kind: "tables"; label: string; group?: string }
  | { kind: "settings"; label: string; group?: string };

// Reseño 2026-09-02 — audit B4. These ten used to sit in one flat strip, which said that
// "Documentos" and "Sesiones" were the same kind of thing. They are not: one is a filing
// cabinet, the other is what happens on Friday. Two groups, and the table comes second only
// because the world is what you build between sessions.
const GRUPO_MUNDO = "El mundo";

/** Los siete tipos de ficha, en el orden en que se ofrecen. Era el orden de las pestañas. */
const TIPOS_DEL_MUNDO: EntityType[] = [
  "NPC",
  "LOCATION",
  "QUEST",
  "FACTION",
  "OBJECT",
  "EVENT",
  "DOCUMENT",
];
const GRUPO_MESA = "La mesa";

/**
 * Los tres cajones del taller (B4, decisión D-R-8): colecciones que se abren **encima** del
 * taller en vez de ocupar una entrada del carril.
 *
 * Vive a nivel de módulo y no dentro del componente porque **la página también lo necesita**,
 * para saber si una dirección antigua (`?seccion=characters`) pide abrir uno.
 */
const CAJONES_DEL_TALLER = [
  { id: "characters", etiqueta: "Personajes", icono: <IconoPersonajes /> },
  { id: "bestiary", etiqueta: "Bestiario", icono: <IconoBestiario /> },
  { id: "items", etiqueta: "Catálogo", icono: <IconoImpedimenta /> },
] as const;

type CajonAbierto = (typeof CAJONES_DEL_TALLER)[number]["id"];

const TABS: TabConfig[] = [
  { kind: "overview", label: "Resumen" },
  // **Un solo destino para el mundo entero, y esto es el arreglo del defecto que el reseño
  // llama de arquitectura.** Aquí había SIETE pestañas —PNJ, Lugares, Misiones, Facciones,
  // Objetos, Sucesos, Documentos— y las siete son, literalmente, **valores del enum de la tabla
  // `Entity`**: la navegación era el esquema de la base de datos. Con las tres rutas propias,
  // diecinueve destinos en una campaña.
  //
  // El tipo pasa a ser un **filtro dentro de un destino**, que es lo que de verdad es. No se
  // pierde nada —el mismo listado, el mismo creador, el mismo filtro de etiquetas— y se gana lo
  // que faltaba: un sitio donde estar que se llama «el mundo» y no «la tabla de entidades».
  // **Sin rótulo de grupo**, por la misma razón que «Ajustes» no lo lleva: era un grupo de una
  // sola entrada llamada igual que el grupo, o sea una línea de versalita repitiendo en
  // mayúsculas la palabra de debajo. Cuando eran siete el rótulo agrupaba; ahora estorba.
  { kind: "world", label: "El mundo" },
  // 2A.17. Va en «La mesa» y no en «La campaña» porque una regla es algo que pasa durante la
  // partida, no un ajuste. El panel se calla entero si quien mira no es el DM.
  // **Sesiones NO es un cajón, y lo decidió el autor cuando la suite lo destapó.** Las otras
  // tres son colecciones que se consultan; una sesión es un **flujo**: dentro hay un
  // «Empezar» que abre su propio diálogo con la asistencia y los personajes, y un modal
  // dentro de un modal es justo la clase de cosa que este reseño existe para quitar.
  //
  // En sus palabras: *«para cosas que sean un poco más externas se puede acomodar afuera
  // como una interfaz normal pero tomando de base el diseño»*. Consultar y planear sesiones
  // es de eso; **empezar** una es de la mesa, y ahí es donde está el botón ahora.
  { kind: "sessions", label: "Sesiones", group: GRUPO_MESA },
  { kind: "rules", label: "Reglas", group: GRUPO_MESA },
  // 2B. Va en «La mesa» y no en «El mundo» aunque hable de objetos: la ficha de mundo de un
  // objeto —su historia, sus enlaces, quién lo quiere— es la pestaña «Objetos» de arriba; esto
  // es su cara mecánica, el dado de daño y la CA, que es lo que se toca durante la partida. El
  // prototipo los separa igual, y por el mismo motivo: son dos caras de la misma cosa y solo
  // una de ellas se consulta con los dados en la mano.
  // 2D. **Justo antes de «Catálogo», que es donde lo pone el prototipo** (pantalla 28), y por el
  // mismo motivo que el catálogo va donde va: es la cara mecánica de algo que ya tiene ficha de
  // mundo. «PNJ» arriba es quién es Kellan y qué quiere; esto es su CA y sus puntos de golpe, que
  // es lo que se consulta con los dados en la mano. El prototipo los mete en un grupo
  // «HERRAMIENTAS» que aquí no existe —tendría dos entradas de nueve— así que van en «La mesa»,
  // conservando el orden relativo, que es lo que de verdad se estaba copiando.
  // 2C.2. Va en «La mesa» y detrás del catálogo, como en el prototipo: es lo que se toca
  // **durante** la partida, no algo que se prepara antes. Y va aquí y no en la hoja de personaje
  // porque la mitad de las tiradas de una mesa no son de nadie —«tirad todos percepción», «1d100
  // a ver qué sale»— y una tirada sin personaje no tiene hoja donde vivir.
  { kind: "dice", label: "Dados", group: GRUPO_MESA },
  // 2C.6. Detrás de «Dados» porque es lo mismo con otra forma —tirar y leer un resultado—, y en
  // «La mesa» porque es una regla de esta mesa: el SRD no trae ninguna de estas tablas.
  { kind: "tables", label: "Tablas", group: GRUPO_MESA },
  // **Sin grupo, a propósito.** La maqueta lo mete en «LA CAMPAÑA», pero ahí acompañaba a
  // media docena de entradas que aquí no existen. Un rótulo de grupo sobre un único elemento
  // no agrupa nada: solo añade una línea de tipografía para decir en versalita lo que la
  // palabra «Ajustes» ya decía. `Tabs` agrupa por tramos consecutivos, así que sin `group`
  // esto se pinta como un bloque aparte al final de la columna, separado y sin rótulo — que
  // es exactamente la separación que se quería.
  { kind: "settings", label: "Ajustes" },
];

// Reseño 2026-09-02 — "Nuevo" told you nothing unless you already knew which section you were
// in, and "Sin elementos." told you nothing at all. Both say what they are about now.

const VACIO_POR_TIPO: Record<EntityType, { titulo: string; texto: string }> = {
  NPC: {
    titulo: "Ningún personaje del mundo todavía",
    texto:
      "Quien tiene un nombre vuelve a aparecer. Empieza por quien tus jugadores van a conocer primero.",
  },
  LOCATION: {
    titulo: "Ningún lugar todavía",
    texto: "Un sitio donde ocurra algo: una ciudad, una posada, una cueva con algo dentro.",
  },
  QUEST: {
    titulo: "Ninguna misión todavía",
    texto: "Lo que la mesa persigue ahora mismo, y lo que ganan o pierden si sale mal.",
  },
  FACTION: {
    titulo: "Ninguna facción todavía",
    texto:
      "Un grupo con intereses propios. Las facciones son lo que hace que el mundo se mueva solo.",
  },
  OBJECT: {
    titulo: "Ningún objeto todavía",
    texto: "Un arma, una reliquia, una llave: cosas que cambian de manos y de dueño.",
  },
  EVENT: {
    titulo: "Ningún evento todavía",
    texto: "Lo que ya pasó y explica el presente, o lo que va a pasar tanto si miran como si no.",
  },
  DOCUMENT: {
    titulo: "Ningún documento todavía",
    texto: "Cartas, mapas, notas y pistas que los jugadores puedan leer con sus propios ojos.",
  },
};

// Row buttons (entity/session/character lists) share this chrome recipe: a bordered card,
// keyed by --surface, with the border picking up --accent on hover/focus instead of a bg
// swap — the token palette has no third dark shade between --bg and --surface to fake the
// old pre-token dark-card/hover-lighter pair with.
// Reseño 2026-09-02, segunda pasada — `block` no es cosmético, es el arreglo de un defecto
// visible: cuando estas filas pasaron de <button> a <a>, heredaron `display: inline`, y un
// borde sobre un elemento en línea que ocupa varias líneas se dibuja **partido** — un trozo
// vertical suelto a la izquierda de cada fila, que es exactamente lo que el autor fotografió.
// Un <button> es `inline-block` por defecto y nunca tuvo el problema, así que el cambio de
// etiqueta lo introdujo en silencio.
// Maqueta 2026-09-03: sesiones y personajes se leen como el mundo. Eran tarjetas sueltas con
// borde propio y un hueco entre medias, en la misma pantalla donde las siete listas del mundo
// ya iban dentro de un solo marco con filetes: la misma pantalla enseñaba dos listas distintas
// según la pestaña. Ahora las cuatro son la misma lista.
const ROW_BUTTON_CLASS =
  "block w-full px-s4 py-s3 text-left font-chrome text-chrome-sm text-text hover:bg-bg focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent";

/** El marco común de las listas: un rectángulo con filetes entre las filas. */
const LIST_FRAME_CLASS =
  "divide-y divide-muted overflow-hidden rounded-radius-sm border border-muted bg-surface";

function EntityTab({ campaignId, type }: { campaignId: string; type: EntityType }) {
  const { data, isLoading, isError, error } = useEntities(campaignId, type);
  const {
    role,
    isLoading: roleLoading,
    isError: roleError,
    retry: retryRole,
  } = useMyRole(campaignId);
  const userId = useAuthStore((s) => s.user?.id);
  const isDM = role === "DM";
  const roleUnresolved = roleLoading || roleError;
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<EntityFilterValue>({ query: "", tags: [] });

  // Tags present in THIS tab's already-loaded list only (not the whole campaign) — entities
  // are listed per type, so that's the set that makes sense to filter by here. Deduped and
  // sorted for a stable, readable button order.
  const availableTags = useMemo(() => {
    const seen = new Set<string>();
    data?.forEach((e) => e.tags.forEach((t) => seen.add(t)));
    return Array.from(seen).sort((a, b) => a.localeCompare(b, "es"));
  }, [data]);

  // Client-side only, over a list the server already filtered by canView — see filter.ts.
  // Never a substitute for that check, only ever a further narrowing of it.
  const filtered = data ? filterEntities(data, filter) : undefined;

  const plantilla = PLANTILLA_POR_TIPO[type];

  return (
    <div>
      {/* La cabecera explicada de la maqueta. El texto de «para qué sirve» NO se escribe aquí:
          sale de `plantillas.ts`, donde ya vivía. Y la acción que crea sube a esta banda,
          junto al título: crear no es filtrar, y estaba metida dentro de la barra de filtros. */}
      <CabeceraDeSeccion
        grupo={GRUPO_MUNDO}
        titulo={ROTULO_PLURAL[type]}
        paraQue={plantilla.paraQue}
        accion={
          /* **El mundo lo escribe el DM.** Crear exigía solo ser miembro y por eso este botón
             no estaba cerrado; el propio DM lo señaló probando con un jugador dentro. El
             servidor lo impone (`entities.service.ts`, `requireDM`); aquí solo se deja de
             ofrecer lo que va a dar 403. La etiqueta dice QUÉ se crea. */
          isDM ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              {NUEVO_POR_TIPO[type]}
            </Button>
          ) : undefined
        }
      />
      {roleError && (
        <p className="mb-3 text-chrome-xs text-danger-text">No se pudo comprobar tu permiso.</p>
      )}
      {roleError && <RetryPermissions onRetry={retryRole} />}
      <EntityFilterBar
        availableTags={availableTags}
        value={filter}
        onChange={setFilter}
        totalCount={data?.length ?? 0}
        visibleCount={filtered?.length ?? 0}
      />
      {isLoading && <p className="text-muted">Cargando…</p>}
      {isError && <p className="text-danger-text">{(error as Error).message}</p>}
      {data && data.length === 0 && (
        <EmptyState title={VACIO_POR_TIPO[type].titulo}>{VACIO_POR_TIPO[type].texto}</EmptyState>
      )}
      {data && data.length > 0 && filtered && filtered.length === 0 && (
        <EmptyState title="Nada coincide con el filtro">
          Prueba con menos etiquetas, o borra lo que hayas escrito en la búsqueda.
        </EmptyState>
      )}
      {/* Un solo marco con filetes entre las filas, como la maqueta, en vez de una tarjeta con
          borde por fila: nueve PNJ se leen como una lista y no como nueve cajas. */}
      {filtered && filtered.length > 0 && (
        <ul className="divide-y divide-muted overflow-hidden rounded-radius-sm border border-muted bg-surface">
          {filtered.map((e) => {
            // Editing is DM-or-creator (entities.service.ts:requireEditable). While the role is
            // unresolved (still loading, or the members request failed — arreglo 4), `isDM`
            // reads false and `userId` may be stale/undefined, so canEdit would otherwise be
            // wrong for a DM or the creator during that window — roleUnresolved is checked
            // first specifically to avoid that.
            const canEdit = !roleUnresolved && (isDM || e.createdById === userId);
            const reason = roleUnresolved
              ? CHECKING_PERMISSIONS
              : canEdit
                ? undefined
                : "Solo el DM o quien lo creó puede editarlo.";
            return (
              <li key={e.id}>
                {/* La fila lleva a la página de lectura, no al editor: leer una ficha no puede
                    exigir abrir un formulario. Editar es un acto deliberado desde ahí. */}
                <FilaDeEntidad
                  to={`/campaigns/${campaignId}/entidades/${e.id}`}
                  type={e.type}
                  name={e.name}
                  summary={resumenDeCuerpo(e.body, 180)}
                  visibility={e.visibility}
                  // Deduplicadas aquí (no en parseTags/entity.schema.ts, que dejan pasar
                  // "lich, lich") para no pintar dos veces el mismo distintivo ni emitir una
                  // clave repetida de React.
                  tags={Array.from(new Set(e.tags))}
                  reason={reason}
                />
              </li>
            );
          })}
        </ul>
      )}
      {creating && (
        <EntityEditor campaignId={campaignId} type={type} onClose={() => setCreating(false)} />
      )}
    </div>
  );
}

function SessionsTab({ campaignId }: { campaignId: string }) {
  const { data, isLoading, isError, error } = useSessions(campaignId);
  const {
    role,
    isLoading: roleLoading,
    isError: roleError,
    retry: retryRole,
  } = useMyRole(campaignId);
  const isDM = role === "DM";
  const roleUnresolved = roleLoading || roleError;
  // Creating and editing a session are both DM-only on the server (sessions.service.ts,
  // requireDM for both). Creating stays gated on the button itself (there's nothing to read
  // if you can't create it), but editing (arreglo 1, 1.15-fix) no longer gates the row —
  // only whether the editor it opens is read-only, same as EntityTab above.
  const canManage = !roleUnresolved && isDM;
  const reason = roleUnresolved
    ? CHECKING_PERMISSIONS
    : canManage
      ? undefined
      : "Solo el DM puede crear o editar sesiones.";
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Session | null>(null);

  return (
    <div>
      {/* Misma cabecera explicada que las secciones del mundo: dónde estás, qué es esto y la
          acción que lo llena. El botón sigue deshabilitado con su motivo en vez de esconderse
          — un botón escondido dice «esto no existe»; uno deshabilitado con su razón dice
          «existe, pero no para ti ahora mismo». */}
      <CabeceraDeSeccion
        grupo={GRUPO_MESA}
        titulo="Sesiones"
        paraQue="Cuándo os sentáis a jugar y qué pasó la última vez. La fecha sirve para que nadie pregunte; las notas, para que nadie lo olvide."
        accion={
          <Button
            variant="primary"
            onClick={() => setCreating(true)}
            disabled={!canManage}
            title={reason}
          >
            Nueva sesión
          </Button>
        }
      />
      {/* Fix round 1 (post-1.18b review), Important 9: stays --muted on purpose, unlike the
          per-row reasons in EntityTab/CharactersTab below — this is a PANEL-level notice above
          the "Nuevo" button, not text sitting inline next to a tag chip it could be confused
          with. The brief's "indistinguishable from the tag chips" problem doesn't apply to a
          standalone paragraph with nothing beside it, so this one was left as-is rather than
          recoloured to match speculatively — a decision recorded here, not only in the report. */}
      {reason && <p className="mb-3 text-chrome-xs text-muted">{reason}</p>}
      {roleError && <RetryPermissions onRetry={retryRole} />}
      {isLoading && <p className="text-muted">Cargando…</p>}
      {isError && <p className="text-danger-text">{(error as Error).message}</p>}
      {data && data.length === 0 && (
        <EmptyState title="Ninguna sesión todavía">
          Apunta la próxima con su fecha y los jugadores sabrán cuándo se juega. Las notas de lo que
          pasó se escriben después, en la misma ficha.
        </EmptyState>
      )}
      {data && data.length > 0 && (
        <ul className={LIST_FRAME_CLASS}>
          {data.map((s) => (
            <li key={s.id}>
              {/* Arreglo 1 (1.15-fix), Crítico: the row always opens — the fecha and notas a
                player can already see via canView were unreachable while the row itself was
                disabled. */}
              <button onClick={() => setEditing(s)} title={reason} className={ROW_BUTTON_CLASS}>
                <span className="flex flex-wrap items-baseline gap-x-s3 gap-y-1">
                  <span className="font-chrome text-chrome-md font-semibold text-text">
                    {s.title}
                  </span>
                  <span className="flex-1" />
                  {/* A session with no date is a session nobody can plan around, so the row
                      says so instead of leaving the space blank and letting you wonder. */}
                  <span className="font-data text-chrome-xs text-copper-text">
                    {s.scheduledAt
                      ? new Date(s.scheduledAt).toLocaleDateString("es-ES", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "sin fecha"}
                  </span>
                </span>
                <span className="mt-s2 block">
                  <Badge visibility={s.visibility} />
                </span>
              </button>
              {/* Los controles van FUERA del botón de la fila: un botón dentro de otro botón no
                  es HTML válido y el clic se lo comería el de fuera. */}
              <div className="flex flex-wrap items-center gap-s2 px-s4 pb-s3">
                <ControlesDeSesion campaignId={campaignId} session={s} puedeGestionar={canManage} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {creating && <SessionEditor campaignId={campaignId} onClose={() => setCreating(false)} />}
      {editing && (
        <SessionEditor
          campaignId={campaignId}
          session={editing}
          onClose={() => setEditing(null)}
          readOnly={!canManage}
          readOnlyReason={reason}
        />
      )}
    </div>
  );
}

function CharactersTab({ campaignId }: { campaignId: string }) {
  const { data, isLoading, isError, error } = useCharacters(campaignId);
  // El archivo se pide siempre, no solo cuando alguien lo abre: su **conteo** hace falta antes
  // que su contenido, porque el hueco vacío tiene que poder decir «hay N archivados». Sin eso,
  // una campaña con todos sus personajes archivados se lee como una campaña que los perdió.
  const { data: archivados } = useArchivedCharacters(campaignId);
  const {
    role,
    isLoading: roleLoading,
    isError: roleError,
    retry: retryRole,
  } = useMyRole(campaignId);
  const userId = useAuthStore((s) => s.user?.id);
  const isDM = role === "DM";
  const roleUnresolved = roleLoading || roleError;
  const [creating, setCreating] = useState(false);

  return (
    <div>
      {/* Crear un personaje lo puede hacer cualquier miembro en el servidor
          (characters.service.ts, requireMember), así que este botón NO se cierra por rol —
          al revés que los del mundo. */}
      <CabeceraDeSeccion
        grupo={GRUPO_MESA}
        titulo="Personajes"
        paraQue="Quién se sienta a esta mesa. Cada jugador lleva el suyo, y el DM puede crearlos también."
        accion={
          <Button variant="primary" onClick={() => setCreating(true)}>
            Nuevo personaje
          </Button>
        }
      />
      {roleError && (
        <p className="mb-3 text-chrome-xs text-danger-text">No se pudo comprobar tu permiso.</p>
      )}
      {roleError && <RetryPermissions onRetry={retryRole} />}
      {isLoading && <p className="text-muted">Cargando…</p>}
      {isError && <p className="text-danger-text">{(error as Error).message}</p>}
      {data && data.length === 0 && (
        <EmptyState title="Ningún personaje todavía">
          {archivados && archivados.length > 0
            ? `Cada jugador crea el suyo; el DM puede crearlos también. Y no se ha perdido nada: hay ${archivados.length} ${archivados.length === 1 ? "personaje archivado" : "personajes archivados"} más abajo, y vuelven de una pulsación.`
            : "Cada jugador crea el suyo; el DM puede crearlos también. Nombre, raza, clase y nivel bastan para empezar."}
        </EmptyState>
      )}
      {data && data.length > 0 && (
        <ul className={LIST_FRAME_CLASS}>
          {data.map((c) => {
            // Editing is DM-or-owner (characters.service.ts:requireEditable).
            const canEdit = !roleUnresolved && (isDM || c.ownerId === userId);
            const reason = roleUnresolved
              ? CHECKING_PERMISSIONS
              : canEdit
                ? undefined
                : "Solo el dueño o el DM puede editar este personaje.";
            return (
              <li key={c.id}>
                {/* Arreglo 1 (1.15-fix), Crítico: the row always opens — see EntityTab above. */}
                {/* Reseño 2026-09-02 — igual que las fichas del mundo: la fila lleva a la hoja
                    del personaje, no a un formulario. */}
                <Link
                  to={`/campaigns/${campaignId}/personajes/${c.id}`}
                  title={reason}
                  className={ROW_BUTTON_CLASS}
                >
                  <span className="flex flex-wrap items-baseline gap-x-s3 gap-y-1">
                    <span className="font-chrome text-chrome-md font-semibold text-text">
                      {c.name}
                    </span>
                    {/* Reseño 2026-09-02 — a character row that says only a name and a level
                        is a row you have to open to recognise. Race and class are what people
                        actually call each other by at the table. */}
                    {descriptorDePersonaje(c) && (
                      <span className="font-world text-chrome-base text-muted">
                        {descriptorDePersonaje(c)}
                      </span>
                    )}
                    <span className="flex-1" />
                    <span className="font-data text-chrome-xs text-copper-text">
                      Nivel {c.level}
                    </span>
                  </span>
                  {/* Fix round 1 (post-1.18b review), Important 9: the identical construct one tab
                    over (EntityTab above) was fixed and this one — same shape, a muted reason
                    right after a muted "Nivel N" chip — was left behind, which is verbatim the
                    failure the brief describes: one sentence reading as two different things in
                    two tabs of the same screen. Same treatment, same guard (Important 8): muted
                    while still checking, warning once it's a real "you can't edit this". */}
                  {reason && (
                    <span
                      className={`ml-2 text-chrome-xs ${
                        reason === CHECKING_PERMISSIONS ? "text-muted" : "text-warning-text"
                      }`}
                    >
                      {reason}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {/* La puerta de salida. Va en la misma pantalla que la lista y no detrás de otro cajón:
          archivar solo es distinto de borrar si el archivo se ve. */}
      <ArchivoDePersonajes
        campaignId={campaignId}
        archivados={archivados ?? []}
        // Misma regla que la fila de arriba y que el servidor: DM o dueño
        // (characters.service.ts:requireEditable).
        puedeDevolver={(c) => !roleUnresolved && (isDM || c.ownerId === userId)}
        motivo={
          roleUnresolved
            ? CHECKING_PERMISSIONS
            : "Solo el dueño o el DM puede devolver este personaje."
        }
      />
      {creating && <CharacterEditor campaignId={campaignId} onClose={() => setCreating(false)} />}
    </div>
  );
}

export function CampaignDetailPage() {
  const { id = "" } = useParams();
  const { data: campaign, isLoading, isError } = useCampaign(id);
  const { user, logout } = useAuthStore();
  const { data: todasLasEntidades } = useAllEntities(id);

  // Reseño 2026-09-02 — the open section lives in the URL. Two reasons, and the second is the
  // one that matters: a section becomes linkable and survives a reload, and an uncontrolled
  // Tabs silently threw that away — a real Playwright journey reloaded the page mid-test and
  // landed back on the first section without saying so, which is exactly what happens to a
  // person who refreshes while editing settings.
  const [searchParams, setSearchParams] = useSearchParams();
  const enLaUrl = searchParams.get("seccion") ?? "overview";
  // **Un tipo de ficha en la URL sigue abriendo el mundo.** `?seccion=LOCATION` era un destino
  // propio y ahora es el mundo con «Lugares» elegido: la dirección no cambia —los enlaces
  // guardados y media docena de recorridos la usan—, cambia dónde se pinta.
  //
  // **Y una dirección que ya no existe abre el resumen, no una pantalla en blanco.** Al mover
  // Personajes, Bestiario y Catálogo a cajones, `?seccion=characters` dejó de encontrar su
  // pestaña: `Tabs` no pintaba ningún panel y el carril no marcaba nada, así que quedaba la
  // cabecera sobre un hueco. Y no era una dirección hipotética guardada en un marcador — **la
  // migaja de toda hoja de personaje apuntaba ahí**, y también el destino tras borrar un
  // personaje. Dos clics desde una pantalla central. Lo encontró la revisión de cierre, y el
  // mensaje del commit de B4 afirmaba lo contrario.
  //
  // **Se cae al resumen, y NO se abre el cajón que nombraba la dirección.** Se probó lo segundo y
  // sale caro por los dos lados: contradice lo que ya estaba declarado —el superpuesto no
  // sobrevive a navegar, y eso es a propósito— y hace que volver de una hoja de personaje te deje
  // el taller tapado por un modal cada vez. Lo que se arregla es la pantalla en blanco; los dos
  // emisores vivos de esa dirección (la miga de la hoja y el destino tras borrar) pasan a apuntar
  // a la campaña a secas, que es donde de verdad quieren llevar.
  const seccionCruda = TIPOS_DEL_MUNDO.includes(enLaUrl as EntityType) ? "world" : enLaUrl;
  // El identificador de una sección es su `kind` —así se construyen abajo, uno a uno—, salvo
  // que ya no existan: los tres cajones salieron del carril en B4.
  const seccionActiva = TABS.some((t) => t.kind === seccionCruda) ? seccionCruda : "overview";
  const abrirSeccion = (id: string) => {
    const siguiente = new URLSearchParams(searchParams);
    if (id === "overview") siguiente.delete("seccion");
    // «El mundo» no es un valor de sección: lo que va a la URL es el tipo que se está mirando,
    // y el primero es el que la sección abre por defecto.
    else if (id === "world") siguiente.set("seccion", TIPOS_DEL_MUNDO[0]);
    else siguiente.set("seccion", id);
    // replace: switching section is not a place you should have to press Back through ten
    // times to leave a campaign.
    setSearchParams(siguiente, { replace: true });
  };

  // One pass over the list the sidebar badges all read from, instead of nine separate counts.
  const conteoPorTipo = useMemo(() => {
    if (!todasLasEntidades) return undefined;
    const conteo = new Map<EntityType, number>();
    for (const e of todasLasEntidades) conteo.set(e.type, (conteo.get(e.type) ?? 0) + 1);
    return conteo;
  }, [todasLasEntidades]);

  // Task 1.19b: the hand-rolled button strip becomes the Tabs primitive (WAI-ARIA tabs
  // pattern — role="tab", roving tabindex, arrow-key navigation for free). Uncontrolled: no
  // consumer outside this page ever needed to read or drive which tab is active, so the
  // `active`/`setActive` index state this replaced was pure bookkeeping Tabs now owns itself.
  // `key={type}` on each EntityTab (1.17c) still matters: without it, switching between two
  // entity-type tabs would update the same mounted EntityTab instance in place instead of
  // remounting it, and its filter/creating/editing state would leak from one type into the
  // next — Tabs renders whichever item.content is active, but the element identity inside it
  // is still ordinary React reconciliation.
  const items: TabItem[] = TABS.map((t) => {
    if (t.kind === "overview") {
      return {
        id: "overview",
        label: t.label,
        group: t.group,
        icon: <IconoResumen />,
        content: <CampaignOverview campaignId={id} />,
      };
    }
    if (t.kind === "bestiary") {
      return {
        id: "bestiary",
        label: t.label,
        group: t.group,
        icon: <IconoBestiario />,
        content: <PanelDeBestiario campaignId={id} />,
      };
    }
    if (t.kind === "rules") {
      return {
        id: "rules",
        label: t.label,
        group: t.group,
        icon: <IconoReglas />,
        content: <PanelDeReglas campaignId={id} />,
      };
    }
    if (t.kind === "settings") {
      return {
        id: "settings",
        label: t.label,
        group: t.group,
        icon: <IconoAjustes />,
        content: (
          <div className="space-y-s4">
            {/* CampaignSettings fetches its own campaign (1.17d) and mounts unconditionally,
                same as MembersPanel and InvitePanel below — see the comment on
                CampaignSettings.tsx for why that (and not gating the mount on `campaign` here)
                is what keeps every consumer of useMyRole subscribing to the members query on
                the same render. */}
            <CampaignSettings campaignId={id} />
            <MembersPanel campaignId={id} />
            {/* InvitePanel gates its own "Generar invitación" button against useMyRole
                (features/campaigns/members.ts) — see the comment there. */}
            <InvitePanel campaignId={id} />
          </div>
        ),
      };
    }
    if (t.kind === "world") {
      return {
        id: "world",
        label: t.label,
        group: t.group,
        // El conteo sale del listado de toda la campaña, que el servidor ya filtró por
        // `canView` — es «cuántas de estas puedes ver», nunca una pista de que hay más que no.
        badge: todasLasEntidades?.length ?? undefined,
        icon: <IconoDeTipo type="LOCATION" />,
        content: <SeccionDelMundo campaignId={id} conteoPorTipo={conteoPorTipo} />,
      };
    }
    if (t.kind === "dice") {
      return {
        id: "dice",
        label: t.label,
        group: t.group,
        // El mismo dado dibujado que la hoja usa para pedir una tirada: es la misma acción, y dos
        // dibujos distintos para lo mismo enseñan que son cosas distintas.
        icon: <DadoDibujado />,
        content: <PanelDeDados campaignId={id} />,
      };
    }
    if (t.kind === "tables") {
      return {
        id: "tables",
        label: t.label,
        group: t.group,
        icon: <IconoTabla />,
        content: <PanelDeTablas campaignId={id} />,
      };
    }
    if (t.kind === "items") {
      return {
        id: "items",
        label: t.label,
        group: t.group,
        icon: <IconoImpedimenta />,
        content: <CampaignItemsCatalogPage campaignId={id} />,
      };
    }
    if (t.kind === "sessions") {
      return {
        id: "sessions",
        label: t.label,
        group: t.group,
        icon: <IconoSesiones />,
        content: <SessionsTab campaignId={id} />,
      };
    }
    return {
      id: "characters",
      label: t.label,
      group: t.group,
      icon: <IconoPersonajes />,
      content: <CharactersTab campaignId={id} />,
    };
  });

  // Fix round 1 (post-1.18b review), Important 12: /campaigns/:id matches ANY segment, so a
  // stale link or a mistyped id (never a UUID this app generated) doesn't fall through to
  // App.tsx's wildcard — that route is ranked last and this one wins on specificity, React
  // Router's own rule. Before this, a failed useCampaign() left an empty <h1> and a tab strip
  // of panels that each failed on their own, one confusing paragraph at a time, with no single
  // statement of what actually happened. This is NOT the 404 route and doesn't claim to be —
  // the URL shape is valid, the specific campaign isn't (deleted, or never existed, or this
  // account isn't a member of it — canView, apps/api/src/common/visibility.ts, forbids telling
  // the three apart, same as every other 404-vs-403 decision in this app).
  if (isError) {
    return (
      <AppShell header={<AppHeader userName={user?.displayName} onLogout={logout} />}>
        <PageHeader title="Campaña no disponible" crumbs={[{ label: "Tus crónicas", to: "/" }]} />
        <EmptyState title="Esta campaña no existe o no tienes acceso">
          Puede que se haya borrado, que el enlace esté mal, o que no seas miembro de ella.
          Distinguir esos tres casos diría más de lo que debe, así que no se distinguen.
        </EmptyState>
      </AppShell>
    );
  }

  return (
    <AppShell header={<AppHeader userName={user?.displayName} onLogout={logout} />}>
      {/* **Maqueta 2026-09-03: el nombre de la campaña es el marco, no el titular.** Ocupaba
          una banda de titular a 30 px con su filete de cobre, y debajo cada sección volvía a
          poner su propio título: dos titulares apilados en cada pantalla, y la mitad de la
          altura útil gastada antes de que empezara el contenido. En la maqueta el nombre vive
          arriba, junto a la migaja, y lo grande de la pantalla es la SECCIÓN que estás
          mirando. Sigue siendo un <h1> —es el nombre del documento, y media docena de
          recorridos de navegador lo buscan como encabezado— pero pesa lo que pesa un marco. */}
      <header className="mb-s4">
        <Breadcrumbs items={[{ label: "Tus crónicas", to: "/" }]} />
        <h1 className="mt-1 font-title text-chrome-xl leading-tight text-text">
          {isLoading ? "Cargando…" : (campaign?.name ?? "")}
        </h1>
        <EnlaceALaMesa campaignId={id} />
        <div className="mt-s3 h-px w-full bg-copper opacity-30" />
      </header>
      <CajonesDelTaller campaignId={id} />
      {/* layout="sidebar": the same WAI-ARIA tablist, standing up. Ten sections in a flat
          strip said everything here was the same kind of thing (audit B4); a grouped column
          says which of them is the world and which is the table. */}
      <Tabs items={items} layout="sidebar" active={seccionActiva} onChange={abrirSeccion} />
    </AppShell>
  );
}

/**
 * **La mesa, en la navegación.** B1, 2026-09-04.
 *
 * El reseño lo cuenta como un defecto de arquitectura y no de acabado: *«`MesaDeSesion` no figura
 * en la lista de pestañas: solo se llega por dos enlaces que existen únicamente mientras hay una
 * sesión en curso. Fuera de sesión, el sitio donde se juega no es alcanzable.»* Diecinueve
 * destinos en una campaña, y el único para el que existe el producto no estaba en ninguno.
 *
 * **No es una pestaña, y eso es deliberado.** Las pestañas de esta página son secciones de un
 * documento —siete de ellas literalmente valores del enum de una tabla—; la mesa es **otro sitio**,
 * con su propia ruta, para tenerla en una pestaña del navegador aparte mientras se consulta el
 * mundo en otra. Meterla en la lista la habría igualado a «Documentos».
 *
 * Lleva su estado escrito porque **cambia lo que vas a encontrar**: en juego o en reposo. Sale del
 * mismo sondeo que ya usa la barra de sesión, así que no añade ninguna petición.
 */
function EnlaceALaMesa({ campaignId }: { campaignId: string }) {
  const { data: sesion } = useCurrentSession(campaignId);
  const enJuego = Boolean(sesion);

  return (
    <Link
      to={`/campaigns/${campaignId}/sesion`}
      className="mt-s2 inline-flex items-center gap-s2 rounded-radius-sm border border-copper px-s3 py-s2 font-chrome text-chrome-sm text-text transition-colors hover:border-accent hover:text-accent-text"
    >
      <IconoEnJuego className="h-2.5 w-2.5 shrink-0 text-copper-text" />
      {/* **No se llama «Ir a la mesa», y no es un capricho de estilo.** Ese nombre ya lo lleva el
          enlace de la barra de «en juego», y dos enlaces con el mismo nombre accesible en la
          misma pantalla son ambiguos para un lector de pantalla y para cualquier prueba que los
          busque por su nombre. Es el fallo que `docs/08-pruebas.md` cuenta de english-log, donde
          un componente metido en cuatro pantallas creó un segundo enlace homónimo y dejó un
          `spec` roto que no vio nadie. Aquí lo cazaron dos pruebas antes de commitear: el
          recorrido de navegador con «Ir a la mesa», y una prueba de componente que ya existía
          cuando el segundo intento se llamó «La mesa» — que es el rótulo del GRUPO de la barra
          lateral. **Entrar a la mesa** es además el verbo que usa la maqueta en su pantalla de
          crónicas, así que no es un tercer nombre inventado para salir del paso. */}
      Entrar a la mesa
      <span className="font-chrome text-chrome-xs text-muted">
        {enJuego ? `en juego · ${sesion?.title}` : "en reposo"}
      </span>
    </Link>
  );
}

/**
 * **El mundo, en un solo destino.** B4, 2026-09-04.
 *
 * El tipo de ficha era una pestaña por valor del enum —siete de los diecinueve destinos de una
 * campaña—, y el reseño lo señala como el defecto de arquitectura de la navegación: *«la
 * navegación es el esquema de la base de datos»*. Aquí el tipo es lo que siempre fue, **un
 * filtro**, y el destino es «el mundo».
 *
 * **No se pierde nada**: dentro sigue estando el mismo `EntityTab` de siempre, con su listado,
 * su creador y su filtro de etiquetas. Lo único que cambia es que elegir «Lugares» ya no es
 * viajar a otro sitio.
 *
 * **Y el tipo elegido sigue en la URL** (`?seccion=LOCATION`), que es como estaba y como media
 * docena de recorridos lo comprueban: un enlace a «los lugares de esta campaña» tiene que seguir
 * llevando a los lugares. Cambió el sitio donde se pinta, no la dirección.
 */
function SeccionDelMundo({
  campaignId,
  conteoPorTipo,
}: {
  campaignId: string;
  conteoPorTipo?: Map<EntityType, number>;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const enLaUrl = searchParams.get("seccion");
  const tipo: EntityType = TIPOS_DEL_MUNDO.includes(enLaUrl as EntityType)
    ? (enLaUrl as EntityType)
    : "NPC";

  const elegir = (siguiente: EntityType) => {
    const params = new URLSearchParams(searchParams);
    params.set("seccion", siguiente);
    setSearchParams(params, { replace: true });
  };

  return (
    <div>
      {/* **Filtros, no pestañas.** Van con `aria-pressed` y no con `role="tab"` a propósito: un
          `tab` promete que hay paneles hermanos entre los que se navega, y aquí solo se acota
          una lista. Prometer con el rol lo que no se hace es el mismo vicio que un botón que da
          403. */}
      <div
        role="group"
        aria-label="Tipo de ficha"
        className="mb-s4 flex flex-wrap items-center gap-s2"
      >
        {TIPOS_DEL_MUNDO.map((t) => {
          const puesto = t === tipo;
          const cuantas = conteoPorTipo?.get(t);
          return (
            <button
              key={t}
              type="button"
              aria-pressed={puesto}
              onClick={() => elegir(t)}
              className={[
                "inline-flex items-center gap-s2 rounded-radius-sm border px-s3 py-s1 font-chrome text-chrome-sm transition-colors",
                puesto
                  ? "border-copper bg-surface text-copper-text"
                  : "border-muted text-muted hover:border-copper-text hover:text-text",
              ].join(" ")}
            >
              <IconoDeTipo type={t} />
              {ROTULO_PLURAL[t]}
              {cuantas !== undefined && <span className="font-data text-chrome-xs">{cuantas}</span>}
            </button>
          );
        })}
      </div>

      {/* `key` importa: sin él, cambiar de tipo actualizaría la misma instancia en su sitio y su
          filtro y su formulario a medio escribir se colarían de un tipo al siguiente. Es el mismo
          motivo por el que lo llevaba cuando eran siete pestañas. */}
      <EntityTab key={tipo} campaignId={campaignId} type={tipo} />
    </div>
  );
}

/**
 * **Los cajones del taller.** B4, 2026-09-04, y la forma la eligió el autor.
 *
 * Personajes, Sesiones, Bestiario y Catálogo eran cuatro de las dieciséis pestañas, y las cuatro
 * son **colecciones que se consultan**, no sitios donde se está. Al matar la navegación vieja se
 * quedaban sin casa; meterlas como cuatro pestañas más del taller habría sido cambiarles el
 * marco sin cambiar el problema.
 *
 * Un cajón se desliza **encima** del taller, Escape cierra, y vuelves exactamente donde estabas.
 * Es **el mismo estrato superpuesto que ya usa la mesa** (`features/sessions/RailDePaneles`), y
 * esa es la razón de fondo para elegirlo: la aplicación se aprende una vez. Lo que se abre
 * encima se cierra con Escape, en la mesa y en el taller, y nunca sustituye lo que estabas
 * mirando.
 *
 * **Uno a la vez**, por lo mismo que en la mesa: dos superpuestos son dos sitios donde estar, y
 * no tener un sitio donde estar es el defecto que todo este reseño existe para corregir.
 */
function CajonesDelTaller({ campaignId }: { campaignId: string }) {
  const [abierto, setAbierto] = useState<CajonAbierto | null>(null);

  const cajones = CAJONES_DEL_TALLER;

  return (
    <>
      <nav
        aria-label="Cajones del taller"
        className="mb-s4 flex flex-wrap items-center gap-s2 rounded-radius-sm border border-muted bg-surface p-s2"
      >
        {cajones.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setAbierto(c.id)}
            className="inline-flex items-center gap-s2 rounded-radius-sm border border-muted bg-bg px-s3 py-s2 font-chrome text-chrome-sm text-muted transition-colors hover:border-accent hover:text-accent-text"
          >
            {c.icono}
            {c.etiqueta}
          </button>
        ))}
      </nav>

      <Dialog
        open={abierto === "characters"}
        onClose={() => setAbierto(null)}
        title="Personajes"
        size="xl"
      >
        <CharactersTab campaignId={campaignId} />
      </Dialog>
      <Dialog
        open={abierto === "bestiary"}
        onClose={() => setAbierto(null)}
        title="Bestiario"
        size="xl"
      >
        <PanelDeBestiario campaignId={campaignId} />
      </Dialog>
      <Dialog
        open={abierto === "items"}
        onClose={() => setAbierto(null)}
        title="Catálogo de objetos"
        size="xl"
      >
        <CampaignItemsCatalogPage campaignId={campaignId} />
      </Dialog>
    </>
  );
}
