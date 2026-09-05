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
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={activo}
      // **El motivo va en el título cuando está apagado.** Un control deshabilitado sin
      // explicación es la peor versión de decir que no: la persona no sabe si le falta un
      // permiso, un dato o un clic en otro sitio.
      title={disabled ? motivo : etiqueta}
      className={[
        // `flex-1` y no `w-20`: los cuatro se reparten el ancho del rail, que es el de la
        // columna del elenco. La maqueta escribe `w-16` fijo, y con cuatro botones y tres huecos
        // eso da 280 px contra los 272 de la columna — ocho px de desfase que se ven porque las
        // dos costuras están una encima de otra. Repartiendo, coinciden **a cualquier ancho**.
        "flex flex-1 flex-col items-center gap-s1 rounded-radius-sm border px-s1 py-s2 transition-colors",
        disabled
          ? "cursor-not-allowed border-muted/30 text-muted/50"
          : activo
            ? // Encendido: el borde y el texto de acento dicen que ese panel está puesto, y
              // `aria-pressed` lo dice para quien no ve el color. El color no es el único
              // portador.
              "border-accent bg-bg text-accent-text"
            : "border-muted bg-bg text-muted hover:border-accent hover:text-accent-text",
      ].join(" ")}
    >
      <span className="[&>svg]:h-5 [&>svg]:w-5">{icono}</span>
      <span className="font-chrome text-chrome-xs leading-none">{etiqueta}</span>
      <span className="font-data text-chrome-xs text-muted">{tecla}</span>
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
    <nav aria-label="Paneles de la mesa" className="flex w-[17rem] shrink-0 items-stretch gap-s2">
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
        icono={<IconoMochila />}
        onClick={() => onAbrir("bolsa")}
        disabled={!tienePersonaje}
        motivo="No llevas ningún personaje en esta mesa"
      />
      <Boton
        etiqueta="Mundo"
        tecla={TECLAS.mundo}
        icono={<IconoBuscar />}
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
