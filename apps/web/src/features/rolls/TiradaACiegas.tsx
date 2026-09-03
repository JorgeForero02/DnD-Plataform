// Tarea 2C.1 — **la otra mitad de una tirada a ciegas: la pantalla de quien no puede verla.**
//
// El servidor ya no le devuelve el resultado a quien tira a ciegas (`rolls.service.ts`), así que
// aquí no hay nada que esconder: no llega. Lo que hay que hacer es **decirlo**, y decirlo bien.
//
// Un silencio sería el peor resultado posible: quien pulsa «Tirar» y no ve nada supone que la
// petición falló, vuelve a pulsar, y la mesa acaba con tres tiradas donde había una. Es la misma
// regla que gobierna las condiciones que caducan («el jugador ve por qué», no un hueco).
//
// Y **no dice cuánto salió ni si fue bien**: eso es precisamente lo que la tirada a ciegas
// esconde. Dice qué se tiró y quién lo sabe, que es lo que pasa en una mesa real cuando el DM
// tira detrás de su pantalla.

export function TiradaACiegas({ etiqueta, expresion }: { etiqueta: string; expresion: string }) {
  return (
    <div
      role="status"
      data-tirada="a-ciegas"
      className="mt-1 rounded-radius-sm border border-muted bg-surface px-s2 py-1.5 text-left"
    >
      <p className="text-chrome-sm text-text">
        Tirado a ciegas. <span className="text-muted">El DM ve el resultado; tú no.</span>
      </p>
      <p className="mt-0.5 font-data text-chrome-xs text-muted">
        {etiqueta} · {expresion}
      </p>
    </div>
  );
}
