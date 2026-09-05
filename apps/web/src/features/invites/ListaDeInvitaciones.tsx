import { useInvites, useRevokeInvite } from "./hooks";
import type { InviteRow } from "./api";
import { Button } from "../../ui/Button";

/**
 * **Los enlaces repartidos, con la verdad completa de cada uno** (plan 11, ficha D3b).
 *
 * Hasta hoy las invitaciones se generaban **a ciegas**: nadie sabía cuántas había vivas ni podía
 * matar una que se hubiera filtrado, y el propio panel lo decía en un aviso. Un listado que solo
 * dijera «3 invitaciones» no serviría de nada, así que cada fila dice **cuándo se creó, en qué
 * estado está, cuándo caduca y quién la usó** si alguien la usó.
 *
 * **El token no se enseña entero, ni siquiera aquí.** Va su cola: suficiente para reconocer «este
 * es el que le pasé a Marta», inútil para colarse. Es una pantalla que un DM abre en una mesa con
 * gente al lado.
 *
 * **Revocar no es marcar como usada.** Un enlace gastado y uno revocado son dos hechos distintos y
 * la columna de estado los distingue; fundirlos habría mentido sobre quién entró en la campaña.
 */
const ROTULO: Record<InviteRow["estado"], string> = {
  VIVA: "Sin usar",
  USADA: "Usada",
  REVOCADA: "Revocada",
  CADUCADA: "Caducada",
};

/** El tono de cada estado. **Vivo es lo único que aún hace algo**, así que es lo único acentuado. */
const TONO: Record<InviteRow["estado"], string> = {
  VIVA: "text-accent-text",
  USADA: "text-muted",
  REVOCADA: "text-muted",
  CADUCADA: "text-muted",
};

function fecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short" });
}

export function ListaDeInvitaciones({ campaignId }: { campaignId: string }) {
  const { data: invitaciones, isLoading } = useInvites(campaignId);
  const revocar = useRevokeInvite(campaignId);

  if (isLoading) return null;
  const filas = invitaciones ?? [];
  if (filas.length === 0) {
    return (
      <p className="mt-3 text-chrome-xs text-muted">Todavía no has repartido ningún enlace.</p>
    );
  }

  return (
    <section aria-label="Enlaces repartidos" className="mt-4">
      <h4 className="text-chrome-sm font-semibold">Enlaces repartidos</h4>
      <ul className="mt-2 flex flex-col gap-1">
        {filas.map((i) => (
          <li
            key={i.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-radius-sm border border-muted px-2 py-1"
          >
            <span className="flex flex-wrap items-baseline gap-2">
              {/* La cola del token identifica la fila sin ser utilizable. En `font-data` porque es
                  un dato que se compara carácter a carácter. */}
              <span className="font-data text-chrome-xs text-text">…{i.tokenTail}</span>
              <span className={`text-chrome-xs ${TONO[i.estado]}`}>{ROTULO[i.estado]}</span>
              <span className="text-chrome-xs text-muted">
                del {fecha(i.createdAt)}
                {i.expiresAt ? ` · caduca el ${fecha(i.expiresAt)}` : " · no caduca"}
                {i.usedByName ? ` · la usó ${i.usedByName}` : ""}
              </span>
            </span>
            {/* **Solo se revoca lo que aún puede usarse.** Ofrecerlo sobre una usada o una caducada
                sería un botón que no cambia nada; el servidor lo aceptaría igual, así que esto es
                honestidad y no control de acceso. */}
            {i.estado === "VIVA" && (
              <Button
                type="button"
                variant="secondary"
                className="px-2 py-0.5 text-chrome-xs"
                disabled={revocar.isPending}
                onClick={() => revocar.mutate(i.id)}
                aria-label={`Revocar el enlace …${i.tokenTail}`}
              >
                Revocar
              </Button>
            )}
          </li>
        ))}
      </ul>
      {revocar.isError && (
        <p role="alert" className="mt-1 text-chrome-xs text-danger-text">
          {(revocar.error as Error).message}
        </p>
      )}
    </section>
  );
}
