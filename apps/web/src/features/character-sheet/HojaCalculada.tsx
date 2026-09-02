import type { AbilityKey, SkillKey } from "@dnd/shared";
import { ABILITY_KEYS, SKILLS } from "@dnd/shared";
import { useCharacterSheet } from "./hooks";
import { ValorDerivado } from "./Traza";
import { TirarBoton } from "./TirarBoton";
import { Avisos } from "./Avisos";
import { EleccionesPendientes } from "./EleccionesPendientes";
import { PuntosDeGolpe } from "./PuntosDeGolpe";
import { RecursosYDescansos } from "./RecursosYDescansos";
import { Condiciones } from "./Condiciones";
import { VelocidadYSentidos } from "./VelocidadYSentidos";
import { Anulaciones } from "./Anulaciones";
import { BotonSubirNivel } from "../level-up/BotonSubirNivel";
import { IdentidadEditable } from "./IdentidadEditable";
import { EmptyState } from "../../ui/Collection";
import { ABREVIATURA_CARACTERISTICA, NOMBRE_CARACTERISTICA, NOMBRE_HABILIDAD } from "./vocabulario";

// Tarea 2A.10 — la pantalla de la hoja de personaje: lee `GET .../sheet` y enseña la traza de
// cada número derivado, los avisos, las elecciones pendientes, los PG con su delta, recursos y
// descansos, condiciones, velocidad efectiva y sentidos, y deja tirar 1d20+mod desde aquí.
//
// **Tarea H3 — cabecera fija + dos columnas** (la maqueta B, elegida por el autor).
//
//  · **Arriba, y siempre visible al desplazar**: CA, iniciativa, velocidad, PG y bonificador de
//    competencia. Son los cinco números que se consultan en mitad de un turno, y desplazarse
//    para leerlos era exactamente el defecto: la hoja de papel no se desplaza.
//  · **Columna izquierda**: características → salvaciones → habilidades, **en ese orden y sin
//    nada en medio**, porque en la hoja de papel bajan por la misma columna *porque una alimenta
//    a la siguiente*, y esa contigüidad ES la explicación (docs/04-convenciones.md).
//  · **Columna derecha**: lo accionable — lo que se pulsa, no lo que se lee.
//  · **Un hueco reservado y rotulado para el inventario**, que llega en la fase 2B. Se dibuja
//    vacío a propósito: un sitio anunciado se enchufa; un sitio que no existe se improvisa donde
//    quepa, y así es como una hoja acaba desordenada.
//
// La costura entre las dos pieles (H4) es justo la línea entre la cabecera y las columnas: la
// cabecera es **cromado** —lo que se opera— y el cuerpo tirará a **vitela** —lo que se lee—. Por
// eso el cuerpo cuelga de un solo contenedor: cambiar de piel tiene que ser un cambio de clases
// ahí, no una reescritura.
//
// La atribución del SRD que `catalog/index.ts` pide ver en pantalla no se repite aquí: ya la
// pinta `AppShell` (`ui/AppShell.tsx`) en el pie de TODA pantalla con sesión, y esta hoja se
// monta dentro de un `AppShell` en `CharacterDetailPage.tsx`. Añadir otro `<LegalNotice />` aquí
// era un segundo pie de página duplicado en la misma pantalla, no una atribución que faltara.

const HABILIDADES_POR_CARACTERISTICA: Record<AbilityKey, SkillKey[]> = ABILITY_KEYS.reduce(
  (acc, ability) => {
    acc[ability] = (Object.entries(SKILLS) as [SkillKey, AbilityKey][])
      .filter(([, a]) => a === ability)
      .map(([skill]) => skill);
    return acc;
  },
  {} as Record<AbilityKey, SkillKey[]>,
);

/**
 * El arcón del hueco de inventario, **dibujado**. No hay icono de inventario en `ui/Iconos.tsx`
 * y ese fichero queda fuera de la frontera de esta tarea, así que vive aquí de momento; cuando
 * 2B monte el inventario de verdad, sube a la casa de los iconos.
 */
function IconoArcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M3 9.5 12 5l9 4.5v8L12 22l-9-4.5z" />
      <path d="M3 9.5 12 14l9-4.5" />
      <path d="M12 14v8" />
    </svg>
  );
}

