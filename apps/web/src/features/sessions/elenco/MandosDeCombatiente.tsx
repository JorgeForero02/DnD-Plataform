import { useId, useState } from "react";
import type { DamageType } from "@dnd/shared";
import { HojaCalculada } from "../../character-sheet/HojaCalculada";
import { SelectorDeTipoDeDano } from "../../character-sheet/AplicarDano";
import { IconoAviso, IconoCorazon, IconoEspada, IconoMochila, IconoOjo } from "../../../ui/Iconos";
import { Dialog } from "../../../ui/Dialog";
import { MenuDeAcciones, type AccionDeMenu } from "../../../ui/MenuDeAcciones";
import { DarObjeto } from "./DarObjeto";
import { PonerCondicion } from "./PonerCondicion";
import { Curar, PonerDano } from "./PonerDano";

/**
 * **Los mandos del DM sobre un combatiente** — «Daño», «Curar», «Condición» y el ojo que abre su
 * hoja —, extraídos (ronda de arreglo 1 sobre la tarea 9b, I-3) porque vivían **idénticos, casi
 * literales**, en `FichaDeElenco.tsx` y en `FichaDePnj.tsx`: la fila de botones, el estado
 * de qué cajón está abierto, el `tipoDeDano` que hay que limpiar al cerrar y los cajones en
 * sí. Un personaje de jugador y un PNJ son la misma fila de `Character` por debajo (fase 2D), así
 * que sus mandos son literalmente la misma operación con un `characterId` distinto — no había
 * ninguna razón para que fueran dos copias, y así nacieron las tres copias del vocabulario del
 * tipo de daño que este proyecto cita como escarmiento (`dano.ts`).
 *
 * **«Curar» (tarea 14, 2026-09-06)** es el hermano de «Daño»: mismo cajón, mismo hook
 * (`useChangeHp`), delta con el signo cambiado — ver la nota en `PonerDano.tsx`.
 *
 * **Solo se monta cuando quien llama ya decidió que hay mandos que dar** (`conMandos`/`esDm` en
 * cada ficha): por eso `puedeEditar` en `HojaCalculada` va siempre en `true` — el servidor deja
 * editar a DM o dueño (`requireEditable`), y esta fila nunca aparece salvo en la disposición del
 * DM. Si algún día se montara desde otro sitio, ese valor tiene que venir de quien sepa el rol.
 *
 * **«Dar» (tarea B4, 2026-09-06)** es el quinto mando: el problema medido en el encargo era que
 * dar un objeto exigía abrir la hoja de quien lo recibe, y con cuatro jugadores y un cofre eso
 * eran cuatro pantallas. `DarObjeto` es un componente aparte porque B5 lo reutiliza entero desde
 * el resultado de una tirada de botín, y escribir un segundo habría sido justo la duplicación que
 * ese plan evita.
 *
 * **Arreglo de vuelta 1 — este panel NO es siempre del DM.** La afirmación de que «esta fila
 * nunca aparece salvo en la disposición del DM» era falsa: `FichaDePnj.tsx` la monta también para
 * el jugador dueño de un PNJ cedido (`puedeManejarlo = esDm || pnj.ownerId === miId`), y ese
 * jugador no es el DM. Con `soyDm` fijo en `true`, ese jugador veía «Dar» con todo el elenco como
 * destinatarios y un botón que el servidor le iba a rechazar con 403 — exactamente lo que la
 * regla del proyecto prohíbe («no se le ofrece a un jugador un botón que el servidor va a
 * rechazar»). Por eso `soyDm` ahora es un prop de verdad, que cada ficha pasa con su rol real.
 *
 * **Solo «Daño» y «Curar» quedan como botones visibles** (tarea 8 del pulido, C2: #1 — anexo
 * #1 de la nota de diseño): son las dos acciones que se repiten treinta veces por sesión,
 * `ACCIONES_VISIBLES` de `docs/04-convenciones.md`. «Condición», «Dar…», «Su hoja» y el bando
 * —hasta siete controles en la versión vieja, que se salía de la tarjeta— se pliegan en
 * `ui/MenuDeAcciones.tsx`. El icono del bando no es un mando más de esta ficha: sus ítems
 * (`AccionDeMenu[]`) llegan ya construidos por prop, desde `useAccionesDeBando`
 * (`accionesDeBando.ts`), porque solo `FichaDeElenco`/`FichaDePnj` saben si hay encuentro y bando
 * que corregir.
 */
