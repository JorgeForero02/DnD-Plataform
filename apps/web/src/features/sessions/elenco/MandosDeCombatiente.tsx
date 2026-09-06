import { useId, useState } from "react";
import type { DamageType } from "@dnd/shared";
import { HojaCalculada } from "../../character-sheet/HojaCalculada";
import { SelectorDeTipoDeDano } from "../../character-sheet/AplicarDano";
import { IconoCorazon, IconoEspada, IconoOjo } from "../../../ui/Iconos";
import { Dialog } from "../../../ui/Dialog";
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
 */
export function MandosDeCombatiente({
  campaignId,
  characterId,
  nombre,
  enCombate,
}: {
  campaignId: string;
  characterId: string;
  nombre: string;
  /** Con encuentro activo se ofrece la escala de asaltos en «Condición»; sin él, solo el reloj. */
  enCombate: boolean;
}) {
  const [panel, setPanel] = useState<"dano" | "curar" | "condicion" | "hoja" | null>(null);
  // **El tipo de daño vive aquí y no dentro del cajón**, porque el cajón se desmonta con el
  // `Dialog` cerrado y lo que hace falta es poder LIMPIARLO al cerrar: el estado que sobrevive a
  // un cierre es exactamente el que hizo que la hoja mandara una causa falsa (ver `PonerDano`).
  const [tipoDeDano, setTipoDeDano] = useState<DamageType | "">("");
  const idTipoDeDano = useId();

  return (
    <>
      <div className="mt-s2 flex items-center gap-s1">
        <button
          type="button"
          onClick={() => setPanel("dano")}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-radius-sm border border-danger px-1 py-1 font-chrome text-chrome-xs text-danger-text hover:bg-[color:var(--danger-tint)]"
        >
          <IconoEspada className="h-3.5 w-3.5" />
          Daño
          <span className="sr-only"> a {nombre}</span>
        </button>
        <button
          type="button"
          onClick={() => setPanel("curar")}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-radius-sm border border-accent px-1 py-1 font-chrome text-chrome-xs text-accent-text hover:bg-[color:var(--accent-tint)]"
        >
          <IconoCorazon className="h-3.5 w-3.5" />
          Curar
          <span className="sr-only"> a {nombre}</span>
        </button>
        <button
          type="button"
          onClick={() => setPanel("condicion")}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-radius-sm border border-warning px-1 py-1 font-chrome text-chrome-xs text-warning-text hover:bg-[color:var(--warning-tint)]"
        >
          Condición
          <span className="sr-only"> a {nombre}</span>
        </button>
        <button
          type="button"
          onClick={() => setPanel("hoja")}
          aria-label={`Abrir la ficha de ${nombre}`}
          className="rounded-radius-sm border border-muted p-1 text-muted hover:text-text"
        >
          <IconoOjo className="h-4 w-4" />
        </button>
      </div>

      {/* Los tres cajones del mando. **Uno a la vez**, como el estrato superpuesto del reseño:
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
      <Dialog
        open={panel === "hoja"}
        onClose={() => setPanel(null)}
        title={nombre}
        subtitulo="Su hoja, sin salir de la mesa."
        size="xl"
      >
        {panel === "hoja" && (
          <HojaCalculada campaignId={campaignId} characterId={characterId} puedeEditar />
        )}
      </Dialog>
    </>
  );
}
