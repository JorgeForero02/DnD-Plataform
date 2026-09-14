import { useDeferredValue, useId, useState } from "react";
import { Badge } from "../../ui/Badge";
import { fieldControlClass } from "../../ui/Field";
import { useEntities } from "./hooks";

// PNJ del mundo y la mesa (spec §3) — **el selector que enlaza un cuerpo con su ficha**.
//
// Se usa en tres sitios (ficha del personaje, al bajar una criatura, y en el propio diálogo «A la
// mesa»), y por eso vive aquí, en `entities/`, y no en ninguno de los tres consumidores.
//
// **Regla de interfaz vinculante**: una opción con significado es un radio con su frase, nunca un
// `<select>` — aquí la opción es «con qué ficha del mundo enlazo este cuerpo», y cada una lleva su
// `Badge` de visibilidad, que es justo lo que un desplegable no puede enseñar sin abrirse.
//
// La búsqueda **no filtra en el cliente**: `q` entra en la clave de consulta de `useEntities`
// (`entities/hooks.ts`) y el servidor busca también dentro del cuerpo de la ficha, no solo en el
// nombre — reimplementar el filtro aquí sería la segunda copia de esa búsqueda.
export function SelectorDeFichaDelMundo({
  campaignId,
  value,
  onChange,
  etiqueta,
}: {
  campaignId: string;
  /** El `entityId` elegido, o `null` para «ninguna». */
  value: string | null;
  onChange: (next: string | null) => void;
  /** El `legend` del `fieldset`. Por defecto, «Ficha del mundo». */
  etiqueta?: string;
}) {
  const [texto, setTexto] = useState("");
  // m7 (ola de cierre, 2026-09-14): sin retardo, cada tecla era una petición al servidor —el
  // resto del proyecto filtra en cliente para listas cortas (`PanelDeBestiario`, `RevelarAlgo`),
  // pero aquí la búsqueda tiene que llegar al servidor (mira dentro del cuerpo de la ficha, no
  // solo el nombre — el comentario de arriba lo dice). `useDeferredValue` deja que React teclee
  // sin esperar a la respuesta y solo lanza la consulta cuando el tecleo se detiene, sin el
  // temporizador a mano de un `setTimeout`.
  const textoDiferido = useDeferredValue(texto);
  const { data } = useEntities(campaignId, "NPC", textoDiferido);
  const fichas = data ?? [];
  const groupId = useId();
  const nombreDeGrupo = `ficha-del-mundo-${groupId}`;

  return (
    <fieldset className="rounded-radius-sm border border-muted p-s3">
      <legend className="px-1 font-chrome text-chrome-sm text-text">
        {etiqueta ?? "Ficha del mundo"}
      </legend>
      <p className="mb-s2 font-chrome text-chrome-xs text-muted">
        Enlaza este cuerpo con su ficha del mundo: revelar uno revela al otro.
      </p>

      <input
        type="search"
        aria-label="Buscar una ficha del mundo"
        placeholder="Buscar una ficha del mundo…"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        className={fieldControlClass}
      />

      <div className="mt-s2 space-y-1">
        <label
          className={[
            "flex cursor-pointer items-center gap-s2 rounded-radius-sm border px-s2 py-1.5 transition-colors",
            value === null
              ? "border-accent bg-[color:var(--accent-tint)]"
              : "border-transparent hover:bg-surface",
          ].join(" ")}
        >
          <input
            type="radio"
            name={nombreDeGrupo}
            value=""
            checked={value === null}
            onChange={() => onChange(null)}
            className="accent-[var(--accent)]"
          />
          <span className="font-chrome text-chrome-sm text-text">Ninguna</span>
        </label>

        {fichas.length === 0 ? (
          <p className="font-chrome text-chrome-xs text-muted">
            No hay fichas de PNJ en el mundo todavía.
          </p>
        ) : (
          fichas.map((ficha) => (
            <label
              key={ficha.id}
              className={[
                "flex cursor-pointer items-center gap-s2 rounded-radius-sm border px-s2 py-1.5 transition-colors",
                value === ficha.id
                  ? "border-accent bg-[color:var(--accent-tint)]"
                  : "border-transparent hover:bg-surface",
              ].join(" ")}
            >
              <input
                type="radio"
                name={nombreDeGrupo}
                value={ficha.id}
                checked={value === ficha.id}
                onChange={() => onChange(ficha.id)}
                className="accent-[var(--accent)]"
              />
              <span className="min-w-0 flex-1 truncate font-chrome text-chrome-sm text-text">
                {ficha.name}
              </span>
              <Badge visibility={ficha.visibility} />
            </label>
          ))
        )}
      </div>
    </fieldset>
  );
}
