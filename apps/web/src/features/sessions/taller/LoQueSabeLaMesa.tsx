import type { ReactNode } from "react";
import { Badge } from "../../../ui/Badge";
import { ETIQUETA_DE_TIPO } from "../../entities/resumen";
import type { Entity } from "../../entities/api";
import { useAllEntities } from "../../entities/hooks";
import { IconoOjo, IconoOjoTachado } from "./iconos";

// **«La mesa lo sabe» / «Sigue oculto».** La pregunta que un DM se hace todo el rato, contestada
// de un vistazo. Copiada de `prototipo/src/features/taller/LoQueSabeLaMesa.tsx`: dos columnas
// arriba, y debajo el estado del mundo —marcas y conjuntos—.
//
// **El reparto en dos columnas es de PANTALLA, no de permisos.** Quién ve qué lo decide `canView`
// en el servidor (`apps/api/src/common/visibility.ts`) y aquí no se reimplementa: lo que se hace
// es agrupar por el nivel que cada ficha declara. Y ojo con «jugadores concretos», que la maqueta
// mete entero en «Sigue oculto»: es verdad para la mesa como conjunto —no lo saben todos— y
// mentira para el jugador que sí tiene la concesión. Esa media verdad se dice en voz alta debajo
// de la columna en vez de dejar que se deduzca.
//
// **Marcas y conjuntos: dibujados y sin datos, y esto no es un olvido.** El servidor tiene las
// cinco rutas (`apps/api/src/world-state/world-state.controller.ts:28-89`) y **ninguna pantalla
// las llama nunca** (auditoría §8.1). La puerta de API en la web es de otro carril (C6), y este
// no escribe una segunda: cuando exista `features/world-state/`, estos dos cuadros se enchufan y
// el aviso se cae. Está en el informe del carril.

function Columna({
  titulo,
  icono,
  tono,
  fichas,
  nota,
}: {
  titulo: string;
  icono: ReactNode;
  tono: "accent" | "copper";
  fichas: Entity[];
  nota?: ReactNode;
}) {
  return (
    <section
      aria-label={titulo}
      className={[
        "rounded-radius-md border p-s3",
        tono === "accent" ? "border-accent" : "border-copper",
      ].join(" ")}
    >
      <h4
        className={[
          "mb-s2 flex items-center gap-s2 font-chrome text-chrome-xs uppercase tracking-[0.14em]",
          tono === "accent" ? "text-accent-text" : "text-copper-text",
        ].join(" ")}
      >
        {icono}
        {titulo}
        <span className="font-data normal-case tracking-normal text-muted">{fichas.length}</span>
      </h4>
      {fichas.length === 0 ? (
        <p className="font-chrome text-chrome-sm text-muted">Nada por aquí todavía.</p>
      ) : (
        <ul className="space-y-s2">
          {fichas.map((ficha) => (
            <li key={ficha.id} className="flex items-center justify-between gap-s2">
              <span className="min-w-0">
                <span className="block truncate font-chrome text-chrome-sm text-text">
                  {ficha.name}
                </span>
                <span className="font-chrome text-chrome-xs text-muted">
                  {ETIQUETA_DE_TIPO[ficha.type]}
                </span>
              </span>
              <Badge visibility={ficha.visibility} />
            </li>
          ))}
        </ul>
      )}
      {nota && <p className="mt-s2 font-chrome text-chrome-xs text-muted">{nota}</p>}
    </section>
  );
}

function CuadroSinPuerta({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="rounded-radius-md border border-muted bg-bg p-s3">
      <h4 className="mb-s2 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
        {titulo}
      </h4>
      <p className="font-chrome text-chrome-sm text-muted">{children}</p>
    </section>
  );
}

export function LoQueSabeLaMesa({ campaignId }: { campaignId: string }) {
  const fichas = useAllEntities(campaignId);
  const todas = fichas.data ?? [];
  const sabidas = todas.filter((f) => f.visibility === "PUBLIC" || f.visibility === "PLAYERS");
  const ocultas = todas.filter(
    (f) =>
      f.visibility === "DM_ONLY" ||
      f.visibility === "OWNER_DM" ||
      f.visibility === "SPECIFIC_PLAYERS",
  );

  if (fichas.isError) {
    return (
      <p className="rounded-radius-sm border border-danger p-s3 font-chrome text-chrome-sm text-danger-text">
        No se pudo leer el mundo. Dos columnas vacías aquí no significan que la mesa no sepa nada.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-s4">
      <div className="grid gap-s3 md:grid-cols-2">
        <Columna
          titulo="La mesa lo sabe"
          icono={<IconoOjo />}
          tono="accent"
          fichas={sabidas}
          nota="Hoy «público» y «jugadores» llegan a las mismas personas: nadie de fuera de la campaña entra todavía."
        />
        <Columna
          titulo="Sigue oculto"
          icono={<IconoOjoTachado />}
          tono="copper"
          fichas={ocultas}
          nota="«Jugadores concretos» está aquí porque la mesa entera no lo sabe: quien tenga la concesión sí lo ve."
        />
      </div>

      <div className="grid gap-s3 md:grid-cols-2">
        <CuadroSinPuerta titulo="Marcas del mundo">
          El servidor las guarda y las lee, pero la web todavía no tiene por dónde pedirlas. En
          cuanto exista, este cuadro las enseña sin cambiar de sitio.
        </CuadroSinPuerta>
        <CuadroSinPuerta titulo="Conjuntos">
          Lo mismo: existen en el servidor y ninguna pantalla los ha pedido nunca. Aquí es donde van
          a vivir.
        </CuadroSinPuerta>
      </div>
    </div>
  );
}
