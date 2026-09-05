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
import { ETIQUETA_DE_TIPO, ROTULO_PLURAL } from "../../entities/resumen";
import { VisibilityChooser } from "../../entities/VisibilityChooser";
import { LinksPanel } from "../../links/LinksPanel";
import { CommentThread } from "../../comments/CommentThread";
import { createLink, fetchLinks } from "../../links/api";
import { linksKey } from "../../links/hooks";
import { IconoMegafono, IconoPluma } from "../../../ui/Iconos";
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
  /**
   * **Reclasificar una ficha que ya existe dice lo que cuesta** (ficha I16, 2026-09-06).
   *
   * Estos chips son el **único** sitio de la aplicación donde se cambia el tipo de una ficha —el
   * `EntityEditor` recibe `type` como prop y no lo toca—, y hasta hoy lo hacían **de un clic y sin
   * dejar rastro**: un PNJ con statblock, enlaces y comentarios se volvía «Documento» y nadie podía
   * saber que había pasado.
   *
   * **Solo se pregunta al editar una que ya existe.** Escribiendo una nueva, el chip elige de qué
   * tipo va a ser y no reclasifica nada: preguntar ahí sería un estorbo en el gesto normal, y una
   * confirmación que salta cuando no hace falta se aprende a ignorar en dos días.
   */
  const [reclasificar, setReclasificar] = useState<EntityType | null>(null);

  const pedirTipo = (t: EntityType) => {
    if (editando && ficha && t !== ficha.type) {
      setReclasificar(t);
      return;
    }
    setTipo(t);
  };
  const [nombre, setNombre] = useState(ficha?.name ?? "");
  const [cuerpo, setCuerpo] = useState(ficha ? bodyToText(ficha.body) : "");
  const [visibilidad, setVisibilidad] = useState<Visibility>(ficha?.visibility ?? "DM_ONLY");
  const [jugadores, setJugadores] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [errorAlBorrar, setErrorAlBorrar] = useState<string | null>(null);

  // **No hay estado derivado que rearmar aquí, y es a propósito.** La primera versión sembraba
  // el estado en el render con dos guardas —una por la ficha elegida y otra por sus concesiones—
  // y la primera vaciaba `jugadores` sin reiniciar la segunda: elegir una ficha con «jugadores
  // concretos», pulsar «Escribir una nueva» y volver a elegir la MISMA dejaba las casillas
  // vacías, porque la guarda de las concesiones ya se había disparado para ese id y no volvía a
  // hacerlo. Guardar entonces mandaba `specificPlayerIds: []`, y `entities.service.ts` hace
  // `deleteMany` sin `createMany`: **las concesiones desaparecían sin un solo aviso**.
  //
  // Ahora el compositor monta este formulario con `key={ficha?.id ?? "ficha-nueva"}`, así que
  // cambiar de ficha lo desmonta y lo vuelve a montar con sus valores iniciales. Un `key` no se
  // puede quedar «sin rearmar»; una guarda sí.

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
  // Vale mientras el formulario esté montado para UNA ficha, que es lo que garantiza el `key`.
  const concesionesListas = !editando || detalle.isSuccess;

  const guardando = crear.isPending || actualizar.isPending;
  const citas = citasDelTexto(cuerpo);
  const { encontradas, sinFicha, aSiMisma } = resolverCitas(citas, todas.data ?? [], ficha?.id);

  /**
   * Tiende los hilos que la prosa cita y todavía no existen.
   *
   * Usa `createLink` —la puerta de API de `features/links`, no una segunda— y refresca su misma
   * clave de consulta. Los enlaces que ya están no se vuelven a crear, y **ninguno se borra**:
   * ver la cabecera de `wikilinks.ts`.
   */
  async function tenderHilos(entidadId: string) {
    // **Sin la lista de enlaces asentada no se tiende nada.** `links.service.ts` no tiene
    // restricción de unicidad, así que crear a ciegas duplica: tras el primer guardado la ficha
    // pasa a «editando», su consulta de enlaces arranca de cero, y un segundo guardado seguido
    // veía `data === undefined` —«no hay ninguno»— y volvía a crear los mismos, dejando **dos
    // hilos idénticos** entre las dos chinchetas. Esperar a la siguiente vuelta no pierde nada:
    // el `[[nombre]]` sigue escrito y el guardado siguiente lo tiende.
    //
    // La condición mira `editando` y **no solo el estado de la consulta**: una consulta apagada
    // (`enabled: false`, que es lo que hay mientras se escribe una ficha nueva) se queda en
    // `isPending` para siempre en react-query 5, así que preguntar solo por ella dejaba una
    // ficha recién creada **sin ninguno** de sus enlaces. Una ficha que aún no existe no tiene
    // enlaces que duplicar: ahí no hay nada que esperar.
    if (editando && !(enlacesActuales.isSuccess && !enlacesActuales.isFetching)) return 0;
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
            <FilterChip key={t} active={tipo === t} onClick={() => pedirTipo(t)}>
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
              se tenderá al guardar de nuevo.{" "}
            </span>
          )}
          {/* Una ficha que se nombra a sí misma no se enlaza consigo misma — pero antes esa
              cita se caía por el hueco entre las dos listas y no se decía en ninguna parte. */}
          {aSiMisma.length > 0 && (
            <span>
              {aSiMisma.map((c) => c.texto).join(", ")}: es esta misma ficha, así que no se enlaza
              consigo misma.
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

      {/* **La consecuencia, no el riesgo** (I16). Nombra los dos tipos, **dónde deja de aparecer** y
          **qué deja de encontrarla**, con los rótulos reales — nunca «¿estás seguro?», que se pulsa
          sin leer y encima tranquiliza. Y dice lo que NO se pierde: si no se dice, se supone lo
          peor y el gesto deja de usarse. */}
      {reclasificar && ficha && (
        <div
          role="alertdialog"
          aria-label="Cambiar el tipo de la ficha"
          className="space-y-s2 rounded-radius-sm border border-copper bg-[color:var(--copper-tint)] p-s3"
        >
          <p className="font-chrome text-chrome-sm text-text">
            <strong>
              «{ficha.name}» pasa de {ETIQUETA_DE_TIPO[ficha.type]} a{" "}
              {ETIQUETA_DE_TIPO[reclasificar]}.
            </strong>{" "}
            Sale de {ROTULO_PLURAL[ficha.type]} y aparece en {ROTULO_PLURAL[reclasificar]}, así que
            quien la busque donde estaba no la va a encontrar. Su cuerpo, sus etiquetas, sus enlaces
            y sus comentarios <strong>no se tocan</strong>.
            {ficha.type === "NPC" &&
              " Y si tenía un statblock asociado, deja de tener sentido: un Documento no pelea."}
          </p>
          <p className="font-chrome text-chrome-xs text-muted">
            Queda escrito en el registro de la campaña, así que se puede ver y deshacer.
          </p>
          <div className="flex flex-wrap gap-s2">
            <Button
              type="button"
              onClick={() => {
                setTipo(reclasificar);
                setReclasificar(null);
              }}
            >
              Sí, pasarla a {ETIQUETA_DE_TIPO[reclasificar]}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setReclasificar(null)}>
              Dejarla como está
            </Button>
          </div>
        </div>
      )}
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
