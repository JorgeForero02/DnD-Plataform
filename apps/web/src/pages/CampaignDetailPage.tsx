import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
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
import { useCharacters } from "../features/characters/hooks";
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
  | { kind: "entity"; label: string; type: EntityType; group?: string }
  | { kind: "sessions"; label: string; group?: string }
  | { kind: "characters"; label: string; group?: string }
  | { kind: "rules"; label: string; group?: string }
  | { kind: "items"; label: string; group?: string }
  | { kind: "dice"; label: string; group?: string }
  | { kind: "tables"; label: string; group?: string }
  | { kind: "settings"; label: string; group?: string };

// Reseño 2026-09-02 — audit B4. These ten used to sit in one flat strip, which said that
// "Documentos" and "Sesiones" were the same kind of thing. They are not: one is a filing
// cabinet, the other is what happens on Friday. Two groups, and the table comes second only
// because the world is what you build between sessions.
const GRUPO_MUNDO = "El mundo";
const GRUPO_MESA = "La mesa";

const TABS: TabConfig[] = [
  { kind: "overview", label: "Resumen" },
  { kind: "entity", label: ROTULO_PLURAL.NPC, type: "NPC", group: GRUPO_MUNDO },
  { kind: "entity", label: ROTULO_PLURAL.LOCATION, type: "LOCATION", group: GRUPO_MUNDO },
  { kind: "entity", label: ROTULO_PLURAL.QUEST, type: "QUEST", group: GRUPO_MUNDO },
  { kind: "entity", label: ROTULO_PLURAL.FACTION, type: "FACTION", group: GRUPO_MUNDO },
  { kind: "entity", label: ROTULO_PLURAL.OBJECT, type: "OBJECT", group: GRUPO_MUNDO },
  { kind: "entity", label: ROTULO_PLURAL.EVENT, type: "EVENT", group: GRUPO_MUNDO },
  { kind: "entity", label: ROTULO_PLURAL.DOCUMENT, type: "DOCUMENT", group: GRUPO_MUNDO },
  { kind: "sessions", label: "Sesiones", group: GRUPO_MESA },
  { kind: "characters", label: "Personajes", group: GRUPO_MESA },
  // 2A.17. Va en «La mesa» y no en «La campaña» porque una regla es algo que pasa durante la
  // partida, no un ajuste. El panel se calla entero si quien mira no es el DM.
  { kind: "rules", label: "Reglas", group: GRUPO_MESA },
  // 2B. Va en «La mesa» y no en «El mundo» aunque hable de objetos: la ficha de mundo de un
  // objeto —su historia, sus enlaces, quién lo quiere— es la pestaña «Objetos» de arriba; esto
  // es su cara mecánica, el dado de daño y la CA, que es lo que se toca durante la partida. El
  // prototipo los separa igual, y por el mismo motivo: son dos caras de la misma cosa y solo
  // una de ellas se consulta con los dados en la mano.
  { kind: "items", label: "Catálogo", group: GRUPO_MESA },
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
          Cada jugador crea el suyo; el DM puede crearlos también. Nombre, raza, clase y nivel
          bastan para empezar.
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
  const seccionActiva = searchParams.get("seccion") ?? "overview";
  const abrirSeccion = (id: string) => {
    const siguiente = new URLSearchParams(searchParams);
    if (id === "overview") siguiente.delete("seccion");
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
    if (t.kind === "entity") {
      return {
        id: t.type,
        label: t.label,
        group: t.group,
        // The count comes from the campaign-wide entity list, which the server already
        // filtered by canView — so it is "how many of these you can see", never a hint that
        // there are more you cannot. See CampaignOverview.tsx for the same reasoning.
        badge: conteoPorTipo?.get(t.type) ?? undefined,
        icon: <IconoDeTipo type={t.type} />,
        content: <EntityTab key={t.type} campaignId={id} type={t.type} />,
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
        <PageHeader title="Campaña no disponible" crumbs={[{ label: "Mis campañas", to: "/" }]} />
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
        <Breadcrumbs items={[{ label: "Mis campañas", to: "/" }]} />
        <h1 className="mt-1 font-title text-chrome-xl leading-tight text-text">
          {isLoading ? "Cargando…" : (campaign?.name ?? "")}
        </h1>
        <div className="mt-s3 h-px w-full bg-copper opacity-30" />
      </header>
      {/* layout="sidebar": the same WAI-ARIA tablist, standing up. Ten sections in a flat
          strip said everything here was the same kind of thing (audit B4); a grouped column
          says which of them is the world and which is the table. */}
      <Tabs items={items} layout="sidebar" active={seccionActiva} onChange={abrirSeccion} />
    </AppShell>
  );
}
