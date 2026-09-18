import { IconoElenco } from "./iconos";
import { IconoLupa, IconoMochila } from "../../ui/Iconos";
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

// **`PanelAbierto` es «qué cajón está abierto», y los dados NO son un cajón.**
//
// Estuvieron dentro de este tipo durante media hora del ensamblado, y era un error con
// consecuencia medible: con un solo estado, abrir la hoja **cerraba los dados**, y eso vacía de
// sentido el `z-30` del panel de dados frente al `z-40` de los cajones. Esos dos números existen
// en la maqueta precisamente para que se pueda **tirar mirando la hoja**. Así que los dados
// tienen su propio estado en el compositor: los cajones siguen siendo uno a la vez, y el panel
// de dados es otra capa que se abre y se cierra por su cuenta.
export type PanelAbierto = "hoja" | "bolsa" | "mundo";

// Los tres de la maqueta. **La `D` de los dados no está aquí y no es un olvido**: se escribe en
// su propio botón, abajo, porque es la única inventada y conviene que se vea que lo es.
const TECLAS: Record<PanelAbierto, string> = { hoja: "N", bolsa: "I", mundo: "M" };

function Boton({
  etiqueta,
  tecla,
  icono,
  onClick,
  disabled,
  motivo,
  activo,
}: {
  etiqueta: string;
  /** El acelerador que se imprime debajo del rótulo. */
  tecla: string;
  icono: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  motivo?: string;
  /**
   * Solo para lo que se **alterna**. Un cajón no lo lleva: se abre encima y se cierra con
   * Escape, así que el rail no es quien dice si está abierto. El panel de dados sí, porque
   * convive con la pantalla y el mismo botón lo quita.
   */
  activo?: boolean;
}) {
  // D-CF-149 (Task 5b de 3A.3) — el `.rail` del prototipo: una caja con cuatro botones sin
  // borde propio (icono, rótulo y tecla), que se encienden en cobre al pasar; el puesto (los
  // dados) lleva el borde de cobre para que se vea que está abierto sin depender del color solo
  // —`aria-pressed` lo dice también.
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={activo}
      title={disabled ? motivo : etiqueta}
      className={[
        "flex min-h-[2.8rem] flex-1 flex-col items-center gap-px rounded-radius-sm border px-s1 py-s1 transition-colors",
        disabled
          ? "cursor-not-allowed border-transparent text-muted/50"
          : activo
            ? "border-copper/45 bg-muted/10 text-copper-text"
            : "border-transparent text-muted hover:border-copper/45 hover:bg-muted/10 hover:text-copper-text",
      ].join(" ")}
    >
      <span className="[&>svg]:h-[17px] [&>svg]:w-[17px]">{icono}</span>
      <span className="font-chrome text-chrome-xs leading-none">{etiqueta}</span>
      <span className="rounded-radius-sm border border-muted/30 px-1 font-data text-chrome-xs leading-snug text-muted/80">
        {tecla}
      </span>
    </button>
  );
}

export function RailDePaneles({
  onAbrir,
  onAlternarDados,
  dadosPuestos = false,
  tienePersonaje,
}: {
  /** Abre un cajón. Uno a la vez: el compositor guarda un solo `PanelAbierto`. */
  onAbrir: (p: PanelAbierto) => void;
  /** Pone y quita el panel de dados, que **no** es un cajón y no cierra ninguno. */
  onAlternarDados: () => void;
  dadosPuestos?: boolean;
  /** Sin personaje en la mesa no hay hoja ni bolsa que abrir — el DM, o quien mira. */
  tienePersonaje: boolean;
}) {
  return (
    // **El rail mide lo que la columna del elenco, y no lleva caja.**
    //
    // Dos desviaciones de la maqueta que se arrastraban sin declarar y que juntas producían lo
    // que el autor vio: los botones eran `w-20` en vez de `w-16`, y el rail iba envuelto en una
    // superficie con borde de cobre y relleno que la maqueta **no tiene** —allí es un
    // `flex items-stretch gap-s2` pelado—. Entre las dos cosas el rail medía ~370 px contra los
    // 272 de la columna, así que la costura vertical entre elenco e hilo caía en x≈285 y la de
    // esta fila en x≈380: dos líneas que tendrían que ser la misma, separadas 90 px. Y la caja
    // hacía además que el hueco a su derecha se leyera como una banda vacía a lo ancho de la
    // pantalla.
    //
    // Se copia la maqueta —sin caja— y **se fija el ancho al de la columna** en vez de dejar los
    // botones a medida fija: la maqueta se queda a 8 px, y forzándolo las dos costuras coinciden
    // aunque cambie el ancho de la ventana, que es lo que se pidió.
    <nav
      aria-label="Paneles de la mesa"
      className="flex w-[17rem] shrink-0 items-stretch gap-s2 rounded-radius-sm border border-muted bg-surface p-s2"
    >
      <Boton
        etiqueta="Hoja"
        tecla={TECLAS.hoja}
        icono={<IconoElenco />}
        onClick={() => onAbrir("hoja")}
        disabled={!tienePersonaje}
        motivo="No llevas ningún personaje en esta mesa"
      />
      <Boton
        etiqueta="Bolsa"
        tecla={TECLAS.bolsa}
        icono={<IconoMochila className="h-5 w-5" />}
        onClick={() => onAbrir("bolsa")}
        disabled={!tienePersonaje}
        motivo="No llevas ningún personaje en esta mesa"
      />
      <Boton
        etiqueta="Mundo"
        tecla={TECLAS.mundo}
        icono={<IconoLupa className="h-5 w-5" />}
        onClick={() => onAbrir("mundo")}
      />
      {/* **Los dados no son un cajón, y por eso este botón alterna en vez de abrir.** El panel
          va anclado abajo a `z-30` y convive con los cajones (`z-40`): se tira mirando la hoja
          o mirando el mundo, y cerrar un cajón con Escape no se lleva los dados por delante.

          **La `D` es un invento sobre la maqueta, declarado**: allí el panel de dados no se abre
          desde el rail —aparece solo cuando hay que tirar—, así que no tiene tecla que copiar.
          Se le pone la única letra libre para que el cuarto botón no salga sin acelerador al
          lado de tres que sí lo llevan. Ojo: **hoy ninguno de los cuatro está cableado** — no hay
          un solo oyente de teclado en la aplicación—, así que las cuatro letras son una promesa
          pendiente, no solo esta. */}
      <Boton
        etiqueta="Dados"
        tecla="D"
        icono={<IconoD20 />}
        onClick={onAlternarDados}
        activo={dadosPuestos}
      />
    </nav>
  );
}
