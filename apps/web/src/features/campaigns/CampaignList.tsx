import { Link } from "react-router-dom";
import { useCampaigns } from "./hooks";
import { EmptyState } from "../../ui/Collection";
import { tiempoRelativo } from "./tiempoRelativo";
import { IconoPersonajes, IconoSesiones, IconoMas } from "./iconosDeSeccion";

// **La tarjeta de la maqueta, adoptada entera (2026-09-03).**
//
// La versión anterior tomó la idea —una tarjeta en vez de una banda— y conservó nuestra
// disposición: nombre, filete ornamental, descripción, y abajo tres datos sueltos del mismo
// peso, entre ellos «desde el 14 de febrero de 2026». La maqueta hace tres cosas distintas y
// las tres importan:
//
//   1. **Tu papel va arriba a la derecha, como marca**, no perdido en una fila de metadatos.
//      Es lo primero que quieres saber de una campaña ajena: si la diriges o la juegas.
//   2. **El nombre manda**, en la voz de los títulos y sin nada compitiendo a su lado.
//   3. **La fecha se dice en huecos** —«hace 6 días»— con su icono, junto al número de
//      miembros. Una fecha absoluta obliga a restar para saber si la campaña sigue viva.
//
// El filete ornamental se ha quitado: en la maqueta la tarjeta es un rectángulo limpio, y un
// adorno que parte en dos una tarjeta de cuatro líneas compite en vez de enmarcar.
//
// Lo que la maqueta no enseña y aquí sí es la **descripción**: es dato real que tenemos y que
// dice de qué va la campaña. Lo que sigue sin enseñarse es cuánto mundo hay dentro — ver
// campaigns.service.ts#listForUser: contar entidades es contar cosas que algunos jugadores no
// pueden ver.

const ROL: Record<string, string> = {
  DM: "Diriges",
  PLAYER: "Juegas",
};

export function CampaignList({ onCreate }: { onCreate?: () => void }) {
  const { data, isLoading, isError, error } = useCampaigns();

  if (isLoading) return <p className="font-chrome text-chrome-sm text-muted">Cargando campañas…</p>;
  if (isError)
    return (
      <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
        {(error as Error).message}
      </p>
    );

  if (!data || data.length === 0) {
    return (
      <EmptyState title="Todavía no hay ninguna campaña">
        Una campaña es el contenedor de todo: su mundo, sus sesiones y sus personajes. Crea la
        primera y empieza por donde quieras.
      </EmptyState>
    );
  }

  return (
    // Dos columnas, como la maqueta. La tercera de antes estrechaba la tarjeta hasta que el
    // nombre de una campaña con cuatro palabras partía en tres líneas.
    <ul className="grid gap-s4 sm:grid-cols-2">
      {data.map((c) => {
        const rol = c.members?.[0]?.role;
        const miembros = c._count?.members;
        const desde = tiempoRelativo(c.createdAt);
        return (
          <li key={c.id} className="group relative flex">
            {/* Stretched link: the whole card is clickable, but the LINK is only the name.
                Wrapping the entire card in an <a> made its accessible name the concatenation
                of everything inside it — name, description, role, member count and date read
                out as one string. The ::after overlay restores the big click target without
                paying for it in the accessibility tree. */}
            <div className="flex h-full w-full flex-col rounded-radius-sm border border-muted bg-surface px-s5 py-s4 transition-colors group-hover:border-copper">
              <div className="flex items-start gap-s3">
                <h2 className="min-w-0 flex-1 font-title text-chrome-xl leading-tight text-text group-hover:text-copper-text">
                  <Link
                    to={`/campaigns/${c.id}`}
                    className="after:absolute after:inset-0 after:content-[''] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {c.name}
                  </Link>
                </h2>
                {rol && (
                  <span className="shrink-0 rounded-radius-sm border border-copper px-1.5 py-0.5 font-chrome text-chrome-xs text-copper-text">
                    {ROL[rol] ?? rol}
                  </span>
                )}
              </div>
              {c.description && (
                <p className="mt-s2 line-clamp-2 flex-1 font-world text-chrome-base leading-snug text-muted">
                  {c.description}
                </p>
              )}
              {/* La fila de datos de la maqueta: cada cifra con su dibujo delante, para que se
                  lean de un vistazo sin que ninguna palabra tenga que decir de qué es. */}
              <div className="mt-auto flex flex-wrap items-center gap-x-s4 gap-y-1 pt-s4 font-chrome text-chrome-xs text-muted">
                {miembros !== undefined && (
                  <span className="flex items-center gap-s2">
                    <IconoPersonajes />
                    <span className="font-data">
                      {miembros} {miembros === 1 ? "miembro" : "miembros"}
                    </span>
                  </span>
                )}
                {desde && (
                  <span className="flex items-center gap-s2">
                    <IconoSesiones />
                    <span className="font-data">{desde}</span>
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
      {onCreate && (
        <li>
          <button
            type="button"
            onClick={onCreate}
            className="flex h-full min-h-[8rem] w-full flex-col items-center justify-center gap-s2 rounded-radius-sm border border-dashed border-muted p-s4 font-chrome text-chrome-sm text-muted transition-colors hover:border-accent hover:text-accent-text"
          >
            <span className="text-chrome-xl leading-none">
              <IconoMas />
            </span>
            Nueva campaña
          </button>
        </li>
      )}
    </ul>
  );
}
