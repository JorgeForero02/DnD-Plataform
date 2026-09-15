import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  dadoDeGolpeDe,
  expresionDePgDe,
  origenDeRef,
  pgMediosDe,
  vdLegible,
  type CreateCampaignStatblockInput,
  type Statblock,
} from "@dnd/shared";
import { Button } from "../../ui/Button";
import { fieldControlClass } from "../../ui/Field";
import { EmptyState, FilterChip, Toolbar } from "../../ui/Collection";
import { Panel } from "../../ui/Panel";
import { DarTemporales } from "./DarTemporales";
import { useMyRole } from "../campaigns/members";
import { nombreCondicion } from "../character-sheet/vocabulario";
import { SelectorDeFichaDelMundo } from "../entities/SelectorDeFichaDelMundo";
import type { NpcEnLaMesa } from "./api";
import {
  useCreateStatblock,
  useDeleteStatblock,
  useInstantiateNpc,
  useNpcs,
  useStatblocks,
  useUpdateStatblock,
} from "./hooks";
import { EditorDeStatblock } from "./EditorDeStatblock";
import { IconoEscudo, IconoPluma } from "../../ui/Iconos";
import { descriptorDeCriatura, NOMBRE_ORIGEN } from "./vocabulario";

// Fase 2D — **el bestiario**.
//
// El prototipo lo resume en una frase que esta pantalla se toma al pie de la letra: *«como una
// ficha, pero para leerla de un vistazo en mitad de un turno»*. Por eso lo grande son tres
// números —CA, PG y velocidad— y todo lo demás va debajo y más pequeño: en mitad de un turno
// nadie lee un párrafo.
//
// **Dos discrepancias con el prototipo, y las dos declaradas** (docs/04-convenciones.md):
//
//  · El prototipo pone la velocidad en **metros** («9 m»). Aquí va en **pies**, que es la unidad
//    del resto de la aplicación y la de la especificación de distancias. Mezclar las dos por
//    parecerse a la maqueta sería que la hoja de un personaje y la ficha de un monstruo midieran
//    distinto en la misma partida.
//
//  · El botón del prototipo dice **«Meter al combate»**, y **no hay combate**: la iniciativa, el
//    orden de turnos y aplicar daño en tanda son **Encuentros**, un bloque que el plan maestro
//    sitúa entre la fase 2 y la 3 pero que **todavía no tiene plan escrito**, y la especificación
//    de 2D los declara fuera de alcance. La regla del proyecto es que **si el texto explica una
//    regla del servidor y discrepan, miente el texto**, así que el botón dice lo que de verdad
//    hace: bajar la criatura a la mesa con sus puntos de golpe. El día que Encuentros exista,
//    este botón podrá decir otra cosa **porque será verdad**.
//
// La autorización la comprueba el servidor **siempre**. Que aquí no se le pinte el botón a un
// jugador no es control de acceso: `requireDM` lo es. Y las dos listas llegan ya filtradas por
// `canView`, así que esta pantalla no esconde ninguna fila — pinta lo que le mandan.

/** Un número grande con su rótulo diminuto encima, como en el prototipo. */
function Cifra({ rotulo, valor, sufijo }: { rotulo: string; valor: string; sufijo?: string }) {
  return (
    <div className="min-w-[3.5rem]">
      <div className="font-chrome text-chrome-xs uppercase tracking-wide text-muted">{rotulo}</div>
      <div className="font-data text-chrome-2xl leading-tight text-text">
        {valor}
        {sufijo ? (
          <span className="ml-1 font-chrome text-chrome-sm text-muted">{sufijo}</span>
        ) : null}
      </div>
    </div>
  );
}

