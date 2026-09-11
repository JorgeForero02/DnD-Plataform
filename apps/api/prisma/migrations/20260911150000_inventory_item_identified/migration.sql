-- D-CF-15 (migracion 7, tickets I3 / M2B-15): "lo tengo pero no se que es". Vuelve a un objeto
-- por lo que hace el juego con el (Foundry): una fila con un interruptor de identificacion y un
-- alias, en vez del `visibility` compartido que D-2B-8 le habia dado. Nace `true` --identificado--
-- por el mismo motivo que un objeto propio nace visible (`InventoryItem.identified`, comentario
-- del esquema): esconder es un gesto del DM, no el estado de partida.
ALTER TABLE "InventoryItem"
  ADD COLUMN "identified" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "unidentifiedName" TEXT;
