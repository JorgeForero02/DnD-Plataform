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
export function MarcoDelTablero({ url }: { url: string }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-col">
      <iframe
        title="Sala del tablero"
        src={url}
        referrerPolicy="no-referrer"
        allow="clipboard-read; clipboard-write"
        className="min-h-0 w-full flex-1 rounded-radius-sm border border-muted bg-surface"
      />
      <p className="mt-s1 font-chrome text-chrome-xs text-muted">
        Cada jugador inicia sesión en el tablero dentro del marco, una vez por navegador.
      </p>
    </div>
  );
}
