import type { ReactNode } from "react";
import type { LevelUpPreview } from "./api";
import {
  conSigno,
  dadosDeGolpe,
  frasesDeEspacios,
  nombreMetodoPg,
  nombreOrigenAptitud,
} from "./vocabulario";

// Tarea 2A.11 — el diff que propone el servidor, pintado tal cual.
//
// **Aquí no se calcula nada.** Todos los números salen del previo
// (`GET .../level-up/preview`): los PG máximos de antes y de después, el delta, el bonificador
// de competencia, los dados de golpe, los espacios y las aptitudes. Ni siquiera se resta
// `delta − conModifier` para enseñar «la media valía 6»: ese número el previo no lo manda, y
// deducirlo aquí sería reimplementar `averageHitDie` en el navegador. Se explica la regla con
// palabras y se enseñan los datos que sí vienen.

function Fila({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-s2 border-t border-muted py-s2 first:border-t-0">
      <dt className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
        {etiqueta}
      </dt>
      <dd className="font-data text-chrome-sm text-text">{children}</dd>
    </div>
  );
}

export function DiffNivel({ previo }: { previo: LevelUpPreview }) {
  const espaciosNuevos = frasesDeEspacios(previo.spellSlots.to);
  const espaciosViejos = frasesDeEspacios(previo.spellSlots.from);

  return (
    <div className="space-y-s3">
      <p className="font-data text-chrome-xl leading-none text-text">
        Nivel {previo.from} → {previo.to}
      </p>

      <dl className="rounded-radius-sm border border-muted bg-surface px-s3 py-s2">
        <Fila etiqueta="Puntos de golpe máximos">
          <span>
            {previo.hp.current} → {previo.hp.next}{" "}
            <span className="text-accent-text">({conSigno(previo.hp.delta)})</span>
          </span>
        </Fila>

        <Fila etiqueta="Bonificador de competencia">
          {previo.proficiencyBonus.changed ? (
            <span>
              {conSigno(previo.proficiencyBonus.from)} → {conSigno(previo.proficiencyBonus.to)}
            </span>
          ) : (
            <span className="text-muted">No cambia ({conSigno(previo.proficiencyBonus.from)})</span>
          )}
        </Fila>

        <Fila etiqueta="Dados de golpe">
          <span>
            {dadosDeGolpe(previo.hitDice.from, previo.hitDice.dieSize)} →{" "}
            {dadosDeGolpe(previo.hitDice.to, previo.hitDice.dieSize)}
          </span>
        </Fila>

        {previo.attacksPerAction.changed && (
          <Fila etiqueta="Ataques por acción">
            <span>
              {previo.attacksPerAction.from} → {previo.attacksPerAction.to}
            </span>
          </Fila>
        )}

        {previo.spellSlots.changed && (
          <Fila etiqueta="Espacios de conjuro">
            <span className="text-right">
              {espaciosViejos.length > 0 ? espaciosViejos.join(", ") : "ninguno"} →{" "}
              {espaciosNuevos.length > 0 ? espaciosNuevos.join(", ") : "ninguno"}
            </span>
          </Fila>
        )}
      </dl>

      <p className="font-chrome text-chrome-xs text-muted">
        {nombreMetodoPg(previo.hp.method)} (d{previo.hp.hitDie}) con Constitución{" "}
        {conSigno(previo.hp.conModifier)}.{" "}
        {previo.hp.method === "AVERAGE"
          ? "La media fija del SRD es la mitad del dado más uno, redondeando hacia arriba."
          : "Esta tirada ya quedó registrada en la campaña."}
      </p>

      {previo.hp.roll && (
        <p className="font-data text-chrome-sm text-text">
          Tirada {previo.hp.roll.expression}: sacaste {previo.hp.roll.rolled}, que con Constitución
          da {conSigno(previo.hp.roll.total)} PG.
        </p>
      )}

      <section aria-label="aptitudes nuevas">
        <h3 className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
          Aptitudes nuevas
        </h3>
        {previo.newFeatures.length === 0 ? (
          <p className="mt-1 font-chrome text-chrome-sm text-muted">
            Este nivel no concede ninguna aptitud nueva.
          </p>
        ) : (
          <ul className="mt-1 space-y-1">
            {previo.newFeatures.map((aptitud) => (
              <li key={`${aptitud.source}:${aptitud.key}`} className="flex items-baseline gap-s2">
                <span className="rounded-radius-sm border border-copper px-s2 py-0.5 font-chrome text-chrome-xs text-copper-text">
                  {nombreOrigenAptitud(aptitud.source)}
                </span>
                <span className="font-chrome text-chrome-sm text-text">{aptitud.name}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {previo.abilityScoreImprovementPending && (
        <p role="note" className="font-chrome text-chrome-xs text-warning-text">
          A este nivel toca una mejora de puntuación de característica. Todavía no se puede elegir
          aquí: la aplicación no modela esa elección, así que se acuerda en la mesa y se escribe a
          mano en las características del personaje.
        </p>
      )}
    </div>
  );
}
