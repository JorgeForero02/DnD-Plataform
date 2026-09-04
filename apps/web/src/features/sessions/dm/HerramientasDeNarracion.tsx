import { useState } from "react";
import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { Dialog } from "../../../ui/Dialog";
import { IconoBuscar } from "../iconos";
import { IconoMegafono, IconoRayo, IconoReloj } from "./iconos";
import { DadoDibujado } from "../../rolls/DadoDibujado";
import { IconoBestiario } from "../../bestiario/iconos";
import { IconoTabla } from "../../dm-tables/iconos";
import { RevelarAlgo } from "./RevelarAlgo";
import { ReglasEnLaMesa } from "./ReglasEnLaMesa";
import { PedirTirada } from "../../roll-requests/PedirTirada";
import { RelojDeCampana } from "../../game-clock/RelojDeCampana";
import { PanelDeBestiario } from "../../bestiario/PanelDeBestiario";
import { PanelDeTablas } from "../../dm-tables/PanelDeTablas";

// **La columna del DM: las SEIS herramientas de narración, y las seis hacen algo.**
//
// La auditoría del 2026-09-04 lo midió: de las seis de la maqueta
// (`prototipo/src/features/HerramientasDeNarracion.tsx:19-46`) en la mesa había **dos**, y
// «Revelar» era *texto de ayuda sin botón*. Pedir una tirada, avanzar el reloj, sacar una
// criatura, los bloques de reglas y las tablas exigían **irse de la mesa** a otra pestaña, que en
// mitad de una partida quiere decir perder el sitio donde estabas.
//
// ## La rejilla es la de la maqueta; el cableado es el del servidor
//
// Ninguna de las seis abre una pantalla nueva: **cada una monta lo que ya existía**, dentro de un
// cajón lateral. Ese es el trabajo de la sustitución —la maqueta es presentación sin datos, así
// que lo que falta es enchufarla a la columna de datos que se conserva—, y por eso aquí no hay ni
// una llamada HTTP ni una regla de juego.
//
// | Herramienta | Qué monta | De quién es |
// |---|---|---|
// | Revelar algo | `RevelarAlgo` | `features/entities` |
// | Pedir tirada | `PedirTirada` | `features/roll-requests` |
// | Avanzar el reloj | `RelojDeCampana` | `features/game-clock` |
// | Sacar criatura | `PanelDeBestiario` | `features/bestiario` |
// | Bloques de reglas | `ReglasEnLaMesa` (lectura) | `features/rules` |
// | Tablas | `PanelDeTablas` | `features/dm-tables` |
//
// **La única que no se cablea entera es «Bloques de reglas», y la razón está en `ReglasEnLaMesa`
// con su fecha de caducidad puesta.** En dos líneas: hay una medición que dice que el editor de
// reglas no arrastra dentro de un superpuesto, **pero esa medición es contra el `Dialog` viejo**
// —el cuadro centrado de `max-h-[85vh]`— y la Ola 0 lo convirtió en un cajón de altura completa,
// que es justo la variable que aquella medición culpaba. **Está pendiente de remedir en el
// navegador**, y lo hace el ensamblado. Mientras el dato no se rehaga no se monta el editor aquí:
// montar sobre una premisa caducada y montar sobre una premisa desmentida se parecen demasiado.
// Lo que sí se monta —qué reglas están escuchando ahora mismo, leídas en voz alta— vale por sí
// solo y no depende de cómo salga la medición.
//
// ## Uno a la vez
//
// Los cajones son el estrato superpuesto: `z-40` (por encima del panel de dados, que va a
// `z-30`), mutuamente excluyentes, Escape cierra y el foco vuelve al botón que lo abrió. Un solo
// `useState` lo garantiza por construcción: no hay forma de que dos queden abiertos.
//
// ## Y el servidor sigue decidiendo
//
// Esta columna solo se pinta para el DM, y eso **no es control de acceso**: `requireDM` responde
// 403 en `roll-requests`, `rules-engine`, `game-clock` y `dm-tables` a quien no dirija. Lo único
// que se evita aquí es ofrecer un botón que el servidor va a rechazar.

/** La frase de la maqueta, literal. No se parafrasea: es voz del producto. */
export const FRASE_DEL_DM =
  "El sistema propone; tú decides. Nada llega a la mesa hasta que lo confirmas.";

