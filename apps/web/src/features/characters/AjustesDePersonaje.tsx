import { useState } from "react";
import type { Visibility } from "@dnd/shared";
import { DeleteButton } from "../../components/DeleteButton";
import { BotonArchivar } from "./BotonArchivar";
import { VisibilityChooser } from "../entities/VisibilityChooser";
import { CHARACTER_VISIBILITIES } from "./niveles";
import { useArchiveCharacter, useDeleteCharacter, useUpdateCharacter } from "./hooks";
import type { Character } from "./api";

// H6 del reseño de interfaz — **un solo camino de edición.**
//
// Hasta aquí había dos: la hoja, que edita en el sitio, y un diálogo («Ajustes y borrado»,
// `CharacterEditor` en modo edición) que volvía a ofrecer el nombre, la raza, la clase, el nivel
// y la historia — todo lo cual ya se toca donde se lee. Lo único que aquel diálogo tenía en
// exclusiva era la **visibilidad**, y eso es lo que se absorbe aquí, más el borrado.
//
// Dos reglas de `docs/04-convenciones.md` mandan sobre este bloque:
//
//  - La visibilidad es **una opción con significado**, así que va en radios visibles a la vez con
//    la frase de cada nivel — nunca en un desplegable. Las frases viven una sola vez, en
//    `features/entities/visibilidad.ts`, y las pinta `VisibilityChooser`; aquí no se reescribe
//    ninguna. Describen lo que hace `canView` en el servidor: **no lo definen**.
//  - Elegir un radio **es** la acción entera, así que se guarda solo. Un rechazo del servidor
//    devuelve el control al valor que este de verdad tiene y explica el motivo **en línea**.
//
// Borrar sigue detrás de un botón con su confirmación: es irreversible y no puede estar a un
// clic de lo que se lee. Y ninguno de los dos controles se esconde a quien no puede usarlo — se
// deshabilita con el motivo a la vista, que es lo que hace el resto de la aplicación. Quien
// manda de verdad es `characters.service.ts`, que exige DM o dueño (`requireEditable`) tanto
// para el `PATCH` como para el `DELETE`.
export function AjustesDePersonaje({
  campaignId,
  character,
  puedeEditar,
  puedeArchivar = false,
  motivo,
  onDeleted,
  onArchived,
}: {
  campaignId: string;
  character: Character;
  puedeEditar: boolean;
  /**
   * Si archivar **aplica** a este personaje, que no es lo mismo que si esta persona puede
   * hacerlo. Archivar es una operación de la lista de personajes jugadores: el servidor devuelve
   * 404 para un PNJ (`characters.service.ts:149`, y no es pereza — el Bestiario no mira
   * `archivedAt`, así que archivar un goblin lo dejaba visible ahí y fuera del archivo), y para
   * uno **ya archivado** el gesto no tiene nada que hacer. Quien monta este panel lo sabe porque
   * sabe de dónde salió la fila; el permiso, en cambio, sigue siendo `puedeEditar`.
   */
  puedeArchivar?: boolean;
  /** Por qué no se puede editar, cuando no se puede. */
  motivo?: string;
  onDeleted: () => void;
  onArchived?: () => void;
}) {
  const actualizar = useUpdateCharacter(campaignId);
  const borrar = useDeleteCharacter(campaignId);
  const archivar = useArchiveCharacter(campaignId);
  // Lo elegido mientras el servidor contesta. `null` = manda lo que dice el servidor.
  const [elegido, setElegido] = useState<Visibility | null>(null);
  const [errorAlGuardar, setErrorAlGuardar] = useState<string | null>(null);
  const [errorAlBorrar, setErrorAlBorrar] = useState<string | null>(null);
  const [errorAlArchivar, setErrorAlArchivar] = useState<string | null>(null);

  const visibilidad = elegido ?? character.visibility;

  const onElegir = async (siguiente: Visibility) => {
    setErrorAlGuardar(null);
    setElegido(siguiente);
    try {
      await actualizar.mutateAsync({
        characterId: character.id,
        input: { visibility: siguiente },
      });
    } catch (err) {
      // El rechazo no se traga: el control vuelve a lo que el servidor tiene y el motivo se lee
      // aquí mismo, no en un aviso flotante que se va antes de que nadie lo lea.
      setElegido(null);
      setErrorAlGuardar((err as Error).message);
    }
  };

  // `Character` no arrastra hijos en cascada en `schema.prisma`: no desaparece nada más con él.
  // Y donde archivar es posible, el borrado **nombra la alternativa barata**: la frase que separa
  // los dos gestos es más eficaz que la que solo advierte del caro.
  const mensajeDeBorrado = puedeArchivar
    ? `Vas a borrar a "${character.name}". No se puede deshacer. Si solo quieres que salga de la mesa, archívalo: eso sí se puede deshacer.`
    : `Vas a borrar a "${character.name}". No se puede deshacer.`;

  // La consecuencia, no el riesgo: dónde deja de aparecer, que no se pierde nada, y por dónde
  // vuelve. Los tres datos son ciertos contra el servidor: `list` excluye a los archivados
  // (`characters.service.ts:57`), `archive` solo escribe `archivedAt` —la hoja, el inventario y
  // el dinero no se tocan (`:155`)— y `unarchive` se limita a limpiar esa fecha (`:184`).
  const mensajeDeArchivado = `"${character.name}" sale de la lista de personajes y deja de aparecer en la mesa. No se pierde nada —su hoja, su inventario y su dinero siguen enteros— y vuelve desde "Archivados", en Personajes.`;

  const onConfirmarArchivado = async () => {
    setErrorAlArchivar(null);
    try {
      await archivar.mutateAsync(character.id);
      onArchived?.();
    } catch (err) {
      setErrorAlArchivar((err as Error).message);
    }
  };

  const onConfirmarBorrado = async () => {
    setErrorAlBorrar(null);
    try {
      await borrar.mutateAsync(character.id);
      onDeleted();
    } catch (err) {
      setErrorAlBorrar((err as Error).message);
    }
  };

  return (
    <div className="space-y-s4">
      <VisibilityChooser
        value={visibilidad}
        onChange={onElegir}
        disabled={!puedeEditar}
        niveles={CHARACTER_VISIBILITIES}
      />
      {!puedeEditar && motivo && <p className="font-chrome text-chrome-sm text-muted">{motivo}</p>}
      {errorAlGuardar && (
        <p className="font-chrome text-chrome-sm text-danger-text">{errorAlGuardar}</p>
      )}

      {/* Archivar va **antes** que borrar y con menos peso visual: es el camino que casi siempre
          se quiere. Un personaje que ya no juega no es un personaje que haya que perder. */}
      {puedeArchivar && (
        <div className="flex flex-col items-start gap-s2">
          <BotonArchivar
            message={mensajeDeArchivado}
            onConfirm={onConfirmarArchivado}
            pending={archivar.isPending}
            disabled={!puedeEditar}
            disabledReason={motivo}
          />
          {errorAlArchivar && (
            <p className="font-chrome text-chrome-sm text-danger-text">{errorAlArchivar}</p>
          )}
        </div>
      )}

      <div className="flex flex-col items-start gap-s2">
        <DeleteButton
          message={mensajeDeBorrado}
          onConfirm={onConfirmarBorrado}
          pending={borrar.isPending}
          disabled={!puedeEditar}
          disabledReason={motivo}
        />
        {errorAlBorrar && (
          <p className="font-chrome text-chrome-sm text-danger-text">{errorAlBorrar}</p>
        )}
      </div>
    </div>
  );
}
