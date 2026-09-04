import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { EntityType, Visibility } from "@dnd/shared";
import { Button } from "../../../ui/Button";
import { FilterChip } from "../../../ui/Collection";
import { fieldControlClass } from "../../../ui/Field";
import { DeleteButton } from "../../../components/DeleteButton";
import { useMembers } from "../../campaigns/members";
import {
  useAllEntities,
  useCreateEntity,
  useDeleteEntity,
  useEntity,
  useUpdateEntity,
} from "../../entities/hooks";
import type { Entity } from "../../entities/api";
import { bodyToText } from "../../entities/body";
import { ETIQUETA_DE_TIPO } from "../../entities/resumen";
import { VisibilityChooser } from "../../entities/VisibilityChooser";
import { LinksPanel } from "../../links/LinksPanel";
import { CommentThread } from "../../comments/CommentThread";
import { createLink, fetchLinks } from "../../links/api";
import { linksKey } from "../../links/hooks";
import { IconoMegafono, IconoPluma } from "./iconos";
import { citasDelTexto, resolverCitas } from "./wikilinks";

// **Escribir una ficha, con la visibilidad decidida al escribir y no en otra pantalla.**
//
// Es la mitad derecha del taller (maqueta: `prototipo/src/features/taller/EscribirFicha.tsx`).
// Lo que se conserva literal: las fichas de tipo arriba, el nombre en la voz de los títulos sobre
// un filete de cobre, la prosa a pantalla completa con su marcador de posición, la visibilidad
// junto al texto, y **los dos botones** con su nota.
//
// **Tres desviaciones respecto de la maqueta, declaradas y no escondidas:**
//
//  1. La visibilidad se elige con `VisibilityChooser` —radios con su explicación— y no con las
//     fichas de la maqueta. Lo manda `docs/04-convenciones.md`: «opciones con significado como
//     radios con explicación y no en un desplegable», y ese control es además el único que sabe
//     ofrecer «jugadores concretos» con su lista. Está preguntado en el informe del carril.
//  2. Al crear, el cuadro empieza **vacío**, con el marcador de la maqueta. `EntityEditor` siembra
//     una plantilla por tipo; aquí sembrarla obligaría a reescribirla cada vez que se toca una
//     ficha de tipo, que es un gesto de un solo clic en este panel.
//  3. Las etiquetas no se editan aquí (la maqueta tampoco las pinta). Por eso **al guardar una
//     ficha que ya existe no se manda `tags`**: el servidor solo escribe las claves presentes
//     (`entities.service.ts`), así que las que tuviera se conservan intactas en vez de vaciarse.
//
// Lo que **no** se pierde de la aplicación real, que es lo que exige la §7 de la auditoría: crear,
// editar, **borrar**, **enlazar** y **comentar**. Los tres últimos se montan con los componentes
// que ya existen; este carril no los reescribe.

const TIPOS: readonly EntityType[] = [
  "NPC",
  "LOCATION",
  "QUEST",
  "FACTION",
  "OBJECT",
  "EVENT",
  "DOCUMENT",
];

const MARCADOR =
  "Escribe aquí la prosa. Puedes usar Markdown y enlazar otras fichas con [[nombre]].";

