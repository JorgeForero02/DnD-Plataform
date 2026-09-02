import type { ReactNode } from "react";
import { OrnamentRule } from "../../ui/Ornament";

// Reseño 2026-09-02 — audit E1: "pese a que las hojas de personaje se trataran no usa el
// formato de la 5ta edicion".
//
// This is the SHAPE of the real sheet, and deliberately only the shape. The author's own
// instruction the same day: "entra pero no su funcionalidad completa, no quiero dejar tareas
// de la fase 2 aca". The engine — ability scores, proficiency, the derived numbers and every
// formula behind them — is phase 2A, specified in
// docs/superpowers/plans/2026-09-01-fase-2A-motor-y-hoja-de-personaje.md.
//
// So every box below is drawn at its real size, in the real reading order a player uses at
// the table (identity → what keeps you alive → what decides if an action works → what you do
// → context), and every one of them says plainly that it has no value yet. An empty box that
// admits it is empty is honest; an empty box pretending to be a feature is not.
//
// The layout follows Foundry/Tidy5e rather than D&D Beyond: one fixed combat header plus
// grouped blocks. D&D Beyond's three switchable layouts are a lot of engineering for a first
// version, and this gets most of the value at a fraction of the cost.

export function Casilla({
  etiqueta,
  valor,
  nota,
  ancho = "normal",
}: {
  etiqueta: string;
  valor?: ReactNode;
  nota?: string;
  ancho?: "normal" | "ancho";
}) {
  const pendiente = valor === undefined || valor === null || valor === "";
  return (
    <div
      className={[
        "rounded-radius-sm border border-muted/50 bg-surface px-s3 py-s3 text-center",
        ancho === "ancho" ? "col-span-2" : "",
      ].join(" ")}
    >
      <p className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
        {etiqueta}
      </p>
      <p
        className={[
          "mt-1 font-data text-chrome-xl leading-none",
          pendiente ? "text-muted/50" : "text-text",
        ].join(" ")}
      >
        {pendiente ? "—" : valor}
      </p>
      {nota && <p className="mt-1 font-chrome text-chrome-xs text-muted">{nota}</p>}
    </div>
  );
}

const CARACTERISTICAS = [
  { nombre: "Fuerza", corto: "FUE" },
  { nombre: "Destreza", corto: "DES" },
  { nombre: "Constitución", corto: "CON" },
  { nombre: "Inteligencia", corto: "INT" },
  { nombre: "Sabiduría", corto: "SAB" },
  { nombre: "Carisma", corto: "CAR" },
];

// SRD 5.1. Listed in the order the official sheet prints them, grouped by the ability they
// key off, because that grouping is what makes the sheet readable in play.
const HABILIDADES: { nombre: string; caracteristica: string }[] = [
  { nombre: "Acrobacias", caracteristica: "DES" },
  { nombre: "Arcanos", caracteristica: "INT" },
  { nombre: "Atletismo", caracteristica: "FUE" },
  { nombre: "Engaño", caracteristica: "CAR" },
  { nombre: "Historia", caracteristica: "INT" },
  { nombre: "Interpretación", caracteristica: "CAR" },
  { nombre: "Intimidación", caracteristica: "CAR" },
  { nombre: "Investigación", caracteristica: "INT" },
  { nombre: "Juego de manos", caracteristica: "DES" },
  { nombre: "Medicina", caracteristica: "SAB" },
  { nombre: "Naturaleza", caracteristica: "INT" },
  { nombre: "Percepción", caracteristica: "SAB" },
  { nombre: "Perspicacia", caracteristica: "SAB" },
  { nombre: "Persuasión", caracteristica: "CAR" },
  { nombre: "Religión", caracteristica: "INT" },
  { nombre: "Sigilo", caracteristica: "DES" },
  { nombre: "Supervivencia", caracteristica: "SAB" },
  { nombre: "Trato con animales", caracteristica: "SAB" },
];