export function HojaCalculada({
  campaignId,
  characterId,
  puedeEditar,
}: {
  campaignId: string;
  characterId: string;
  puedeEditar: boolean;
}) {
  const { data, isLoading, isError } = useCharacterSheet(campaignId, characterId);

  if (isLoading) {
    return <p className="font-chrome text-chrome-sm text-muted">Calculando la hoja…</p>;
  }
  if (isError || !data) {
    return (
      <EmptyState title="No se pudo cargar la hoja de 5.ª edición">
        Vuelve a intentarlo en un momento.
      </EmptyState>
    );
  }

  const { sheet, reason, hp, deathSaves, character } = data;

  if (!sheet) {
    return (
      <div className="flex flex-col gap-s3">
        <EmptyState title="La hoja de 5.ª edición está a medias">
          {reason ?? "Faltan datos para calcular la hoja."}
        </EmptyState>
        {/* **Una ficha a medias se completa aquí, no en otra pantalla.** Antes había un botón
            que abría un diálogo: quien acaba de crear un personaje veía un aviso, pulsaba, y
            aterrizaba en un formulario distinto del sitio donde iba a leer el resultado. */}
        <IdentidadEditable
          campaignId={campaignId}
          characterId={characterId}
          character={character}
          sheet={null}
          puedeEditar={puedeEditar}
        />
      </div>
    );
  }

  // La velocidad de la cabecera es la **efectiva** —la que ya tiene en cuenta las condiciones—,
  // que calcula el servidor. Si la respuesta no la trae (una mutación, que no la manda), se pinta
  // la base sin traza en vez de recalcular aquí una regla del juego que vive en la API.
  const velocidad = data.effectiveSpeeds?.walk ?? { total: sheet.speeds.walk ?? 0, steps: [] };

  return (
    <div className="flex flex-col gap-s4">
      <div className="flex flex-wrap items-start justify-end gap-s3">
        {/* La subida de nivel vive en su propia feature (2A.11): esta hoja solo la monta. */}
        {puedeEditar && (
          <BotonSubirNivel
            campaignId={campaignId}
            characterId={characterId}
            level={character.level}
          />
        )}
      </div>

      {/* **La cabecera fija.** `top-16` es la altura de la cabecera de la aplicación
          (`ui/AppShell.tsx`, `h-16`), que también es fija: este bloque se apoya justo debajo en
          vez de deslizarse por detrás. Es la piel de **cromado**: fondo más oscuro que las
          superficies que enmarca, y un filete de cobre debajo. */}
      <section
        aria-label="resumen de combate"
        className="sticky top-16 z-20 -mx-s2 border-b border-copper/40 bg-bg/95 px-s2 py-s2 backdrop-blur"
      >
        <div className="grid grid-cols-2 gap-s2 sm:grid-cols-3 lg:grid-cols-5">
          <ValorDerivado etiqueta="CA" valor={sheet.derived.ac} />
          <ValorDerivado etiqueta="Iniciativa" valor={sheet.derived.initiative} />
          <ValorDerivado
            etiqueta="Velocidad (pies)"
            valor={{ key: "speed.walk", total: velocidad.total, steps: velocidad.steps }}
          />
          {/* Los PG de la cabecera son **solo lectura**: el delta —recibo daño, me curo— se
              aplica en su bloque de la columna derecha, que es donde está la acción. Repetir
              aquí el control sería el mismo dato en dos sitios, que es como se acaba con uno de
              los dos mintiendo. El rótulo dice «PG» y no «Puntos de golpe» justamente para que
              no haya dos cosas llamadas igual en la misma pantalla. */}
          <div className="rounded-radius-sm border border-muted/50 bg-surface px-s3 py-s3 text-center">
            <p className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">PG</p>
            <p className="mt-1 font-data text-chrome-xl leading-none text-text">
              {hp.current ?? "—"} / {hp.max ?? "—"}
            </p>
            <p className="mt-0.5 font-chrome text-chrome-xs text-muted">
              {hp.temp > 0 ? `+${hp.temp} temporales` : "actuales / máximos"}
            </p>
          </div>
          {sheet.derived.proficiencyBonus && (
            <ValorDerivado etiqueta="Competencia" valor={sheet.derived.proficiencyBonus} />
          )}
        </div>
      </section>

      {/* El cuerpo. **Aquí cambia la piel en H4** (cromado arriba, vitela abajo): es un cambio de
          clases en este contenedor y en las dos columnas, no una reescritura. */}
      <div className="grid items-start gap-s5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        {/* --- Columna izquierda: la cadena que explica los números. NO se intercala nada entre
            características, salvaciones y habilidades. --- */}
        <div className="flex min-w-0 flex-col gap-s5">
          {/* **Aquí estaba el segundo botón de «Editar».** Ya no hay diálogo: la identidad y las
              seis características se tocan donde se leen, y el modificador de cada una vive
              pegado a su puntuación — que es como lo dibuja la hoja de papel, y por un motivo:
              la contigüidad ES la explicación de por qué el número es el que es. */}
          <IdentidadEditable
            campaignId={campaignId}
            characterId={characterId}
            character={character}
            sheet={sheet}
            puedeEditar={puedeEditar}
          />

          <section aria-label="salvaciones">
            <p className="mb-s2 font-chrome text-chrome-sm font-semibold text-text">Salvaciones</p>
            {ABILITY_KEYS.map((ability) => (
              <ValorDerivado
                key={ability}
                variante="fila"
                etiqueta={`Salvación de ${NOMBRE_CARACTERISTICA[ability]}`}
                valor={sheet.derived[`save.${ability}`]}
                accion={
                  <TirarBoton
                    campaignId={campaignId}
                    characterId={characterId}
                    etiqueta={`Salvación de ${NOMBRE_CARACTERISTICA[ability]}`}
                    modificador={sheet.derived[`save.${ability}`].total}
                  />
                }
              />
            ))}
          </section>

          <section aria-label="habilidades">
            <p className="mb-s2 font-chrome text-chrome-sm font-semibold text-text">Habilidades</p>
            {ABILITY_KEYS.flatMap((ability) =>
              HABILIDADES_POR_CARACTERISTICA[ability].map((skill) => (
                <ValorDerivado
                  key={skill}
                  variante="fila"
                  etiqueta={`${NOMBRE_HABILIDAD[skill]} (${ABREVIATURA_CARACTERISTICA[ability]})`}
                  valor={sheet.derived[`skill.${skill}`]}
                  accion={
                    <TirarBoton
                      campaignId={campaignId}
                      characterId={characterId}
                      etiqueta={NOMBRE_HABILIDAD[skill]}
                      modificador={sheet.derived[`skill.${skill}`].total}
                    />
                  }
                />
              )),
            )}
          </section>

          {/* La percepción pasiva cierra la cadena: es una habilidad que no se tira. Va **después**
              de las habilidades, nunca entre medias. */}
          <section aria-label="valores pasivos" className="grid grid-cols-2 gap-s2">
            <ValorDerivado etiqueta="Percepción pasiva" valor={sheet.derived.passivePerception} />
          </section>
        </div>

        {/* --- Columna derecha: lo accionable. --- */}
        <div className="flex min-w-0 flex-col gap-s4">
          <Avisos warnings={sheet.warnings} />
          <EleccionesPendientes
            campaignId={campaignId}
            characterId={characterId}
            pendingChoices={sheet.pendingChoices}
            choicesActuales={character.choices ?? {}}
          />

          <PuntosDeGolpe
            campaignId={campaignId}
            characterId={characterId}
            hp={hp}
            deathSaves={deathSaves}
            puedeEditar={puedeEditar}
          />

          <RecursosYDescansos
            campaignId={campaignId}
            characterId={characterId}
            puedeEditar={puedeEditar}
          />
          <Condiciones
            campaignId={campaignId}
            characterId={characterId}
            puedeEditar={puedeEditar}
          />

          {/* Ataques y conjuros — lo que se hace en un turno */}
          <section aria-label="ataques y conjuros" className="grid grid-cols-2 gap-s2">
            <ValorDerivado
              etiqueta="Ataque cuerpo a cuerpo"
              valor={sheet.derived["attack.melee"]}
            />
            <ValorDerivado etiqueta="Ataque a distancia" valor={sheet.derived["attack.ranged"]} />
            {sheet.derived["attack.spell"] && (
              <ValorDerivado etiqueta="Ataque de conjuro" valor={sheet.derived["attack.spell"]} />
            )}
            {sheet.derived.spellSaveDc && (
              <ValorDerivado
                etiqueta="CD de salvación de conjuro"
                valor={sheet.derived.spellSaveDc}
              />
            )}
          </section>

          {sheet.spellSlots.length > 0 && (
            <section aria-label="espacios de conjuro">
              <p className="mb-s2 font-chrome text-chrome-sm font-semibold text-text">
                Espacios de conjuro (se reponen en{" "}
                {sheet.spellSlotResetOn === "SHORT_REST" ? "descanso corto" : "descanso largo"})
              </p>
              <ul className="flex flex-wrap gap-s2">
                {sheet.spellSlots.map((s) => (
                  <li
                    key={s.spellLevel}
                    className="rounded-radius-sm border border-muted/50 bg-surface px-s2 py-1 font-data text-chrome-xs text-text"
                  >
                    Nivel {s.spellLevel}: {s.slots}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <VelocidadYSentidos
            speeds={sheet.speeds}
            effectiveSpeeds={data.effectiveSpeeds}
            darkvision={sheet.derived["senses.darkvision"]}
          />

          <Anulaciones
            campaignId={campaignId}
            characterId={characterId}
            overrides={data.character.overrides}
          />

          {sheet.features.length > 0 && (
            <section aria-label="rasgos y aptitudes">
              <p className="mb-s2 font-chrome text-chrome-sm font-semibold text-text">
                Rasgos y aptitudes
              </p>
              <ul className="flex flex-wrap gap-s2">
                {sheet.features.map((f) => (
                  <li
                    key={f.labelKey}
                    className="rounded-radius-sm border border-muted/50 bg-surface px-s2 py-1 font-chrome text-chrome-xs text-text"
                  >
                    {f.name}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* **El hueco del inventario (fase 2B).** Rotulado y vacío, no escondido: la CA se
              explica hoy con «sin armadura» porque no hay dónde meter una armadura todavía, y
              decirlo aquí es más honesto que dejar al lector preguntándoselo. */}
          <section
            aria-label="inventario"
            className="rounded-radius-sm border border-dashed border-muted/60 p-s3"
          >
            <p className="flex items-center gap-s2 font-chrome text-chrome-sm font-semibold text-muted">
              <IconoArcon className="h-4 w-4 shrink-0" />
              Inventario
            </p>
            <p className="mt-1 font-chrome text-chrome-xs text-muted">
              Llega en la fase 2B y se enchufa aquí: armadura, escudo y objetos que cambian los
              números de arriba. Hasta entonces la CA se calcula sin equipo.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