/** Cuál de los seis cajones está abierto. `null` es «ninguno», que es el estado normal. */
type HerramientaAbierta = "revelar" | "tirada" | "reloj" | "criatura" | "reglas" | "tablas";

/**
 * Los cuatro tonos de la maqueta (`copper`, `accent`, `fantasma`, `danger`) sobre el botón de
 * esta casa.
 *
 * `ui/Button` tiene cuatro variantes y **ninguna es de cobre**, así que el mosaico se dibuja aquí
 * con los tokens que ya existen, en vez de añadirle una variante a una primitiva que usa media
 * aplicación y que además es de otro carril. Es maquetación local a esta rejilla y **la capa
 * visual la absorberá** cuando `ui/Button` tenga su variante de cobre.
 */
const TONOS = {
  copper: "border-copper text-copper-text hover:border-accent hover:text-accent-text",
  accent: "border-accent text-accent-text hover:brightness-110",
  fantasma: "border-muted text-text hover:border-accent hover:text-accent-text",
  danger: "border-danger text-danger-text hover:brightness-110",
} as const;

function BotonDeHerramienta({
  icono,
  tono,
  onClick,
  children,
}: {
  icono: ReactNode;
  tono: keyof typeof TONOS;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex min-w-0 items-start gap-s1 rounded-radius-sm border bg-bg px-s2 py-s2 text-left font-chrome text-chrome-xs leading-snug transition-colors",
        TONOS[tono],
      ].join(" ")}
    >
      <span className="mt-px shrink-0">{icono}</span>
      <span className="min-w-0">{children}</span>
    </button>
  );
}