function FichaDeCriatura({
  campaignId,
  statblock,
  puedeBajar,
  onBajar,
  bajando,
  /**
   * Solo las **propias del DM** se editan y se borran: un statblock del libro vive en código,
   * no en la base, y el servidor devuelve 404 si se intenta. Se pasa como `undefined` para las
   * del SRD en vez de comprobar el origen aquí dos veces.
   */
  onEditar,
  onBorrar,
}: {
  campaignId: string;
  statblock: Statblock;
  puedeBajar: boolean;
  onBajar: (ref: string, cuantos: number, entityId: string | null) => void;
  bajando: boolean;
  onEditar?: () => void;
  onBorrar?: () => void;
}) {
  const [cuantos, setCuantos] = useState(1);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  // PNJ del mundo y la mesa (spec §3.1) — «¿de qué ficha del mundo es?», antes de bajarla. Es
  // una elección LOCAL: no se guarda hasta que se pulsa «Bajar a la mesa», que es cuando de
  // verdad nace el cuerpo que se puede enlazar.
  const [mostrarSelector, setMostrarSelector] = useState(false);
  const [fichaDelMundo, setFichaDelMundo] = useState<string | null>(null);
  const velocidad = statblock.speeds.walk ?? 0;

  return (
    <article
      className="rounded-radius-sm border border-muted bg-surface"
      data-testid="ficha-de-criatura"
    >
      <header className="flex items-baseline justify-between gap-s2 border-b border-muted px-s3 py-s2">
        <div className="min-w-0">
          {/* PNJ del mundo y la mesa (spec §3.4) — la tarjeta dice de qué es antes de decir
              cuál: sin esto, «Plantilla» y «En la mesa» (más abajo, la lista de criaturas ya
              instanciadas) leían igual y solo el texto suelto de la cabecera de bestiario los
              distinguía. */}
          <p className="font-chrome text-chrome-xs uppercase tracking-wide text-muted">Plantilla</p>
          <h3 className="font-title text-chrome-lg text-text">{statblock.name}</h3>
        </div>
        <span className="font-chrome text-chrome-xs uppercase tracking-wide text-muted">
          {NOMBRE_ORIGEN[statblock.source]}
        </span>
      </header>

      <div className="space-y-s3 px-s3 py-s3">
        <p className="font-chrome text-chrome-xs text-muted">{descriptorDeCriatura(statblock)}</p>

        <div className="flex flex-wrap gap-s4">
          <Cifra rotulo="CA" valor={String(statblock.ac)} />
          <Cifra rotulo="PG" valor={String(pgMediosDe(statblock))} />
          {/* En **pies**, no en metros: ver la nota de arriba. */}
          <Cifra rotulo="Vel" valor={String(velocidad)} sufijo="pies" />
          <Cifra rotulo="VD" valor={vdLegible(statblock.cr)} />
        </div>

        <p className="font-chrome text-chrome-xs text-muted">
          {/* La fórmula entera, porque es lo que se tira si el DM quiere PG distintos por bicho.
              Y el dado sale del TAMAÑO de la criatura, no de una clase: enseñarlo aquí es lo que
              evita la pregunta «¿de dónde sale ese d10?». */}
          {expresionDePgDe(statblock)} · dado d{dadoDeGolpeDe(statblock)}
          {statblock.acNote ? ` · CA por ${statblock.acNote}` : null}
        </p>

        {statblock.actions.length > 0 ? (
          <ul className="space-y-1">
            {statblock.actions.map((a) => (
              <li key={a.name} className="font-chrome text-chrome-sm text-text">
                <span className="font-semibold">{a.name}.</span>{" "}
                <span className="text-muted">{a.desc}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {statblock.traits.length > 0 ? (
          <ul className="space-y-1">
            {statblock.traits.map((t) => (
              <li key={t.name} className="font-chrome text-chrome-xs text-muted">
                <span className="font-semibold text-text">{t.name}.</span> {t.desc}
              </li>
            ))}
          </ul>
        ) : null}

        {puedeBajar ? (
          // **`flex-wrap`, y los botones no se parten por dentro** (2026-09-14, captura del
          // autor): con la pregunta de la ficha del mundo en la misma fila, a ~430 px «Bajar a la
          // mesa» se partía en tres líneas, la pregunta en cinco y «Borrar» se salía de la tarjeta.
          // La fila envuelve; cada botón conserva su rótulo entero (`whitespace-nowrap`); y la
          // pregunta —que es un gesto raro, no uno de cada bajada— va en su propia línea, debajo.
          <div className="flex flex-wrap items-center gap-s2 pt-s1 [&>button]:whitespace-nowrap">
            <label
              className="font-chrome text-chrome-xs text-muted"
              htmlFor={`cuantos-${statblock.ref}`}
            >
              Cuántos
            </label>
            <input
              id={`cuantos-${statblock.ref}`}
              type="number"
              min={1}
              max={10}
              value={cuantos}
              onChange={(e) => setCuantos(Number(e.target.value))}
              className="w-16 rounded-radius-sm border border-muted bg-surface px-2 py-1 font-data text-chrome-sm text-text"
            />
            <Button
              variant="secondary"
              disabled={bajando}
              onClick={() => onBajar(statblock.ref, cuantos, fichaDelMundo)}
            >
              <IconoEscudo className="mr-1 inline h-4 w-4" />
              Bajar a la mesa
            </Button>
            {onEditar ? (
              <Button variant="ghost" onClick={onEditar}>
                Editar
              </Button>
            ) : null}
            {onBorrar ? (
              // Confirmación en pantalla, nunca `window.confirm`: el patrón de todo el proyecto.
              confirmandoBorrado ? (
                <>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setConfirmandoBorrado(false);
                      onBorrar();
                    }}
                  >
                    Sí, borrarla
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmandoBorrado(false)}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button variant="danger" onClick={() => setConfirmandoBorrado(true)}>
                  Borrar
                </Button>
              )
            ) : null}
          </div>
        ) : null}

        {puedeBajar ? (
          // PNJ del mundo y la mesa (spec §3.1) — «¿de qué ficha del mundo es?». Botón de texto en
          // su propia línea, no un campo más: la mayoría de las bajadas no enlazan con nada, y un
          // campo siempre visible pesaría igual que los que sí importan.
          <div>
            <Button variant="ghost" onClick={() => setMostrarSelector((v) => !v)}>
              ¿De qué ficha del mundo es?
            </Button>
          </div>
        ) : null}

        {puedeBajar && mostrarSelector ? (
          <SelectorDeFichaDelMundo
            campaignId={campaignId}
            value={fichaDelMundo}
            onChange={setFichaDelMundo}
            etiqueta="De qué ficha del mundo es"
          />
        ) : null}
      </div>
    </article>
  );
}

/**
 * Los que ya están en la mesa: sus puntos de golpe, sus **condiciones vivas** y un enlace a su
 * ficha.
 *
 * **Estos PNJ no salen en la pestaña «Personajes»** (2D.6): esa lista es quién se sienta a la
 * mesa. Seis goblins mezclados con tres aventureros la convierten en un listado de combate, que
 * es justo lo que el hueco M13 describía como el problema de la solución de andar por casa
 * —«crear tres personajes a nombre del DM»—.
 *
 * **Y no se pinta el PG máximo**, a propósito: derivarlo aquí sería un segundo camino que
 * discreparía del de la hoja en cuanto hubiera agotamiento. El máximo vive en la ficha.
 */
function EnLaMesa({ campaignId, npcs }: { campaignId: string; npcs: NpcEnLaMesa[] }) {
  if (npcs.length === 0) return null;
  return (
    <section className="space-y-s2" data-testid="pnj-en-la-mesa">
      <h3 className="font-chrome text-chrome-xs uppercase tracking-wide text-muted">En la mesa</h3>
      <ul className="space-y-1">
        {npcs.map((n) => (
          <li
            key={n.id}
            className="flex flex-wrap items-baseline justify-between gap-s2 rounded-radius-sm border border-muted px-s3 py-s2"
          >
            {/* El enlace no es un adorno: hacerle daño a un PNJ ocurre en su ficha, que es la
                misma pantalla que la de un personaje jugador porque un PNJ **es** una fila de
                `Character`. Repetir aquí los controles de PG habría sido escribir por segunda vez
                la parte más revisada del proyecto. */}
            <Link
              to={`/campaigns/${campaignId}/personajes/${n.id}`}
              className="font-chrome text-chrome-sm text-accent-text underline-offset-2 hover:underline"
            >
              {n.name}
            </Link>
            <span className="flex items-baseline gap-s2">
              {(n.conditions ?? []).map((c) => (
                <span
                  key={c.key}
                  className="font-chrome text-chrome-xs text-copper-text"
                  data-testid="condicion-de-pnj"
                >
                  {nombreCondicion(c.key)}
                  {/* Solo el agotamiento tiene niveles; en las otras catorce `level` es null,
                      y «Derribado 1» sería un número inventado. */}
                  {c.level !== null && c.level > 1 ? ` ${c.level}` : ""}
                </span>
              ))}
              <span className="font-data text-chrome-sm text-muted">
                {n.currentHp === null ? "a PG máximos" : `${n.currentHp} PG`}
                {/* **Los PG temporales, que llegaban del servidor y no se pintaban**
                    (auditoría §8.5). Van APARTE y nunca sumados a los actuales, igual que en la
                    hoja del jugador: el daño se los come primero, y sumarlos aquí diría que el
                    PNJ aguanta más de lo que aguanta. */}
                {n.tempHp && n.tempHp > 0 ? (
                  <span className="ml-s2 font-chrome text-chrome-xs text-accent-text">
                    +{n.tempHp} temporales
                  </span>
                ) : null}
              </span>
            </span>
            {/* **El gesto que faltaba** (ficha C6-4): `tempHp` se pintaba desde la auditoría §8.5 y
                **nunca se había visto con datos**, porque ninguna pantalla los concedía. Va aquí,
                en la fila del PNJ que está en la mesa, que es donde el DM se los daría. */}
            <DarTemporales campaignId={campaignId} characterId={n.id} nombre={n.name} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PanelDeBestiario({ campaignId }: { campaignId: string }) {
  const { role: rol } = useMyRole(campaignId);
  const esDM = rol === "DM";
  const { data, isLoading } = useStatblocks(campaignId);
  const { data: npcs } = useNpcs(campaignId);
  const bajar = useInstantiateNpc(campaignId);
  const crear = useCreateStatblock(campaignId);
  const actualizar = useUpdateStatblock(campaignId);
  const borrar = useDeleteStatblock(campaignId);
  const [origen, setOrigen] = useState<"todos" | "SRD" | "CAMPAIGN">("todos");
  const [busqueda, setBusqueda] = useState("");
  // `null` = cerrado · `{}` = escribiendo una nueva · `{ statblock }` = editando esa.
  const [editando, setEditando] = useState<{ statblock?: Statblock } | null>(null);
  // PNJ del mundo y la mesa (spec §3.1) — si la última bajada llevaba `entityId`, para elegir el
  // mensaje de éxito correcto. `bajar.data` no lo dice: es la respuesta del servidor, sin el
  // pedido que la causó.
  const [ultimoConFicha, setUltimoConFicha] = useState(false);

  /** El id de base de una criatura propia, o `null` si es del libro (que no se toca). */
  const idDeCampana = (s: Statblock): string | null => {
    const origen = origenDeRef(s.ref);
    return origen && origen.source === "CAMPAIGN" ? origen.id : null;
  };

  const guardar = (input: CreateCampaignStatblockInput) => {
    const id = editando?.statblock ? idDeCampana(editando.statblock) : null;
    if (id) {
      actualizar.mutate({ statblockId: id, input }, { onSuccess: () => setEditando(null) });
    } else {
      crear.mutate(input, { onSuccess: () => setEditando(null) });
    }
  };

  const criaturas = useMemo(() => {
    const todas = [...(data?.campaign ?? []), ...(data?.srd ?? [])];
    const porOrigen = origen === "todos" ? todas : todas.filter((s) => s.source === origen);
    const q = busqueda.trim().toLowerCase();
    return q ? porOrigen.filter((s) => s.name.toLowerCase().includes(q)) : porOrigen;
  }, [data, origen, busqueda]);

  if (isLoading)
    return <p className="font-chrome text-chrome-sm text-muted">Cargando el bestiario…</p>;

  return (
    <Panel>
      <div className="space-y-s4">
        <header className="space-y-1">
          <h2 className="font-title text-chrome-xl text-text">Bestiario</h2>
          <p className="font-chrome text-chrome-sm text-muted">
            Como una ficha, pero para leerla de un vistazo en mitad de un turno.
          </p>
        </header>

        <Toolbar
          search={
            <input
              aria-label="Buscar una criatura"
              placeholder="Buscar una criatura"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className={fieldControlClass}
            />
          }
          filters={
            <>
              <FilterChip active={origen === "todos"} onClick={() => setOrigen("todos")}>
                Todas
              </FilterChip>
              <FilterChip active={origen === "CAMPAIGN"} onClick={() => setOrigen("CAMPAIGN")}>
                De la campaña
              </FilterChip>
              <FilterChip active={origen === "SRD"} onClick={() => setOrigen("SRD")}>
                Del libro
              </FilterChip>
            </>
          }
          count={`${criaturas.length} de ${(data?.srd.length ?? 0) + (data?.campaign.length ?? 0)}`}
        />

        {bajar.isError ? (
          <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
            No se ha podido bajar la criatura a la mesa.
          </p>
        ) : null}
        {bajar.isSuccess ? (
          <p role="status" className="font-chrome text-chrome-sm text-muted">
            {bajar.data?.length === 1
              ? ultimoConFicha
                ? `${bajar.data[0].name} está en la mesa, enlazado con su ficha del mundo. Solo lo ves tú hasta que lo reveles.`
                : `${bajar.data[0].name} está en la mesa. Solo lo ves tú hasta que le subas la visibilidad.`
              : ultimoConFicha
                ? `${bajar.data?.length} criaturas están en la mesa, enlazadas con su ficha del mundo. Solo las ves tú hasta que las reveles.`
                : `${bajar.data?.length} criaturas están en la mesa. Solo las ves tú hasta que les subas la visibilidad.`}
          </p>
        ) : null}

        {esDM ? (
          <div className="flex flex-wrap items-center gap-s2">
            <Button onClick={() => setEditando({})}>
              {/* Anexo #22 — este botón no llevaba icono. `IconoPluma` es el mismo dibujo que
                  `EntityDetailPage` usa para «escribir» una ficha del mundo: un concepto, un icono. */}
              <IconoPluma />
              Escribir una criatura
            </Button>
            {borrar.isError ? (
              <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
                {/* El rechazo del servidor se pinta tal cual: un 409 al borrar una criatura que
                    ya está en la mesa dice cuántos PNJ la usan, y ese dato es operativo. */}
                {(borrar.error as Error).message}
              </p>
            ) : null}
          </div>
        ) : null}

        {esDM && npcs ? <EnLaMesa campaignId={campaignId} npcs={npcs} /> : null}

        {criaturas.length === 0 ? (
          <EmptyState title="No hay ninguna criatura que se llame así">
            El bestiario trae quince criaturas del libro, y el DM puede escribir las suyas.
          </EmptyState>
        ) : (
          <div className="grid gap-s3 md:grid-cols-2">
            {criaturas.map((s) => {
              const id = idDeCampana(s);
              return (
                <FichaDeCriatura
                  key={s.ref}
                  statblock={s}
                  puedeBajar={esDM && origenDeRef(s.ref) !== null}
                  bajando={bajar.isPending}
                  campaignId={campaignId}
                  onBajar={(ref, cuantos, entityId) => {
                    setUltimoConFicha(entityId !== null);
                    bajar.mutate({
                      ref,
                      count: cuantos,
                      hp: "AVERAGE",
                      entityId: entityId ?? undefined,
                    });
                  }}
                  onEditar={esDM && id ? () => setEditando({ statblock: s }) : undefined}
                  onBorrar={esDM && id ? () => borrar.mutate(id) : undefined}
                />
              );
            })}
          </div>
        )}
      </div>

      {editando ? (
        <EditorDeStatblock
          // Remontar al cambiar de criatura: el borrador se inicializa una sola vez.
          key={editando.statblock?.ref ?? "nueva"}
          abierto
          statblock={editando.statblock}
          guardando={crear.isPending || actualizar.isPending}
          error={
            crear.isError
              ? (crear.error as Error).message
              : actualizar.isError
                ? (actualizar.error as Error).message
                : undefined
          }
          onGuardar={guardar}
          onCerrar={() => setEditando(null)}
        />
      ) : null}
    </Panel>
  );
}
