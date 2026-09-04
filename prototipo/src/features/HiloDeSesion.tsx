// Estrato: PERMANENTE — el hilo es «el juego». Nunca se sustituye.
// Referencia: Disco Elysium (voces con color y jerarquía) + Discord (campo de
// escritura abajo, marca de «no leído desde aquí»). No copia el gris de Discord.
import { useState } from "react";
import { TiradaIncrustada } from "./TiradaIncrustada";
import { IconPluma } from "../ui/icons";
import type { MensajeHilo } from "../datos-de-ejemplo";

const colorVoz: Record<string, string> = {
  text: "text-text",
  copper: "text-copper-text",
  accent: "text-accent-text",
  danger: "text-danger-text",
};

function Mensaje({ m }: { m: MensajeHilo }) {
  if (m.tipo === "sello") {
    return (
      <div className="my-s3 flex items-center gap-s3" role="separator">
        <span className="h-px flex-1 bg-copper/30" />
        <span className="font-title text-chrome-sm uppercase tracking-widest text-copper-text">
          {m.cuerpo}
        </span>
        <span className="h-px flex-1 bg-copper/30" />
      </div>
    );
  }
  if (m.tipo === "sistema") {
    return (
      <p className="my-s2 font-chrome text-chrome-xs italic text-muted">{m.cuerpo}</p>
    );
  }
  if (m.tipo === "tirada" && m.tirada) {
    return (
      <div>
        <p className="font-chrome text-chrome-sm text-muted">{m.cuerpo}</p>
        <TiradaIncrustada t={m.tirada} />
      </div>
    );
  }
  if (m.tipo === "narracion") {
    // Prosa del mundo, medida cómoda de leer, con capitular de cobre.
    return (
      <p className="capitular my-s2 max-w-[62ch] font-world text-world-base text-copper-text/90">
        {m.cuerpo}
      </p>
    );
  }
  // personaje
  return (
    <p className="my-s1 max-w-[62ch] font-world text-world-base">
      <span className={`font-chrome text-chrome-sm font-semibold ${colorVoz[m.color ?? "text"]}`}>
        {m.autor}
      </span>{" "}
      <span className={colorVoz[m.color ?? "text"]}>{m.cuerpo}</span>
    </p>
  );
}

export function HiloDeSesion({
  mensajes,
  desdeNoLeido,
  puedeEscribir = true,
}: {
  mensajes: MensajeHilo[];
  desdeNoLeido?: string; // id del primer mensaje no leído
  puedeEscribir?: boolean;
}) {
  const [texto, setTexto] = useState("");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-s5 py-s4">
        {mensajes.map((m) => (
          <div key={m.id}>
            {desdeNoLeido === m.id && (
              <div className="my-s3 flex items-center gap-s3" aria-label="No leído desde aquí">
                <span className="h-px flex-1 bg-accent/50" />
                <span className="font-chrome text-chrome-xs uppercase tracking-widest text-accent-text">
                  No leído desde aquí
                </span>
                <span className="h-px flex-1 bg-accent/50" />
              </div>
            )}
            <Mensaje m={m} />
          </div>
        ))}
      </div>
      {puedeEscribir && (
        <form
          className="flex items-end gap-s2 border-t border-muted/20 px-s5 py-s3"
          onSubmit={(e) => {
            e.preventDefault();
            setTexto("");
          }}
        >
          <IconPluma className="mb-s2 size-5 shrink-0 text-copper-text" />
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={1}
            placeholder="Habla, narra o describe lo que haces…"
            className="scroll-quiet max-h-28 min-h-[2.4rem] flex-1 resize-none rounded-radius-sm border border-muted/30 bg-bg px-s3 py-s2 font-world text-world-base text-text placeholder:text-muted/60 focus:border-accent"
          />
          <button
            type="submit"
            disabled={!texto.trim()}
            className="mb-px rounded-radius-sm bg-accent px-s4 py-s2 font-chrome text-chrome-sm text-bg hover:brightness-110 disabled:opacity-40"
          >
            Enviar
          </button>
        </form>
      )}
    </div>
  );
}
