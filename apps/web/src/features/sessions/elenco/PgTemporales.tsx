import { Dialog } from "../../../ui/Dialog";
import { DarTemporales } from "../../bestiario/DarTemporales";

/**
 * **«PG temporales…», en el menú «Más acciones» de un combatiente** (tarea 9 del plan
 * 2026-09-19).
 *
 * Vivía como control suelto en la lista «En la mesa» del bestiario (`PanelDeBestiario`), a un
 * lado del nombre del PNJ — el único gesto de esa lista que no pasaba por `MandosDeCombatiente`,
 * que es donde viven «Daño», «Curar» y el resto de mandos de un combatiente. Y era solo de PNJ,
 * cuando el formulario (`DarTemporales`) nunca lo fue: recibe cualquier `characterId`, así que un
 * personaje de jugador podía llevar PG temporales y no tenía por dónde dárselos.
 *
 * Este componente no repite el formulario — `DarTemporales` ya hace la pregunta del SRD (no se
 * suman, se elige cuál de los dos montones se queda) — solo le da un cajón propio, con el mismo
 * patrón que `PonerDano`/`Curar`/`PonerCondicion`.
 */
export function PgTemporales({
  campaignId,
  characterId,
  nombre,
  abierto,
  onCerrar,
}: {
  campaignId: string;
  characterId: string;
  nombre: string;
  abierto: boolean;
  onCerrar: () => void;
}) {
  return (
    <Dialog
      open={abierto}
      onClose={onCerrar}
      title={`PG temporales · ${nombre}`}
      subtitulo="No se suman a los que ya tiene: el SRD pide elegir cuál de los dos montones se queda."
      size="sm"
    >
      <DarTemporales campaignId={campaignId} characterId={characterId} nombre={nombre} />
    </Dialog>
  );
}
