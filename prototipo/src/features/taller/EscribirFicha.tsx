// Estrato: PERMANENTE (parte del taller del DM). Escribir una ficha con su
// prosa larga, sus etiquetas y su visibilidad DECIDIDA AL ESCRIBIR, no después.
// No es un formulario de banco: la prosa manda y la ficha se lee como se escribe.
import { useState } from "react";
import { FilterChip } from "../../ui/FilterChip";
import { Button } from "../../ui/Button";
import { BadgeVisibilidad } from "../BadgeVisibilidad";
import { IconMegafono, IconPluma } from "../../ui/icons";
import { etiquetaVisibilidad, type EntradaMundo, type Visibilidad } from "../../datos-de-ejemplo";

const tipos = ["Personaje", "Lugar", "Misión", "Facción", "Objeto", "Suceso", "Documento"] as const;
const visibilidades: Visibilidad[] = ["publico", "jugadores", "dueno", "dm", "concretos"];

export function EscribirFicha({ base }: { base: EntradaMundo | null }) {
  const [tipo, setTipo] = useState<string>(base?.tipo ?? "Personaje");
  const [nombre, setNombre] = useState(base?.nombre ?? "");
  const [cuerpo, setCuerpo] = useState(base?.cuerpo ?? "");
  const [visib, setVisib] = useState<Visibilidad>(base?.visibilidad ?? "dm");

  return (
    <div className="flex h-full flex-col">
      <div className="mb-s3 flex flex-wrap gap-s1">
        {tipos.map((t) => (
          <FilterChip key={t} activo={tipo === t} onClick={() => setTipo(t)}>{t}</FilterChip>
        ))}
      </div>

      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre de la ficha…"
        className="mb-s2 w-full border-b border-copper/30 bg-transparent pb-s2 font-title text-chrome-lg text-text placeholder:text-muted/50 focus:border-copper"
      />

      <textarea
        value={cuerpo}
        onChange={(e) => setCuerpo(e.target.value)}
        placeholder="Escribe aquí la prosa. Puedes usar Markdown y enlazar otras fichas con [[nombre]]."
        className="scroll-quiet min-h-0 flex-1 resize-none rounded-radius-sm border border-muted/25 bg-bg p-s3 font-world text-world-base text-text placeholder:text-muted/50 focus:border-accent"
      />

      {/* La visibilidad se decide al escribir. */}
      <div className="mt-s3">
        <div className="mb-s1 flex items-center gap-s2">
          <span className="font-chrome text-chrome-xs uppercase tracking-wide text-muted">Quién la verá</span>
          <BadgeVisibilidad v={visib} />
        </div>
        <div className="flex flex-wrap gap-s1">
          {visibilidades.map((v) => (
            <FilterChip key={v} activo={visib === v} onClick={() => setVisib(v)}>
              {etiquetaVisibilidad[v]}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="mt-s3 flex items-center gap-s2">
        <Button variante="copper" icono={<IconPluma />} disabled={!nombre.trim()}>
          Guardar en el mundo
        </Button>
        <Button variante="accent" icono={<IconMegafono />} disabled={!nombre.trim()}>
          Enseñar a la mesa
        </Button>
        <span className="font-chrome text-chrome-xs text-muted">
          Enseñarla aparece como un empujón en la pantalla de los jugadores, no como un cambio de permiso.
        </span>
      </div>
    </div>
  );
}
