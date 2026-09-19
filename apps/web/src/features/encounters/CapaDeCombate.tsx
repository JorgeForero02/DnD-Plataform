import { useState } from "react";
import type { XpPropuesto } from "@dnd/shared";
import { useCurrentEncounter } from "./hooks";
import { TiraDeIniciativa } from "./TiraDeIniciativa";
import { EmpezarCombate } from "./EmpezarCombate";
import type { Character } from "../characters/api";
import type { NpcEnLaMesa } from "../bestiario/api";
import { Button } from "../../ui/Button";
import { DarXp } from "../sessions/dm/DarXp";

/**
 * **El combate, como capa sobre la mesa.**
 *
 * Tres estados, y los tres se ven sin salir de aquí: sin encuentro el DM ve «Entrar en combate» y
 * el jugador no ve nada —no hay combate que anunciar—; con encuentro activo, la tira de
 * iniciativa; y cuando termina, la tira desaparece sola en el siguiente sondeo.
 *
 * **El jugador no ve el botón, y no es esconder un botón:** `EncountersService.start` exige DM.
 * Lo que decide es el servidor; esto solo evita prometer lo que va a rechazar.
 *
 * Y desde la ola de arreglos 1 de la puerta de efectos, **la propuesta de experiencia que
 * sobrevive al fin del combate**. Este componente vivía dentro de `MesaDeSesion.tsx` sin
 * exportarse; se saca aquí por un fallo que la unitaria de la tira no podía ver: la propuesta de
 * XP (E-PE-9) estaba en el `useState` de `TiraDeIniciativa`, pero `useEndEncounter` invalida
 * `current`, el servidor devuelve `null` para un encuentro `ENDED`, y esta capa desmontaba la tira
 * —con su estado— en el siguiente sondeo. El bloque «Repartir los PX» se pintaba y
 * desaparecía antes de que el DM pudiera leerlo. La propuesta tiene que vivir en el componente
 * que sigue montado cuando el encuentro ya no existe, y ese es este.
 */
export function CapaDeCombate({
  campaignId,
  sessionId,
  personajes,
  pnjs,
  esDm,
}: {
  campaignId: string;
  sessionId: string;
  personajes: Character[];
  pnjs: NpcEnLaMesa[];
  esDm: boolean;
}) {
  const { data: encuentro } = useCurrentEncounter(campaignId, sessionId);
  // Lo que `EncountersService.end()` propuso en modo XP (E-PE-9). `null` fuera de ese modo, sin
  // ningún `ENEMY` con statblock, o cuando ya se repartió. Lo rellena la tira al terminar el
  // combate (`onXpPropuesto`) y se retira cuando `DarXp` avisa que ya se dio (`onHecho`).
  const [propuestaXp, setPropuestaXp] = useState<XpPropuesto | null>(null);
  // La frase de confirmación tras repartir («Dados 100 PX a Thora»): sustituye al bloque para
  // que el DM vea que se dio en vez de un formulario que simplemente desapareció.
  const [repartido, setRepartido] = useState<string | null>(null);

  // E-PE-9: la propuesta se pinta con el MISMO `DarXp` que la herramienta «Dar PX», solo que
  // prellenado — el DM confirma o edita, no repite el cálculo. Se pinta con o sin encuentro:
  // normalmente ya no lo hay, porque terminar el combate es lo que la trae. Si el DM cierra la
  // mesa sin darla, se queda escrita en el registro del combate, no perdida — nada aquí impide
  // abrir «Dar PX» más tarde.
  const bloqueDeXp = propuestaXp ? (
    <div className="mx-s3 mt-s3 rounded-radius-md border border-copper bg-surface p-s3">
      <div className="mb-s2 flex items-center gap-s2">
        <h3 className="font-title text-chrome-md text-text">Repartir los PX</h3>
        <span className="h-px flex-1 bg-copper/30" />
        <Button
          type="button"
          variant="ghost"
          className="px-2 py-0.5 text-chrome-xs"
          onClick={() => setPropuestaXp(null)}
        >
          Ahora no
        </Button>
      </div>
      <DarXp
        campaignId={campaignId}
        propuesta={propuestaXp}
        // Menor 5 del barrido PE-1: `XpPropuesto` no lleva `encounterId` (no es del combate, es
        // del reparto), así que la clave sale de a quién y cuánto propone — dos combates
        // seguidos casi nunca proponen los mismos destinatarios con el mismo total, y con eso
        // basta para que React monte un `DarXp` nuevo y no arrastre la elección o la cantidad
        // del formulario anterior.
        key={`${propuestaXp.total}:${propuestaXp.destinatarios.map((d) => d.characterId).join(",")}`}
        onHecho={(resumen) => {
          setPropuestaXp(null);
          setRepartido(resumen);
        }}
      />
    </div>
  ) : repartido ? (
    <p
      role="status"
      className="mx-s3 mt-s3 flex items-center gap-s2 rounded-radius-sm border border-copper/40 bg-copper/10 px-s3 py-s1 font-chrome text-chrome-xs text-copper-text"
    >
      <span className="flex-1">{repartido}</span>
      <button
        type="button"
        onClick={() => setRepartido(null)}
        className="font-chrome text-chrome-xs underline-offset-2 hover:underline"
      >
        Cerrar
      </button>
    </p>
  ) : null;

  if (encuentro) {
    return (
      <>
        <TiraDeIniciativa
          campaignId={campaignId}
          sessionId={sessionId}
          encuentro={encuentro}
          personajes={personajes}
          pnjs={pnjs}
          esDm={esDm}
          onXpPropuesto={setPropuestaXp}
        />
        {bloqueDeXp}
      </>
    );
  }
  if (!esDm) return null;
  return (
    <>
      {/* D-CF-149 — la misma franja del prototipo, en reposo: «La mesa no está en combate.»
          seguido del gesto de entrar, a lo ancho y sin caja, entre la banda y el `main`. */}
      <div className="flex min-h-[2.75rem] items-center gap-s3 border-b border-muted/40 bg-surface/50 px-s4 py-s2">
        <span className="font-chrome text-chrome-sm text-muted">La mesa no está en combate.</span>
        <EmpezarCombate
          campaignId={campaignId}
          sessionId={sessionId}
          personajes={personajes}
          pnjs={pnjs}
        />
      </div>
      {bloqueDeXp}
    </>
  );
}
