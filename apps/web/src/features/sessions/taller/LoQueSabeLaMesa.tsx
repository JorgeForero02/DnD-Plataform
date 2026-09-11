import type { ReactNode } from "react";
import { Badge } from "../../../ui/Badge";
import { ETIQUETA_DE_TIPO } from "../../entities/resumen";
import { ETIQUETA_DE_NIVEL } from "../../entities/visibilidad";
import type { Entity } from "../../entities/api";
import { useAllEntities } from "../../entities/hooks";
import { IconoOjo, IconoOjoTachado } from "../../../ui/Iconos";
import { Button } from "../../../ui/Button";
import { useFlags, useSetFlag, useSets } from "../../world-state/hooks";
import { NOMBRE_TIPO_DE_MIEMBRO_CORTO } from "../../world-state/vocabulario";

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
// **Marcas y conjuntos: enchufados en el ensamblado (2026-09-04).** Nacieron dibujados y vacíos
// porque `features/world-state/` no existía en la base de este carril. Ya existe, así que estos
// dos cuadros **consumen sus hooks** —`useFlags`, `useSets`, `useSetFlag`— y no escriben una
// segunda puerta de API: `features/world-state/api.ts` sigue siendo la única que habla HTTP con
// `apps/api/src/world-state/`.
//
// **Lo que aquí NO está, y dónde está.** Crear un conjunto, meter y sacar miembros y levantar una
// señal viven enteros en `world-state/PanelDeEstadoDelMundo`, montado como solapa de «Reglas». No
// se traen: la maqueta pone en esta solapa dos **cuadros de estado** dentro de una rejilla de dos
// columnas, no tres formularios, y duplicar aquí los de allá sería tener dos autorías de la misma
// cosa. Lo que sí se queda es **poner y quitar una marca**, que es un botón por fila y el gesto
// que un DM hace preparando —«el puente está caído»— sin salir del taller. El pie de cada cuadro
// dice dónde está el resto en vez de dejar que se busque.

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

function Cuadro({
  titulo,
  cuenta,
  children,
  pie,
}: {
  titulo: string;
  cuenta?: number;
  children: ReactNode;
  pie: ReactNode;
}) {
  return (
    <section aria-label={titulo} className="rounded-radius-md border border-muted bg-bg p-s3">
      <h4 className="mb-s2 flex items-center gap-s2 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
        {titulo}
        {cuenta !== undefined && (
          <span className="font-data normal-case tracking-normal text-muted">{cuenta}</span>
        )}
      </h4>
      {children}
      <p className="mt-s2 font-chrome text-chrome-xs text-muted">{pie}</p>
    </section>
  );
}

/**
 * Las marcas del mundo, con su interruptor.
 *
 * **Una marca puesta puede disparar una regla**, así que esto no es una lista de lectura: es la
 * palanca que le faltaba al DM para arrancar una cadena. `useSetFlag` ya invalida las reglas
 * además de las marcas, precisamente porque `fireCount` y `lastFiredAt` cambian al dispararse.
 */
