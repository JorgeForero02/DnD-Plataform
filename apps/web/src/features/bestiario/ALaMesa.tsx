import { useMemo, useState } from "react";
import type { Statblock, Visibility } from "@dnd/shared";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";
import { fieldControlClass } from "../../ui/Field";
import type { Entity } from "../entities/api";
import { useInstantiateNpc, useStatblocks } from "./hooks";
import { IconoBestiario } from "./iconos";
import { NOMBRE_ORIGEN } from "./vocabulario";

// PNJ del mundo y la mesa (spec §3.4) — **«A la mesa», desde la ficha del mundo.**
//
// Es el camino inverso al del bestiario: allí se elige primero la plantilla y luego, si se
// quiere, de qué ficha del mundo es; aquí ya se sabe la ficha —es la que se está leyendo— y lo
// que falta es la plantilla. El cuerpo que nace **siempre** lleva `entityId`, así que este
// diálogo no ofrece «Ninguna»: eso es justo lo que `SelectorDeFichaDelMundo` sirve y aquí no
// aplica.
//
// Nace **oculto** (`DM_ONLY`, el defecto de `instantiateNpcSchema`) — «solo lo ves tú hasta que
// lo reveles» es literal, no una frase de cortesía: es como el servidor lo guarda.
type PlantillaConVisibilidad = Statblock & { visibility?: Visibility };

export function ALaMesa({ campaignId, entity }: { campaignId: string; entity: Entity }) {
  const [abierto, setAbierto] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          setMensaje(null);
          setAbierto(true);
        }}
      >
        <IconoBestiario className="mr-1 inline h-4 w-4" />A la mesa
      </Button>

      {abierto && (
        <DialogoALaMesa
          campaignId={campaignId}
          entity={entity}
          onClose={() => setAbierto(false)}
          onExito={(texto) => {
            setMensaje(texto);
            setAbierto(false);
          }}
        />
      )}

      {/* El aviso vive FUERA del diálogo, y por eso sobrevive a que se cierre: quien lo pulsó
          quiere ver la confirmación, no perderla en el mismo gesto que la cierra. */}
      {mensaje && (
        <p role="status" className="mt-s1 font-chrome text-chrome-xs text-muted">
          {mensaje}
        </p>
      )}
    </>
  );
}

function DialogoALaMesa({
  campaignId,
  entity,
  onClose,
  onExito,
}: {
  campaignId: string;
  entity: Entity;
  onClose: () => void;
  onExito: (mensaje: string) => void;
}) {
  const { data } = useStatblocks(campaignId);
  const bajar = useInstantiateNpc(campaignId);
  const [texto, setTexto] = useState("");
  const [elegido, setElegido] = useState<PlantillaConVisibilidad | null>(null);
  const [nombre, setNombre] = useState(entity.name);
  const [cuantos, setCuantos] = useState(1);

  const plantillas = useMemo<PlantillaConVisibilidad[]>(() => {
    // De la campaña primero: son las que el DM más probablemente busca para su propia ficha.
    const todas: PlantillaConVisibilidad[] = [...(data?.campaign ?? []), ...(data?.srd ?? [])];
    const q = texto.trim().toLowerCase();
    return q ? todas.filter((s) => s.name.toLowerCase().includes(q)) : todas;
  }, [data, texto]);

  const onBajar = () => {
    if (!elegido) return;
    bajar.mutate(
      {
        ref: elegido.ref,
        count: cuantos,
        hp: "AVERAGE",
        name: nombre.trim() || undefined,
        entityId: entity.id,
      },
      {
        onSuccess: (npcs) => {
          const quien = npcs.length === 1 ? npcs[0].name : entity.name;
          onExito(`${quien} está en la mesa. Solo lo ves tú hasta que lo reveles.`);
        },
      },
    );
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="A la mesa"
      subtitulo="Elige la plantilla; el cuerpo nace enlazado con esta ficha y solo lo ves tú."
      acciones={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          {/* Mismo rótulo que en el bestiario: es el mismo gesto, y los e2e que ya lo buscan no
              tienen por qué distinguir de dónde salió el diálogo. */}
          <Button
            type="button"
            variant="primary"
            disabled={!elegido || bajar.isPending}
            onClick={onBajar}
          >
            Bajar a la mesa
          </Button>
        </>
      }
    >
      <div className="space-y-s3">
        <input
          type="search"
          aria-label="Buscar una plantilla"
          placeholder="Buscar una plantilla…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className={fieldControlClass}
        />

        <div
          role="radiogroup"
          aria-label="Plantilla"
          className="max-h-64 space-y-1 overflow-y-auto"
        >
          {plantillas.length === 0 ? (
            <p className="font-chrome text-chrome-xs text-muted">Ninguna plantilla coincide.</p>
          ) : (
            plantillas.map((s) => {
              const marcada = elegido?.ref === s.ref;
              return (
                <label
                  key={s.ref}
                  className={[
                    "flex cursor-pointer items-center gap-s2 rounded-radius-sm border px-s2 py-1.5 transition-colors",
                    marcada
                      ? "border-accent bg-[color:var(--accent-tint)]"
                      : "border-transparent hover:bg-surface",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="a-la-mesa-plantilla"
                    checked={marcada}
                    onChange={() => setElegido(s)}
                    className="accent-[var(--accent)]"
                  />
                  <span className="min-w-0 flex-1 truncate font-chrome text-chrome-sm text-text">
                    {s.name}
                  </span>
                  <span className="shrink-0 font-chrome text-chrome-xs text-muted">
                    {NOMBRE_ORIGEN[s.source]}
                  </span>
                  {/* Solo las propias del DM llevan visibilidad — las del SRD no tienen nivel,
                      las ve cualquiera que juegue (mismo comentario que `statblocks.service.ts`). */}
                  {s.visibility ? <Badge visibility={s.visibility} /> : null}
                </label>
              );
            })
          )}
        </div>

        <label className="flex flex-col gap-1">
          <span className="font-chrome text-chrome-xs text-muted">Nombre</span>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={fieldControlClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-chrome text-chrome-xs text-muted">Cuántos</span>
          <input
            type="number"
            min={1}
            max={10}
            value={cuantos}
            onChange={(e) => setCuantos(Number(e.target.value))}
            className="w-16 rounded-radius-sm border border-muted bg-surface px-2 py-1 font-data text-chrome-sm text-text"
          />
        </label>

        {bajar.isError && (
          <p role="alert" className="font-chrome text-chrome-xs text-danger-text">
            {(bajar.error as Error).message}
          </p>
        )}
      </div>
    </Dialog>
  );
}