export function HojaCincoE() {
  return (
    <div className="space-y-s5">
      <div className="rounded-radius-sm border border-dashed border-warning/60 bg-warning/5 px-s4 py-s3">
        <p className="font-chrome text-chrome-sm text-warning-text">
          Esta es la <strong>forma</strong> de la hoja, todavía sin sus números.
        </p>
        <p className="mt-1 max-w-[72ch] font-chrome text-chrome-xs text-muted">
          Las casillas están en su sitio y a su tamaño real para poder decidir la disposición antes
          de construir el motor. Las características, la competencia y todo lo que se calcula a
          partir de ellas llegan en la fase 2A. Ninguna de estas casillas se puede rellenar aún, y
          por eso todas dicen «—» en lugar de fingir un valor.
        </p>
      </div>

      <section>
        <OrnamentRule className="mb-s3">Combate</OrnamentRule>
        <div className="grid grid-cols-2 gap-s3 sm:grid-cols-4">
          <Casilla etiqueta="Clase de armadura" nota="10 + mod. DES, o la armadura que lleves" />
          <Casilla etiqueta="Iniciativa" nota="mod. DES" />
          <Casilla etiqueta="Velocidad" nota="según la raza" />
          <Casilla etiqueta="Competencia" nota="+2 a +6 según el nivel" />
        </div>
        <div className="mt-s3 grid grid-cols-2 gap-s3 sm:grid-cols-4">
          <Casilla etiqueta="Puntos de golpe" nota="actuales y máximos" />
          <Casilla etiqueta="PG temporales" nota="se gastan primero, no se suman" />
          <Casilla etiqueta="Dados de golpe" nota="se recuperan al descanso largo" />
          <Casilla etiqueta="Tiradas de muerte" nota="éxitos y fracasos" />
        </div>
      </section>

      <div className="grid gap-s5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="space-y-s5">
          <section>
            <OrnamentRule className="mb-s3">Características</OrnamentRule>
            <div className="grid grid-cols-3 gap-s2">
              {CARACTERISTICAS.map((c) => (
                <Casilla key={c.corto} etiqueta={c.corto} nota={c.nombre} />
              ))}
            </div>
          </section>

          <section>
            <OrnamentRule className="mb-s3">Salvaciones</OrnamentRule>
            <ul className="divide-y divide-muted/25 rounded-radius-sm border border-muted/40">
              {CARACTERISTICAS.map((c) => (
                <li
                  key={c.corto}
                  className="flex items-center justify-between px-s3 py-1.5 font-chrome text-chrome-sm"
                >
                  <span className="text-muted">{c.nombre}</span>
                  <span className="font-data text-muted/50">—</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-s5">
          <section>
            <OrnamentRule className="mb-s3">Habilidades</OrnamentRule>
            <ul className="grid gap-x-s5 rounded-radius-sm border border-muted/40 p-s2 sm:grid-cols-2">
              {HABILIDADES.map((h) => (
                <li
                  key={h.nombre}
                  className="flex items-center justify-between border-b border-muted/20 px-s2 py-1 font-chrome text-chrome-sm last:border-b-0"
                >
                  <span className="text-muted">
                    {h.nombre}{" "}
                    <span className="font-data text-chrome-xs text-copper-text">
                      {h.caracteristica}
                    </span>
                  </span>
                  <span className="font-data text-muted/50">—</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <OrnamentRule className="mb-s3">Ataques y equipo</OrnamentRule>
            <div className="rounded-radius-sm border border-muted/40 p-s4">
              <p className="max-w-[68ch] font-chrome text-chrome-sm text-muted">
                Aquí van las armas con su bonificador y su daño, y el equipo con{" "}
                <strong className="text-text">casillas de mano</strong>: una espada en una mano y un
                escudo en la otra no dan lo mismo que un arma a dos manos, y la CA y el ataque
                dependen de esa elección. Ese hueco lo detectó el autor y está recogido en la fase
                2A.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
