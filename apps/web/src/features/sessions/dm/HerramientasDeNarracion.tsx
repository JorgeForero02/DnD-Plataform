import { useState } from "react";
import type { ReactNode } from "react";
import { Dialog } from "../../../ui/Dialog";
import { IconoLupa } from "../../../ui/Iconos";
import { IconoD20, IconoMegafono, IconoRayo, IconoReloj } from "../../../ui/Iconos";
import { IconoBestiario } from "../../bestiario/iconos";
import { IconoTabla } from "../../dm-tables/iconos";
import { RevelarAlgo } from "./RevelarAlgo";
import { ReglasEnLaMesa } from "./ReglasEnLaMesa";
import { PedirTirada } from "../../roll-requests/PedirTirada";
import { RelojDeCampana } from "../../game-clock/RelojDeCampana";
import { PanelDeBestiario } from "../../bestiario/PanelDeBestiario";
import { PanelDeTablas } from "../../dm-tables/PanelDeTablas";
import { DarXp } from "./DarXp";
import { IconoAscenso } from "../../level-up/IconoAscenso";
import { useCampaign } from "../../campaigns/hooks";
import { reglasCompletas } from "../../campaigns/reglas";

// **La columna del DM: las SEIS herramientas de narración de la maqueta —y las seis hacen algo—,
// más la séptima («Dar PX») que solo aparece cuando la mesa progresa por experiencia (E-PE-8).**
//
// La auditoría del 2026-09-04 lo midió: de las seis de la maqueta
// (`prototipo/src/features/HerramientasDeNarracion.tsx:19-46`) en la mesa había **dos**, y
// «Revelar» era *texto de ayuda sin botón*. Pedir una tirada, avanzar el reloj, sacar una
// criatura, los bloques de reglas y las tablas exigían **irse de la mesa** a otra pestaña, que en
// mitad de una partida quiere decir perder el sitio donde estabas.
//
// ## La rejilla es la de la maqueta; el cableado es el del servidor
//
// Ninguna de las siete abre una pantalla nueva: **cada una monta lo que ya existía**, dentro de un
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
// **«Bloques de reglas» sigue montando lectura y no el editor, pero ya NO por falta de datos.**
//
// La medición se rehizo el **2026-09-06** (plan 14, punto 14.1,
// `apps/web/e2e/arrastre-dentro-del-cajon.spec.ts`) y el resultado es que **`dragstart` SÍ llega
// dentro del cajón**: el diagnóstico viejo era cierto contra el `Dialog` de entonces —cuadro
// centrado de `max-h-[85vh]`— y la Ola 0 lo convirtió en cajón de altura completa, que era justo la
// variable que culpaba. La ficha R1 está cerrada.
//
// Así que la premisa que impedía montar el editor aquí **ya no existe**, y lo que queda es una
// decisión de pantalla, no de datos: **qué quiere el DM en mitad de la mesa**. Lo que se monta
// —qué reglas están escuchando ahora mismo, leídas en voz alta— es lo que se consulta en juego;
// escribir una regla nueva es preparación, y para eso está su pestaña con la pantalla entera.
// Montarlo aquí es posible desde hoy, y es una tanda con su ficha, no una línea en esta.
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

/**
 * Cuál de los cajones está abierto. `null` es «ninguno», que es el estado normal.
 *
 * `"xp"` se suma en la Puerta de efectos §5 bis (E-PE-8): la séptima herramienta, «Dar PX», solo
 * se ofrece con la mesa en modo `XP` (D-CF-53) — en `HITO` la hoja no cuenta experiencia y el
 * botón no tendría nada que hacer.
 */
type HerramientaAbierta = "revelar" | "tirada" | "reloj" | "criatura" | "reglas" | "tablas" | "xp";

