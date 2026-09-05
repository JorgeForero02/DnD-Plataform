import { IconoBuscar, IconoElenco, IconoMochila } from "./iconos";
import { IconoD20 } from "../../ui/Iconos";

// B1.3 — **el estrato SUPERPUESTO, y su puerta.**
//
// El reseño de la mesa (§4) reparte la pantalla en tres estratos, y el argumento sale del mapa de
// teclas de Baldur's Gate 3: diez paneles tienen tecla de alternar y los retratos y la barra de
// acciones **no tienen ninguna**. Un panel tiene tecla **porque se quita**; los otros no la tienen
// **porque nunca se quitan**.
//
// Este rail es lo permanente que abre lo que se quita. Tres reglas que lo gobiernan:
//
//  1. **Uno a la vez.** Abrir la bolsa cierra la hoja. Dos paneles superpuestos son dos sitios
//     donde estar, y el defecto que todo esto corrige era precisamente no tener un sitio donde
//     estar.
//  2. **Escape cierra y vuelves donde estabas.** Lo da `ui/Dialog`, que ya atrapa el foco y lo
//     devuelve al control que lo abrió.
//  3. **El objeto en pantalla Y la tecla, nunca solo la tecla.** La maqueta escribe el acelerador
//     debajo del rótulo, y aquí se hace igual: quien no sepa que existe llega igual pulsando.
//
// **Lo que sustituye.** «Consulta del mundo» era una tercera columna fija de la mesa que se
// llevaba un cuarto del ancho para una búsqueda que se usa a ráfagas. De columna a panel: el ancho
// vuelve al hilo, que es donde pasa la partida.

export type PanelAbierto = "hoja" | "bolsa" | "mundo" | "dados";

// **«Dados» es la cuarta, y su acelerador es el único inventado.** La maqueta escribe tres
// —`N` hoja, `I` bolsa, `M` mundo— y **no da ninguno para los dados**, porque en ella el panel
// de dados no se abre desde el rail: aparece solo cuando hay que tirar. Aquí sí hace falta una
// puerta mientras no exista quien lo levante por su cuenta, así que se le pone la `D` que nadie
// más usa. Declarado en el informe del ensamblado; si el autor prefiere otra, es esta línea.
const TECLAS: Record<PanelAbierto, string> = { hoja: "N", bolsa: "I", mundo: "M", dados: "D" };

function Boton({
  panel,
  etiqueta,
  icono,
  onAbrir,
  disabled,
  motivo,
}: {
  panel: PanelAbierto;
  etiqueta: string;
  icono: React.ReactNode;
  onAbrir: (p: PanelAbierto) => void;
  disabled?: boolean;
  motivo?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onAbrir(panel)}
      disabled={disabled}
      // **El motivo va en el título cuando está apagado.** Un control deshabilitado sin
      // explicación es la peor versión de decir que no: la persona no sabe si le falta un
      // permiso, un dato o un clic en otro sitio.
      title={disabled ? motivo : etiqueta}
      className={[
        "flex w-20 flex-col items-center gap-s1 rounded-radius-sm border px-s1 py-s2 transition-colors",
        disabled
          ? "cursor-not-allowed border-muted/30 text-muted/50"
          : "border-muted bg-bg text-muted hover:border-accent hover:text-accent-text",
      ].join(" ")}
    >
      <span className="[&>svg]:h-5 [&>svg]:w-5">{icono}</span>
      <span className="font-chrome text-chrome-xs leading-none">{etiqueta}</span>
      <span className="font-data text-chrome-xs text-muted">{TECLAS[panel]}</span>
    </button>
  );
}

export function RailDePaneles({
  onAbrir,
  tienePersonaje,
}: {
  onAbrir: (p: PanelAbierto) => void;
  /** Sin personaje en la mesa no hay hoja ni bolsa que abrir — el DM, o quien mira. */
  tienePersonaje: boolean;
}) {
  return (
    <nav
      aria-label="Paneles de la mesa"
      className="flex items-stretch gap-s2 rounded-radius-md border border-copper bg-surface p-s2"
    >
      <Boton
        panel="hoja"
        etiqueta="Hoja"
        icono={<IconoElenco />}
        onAbrir={onAbrir}
        disabled={!tienePersonaje}
        motivo="No llevas ningún personaje en esta mesa"
      />
      <Boton
        panel="bolsa"
        etiqueta="Bolsa"
        icono={<IconoMochila />}
        onAbrir={onAbrir}
        disabled={!tienePersonaje}
        motivo="No llevas ningún personaje en esta mesa"
      />
      <Boton panel="mundo" etiqueta="Mundo" icono={<IconoBuscar />} onAbrir={onAbrir} />
      {/* **Los dados no son un superpuesto**: el panel va anclado abajo a `z-30` y CONVIVE con
          los cajones (`z-40`), así que se puede tener la hoja abierta y tirar. El rail solo lo
          levanta; quien lo coloca es el compositor, fuera del `<main>`. */}
      <Boton panel="dados" etiqueta="Dados" icono={<IconoD20 />} onAbrir={onAbrir} />
    </nav>
  );
}