function Marcas({ campaignId }: { campaignId: string }) {
  const marcas = useFlags(campaignId);
  const poner = useSetFlag(campaignId);

  return (
    <Cuadro
      titulo="Marcas del mundo"
      cuenta={marcas.data?.length}
      pie={
        <>
          Un hecho que la campaña recuerda. Para crear una nueva, y para las señales, «Reglas» ·
          «Estado del mundo».
          {poner.isError && (
            <span role="alert" className="block text-danger-text">
              {(poner.error as Error).message}
            </span>
          )}
        </>
      }
    >
      {marcas.isLoading && (
        <p className="font-chrome text-chrome-sm text-muted">Leyendo las marcas…</p>
      )}
      {marcas.isError && (
        <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
          No se pudieron leer las marcas. Un cuadro vacío aquí no significa que no haya ninguna.
        </p>
      )}
      {marcas.isSuccess &&
        (marcas.data.length === 0 ? (
          <p className="font-chrome text-chrome-sm text-muted">
            Ninguna marca todavía. Una regla armada sobre una marca no se dispara hasta que alguien
            la pone.
          </p>
        ) : (
          <ul className="space-y-1">
            {marcas.data.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-s2"
                data-testid="marca-en-el-taller"
              >
                <span className="min-w-0 truncate font-chrome text-chrome-sm text-text">
                  {m.key}
                </span>
                <span className="flex shrink-0 items-center gap-s2">
                  <span
                    className={[
                      "font-chrome text-chrome-xs",
                      m.value ? "text-copper-text" : "text-muted",
                    ].join(" ")}
                  >
                    {m.value ? "Puesta" : "Quitada"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-2 py-0.5 text-chrome-xs"
                    disabled={poner.isPending}
                    aria-label={(m.value ? "Quitar" : "Poner") + " la marca " + m.key}
                    onClick={() => poner.mutate({ key: m.key, value: !m.value })}
                  >
                    {m.value ? "Quitarla" : "Ponerla"}
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        ))}
    </Cuadro>
  );
}

/**
 * Los conjuntos, de lectura.
 *
 * «¿Quién sabe esto?», que es la pregunta de esta solapa. Aquí solo se cuentan; quitarlos y
 * rellenarlos es de `PanelDeEstadoDelMundo`, que además sabe resolver el nombre de un miembro y
 * enseñar su identificador crudo cuando apunta a algo que ya no existe.
 */
function Conjuntos({ campaignId }: { campaignId: string }) {
  const conjuntos = useSets(campaignId);

  return (
    <Cuadro
      titulo="Conjuntos"
      cuenta={conjuntos.data?.length}
      pie="Quién sabe qué. Se crean y se rellenan en «Reglas» · «Estado del mundo»."
    >
      {conjuntos.isLoading && (
        <p className="font-chrome text-chrome-sm text-muted">Leyendo los conjuntos…</p>
      )}
      {conjuntos.isError && (
        <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
          No se pudieron leer los conjuntos. Un cuadro vacío aquí no significa que no haya ninguno.
        </p>
      )}
      {conjuntos.isSuccess &&
        (conjuntos.data.length === 0 ? (
          <p className="font-chrome text-chrome-sm text-muted">
            Ningún conjunto todavía. Una regla puede preguntar por su tamaño o por si alguien está
            dentro.
          </p>
        ) : (
          <ul className="space-y-1">
            {conjuntos.data.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-s2"
                data-testid="conjunto-en-el-taller"
              >
                <span className="min-w-0 truncate font-chrome text-chrome-sm text-text">
                  {c.label}
                </span>
                <span className="shrink-0 font-chrome text-chrome-xs text-muted">
                  {c.members.length === 0
                    ? "nadie dentro"
                    : c.members.length === 1
                      ? "1 " + NOMBRE_TIPO_DE_MIEMBRO_CORTO[c.members[0].memberType]
                      : c.members.length + " dentro"}
                </span>
              </li>
            ))}
          </ul>
        ))}
    </Cuadro>
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
          // Fix round 1 (Task 12, Important): los nombres de nivel venían escritos a mano;
          // ahora se leen de `ETIQUETA_DE_NIVEL` (features/entities/visibilidad.ts), la misma
          // fuente que usa `Badge`. En minúsculas porque van dentro de la frase, no como
          // etiqueta suelta.
          nota={
            <>
              Hoy «{ETIQUETA_DE_NIVEL.PUBLIC.toLowerCase()}» y «
              {ETIQUETA_DE_NIVEL.PLAYERS.toLowerCase()}» llegan a las mismas personas: nadie de
              fuera de la campaña entra todavía.
            </>
          }
        />
        <Columna
          titulo="Sigue oculto"
          icono={<IconoOjoTachado />}
          tono="copper"
          fichas={ocultas}
          nota={
            <>
              «{ETIQUETA_DE_NIVEL.SPECIFIC_PLAYERS}» está aquí porque la mesa entera no lo sabe:
              quien tenga la concesión sí lo ve.
            </>
          }
        />
      </div>

      <div className="grid gap-s3 md:grid-cols-2">
        <Marcas campaignId={campaignId} />
        <Conjuntos campaignId={campaignId} />
      </div>
    </div>
  );
}
