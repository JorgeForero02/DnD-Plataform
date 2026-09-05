import type { EntityType, Visibility } from "@dnd/shared";
import { Button } from "../../ui/Button";
import { useUpdateEntity } from "./hooks";

// **«Revelar» existía como gesto y no como botón** (auditoría de la mesa, §8.4).
//
// El servidor lo entiende perfectamente: `entities.service.ts` compara el conjunto de quién veía
// la ficha antes con el de quién la ve después, y **si creció** escribe un `ENTITY_REVEALED` que
// el motor de reglas escucha (`game-event-triggers.ts:39`). Lo que faltaba era el gesto: la
// única forma de revelar era abrir el formulario de edición y cambiar el desplegable de
// visibilidad, que es *«editar la visibilidad»* y no *«enseñárselo a la mesa»*. Con el gesto
// escondido dentro de un formulario, la mitad de las cadenas de reglas del proyecto —las que
// arrancan en `ENTITY_REVEALED`— dependían de que alguien recordara qué desplegable tocar.
//
// **No es un permiso nuevo ni un camino nuevo**: manda el mismo `PATCH` con la misma
// visibilidad que el formulario, y el servidor lo autoriza igual. Lo que cambia es que ahora se
// llama por su nombre.

/**
 * Los niveles desde los que revelar **significa algo**.
 *
 * `PUBLIC` y `PLAYERS` ya los ve toda la mesa (`canView` devuelve `false` para quien no es
 * miembro **antes** de mirar el nivel, y eso está escrito en `visibilidad.ts` y en
 * `docs/05-datos.md`), así que ofrecer «Revelar» sobre una ficha que ya está en `PLAYERS` sería
 * ofrecer un gesto sin efecto: el conjunto no crecería y el servidor no escribiría nada.
 */
export function sePuedeRevelar(visibility: Visibility): boolean {
  return visibility !== "PUBLIC" && visibility !== "PLAYERS";
}

/**
 * Enseñar una ficha a la mesa entera.
 *
 * Sube la visibilidad a `PLAYERS` — «todos los que se sientan a esta mesa», que es lo que la
 * frase «revelar» significa en una partida. Para el secreto que uno sabe y los demás no está
 * `SPECIFIC_PLAYERS`, y eso sigue siendo una decisión con matiz que se toma en el formulario;
 * este botón es el caso de mesa: *ya lo han visto, que conste*.
 */
export function BotonRevelar({
  campaignId,
  type,
  entityId,
  visibility,
  disabled,
}: {
  campaignId: string;
  type: EntityType;
  entityId: string;
  visibility: Visibility;
  /** Quien lo monta ya sabe si esta persona puede editar; el servidor lo impone igualmente. */
  disabled?: boolean;
}) {
  const actualizar = useUpdateEntity(campaignId, type);

  if (!sePuedeRevelar(visibility)) return null;

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="primary"
        disabled={disabled || actualizar.isPending}
        onClick={() => actualizar.mutate({ entityId, input: { visibility: "PLAYERS" } })}
      >
        Revelar a la mesa
      </Button>
      {actualizar.isError && (
        <span role="alert" className="font-chrome text-chrome-xs text-danger-text">
          {(actualizar.error as Error).message}
        </span>
      )}
    </span>
  );
}
