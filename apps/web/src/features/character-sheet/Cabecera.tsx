import { Retrato } from "../sessions/elenco/FichaDeElenco";
import { descriptorDePersonaje } from "../characters/descriptor";
import { ValorDerivado } from "./Traza";
import { Condiciones } from "./Condiciones";
import { Avisos } from "./Avisos";
import { EleccionesPendientes } from "./EleccionesPendientes";
import { AvisoDeDm } from "./AvisoDeDm";
import { BotonSubirNivel } from "../level-up/BotonSubirNivel";
import { ROTULO_DE_CASILLA } from "./Tarjeta";
import type { PropsDePestana } from "./pestanas/tipos";

// Tarea 3 (spec 2026-09-11, «la hoja a página completa») — la cabecera fija de la hoja: lo que
// cambia el turno, en cualquier disposición y fuera de todas las pestañas. Vivía dentro de
// `HojaCalculada.tsx`; se mueve a su propio componente para que las pestañas que vienen después
// (Tarea 4+) puedan compartirla sin que cada una tenga que volver a montarla.
//
// **Es HERMANA del cuerpo, nunca su padre**: `sticky` se pega dentro de su padre, y envolverla
// soltaría la tira sin que ninguna unitaria se enterase (lo mide el punto 7 de
// `e2e/hoja.spec.ts`). Quien monta `Cabecera` tiene que colocarla como hermana del resto de la
// hoja, no como envoltorio.
export function Cabecera({
  campaignId,
  characterId,
  data,
  puedeEditar,
  disposicion,
}: PropsDePestana) {
  const { sheet, hp, character } = data;
  // La velocidad de la cabecera es la **efectiva** —la que ya tiene en cuenta las condiciones—,
  // que calcula el servidor. Si la respuesta no la trae (una mutación, que no la manda), se pinta
  // la base sin traza en vez de recalcular aquí una regla del juego que vive en la API.
  const velocidad = data.effectiveSpeeds?.walk ?? { total: sheet.speeds.walk ?? 0, steps: [] };
  const descripcion = descriptorDePersonaje(character);

  return (
    // **El escalón lo declara quien lo tiene, no esta hoja.** `AppShell` pone
    // `--tira-fija-top: 4rem` porque su cabecera mide `h-16`, y `--tira-fija-pull: -1.5rem` para
    // subir la tira a la banda del nombre. Dentro de un cajón no hay ninguna de las dos cosas y
    // las variables valen **cero**: escribir `top-16` aquí hacía que la tira se parase 64px por
    // debajo del borde del cajón y **se solapase 72px con su propio cuerpo**.
    <section
      aria-label="resumen de combate"
      className="sticky top-[var(--tira-fija-top,0px)] z-20 -mx-s2 mt-[var(--tira-fija-pull,0px)] border-b border-muted bg-[color:var(--chrome-veil)] px-s2 py-s2 backdrop-blur"
    >
      <div className="flex flex-wrap items-start gap-s3">
        <Retrato personaje={character} />
        {/* El nombre y la descripción solo en la mesa: en la página ya los pinta `PageHeader`
            (fuera de la frontera de esta tarea), y repetirlos aquí sería el mismo dato en dos
            sitios. */}
        {disposicion === "mesa" && (
          <div className="min-w-0">
            <p className="truncate font-title text-chrome-md text-text">{character.name}</p>
            {descripcion && <p className="font-world text-chrome-sm text-muted">{descripcion}</p>}
          </div>
        )}
        <div className="ml-auto flex flex-wrap items-start justify-end gap-s2">
          <ValorDerivado variante="compacta" etiqueta="CA" valor={sheet.derived.ac} />
          <ValorDerivado
            variante="compacta"
            etiqueta="Inic."
            etiquetaLarga="Iniciativa"
            valor={sheet.derived.initiative}
          />
          <ValorDerivado
            variante="compacta"
            etiqueta="Vel. (pies)"
            etiquetaLarga="Velocidad efectiva en pies"
            valor={{ key: "speed.walk", total: velocidad.total, steps: velocidad.steps }}
          />
          {/* Los PG de la cabecera son **solo lectura**: el delta —recibo daño, me curo— se
              aplica en su tarjeta, que es donde está la acción. Repetir aquí el control sería el
              mismo dato en dos sitios, que es como se acaba con uno de los dos mintiendo. */}
          <div className="min-w-[4.75rem] rounded-radius-sm border border-muted bg-surface px-s2 py-1 text-center">
            <p className={`${ROTULO_DE_CASILLA} leading-tight`}>PG</p>
            <p className="font-data text-chrome-lg leading-none text-text">
              {hp.current ?? "—"} / {hp.max ?? "—"}
            </p>
            {hp.temp > 0 && (
              <p className="font-chrome text-chrome-xs text-accent-text">+{hp.temp} temporales</p>
            )}
          </div>
          {sheet.derived.proficiencyBonus && (
            <ValorDerivado
              variante="compacta"
              etiqueta="Comp."
              etiquetaLarga="Competencia"
              valor={sheet.derived.proficiencyBonus}
            />
          )}
        </div>
      </div>
      <div className="mt-s2 flex flex-col gap-s2">
        <Condiciones
          campaignId={campaignId}
          characterId={characterId}
          puedeEditar={false}
          variante="chips"
        />
        <Avisos warnings={sheet.warnings} />
        <EleccionesPendientes
          campaignId={campaignId}
          characterId={characterId}
          pendingChoices={sheet.pendingChoices}
          choicesActuales={character.choices ?? {}}
        />
        <AvisoDeDm campaignId={campaignId} />
        {puedeEditar && (
          <BotonSubirNivel
            campaignId={campaignId}
            characterId={characterId}
            level={character.level}
          />
        )}
      </div>
    </section>
  );
}
