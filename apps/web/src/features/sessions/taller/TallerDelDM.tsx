// **Ola 0 (2026-09-04): la ranura del taller, todavía vacía por dentro.**
//
// El taller es **lo que ocupa la mesa cuando el DM está en reposo** (§2.1 de la maqueta), no una
// ruta a la que se navega. La auditoría del 2026-09-04 lo puso en su primera línea: *«no hay
// taller»* — el mundo se gestiona hoy con listas y formularios CRUD en `CampaignDetailPage`, y
// `grep -rln "Telarana" apps/web/src` daba **cero**.
//
// Esta ranura existe para que el compositor de la mesa pueda colocarla ya, con su disposición
// `grid-cols-[1.15fr_1fr]`, y el carril del taller la rellene **sin tocar `MesaDeSesion.tsx`**.
// Lo que va dentro, por la izquierda el tablero telaraña —chinchetas en `%` y líneas
// discontinuas de cobre entre fichas enlazadas— y por la derecha tres solapas:
//
//  · **Escribir ficha** — con `[[nombre]]`, visibilidad al escribir, y **dos botones**:
//    «Guardar en el mundo» y «Enseñar a la mesa». La segunda lleva su frase, literal:
//    «Enseñarla aparece como un empujón en la pantalla de los jugadores, no como un cambio de
//    permiso.»
//  · **Preparar sesión** — «La escena abre en», «A mano para revelar» con su botón Revelar por
//    fila, «Criaturas a mano», «Tiradas que pediré».
//  · **Lo que sabe la mesa** — dos columnas, «La mesa lo sabe» / «Sigue oculto», más las marcas y
//    los conjuntos del mundo (que son, literalmente, las cinco rutas de `world-state` que hoy
//    ninguna pantalla llama).

export function TallerDelDM({ campaignId }: { campaignId: string }) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[1.15fr_1fr] gap-s3">
      <section
        aria-label="El mundo, con sus hilos"
        className="scroll-quiet flex min-h-0 min-w-0 flex-col overflow-y-auto rounded-radius-sm border border-muted bg-surface p-s4"
        data-campana={campaignId}
      >
        <h2 className="flex items-center gap-s3 font-title text-chrome-md text-text">
          El mundo, con sus hilos
          <span aria-hidden="true" className="h-px flex-1 bg-copper/40" />
        </h2>
        <p className="mt-s3 font-chrome text-chrome-sm text-muted">
          El tablero de fichas enlazadas entra con su carril. Mientras tanto, el mundo se gestiona
          desde la campaña.
        </p>
      </section>

      <section
        aria-label="Preparar la mesa"
        className="scroll-quiet flex min-h-0 min-w-0 flex-col overflow-y-auto rounded-radius-sm border border-muted bg-surface p-s4"
      >
        <h2 className="flex items-center gap-s3 font-title text-chrome-md text-text">
          Preparar la mesa
          <span aria-hidden="true" className="h-px flex-1 bg-copper/40" />
        </h2>
        <p className="mt-s3 font-chrome text-chrome-sm text-muted">
          Escribir ficha, preparar sesión y lo que sabe la mesa entran con su carril.
        </p>
      </section>
    </div>
  );
}