export function MandosDeCombatiente({
  campaignId,
  characterId,
  nombre,
  enCombate,
  soyDm,
  accionesDeBando = [],
  errorDeBando = null,
  accionesDeMesa = [],
  errorDeMesa = null,
}: {
  campaignId: string;
  characterId: string;
  nombre: string;
  /** Con encuentro activo se ofrece la escala de asaltos en «Condición»; sin él, solo el reloj. */
  enCombate: boolean;
  /**
   * El rol real de quien mira, no una constante. `FichaDeElenco` lo pasa como `esDm`
   * (`conMandos` ya lo es en su único sitio de montaje); `FichaDePnj` lo pasa como su propio
   * `esDm`, que es distinto de `puedeManejarlo` — un jugador con un PNJ cedido maneja el panel
   * sin ser el DM.
   */
  soyDm: boolean;
  /**
   * Los ítems del bando, ya resueltos por `useAccionesDeBando` — vacío cuando no hay encuentro
   * o este combatiente no combate ahora mismo, que es cuando la fila de bando tampoco se
   * pintaba antes de esta tarea.
   */
  accionesDeBando?: AccionDeMenu[];
  /**
   * Lo que dijo el servidor al rechazar un cambio de bando, del mismo `useAccionesDeBando`. La
   * fila vieja lo pintaba con `role="alert"`; el menú se cierra al elegir, así que el aviso va
   * aquí, bajo la fila de mandos, donde sigue a la vista (fix round 3 de la tarea 8).
   */
  errorDeBando?: string | null;
  /**
   * **PNJ del mundo y la mesa (spec §3.2/§3.3)**: «Revelar a la mesa»/«Ocultar»/«Sacar del
   * combate», ya resueltos por `useAccionesDeMesa`. Mismo patrón que `accionesDeBando` — la
   * lista llega vacía cuando no toca (no es DM, no hay `visibility`, no hay combate).
   */
  accionesDeMesa?: AccionDeMenu[];
  /** Lo que dijo el servidor al rechazar revelar/ocultar/sacar, del mismo `useAccionesDeMesa`. */
  errorDeMesa?: string | null;
}) {
  const [panel, setPanel] = useState<"dano" | "curar" | "condicion" | "dar" | "hoja" | null>(null);
  // **El tipo de daño vive aquí y no dentro del cajón**, porque el cajón se desmonta con el
  // `Dialog` cerrado y lo que hace falta es poder LIMPIARLO al cerrar: el estado que sobrevive a
  // un cierre es exactamente el que hizo que la hoja mandara una causa falsa (ver `PonerDano`).
  const [tipoDeDano, setTipoDeDano] = useState<DamageType | "">("");
  const idTipoDeDano = useId();

  return (
    <>
      {/* D-CF-149 (Task 5b de 3A.3) — **la fila de mandos, en pequeño.** El prototipo no dibuja
          mandos en la tarjeta, y el autor pidió conservarlos («los de daño, las opciones del DM
          por personaje…») adaptados a esa forma: tres cuadrados de 1.6 rem al pie —espada,
          corazón, tres puntos— con su palabra en `title` y leída (`sr-only`), con los mismos
          nombres accesibles de siempre («Daño a X», «Curar a X», «Más acciones sobre X»). */}
      <div className="mt-s2 flex items-center gap-s1">
        <button
          type="button"
          onClick={() => setPanel("dano")}
          title={`Daño a ${nombre}`}
          className="grid h-[1.6rem] w-[1.6rem] place-items-center rounded-radius-sm border border-danger/50 text-danger-text transition-colors hover:bg-[color:var(--danger-tint)]"
        >
          <IconoEspada className="h-3.5 w-3.5" />
          <span className="sr-only">Daño a {nombre}</span>
        </button>
        <button
          type="button"
          onClick={() => setPanel("curar")}
          title={`Curar a ${nombre}`}
          className="grid h-[1.6rem] w-[1.6rem] place-items-center rounded-radius-sm border border-accent/50 text-accent-text transition-colors hover:bg-[color:var(--accent-tint)]"
        >
          <IconoCorazon className="h-3.5 w-3.5" />
          <span className="sr-only">Curar a {nombre}</span>
        </button>
        {/* **El resto va al menú** (tarea 8 del pulido): «Condición», «Dar…» y «Su hoja» son
            del mando de este combatiente; `accionesDeMesa` (revelar/ocultar/sacar del combate,
            PNJ del mundo y la mesa §3.2/§3.3) y `accionesDeBando` se añaden al final, en ese
            orden — el mismo orden que llevaba la fila vieja para el bando. */}
        <MenuDeAcciones
          etiqueta={`Más acciones sobre ${nombre}`}
          acciones={[
            {
              id: "condicion",
              rotulo: "Condición",
              icono: <IconoAviso />,
              onSelect: () => setPanel("condicion"),
            },
            { id: "dar", rotulo: "Dar…", icono: <IconoMochila />, onSelect: () => setPanel("dar") },
            {
              id: "hoja",
              rotulo: "Su hoja",
              icono: <IconoOjo />,
              onSelect: () => setPanel("hoja"),
            },
            ...accionesDeMesa,
            ...accionesDeBando,
          ]}
        />
      </div>
      {errorDeMesa && (
        <p role="alert" className="mt-s1 font-chrome text-chrome-xs text-danger-text">
          {errorDeMesa}
        </p>
      )}
      {errorDeBando && (
        <p role="alert" className="mt-s1 font-chrome text-chrome-xs text-danger-text">
          {errorDeBando}
        </p>
      )}

      {/* «Dar…» no reparte NADA para {nombre} en particular — el destinatario se elige dentro,
          entre todo el elenco. Vive controlado desde el menú de arriba: `DarObjeto` no pinta su
          propio disparador porque ya lo hizo el ítem «Dar…». */}
      <DarObjeto
        campaignId={campaignId}
        soyDm={soyDm}
        miPersonajeId={characterId}
        controlado={{ abierto: panel === "dar", onCerrar: () => setPanel(null) }}
      />

      {/* Los cajones del mando. **Uno a la vez**, como el estrato superpuesto del reseño:
          `panel` es un solo estado, así que abrir «Condición» cierra «Daño». */}
      <PonerDano
        campaignId={campaignId}
        characterId={characterId}
        nombre={nombre}
        abierto={panel === "dano"}
        onCerrar={() => {
          setPanel(null);
          // Se limpia con el cierre: si no, el siguiente golpe al mismo personaje saldría «de
          // fuego» porque el anterior lo era, y nadie lo habría vuelto a decir.
          setTipoDeDano("");
        }}
        tipoDeDano={tipoDeDano || undefined}
        // **El selector es el de la hoja, no una copia.** `SelectorDeTipoDeDano` no consulta nada
        // y su vocabulario es el largo de `character-sheet`; escribir aquí un segundo desplegable
        // sería una quinta lista de tipos de daño en la aplicación.
        ranuraTipoDeDano={
          <div className="mt-s3 flex items-center gap-s2">
            <label
              className="font-chrome text-chrome-sm text-text"
              htmlFor={`${idTipoDeDano}-tipo`}
            >
              De qué tipo
            </label>
            <SelectorDeTipoDeDano
              id={`${idTipoDeDano}-tipo`}
              value={tipoDeDano}
              onChange={setTipoDeDano}
            />
          </div>
        }
      />
      <Curar
        campaignId={campaignId}
        characterId={characterId}
        nombre={nombre}
        abierto={panel === "curar"}
        onCerrar={() => setPanel(null)}
      />
      <PonerCondicion
        campaignId={campaignId}
        characterId={characterId}
        nombre={nombre}
        abierto={panel === "condicion"}
        enCombate={enCombate}
        onCerrar={() => setPanel(null)}
      />
      {/* HP-1 (2026-09-12, opción A del autor): el cajón se llama «Su hoja», simétrico con el
          «Tu hoja» del jugador (`MesaDeSesion.tsx`). El nombre y el descriptor los pinta UNA
          vez la `Cabecera` de la hoja en disposición «mesa»; antes el título los repetía. */}
      <Dialog
        open={panel === "hoja"}
        onClose={() => setPanel(null)}
        title="Su hoja"
        subtitulo="Sin salir de la mesa."
        size="xl"
      >
        {panel === "hoja" && (
          <HojaCalculada
            campaignId={campaignId}
            characterId={characterId}
            puedeEditar
            disposicion="mesa"
            esDM={soyDm}
          />
        )}
      </Dialog>
    </>
  );
}