export function HerramientasDeNarracion({
  campaignId,
  onConsultarElMundo,
}: {
  /**
   * De qué campaña son estas herramientas.
   *
   * **Es opcional solo por hoy.** Las seis piezas que se montan aquí lo necesitan, y quien lo
   * sabe de verdad es el compositor (`MesaDeSesion`), que ya lo recibe de la ruta. Mientras no lo
   * pase, se lee del propio camino —`/campaigns/:id/...`, que es de donde sale el suyo—, y así
   * esta columna funciona sin obligar a tocar un fichero que no es de este carril. **En cuanto el
   * compositor lo pase, este parámetro pasa a obligatorio y el respaldo de abajo se borra.**
   */
  campaignId?: string;
  /**
   * Abre el códice del mundo. **Lo monta el compositor, no esta columna**: `ConsultaDelMundo` va
   * en UN solo sitio —el cajón del rail—, y montarla también aquí pintaría dos buscadores del
   * mismo mundo (una prueba de esta casa lo cazó al primer intento). Es opcional: si el
   * compositor deja de pasarlo, el atajo desaparece y no pasa nada más.
   */
  onConsultarElMundo?: () => void;
}) {
  const { id } = useParams<{ id: string }>();
  const campana = campaignId ?? id;
  const [abierta, setAbierta] = useState<HerramientaAbierta | null>(null);
  const cerrar = () => setAbierta(null);

  // Sin campaña no hay herramientas: ni siquiera se pinta el título. No puede pasar en la mesa
  // —la ruta siempre trae el identificador— y el respaldo desaparece en cuanto el compositor
  // pase `campaignId`; hasta entonces, esto es lo que impide que el compilador se lo trague.
  if (!campana) return null;

  return (
    // `gap-s4`, que es lo que la §5 de la auditoría fija literalmente para las herramientas del
    // DM (`flex min-h-0 flex-col gap-s4 overflow-y-auto scroll-quiet`). El scroll y el
    // `overflow-y-auto` los pone el compositor en su `aside`; aquí va el ritmo vertical.
    <div className="flex min-h-0 flex-col gap-s4">
      <h2 className="flex shrink-0 items-center gap-s2 font-title text-chrome-md text-text">
        Herramientas del DM
        <span aria-hidden="true" className="h-px flex-1 bg-copper/40" />
      </h2>

      {/* La rejilla de la maqueta, con sus seis en el mismo orden y con sus mismos tonos. */}
      <div className="grid shrink-0 grid-cols-2 gap-s2">
        <BotonDeHerramienta
          tono="copper"
          icono={<IconoMegafono className="h-4 w-4" />}
          onClick={() => setAbierta("revelar")}
        >
          Revelar algo
        </BotonDeHerramienta>
        <BotonDeHerramienta
          tono="accent"
          icono={<DadoDibujado className="text-chrome-base" />}
          onClick={() => setAbierta("tirada")}
        >
          Pedir tirada
        </BotonDeHerramienta>
        <BotonDeHerramienta
          tono="fantasma"
          icono={<IconoReloj className="h-4 w-4" />}
          onClick={() => setAbierta("reloj")}
        >
          Avanzar el reloj
        </BotonDeHerramienta>
        <BotonDeHerramienta
          tono="danger"
          icono={<IconoBestiario className="h-4 w-4" />}
          onClick={() => setAbierta("criatura")}
        >
          Sacar criatura
        </BotonDeHerramienta>
        <BotonDeHerramienta
          tono="fantasma"
          icono={<IconoRayo className="h-4 w-4" />}
          onClick={() => setAbierta("reglas")}
        >
          Bloques de reglas
        </BotonDeHerramienta>
        <BotonDeHerramienta
          tono="fantasma"
          icono={<IconoTabla className="h-4 w-4" />}
          onClick={() => setAbierta("tablas")}
        >
          Tablas
        </BotonDeHerramienta>
      </div>

      <p className="shrink-0 font-chrome text-chrome-xs leading-snug text-muted">{FRASE_DEL_DM}</p>

      {/* **«Consultar el mundo» baja de categoría a propósito, y queda declarado.**
          Hasta hoy era el único control de esta columna, y por eso iba como botón con borde de
          cobre. Ya no lo es: al lado de las seis herramientas de la maqueta, un séptimo botón del
          mismo peso competiría con ellas, y además **no está en la maqueta** — su columna del DM
          no tiene ningún acceso al mundo. Se queda como pie discreto porque el acceso de verdad
          es el rail, donde vive con su atajo `M`; esto es solo un atajo para la mano que ya está
          aquí. Si se prefiere el botón de antes, se devuelve cambiando estas clases; si se
          prefiere que no exista, basta con dejar de pasar `onConsultarElMundo`. */}
      {onConsultarElMundo && (
        <button
          type="button"
          onClick={onConsultarElMundo}
          className="flex shrink-0 items-center gap-s2 border-t border-muted pt-s2 text-left font-chrome text-chrome-xs text-muted transition-colors hover:text-accent-text"
        >
          <IconoBuscar className="h-4 w-4 shrink-0 text-copper-text" />
          Consultar el mundo
        </button>
      )}

      <Dialog
        open={abierta === "revelar"}
        onClose={cerrar}
        title="Revelar algo"
        subtitulo="Lo que la mesa todavía no ve."
        size="lg"
      >
        <RevelarAlgo campaignId={campana} />
      </Dialog>

      <Dialog
        open={abierta === "tirada"}
        onClose={cerrar}
        title="Pedir una tirada"
        subtitulo="Se pide un valor de la hoja, no una expresión: la compone el servidor."
        size="lg"
      >
        <PedirTirada campaignId={campana} />
      </Dialog>

      <Dialog
        open={abierta === "reloj"}
        onClose={cerrar}
        title="Avanzar el reloj"
        subtitulo="El tiempo de la campaña. Las condiciones vencen contra él, no contra un temporizador de esta pantalla."
        size="lg"
      >
        <RelojDeCampana campaignId={campana} />
      </Dialog>

      <Dialog
        open={abierta === "criatura"}
        onClose={cerrar}
        title="Sacar una criatura"
        subtitulo="Un PNJ en la mesa es una fila de Character: recibe daño y coge condiciones."
        size="xl"
      >
        <PanelDeBestiario campaignId={campana} />
      </Dialog>

      <Dialog
        open={abierta === "reglas"}
        onClose={cerrar}
        title="Bloques de reglas"
        subtitulo="Qué está escuchando el motor ahora mismo."
        size="lg"
      >
        <ReglasEnLaMesa campaignId={campana} />
      </Dialog>

      <Dialog
        open={abierta === "tablas"}
        onClose={cerrar}
        title="Tablas de la casa"
        subtitulo="No son del manual: el SRD no trae tablas de críticos ni de pifias."
        size="xl"
      >
        <PanelDeTablas campaignId={campana} />
      </Dialog>
    </div>
  );
}