export function EscribirFicha({
  campaignId,
  ficha,
  onGuardada,
  onBorrada,
}: {
  campaignId: string;
  /** La ficha elegida en el tablero, o `null` para escribir una nueva. */
  ficha: Entity | null;
  onGuardada: (guardada: Entity) => void;
  onBorrada: () => void;
}) {
  const editando = Boolean(ficha);
  const [tipo, setTipo] = useState<EntityType>(ficha?.type ?? "NPC");
  const [nombre, setNombre] = useState(ficha?.name ?? "");
  const [cuerpo, setCuerpo] = useState(ficha ? bodyToText(ficha.body) : "");
  const [visibilidad, setVisibilidad] = useState<Visibility>(ficha?.visibility ?? "DM_ONLY");
  const [jugadores, setJugadores] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [errorAlBorrar, setErrorAlBorrar] = useState<string | null>(null);

  // Sembrado en el render, no en un efecto: es el patrón que React documenta para «derivar estado
  // cuando cambia una entrada», y ahorra el render de más que daría un `useEffect`. La entrada es
  // la ficha elegida en el tablero: pulsar otra chincheta trae otra ficha a este cuadro.
  const [sembradaPara, setSembradaPara] = useState<string | null>(ficha?.id ?? null);
  if ((ficha?.id ?? null) !== sembradaPara) {
    setSembradaPara(ficha?.id ?? null);
    setTipo(ficha?.type ?? "NPC");
    setNombre(ficha?.name ?? "");
    setCuerpo(ficha ? bodyToText(ficha.body) : "");
    setVisibilidad(ficha?.visibility ?? "DM_ONLY");
    setJugadores([]);
    setError(null);
    setAviso(null);
    setErrorAlBorrar(null);
  }

  const qc = useQueryClient();
  const todas = useAllEntities(campaignId);
  const crear = useCreateEntity(campaignId, tipo);
  const actualizar = useUpdateEntity(campaignId, tipo);
  const borrar = useDeleteEntity(campaignId, tipo);
  // La MISMA clave y la MISMA función que `useLinks` (comparten caché con el tablero y con el
  // panel de enlaces de abajo); se consulta a mano solo para poder apagarla cuando no hay ficha
  // elegida — `useLinks` no acepta `enabled`, y pedir `/entities//links` sería una llamada rota.
  const enlacesActuales = useQuery({
    queryKey: linksKey(ficha?.id ?? ""),
    queryFn: () => fetchLinks(ficha?.id as string),
    enabled: Boolean(ficha?.id),
  });
  const miembros = useMembers(campaignId, { enabled: visibilidad === "SPECIFIC_PLAYERS" });

  // Las concesiones solo viajan en el detalle, no en el listado. Sin ellas cargadas, mandar
  // `specificPlayerIds` borraría las que la ficha ya tuviera (docs/06-pendientes.md).
  const detalle = useEntity(campaignId, tipo, ficha?.id, editando);
  const [concesionesDe, setConcesionesDe] = useState<string | null>(null);
  if (detalle.data && concesionesDe !== detalle.data.id) {
    setConcesionesDe(detalle.data.id);
    setJugadores(detalle.data.grants.map((g) => g.userId));
  }
  const concesionesListas = !editando || detalle.isSuccess;

  const guardando = crear.isPending || actualizar.isPending;
  const citas = citasDelTexto(cuerpo);
  const { encontradas, sinFicha } = resolverCitas(citas, todas.data ?? [], ficha?.id);

  /**
   * Tiende los hilos que la prosa cita y todavía no existen.
   *
   * Usa `createLink` —la puerta de API de `features/links`, no una segunda— y refresca su misma
   * clave de consulta. Los enlaces que ya están no se vuelven a crear, y **ninguno se borra**:
   * ver la cabecera de `wikilinks.ts`.
   */
  async function tenderHilos(entidadId: string) {
    const yaEnlazadas = new Set((enlacesActuales.data ?? []).map((e) => e.to.id));
    const nuevos = encontradas.filter(({ fichaDestino }) => !yaEnlazadas.has(fichaDestino.id));
    if (nuevos.length === 0) return 0;
    for (const { fichaDestino } of nuevos) {
      await createLink(entidadId, { toId: fichaDestino.id });
    }
    await qc.invalidateQueries({ queryKey: linksKey(entidadId) });
    return nuevos.length;
  }

  async function guardar(comoLaVeLaMesa?: Visibility) {
    setError(null);
    setAviso(null);
    const nivel = comoLaVeLaMesa ?? visibilidad;
    const payload = {
      type: tipo,
      name: nombre.trim(),
      // Editando se manda siempre, aunque esté vacío, para que borrar el texto lo borre de verdad
      // (el servicio solo escribe las claves presentes). Creando, solo si hay algo que guardar.
      ...(editando || cuerpo.trim() ? { body: { format: "markdown" as const, text: cuerpo } } : {}),
      ...(nivel === "SPECIFIC_PLAYERS" && concesionesListas
        ? { specificPlayerIds: jugadores }
        : {}),
      visibility: nivel,
    };
    try {
      const guardada =
        editando && ficha
          ? await actualizar.mutateAsync({ entityId: ficha.id, input: payload })
          : // `tags` es obligatorio al crear (el esquema le da valor por defecto y el tipo de
            // salida ya no lo hace opcional) y **no se manda al editar**: ver el punto 3 de la
            // cabecera — omitirlo es lo que conserva las etiquetas que la ficha ya tuviera.
            await crear.mutateAsync({ ...payload, tags: [] });
      if (comoLaVeLaMesa) setVisibilidad(comoLaVeLaMesa);
      let hilos = 0;
      try {
        hilos = await tenderHilos(guardada.id);
      } catch (err) {
        // La ficha SÍ se guardó. Un fallo al tender los hilos no puede leerse como si el texto se
        // hubiera perdido, así que se cuenta aparte y con el mensaje del servidor tal cual.
        setError(`La ficha se guardó, pero un enlace no: ${(err as Error).message}`);
      }
      setAviso(
        [
          comoLaVeLaMesa ? "Enseñada a la mesa." : "Guardada en el mundo.",
          hilos > 0 ? `${hilos} ${hilos === 1 ? "hilo tendido" : "hilos tendidos"}.` : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
      onGuardada(guardada);
    } catch (err) {
      // El mensaje del servidor se pinta tal cual: un 409 dice cuántos lo llevan, y cambiarlo por
      // un aviso genérico pierde información operativa (auditoría §7).
      setError((err as Error).message);
    }
  }

  async function confirmarBorrado() {
    if (!ficha) return;
    setErrorAlBorrar(null);
    try {
      await borrar.mutateAsync(ficha.id);
      onBorrada();
    } catch (err) {
      setErrorAlBorrar((err as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-s3">
      <div className="flex flex-wrap items-center gap-s2">
        <div className="flex flex-wrap gap-s1">
          {TIPOS.map((t) => (
            <FilterChip key={t} active={tipo === t} onClick={() => setTipo(t)}>
              {ETIQUETA_DE_TIPO[t]}
            </FilterChip>
          ))}
        </div>
        <div className="flex-1" />
        {editando && (
          <Button type="button" variant="ghost" onClick={onBorrada}>
            Escribir una nueva
          </Button>
        )}
      </div>

      <label className="sr-only" htmlFor="taller-nombre">
        Nombre de la ficha
      </label>
      <input
        id="taller-nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre de la ficha…"
        className="w-full border-b border-copper/30 bg-transparent pb-s2 font-title text-chrome-lg text-text placeholder:text-muted focus-visible:border-copper focus-visible:outline-none"
      />

      <label className="sr-only" htmlFor="taller-cuerpo">
        Prosa de la ficha
      </label>
      <textarea
        id="taller-cuerpo"
        value={cuerpo}
        onChange={(e) => setCuerpo(e.target.value)}
        rows={12}
        placeholder={MARCADOR}
        className={`${fieldControlClass} scroll-quiet resize-y bg-bg font-world text-world-base leading-relaxed`}
      />

      {citas.length > 0 && (
        <p className="font-chrome text-chrome-xs text-muted">
          {encontradas.length > 0 && (
            <>
              Se enlazará con {encontradas.map(({ fichaDestino }) => fichaDestino.name).join(", ")}
              .{" "}
            </>
          )}
          {sinFicha.length > 0 && (
            <span className="text-copper-text">
              Sin ficha todavía: {sinFicha.map((c) => c.texto).join(", ")}. Escríbelas y el enlace
              se tenderá al guardar de nuevo.
            </span>
          )}
        </p>
      )}

      <VisibilityChooser value={visibilidad} onChange={setVisibilidad}>
        <fieldset className="rounded-radius-sm border border-muted p-s2">
          <legend className="px-1 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
            Jugadores con acceso
          </legend>
          {miembros.isLoading && (
            <p className="font-chrome text-chrome-sm text-muted">Cargando jugadores…</p>
          )}
          {miembros.isError && (
            <p className="font-chrome text-chrome-sm text-danger-text">
              No se pudo cargar la lista de jugadores. Un cuadro vacío aquí no significa que la
              campaña no tenga ninguno.
            </p>
          )}
          {miembros.data
            ?.filter((m) => m.role === "PLAYER")
            .map((m) => (
              <label
                key={m.userId}
                className="flex items-center gap-s2 py-0.5 font-chrome text-chrome-sm text-text"
              >
                <input
                  type="checkbox"
                  checked={jugadores.includes(m.userId)}
                  onChange={() =>
                    setJugadores((prev) =>
                      prev.includes(m.userId)
                        ? prev.filter((id) => id !== m.userId)
                        : [...prev, m.userId],
                    )
                  }
                  className="accent-[var(--accent)]"
                />
                {m.displayName}
              </label>
            ))}
        </fieldset>
      </VisibilityChooser>

      <div className="flex flex-wrap items-center gap-s2">
        <Button
          type="button"
          variant="secondary"
          disabled={!nombre.trim() || guardando}
          onClick={() => void guardar()}
        >
          <IconoPluma />
          Guardar en el mundo
        </Button>
        <Button
          type="button"
          disabled={!nombre.trim() || guardando}
          onClick={() => void guardar("PLAYERS")}
        >
          <IconoMegafono />
          Enseñar a la mesa
        </Button>
      </div>
      <p className="font-chrome text-chrome-xs text-muted">
        Enseñarla aparece como un empujón en la pantalla de los jugadores, no como un cambio de
        permiso.
      </p>

      {aviso && <p className="font-chrome text-chrome-sm text-accent-text">{aviso}</p>}
      {error && <p className="font-chrome text-chrome-sm text-danger-text">{error}</p>}

      {editando && ficha && (
        <>
          <div className="border-t border-muted pt-s3">
            <DeleteButton
              message={
                `Vas a borrar "${ficha.name}". No se puede deshacer: se borrarán también todos ` +
                `los enlaces en los que aparece —salgan de ella o apunten a ella—, sus ` +
                `comentarios y sus concesiones de visibilidad.`
              }
              onConfirm={() => void confirmarBorrado()}
              pending={borrar.isPending}
            />
            {errorAlBorrar && (
              <p className="mt-s2 font-chrome text-chrome-sm text-danger-text">{errorAlBorrar}</p>
            )}
          </div>

          {/* Enlazar y comentar: los componentes que ya existen, sin reescribirlos. Quitar un
              enlace lo decide el servidor por fila (`canRemove`), y en un retroenlace depende de
              la ficha de enfrente. */}
          <LinksPanel campaignId={campaignId} entityId={ficha.id} entityName={ficha.name} />
          <CommentThread campaignId={campaignId} entityId={ficha.id} />
        </>
      )}
    </div>
  );
}
