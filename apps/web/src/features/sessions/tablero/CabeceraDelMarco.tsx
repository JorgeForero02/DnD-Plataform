import { useAllEntities } from "../../entities/hooks";
import { useGameLog } from "../hooks";
import { lugarDeLaEscena } from "../escena";
import { IconoLugar, IconoAbrirAparte } from "../iconos";

// Task 5 (3A.3) — **la cabecera del marco del tablero**, la tercera pieza que faltaba de las tres
// columnas del prototipo (`task-5-brief.md`, §"marco del tablero con cabecera"): icono de lugar +
// nombre de la escena + «tablero en vivo, abrir aparte».
//
// **Por qué se calcula aquí y no se recibe por prop.** `BandaUnica.tsx` ya deriva el mismo
// `lugarDeLaEscena` para la fila superior (su propio comentario explica el porqué: «se deriva, no
// se guarda»), y aquí se repite el mismo cálculo con las mismas dos consultas
// (`useAllEntities`/`useGameLog`) en vez de subirlo a `MesaDeSesion` y pasarlo por props. Es la
// misma decisión que ya tomó `HerramientasDeNarracion` con `useCampaign` — «comparte clave con
// React Query, así que no es una segunda petición» — TanStack Query deduplica por clave de
// consulta, así que dos componentes pidiendo lo mismo con el mismo `campaignId` comparten una
// sola llamada de red. Subirlo a `MesaDeSesion` ataría este componente a que su padre exacto siga
// pidiendo esos datos, cuando la regla real es «cualquiera que necesite el lugar de la escena lo
// deriva del registro» — la misma regla que ya declaró `escena.ts`.
//
// **Sin lugar revelado, no se inventa uno** (misma regla que `BandaUnica`): la cabecera dice «Sin
// escena revelada» en vez de dejar un hueco o mentir un nombre.

export function CabeceraDelMarco({ campaignId, url }: { campaignId: string; url: string }) {
  const { data: entidades } = useAllEntities(campaignId);
  const { data: log } = useGameLog(campaignId);
  const lugar = lugarDeLaEscena(log?.events ?? [], entidades ?? []);

  return (
    <div className="flex shrink-0 items-center gap-s2 rounded-t-radius-sm border border-b-0 border-muted bg-surface px-s3 py-s2">
      <IconoLugar className="h-4 w-4 shrink-0 text-copper-text" />
      <p className="min-w-0 flex-1 truncate font-chrome text-chrome-sm text-text">
        {lugar?.nombre ?? "Sin escena revelada"}
      </p>
      {/* «Abrir aparte»: la partida entera de PlanarAlly, en su propia pestaña — para quien
          prefiera el tablero a pantalla completa en vez de dentro del marco recortado. */}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex shrink-0 items-center gap-1 font-chrome text-chrome-xs text-copper-text underline-offset-4 hover:underline"
      >
        Tablero en vivo
        <IconoAbrirAparte className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
