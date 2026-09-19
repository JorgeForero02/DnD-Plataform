import { CabeceraDelMarco } from "./CabeceraDelMarco";

// C1 bis — el mapa en el hueco del registro (maqueta del autor, anexo #13). El tablero es
// PlanarAlly autoalojado en tablero.supportive.pro (D-CF-57): medido el 2026-09-12, sin
// X-Frame-Options ni CSP, y con registro + login dentro de un iframe desde otro origen. La URL
// es la de la PARTIDA (`…/game/<nombre>`), que el DM pega en «Sala del tablero»
// (CampaignSettings.tsx).
//
// Sin fichero de aviso propio: PlanarAlly guarda mapas y usuarios en su servidor (spec § 2 ter),
// así que la trampa del particionado por navegador que tenía Legacy no existe aquí. Lo único que
// hace falta decir — que cada jugador entra con su propia cuenta dentro del marco — es una línea
// fija debajo, no un aviso que se cierra y se olvida.
//
// **Task 5 (3A.3) añade la cabecera** (`CabeceraDelMarco`): el icono de lugar, el nombre de la
// escena y «Tablero en vivo, abrir aparte». Va DENTRO de este marco, pegada al borde superior del
// recuadro del propio tablero, no como fila aparte de la rejilla de `MesaDeSesion.tsx` — así lo
// dibuja el prototipo. `campaignId` entra por eso: antes este componente solo necesitaba la URL
// de la sala; ahora también necesita de qué campaña es, para derivar el lugar de la escena.
export function MarcoDelTablero({ campaignId, url }: { campaignId: string; url: string }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-col">
      <CabeceraDelMarco campaignId={campaignId} url={url} />
      <iframe
        title="Sala del tablero"
        src={url}
        referrerPolicy="no-referrer"
        allow="clipboard-read; clipboard-write"
        className="min-h-0 w-full flex-1 rounded-b-radius-sm border border-muted bg-surface"
      />
      <p className="mt-s1 font-chrome text-chrome-xs text-muted">
        Cada jugador inicia sesión en el tablero dentro del marco, una vez por navegador.
      </p>
    </div>
  );
}