/**
 * D-CF-149 (Task 5b de 3A.3) — **un solo tono, el del prototipo** (`.herr-rejilla button`): borde
 * apagado, icono en cobre, texto pequeño, y el cobre en el borde al pasar el ratón. Hasta aquí
 * cada botón llevaba uno de los cuatro tonos de la maqueta de Figma (`copper`, `accent`,
 * `fantasma`, `danger`); el HTML de la mesa los iguala, y la mesa se ve como el HTML.
 */
function BotonDeHerramienta({
  icono,
  onClick,
  children,
}: {
  icono: ReactNode;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[2rem] min-w-0 items-center gap-s1 rounded-radius-sm border border-muted/40 px-s2 py-s1 text-left font-chrome text-chrome-xs leading-tight text-text transition-colors hover:border-copper hover:bg-muted/10"
    >
      <span className="shrink-0 text-copper-text [&>svg]:h-3.5 [&>svg]:w-3.5">{icono}</span>
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
   * **Obligatorio desde el ensamblado.** Nació opcional, con un respaldo que lo leía de
   * `useParams()` para no obligar a tocar el compositor mientras el carril trabajaba solo. El
   * compositor ya lo pasa, así que el respaldo se ha borrado: dos formas de averiguar de qué
   * campaña se habla son **dos fuentes de verdad para el mismo identificador**, y la que se lee
   * del camino deja de valer en cuanto esta columna se monte desde una ruta con otra forma.
   */
  campaignId: string;
  /**
   * Abre el códice del mundo. **Lo monta el compositor, no esta columna**: `ConsultaDelMundo` va
   * en UN solo sitio —el cajón del rail—, y montarla también aquí pintaría dos buscadores del
   * mismo mundo (una prueba de esta casa lo cazó al primer intento). Es opcional: si el
   * compositor deja de pasarlo, el atajo desaparece y no pasa nada más.
   */
  onConsultarElMundo?: () => void;
}) {
  const [abierta, setAbierta] = useState<HerramientaAbierta | null>(null);
  const cerrar = () => setAbierta(null);

  // **De qué progresión juega la mesa.** `useCampaign` es la misma consulta que ya usan
  // `ReglasDeLaMesa`/`CampaignSettings` — comparte clave con React Query, así que no es una
  // segunda petición. `reglasCompletas` rellena los defaults de una respuesta vieja en caché,
  // igual que hace esa pantalla.
  const { data: campana } = useCampaign(campaignId);
  const enModoXp = reglasCompletas(campana?.tableRules).progresion === "XP";

  return (
    // D-CF-149 — la caja de herramientas del prototipo (`.herramientas`): título, la frase
    // «Lo que la mesa todavía no ve.» en cursiva, y la rejilla de dos columnas. «Consultar el
    // mundo» entra en la rejilla como octavo botón —el HTML lo pone ahí— en vez de como pie.
    // El scroll y el `overflow-y-auto` los pone el compositor en su `aside`; aquí va el ritmo.
    <div className="flex min-h-0 flex-col gap-s2">
      <h2 className="shrink-0 font-title text-chrome-md text-text">Herramientas del DM</h2>
      <p className="shrink-0 font-world text-chrome-sm italic text-muted">
        Lo que la mesa todavía no ve.
      </p>

      {/* La rejilla del prototipo, en su mismo orden. */}
      <div className="grid shrink-0 grid-cols-2 gap-s2">
        <BotonDeHerramienta icono={<IconoD20 />} onClick={() => setAbierta("tirada")}>
          Pedir tirada
        </BotonDeHerramienta>
        <BotonDeHerramienta icono={<IconoBestiario />} onClick={() => setAbierta("criatura")}>
          Sacar criatura
        </BotonDeHerramienta>
        <BotonDeHerramienta icono={<IconoMegafono />} onClick={() => setAbierta("revelar")}>
          Revelar algo
        </BotonDeHerramienta>
        <BotonDeHerramienta icono={<IconoReloj />} onClick={() => setAbierta("reloj")}>
          Avanzar el reloj
        </BotonDeHerramienta>
        {/* Séptima herramienta, solo en modo XP (E-PE-8): la rejilla de la maqueta es de seis y
            esta no la sustituye, se suma. */}
        {enModoXp && (
          <BotonDeHerramienta icono={<IconoAscenso />} onClick={() => setAbierta("xp")}>
            Dar PX
          </BotonDeHerramienta>
        )}
        <BotonDeHerramienta icono={<IconoRayo />} onClick={() => setAbierta("reglas")}>
          Bloques de reglas
        </BotonDeHerramienta>
        <BotonDeHerramienta icono={<IconoTabla />} onClick={() => setAbierta("tablas")}>
          Tablas
        </BotonDeHerramienta>
        {/* **«Consultar el mundo» lo monta el compositor, no esta columna**: `ConsultaDelMundo`
            va en UN solo sitio —el cajón del rail, con su atajo `M`— y esto es el atajo del
            prototipo para la mano que ya está aquí. Si el compositor deja de pasarlo, el botón
            desaparece y no pasa nada más. */}
        {onConsultarElMundo && (
          <BotonDeHerramienta icono={<IconoLupa />} onClick={onConsultarElMundo}>
            Consultar el mundo
          </BotonDeHerramienta>
        )}
      </div>

      <p className="shrink-0 font-chrome text-chrome-xs leading-snug text-muted">{FRASE_DEL_DM}</p>

      <Dialog
        open={abierta === "revelar"}
        onClose={cerrar}
        title="Revelar algo"
        subtitulo="Lo que la mesa todavía no ve."
        size="lg"
      >
        <RevelarAlgo campaignId={campaignId} />
      </Dialog>

      <Dialog
        open={abierta === "tirada"}
        onClose={cerrar}
        title="Pedir una tirada"
        subtitulo="Se pide un valor de la hoja, no una expresión: la compone el servidor."
        size="lg"
      >
        <PedirTirada campaignId={campaignId} />
      </Dialog>

      <Dialog
        open={abierta === "reloj"}
        onClose={cerrar}
        title="Avanzar el reloj"
        subtitulo="El tiempo de la campaña. Las condiciones vencen contra él, no contra un temporizador de esta pantalla."
        size="lg"
      >
        <RelojDeCampana campaignId={campaignId} />
      </Dialog>

      <Dialog
        open={abierta === "criatura"}
        onClose={cerrar}
        title="Sacar una criatura"
        subtitulo="Un PNJ en la mesa es una fila de Character: recibe daño y coge condiciones."
        size="xl"
      >
        <PanelDeBestiario campaignId={campaignId} />
      </Dialog>

      <Dialog
        open={abierta === "reglas"}
        onClose={cerrar}
        title="Bloques de reglas"
        subtitulo="Qué está escuchando el motor ahora mismo."
        size="lg"
      >
        <ReglasEnLaMesa campaignId={campaignId} />
      </Dialog>

      <Dialog
        open={abierta === "tablas"}
        onClose={cerrar}
        title="Tablas de la casa"
        subtitulo="No son del manual: el SRD no trae tablas de críticos ni de pifias."
        size="xl"
      >
        <PanelDeTablas campaignId={campaignId} />
      </Dialog>

      <Dialog
        open={abierta === "xp"}
        onClose={cerrar}
        title="Dar PX"
        subtitulo="El servidor no sube el nivel: avisa en la hoja y lo pulsa el DM."
        size="lg"
      >
        {/* **El diálogo no se cierra solo al dar** (ola de arreglos 1): `DarXp` pinta «Dados N PX
            a …» y vacía el formulario, y esa frase es la confirmación que el DM tiene que leer
            antes de cerrar. Cerrarlo en `onHecho` habría sido sustituir una falta de señal por
            otra —el diálogo desaparece y nada dice si se dio o no—; con el formulario vacío, un
            segundo clic ya no puede repetir el reparto. */}
        <DarXp campaignId={campaignId} />
      </Dialog>
    </div>
  );
}
