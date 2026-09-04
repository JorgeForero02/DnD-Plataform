// Estrato: PERMANENTE — la columna de retratos. Dos disposiciones (§6):
// jugador (tu personaje delante, los demás en segundo plano, sin botones sobre
// ellos) y DM (la parrilla de todos, con mandos en cada uno).
import { FichaDeElenco } from "./FichaDeElenco";
import { grupo, enemigos, type Personaje } from "../datos-de-ejemplo";

export function ColumnaElenco({
  rol,
  enCombate,
  onAbrir,
  onCondicion,
}: {
  rol: "jugador" | "dm";
  enCombate: boolean;
  onAbrir: (p: Personaje) => void;
  onCondicion: (nombre: string) => void;
}) {
  const yo = grupo.find((p) => p.esYo)!;
  const otros = grupo.filter((p) => !p.esYo);

  if (rol === "jugador") {
    return (
      <div className="scroll-quiet flex h-full flex-col gap-s3 overflow-y-auto pr-s1">
        <div>
          <h3 className="mb-s2 font-chrome text-chrome-xs uppercase tracking-widest text-accent-text">
            Tu personaje
          </h3>
          <FichaDeElenco
            p={{ ...yo, subtitulo: `${yo.clase} · nivel ${yo.nivel}` }}
            variante="yo"
            turnoActual={enCombate}
          />
        </div>
        <div>
          <h3 className="mb-s2 font-chrome text-chrome-xs uppercase tracking-widest text-muted">
            El resto del grupo
          </h3>
          <div className="space-y-s2">
            {otros.map((p) => (
              <FichaDeElenco
                key={p.id}
                p={{ ...p, subtitulo: p.clase }}
                variante="companero"
                onAbrir={() => onAbrir(p)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // DM: parrilla de todos, jugadores y monstruos, con mandos.
  return (
    <div className="scroll-quiet flex h-full flex-col gap-s3 overflow-y-auto pr-s1">
      <div>
        <h3 className="mb-s2 font-chrome text-chrome-xs uppercase tracking-widest text-accent-text">
          Grupo
        </h3>
        <div className="space-y-s2">
          {grupo.map((p) => (
            <FichaDeElenco
              key={p.id}
              p={{ ...p, subtitulo: `${p.jugador} · ${p.clase}` }}
              variante="dm-aliado"
              turnoActual={enCombate && p.esYo}
              onAbrir={() => onAbrir(p)}
              onCondicion={() => onCondicion(p.nombre)}
            />
          ))}
        </div>
      </div>
      {enCombate && (
        <div>
          <h3 className="mb-s2 font-chrome text-chrome-xs uppercase tracking-widest text-danger-text">
            Enemigos
          </h3>
          <div className="space-y-s2">
            {enemigos.map((e) => (
              <FichaDeElenco
                key={e.id}
                p={{ nombre: e.nombre, pv: e.pv, pvMax: e.pvMax, ca: e.ca, estados: e.estados, retrato: e.retrato }}
                variante="dm-enemigo"
                onCondicion={() => onCondicion(e.nombre)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
