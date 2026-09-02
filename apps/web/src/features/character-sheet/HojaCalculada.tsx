import { useState } from "react";
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
import { EditorFicha } from "./EditorFicha";
import { Button } from "../../ui/Button";
import { EmptyState } from "../../ui/Collection";
import {
  ABREVIATURA_CARACTERISTICA,
  NOMBRE_CARACTERISTICA,
  NOMBRE_HABILIDAD,
  nombreClase,
  nombreRaza,
  nombreSubraza,
} from "./vocabulario";

// Tarea 2A.10 — la pantalla de la hoja de personaje: lee `GET .../sheet` y enseña la traza de
// cada número derivado, los avisos, las elecciones pendientes, los PG con su delta, recursos y
// descansos, condiciones, velocidad efectiva y sentidos, y deja tirar 1d20+mod desde aquí.
//
// Sigue la rejilla de docs/superpowers/specs/2026-09-02-hoja-5e-design.md §4.3: identidad arriba,
// combate (CA/iniciativa/velocidad/PG) primero, características/habilidades a la izquierda,
// acción y contexto después — el orden en que se consulta la hoja en una partida real.
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
  const [editando, setEditando] = useState(false);

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
        {puedeEditar && (
          <div>
            <Button variant="primary" onClick={() => setEditando(true)}>
              Completar características, raza y clase
            </Button>
          </div>
        )}
        {editando && (
          <EditorFicha
            campaignId={campaignId}
            characterId={characterId}
            character={character}
            onClose={() => setEditando(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-s5">
      <div className="flex flex-wrap items-center justify-between gap-s2">
        <p className="font-chrome text-chrome-sm text-muted">
          {nombreRaza(sheet.raceKey)}
          {sheet.subraceKey ? ` (${nombreSubraza(sheet.subraceKey)})` : ""} ·{" "}
          {nombreClase(sheet.classKey)} · nivel {character.level}
        </p>
        {puedeEditar && (
          <Button variant="ghost" onClick={() => setEditando(true)}>
            Editar clase, raza y características
          </Button>
        )}
      </div>

      <Avisos warnings={sheet.warnings} />
      <EleccionesPendientes
        campaignId={campaignId}
        characterId={characterId}
        pendingChoices={sheet.pendingChoices}
        choicesActuales={character.choices ?? {}}
      />

      {/* Combate: CA, iniciativa, PG — lo que decide si el personaje sigue vivo (§4.3) */}
      <div className="grid grid-cols-2 gap-s2 sm:grid-cols-3">
        <ValorDerivado etiqueta="CA" valor={sheet.derived.ac} />
        <ValorDerivado etiqueta="Iniciativa" valor={sheet.derived.initiative} />
        <ValorDerivado etiqueta="Percepción pasiva" valor={sheet.derived.passivePerception} />
      </div>

      <PuntosDeGolpe
        campaignId={campaignId}
        characterId={characterId}
        hp={hp}
        deathSaves={deathSaves}
        puedeEditar={puedeEditar}
      />

      {/* Características, salvaciones y habilidades — lo que decide si una acción tiene éxito */}
      <div className="grid grid-cols-3 gap-s2 sm:grid-cols-6">
        {ABILITY_KEYS.map((ability) => (
          <ValorDerivado
            key={ability}
            etiqueta={ABREVIATURA_CARACTERISTICA[ability]}
            valor={sheet.derived[`abilityMod.${ability}`]}
          />
        ))}
      </div>

      <div className="grid gap-s5 md:grid-cols-2">
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
      </div>

      <VelocidadYSentidos
        speeds={sheet.speeds}
        effectiveSpeeds={data.effectiveSpeeds}
        darkvision={sheet.derived["senses.darkvision"]}
      />

      {/* Ataques y conjuros — lo que se hace en un turno */}
      <section aria-label="ataques y conjuros" className="grid grid-cols-2 gap-s2 sm:grid-cols-4">
        <ValorDerivado etiqueta="Ataque cuerpo a cuerpo" valor={sheet.derived["attack.melee"]} />
        <ValorDerivado etiqueta="Ataque a distancia" valor={sheet.derived["attack.ranged"]} />
        {sheet.derived["attack.spell"] && (
          <ValorDerivado etiqueta="Ataque de conjuro" valor={sheet.derived["attack.spell"]} />
        )}
        {sheet.derived.spellSaveDc && (
          <ValorDerivado etiqueta="CD de salvación de conjuro" valor={sheet.derived.spellSaveDc} />
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

      <RecursosYDescansos
        campaignId={campaignId}
        characterId={characterId}
        puedeEditar={puedeEditar}
      />
      <Condiciones campaignId={campaignId} characterId={characterId} puedeEditar={puedeEditar} />

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

      {editando && (
        <EditorFicha
          campaignId={campaignId}
          characterId={characterId}
          character={character}
          onClose={() => setEditando(false)}
        />
      )}
    </div>
  );
}
