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
import { AtaquesYLanzamiento } from "./AtaquesYLanzamiento";
import { DadosDeGolpe, PercepcionPasiva, SalvacionesDeMuerte } from "./TarjetasDeEstado";
import { Personalidad, RasgosYAptitudes } from "./BloquesDelPie";
import { AvisoDeDm } from "./AvisoDeDm";
import { BotonSubirNivel } from "../level-up/BotonSubirNivel";
import { IdentidadEditable } from "./IdentidadEditable";
import { EmptyState } from "../../ui/Collection";
import { ABREVIATURA_CARACTERISTICA, NOMBRE_CARACTERISTICA, NOMBRE_HABILIDAD } from "./vocabulario";
import { HojaDeVitela, PROSA_DE_VITELA, ROTULO_DE_CASILLA, RotuloDeSeccion } from "./Vitela";

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
// **Tarea H4 — la costura entre las dos pieles**, que es justo la línea entre la cabecera y las
// columnas. Y no separa solo dos colores; separa tres cosas a la vez, y por eso está donde está:
//
//  · **Dos pieles.** Arriba, cromado: `--bg`, sans de interfaz, escala pequeña, denso. Abajo,
//    vitela: `--vellum`, serif del mundo, filetes de cobre, interlineado de lectura.
//  · **Dos patrones de guardado.** Arriba no se guarda nada —los cinco números de la cabecera
//    son de solo lectura a propósito—. Abajo vive TODA la edición, con sus dos patrones
//    (`EdicionEnSitio.tsx`): automático donde el gesto es la acción entera, explícito donde
//    escribir es un proceso.
//  · **Dos formas de usar la hoja.** Arriba se consulta en mitad de un turno, sin desplazar.
//    Abajo se lee y se decide entre turnos.
//
// El cambio de piel es un contenedor —`HojaDeVitela`, en `Vitela.tsx`— y una propiedad `piel`
// en `ValorDerivado`, no una reescritura. Ese contenedor es **hermano** de la cabecera fija, no
// su padre: `sticky` se pega dentro de su padre, y envolver la cabecera en la hoja la habría
// soltado sin que ninguna prueba unitaria se enterase (lo dice el punto 7 de `e2e/hoja.spec.ts`).
//
// --- Adopción de la maqueta de Figma (2026-09-02) ------------------------------------------
//
// El autor encargó una maqueta y prefiere su hoja a la nuestra. **Manda ella en disposición,
// densidad y estructura**, salvo donde choque con una regla vinculante o con lo que hace el
// servidor. Lo que se ha traído, y lo que se ha traducido en vez de copiarse:
//
//  1. **La cabecera es una tira compacta**, no una banda de cinco tarjetas altas.
//  2. **La casilla de característica lleva el modificador grande y la puntuación pequeña
//     debajo** (`IdentidadEditable.tsx`). La maqueta tiene razón: en la mesa se usa el
//     modificador y la puntuación es su causa. **La afordancia se mantiene al revés que el
//     tamaño**: la puntuación, que es lo editable, es la que lleva el subrayado; el modificador,
//     que es derivado, no lleva ninguno. Es la primera vez en esta hoja que lo pequeño es lo que
//     se toca, así que la ausencia de subrayado en el número grande es lo único que lo dice.
//  3. **La Clase de Armadura tiene su propia tarjeta con la fórmula en línea.**
//  4. **Una fila de tarjetas pequeñas** bajo las columnas (`TarjetasDeEstado.tsx`).
//  5. **«Ataques y lanzamiento» es una tabla** (`AtaquesYLanzamiento.tsx`).
//  6. **Un pie de bloques de lectura** (`BloquesDelPie.tsx`).
//  7. **Un aviso para el DM** (`AvisoDeDm.tsx`), con el texto corregido: el de la maqueta
//     promete algo que el servidor no hace.
//
// **Lo que NO se ha traído: la piel.** La maqueta es toda cromado; esta hoja estrenó cuerpo de
// vitela en la tarea H4 y las dos pieles son una decisión de identidad ya tomada y documentada
// (docs/04-convenciones.md). Se adopta la disposición sobre la piel que ya había.
//
// **Y la maqueta usa metros («Vel. 9 m») y aquí siguen los pies.** No es un descuido: los pasos
// de la traza vienen del servidor en pies, y convertir solo el total dejaría un «9 m» explicado
// por un «30 velocidad base». La conversión, si se quiere, es del motor entero o de nada.
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
      {/* **La cabecera fija, ahora una TIRA COMPACTA.** Es el cambio de la maqueta que más sitio
          devuelve: cinco casillas altas con su fórmula debajo se comían media pantalla de un
          portátil para enseñar cinco números de dos cifras. `top-16` es la altura de la cabecera
          de la aplicación (`ui/AppShell.tsx`, `h-16`), que también es fija: este bloque se apoya
          justo debajo en vez de deslizarse por detrás. Sigue siendo la piel de **cromado**.

          Va **alineada a la derecha** porque en la maqueta vive a la derecha del nombre del
          personaje, y el nombre lo pinta la página (`CharacterDetailPage.tsx`), que está fuera de
          la frontera de esta tarea. A la derecha queda debajo del nombre y a su altura visual;
          a la izquierda chocaría con él. */}
      <section
        aria-label="resumen de combate"
        className="sticky top-16 z-20 -mx-s2 border-b border-copper bg-[color:var(--chrome-veil)] px-s2 py-s2 backdrop-blur"
      >
        <div className="flex flex-wrap items-start justify-end gap-s2">
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
              aplica en su bloque de la columna derecha, que es donde está la acción. Repetir
              aquí el control sería el mismo dato en dos sitios, que es como se acaba con uno de
              los dos mintiendo. El rótulo dice «PG» y no «Puntos de golpe» justamente para que
              no haya dos cosas llamadas igual en la misma pantalla. */}
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
      </section>

      {/* El cuerpo, ya en vitela. `HojaDeVitela` es HERMANO de la cabecera de arriba, nunca su
          padre — ver la nota de la costura al principio del fichero. */}
      <HojaDeVitela>
        <div className="flex flex-col gap-s5">
          <AvisoDeDm campaignId={campaignId} />

          <div className="grid items-start gap-s5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            {/* --- Columna izquierda: la cadena que explica los números. NO se intercala nada
                entre características, salvaciones y habilidades. --- */}
            <div className="flex min-w-0 flex-col gap-s5">
              <IdentidadEditable
                campaignId={campaignId}
                characterId={characterId}
                character={character}
                sheet={sheet}
                puedeEditar={puedeEditar}
              />

              <section aria-label="salvaciones">
                <RotuloDeSeccion>Salvaciones</RotuloDeSeccion>
                {ABILITY_KEYS.map((ability) => (
                  <ValorDerivado
                    piel="vitela"
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
                        derivado={sheet.derived[`save.${ability}`]}
                      />
                    }
                  />
                ))}
              </section>

              <section aria-label="habilidades">
                <RotuloDeSeccion>Habilidades</RotuloDeSeccion>
                {ABILITY_KEYS.flatMap((ability) =>
                  HABILIDADES_POR_CARACTERISTICA[ability].map((skill) => (
                    <ValorDerivado
                      piel="vitela"
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
                          derivado={sheet.derived[`skill.${skill}`]}
                        />
                      }
                    />
                  )),
                )}
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
                puedeEditar={puedeEditar}
              />

              {/* **La Clase de Armadura, con su fórmula en línea** — la tarjeta de la maqueta.
                  La cifra sale también arriba en la tira, y eso está bien: son el mismo valor
                  derivado leído del mismo sitio, así que no pueden discrepar. Lo que aporta esta
                  tarjeta es la explicación a tamaño de lectura, que en una casilla de la tira no
                  cabe — que es exactamente el reparto que hace la maqueta. */}
              <section aria-label="clase de armadura">
                <ValorDerivado
                  piel="vitela"
                  variante="tarjeta"
                  etiqueta="Clase de armadura"
                  valor={sheet.derived.ac}
                />
              </section>

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

              {sheet.spellSlots.length > 0 && (
                <section aria-label="espacios de conjuro">
                  <RotuloDeSeccion>
                    Espacios de conjuro (se reponen en{" "}
                    {sheet.spellSlotResetOn === "SHORT_REST" ? "descanso corto" : "descanso largo"})
                  </RotuloDeSeccion>
                  <ul className="flex flex-wrap gap-s2">
                    {sheet.spellSlots.map((s) => (
                      <li
                        key={s.spellLevel}
                        className="rounded-radius-sm border border-copper px-s2 py-1 font-data text-chrome-sm text-text"
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

              {/* **El hueco del inventario (fase 2B).** Rotulado y vacío, no escondido: la CA se
                  explica hoy con «sin armadura» porque no hay dónde meter una armadura todavía, y
                  decirlo aquí es más honesto que dejar al lector preguntándoselo. */}
              <section
                aria-label="inventario"
                className="rounded-radius-sm border border-dashed border-[color:var(--copper-rule)] p-s3"
              >
                {/* El filete sigue siendo **de trazos** y no continuo, que es lo que distingue un
                    sitio reservado de un sitio con algo dentro: en la hoja impresa, un recuadro
                    punteado es la casilla que todavía no se ha rellenado. */}
                <p className="flex items-center gap-s2 font-title text-world-base text-muted">
                  <IconoArcon className="h-[1em] w-[1em] shrink-0" />
                  Inventario
                </p>
                <p className={`mt-1 ${PROSA_DE_VITELA}`}>
                  Llega en la fase 2B y se enchufa aquí: armadura, escudo y objetos que cambian los
                  números de arriba. Hasta entonces la CA se calcula sin equipo.
                </p>
              </section>

              {/* La subida de nivel vive en su propia feature (2A.11): esta hoja solo la monta.
                  En la maqueta es un botón del bloque accionable, no un adorno suelto flotando
                  sobre la cabecera, y ahí se lee mejor: al lado de lo que cambia al pulsarlo. */}
              {puedeEditar && (
                <BotonSubirNivel
                  campaignId={campaignId}
                  characterId={characterId}
                  level={character.level}
                />
              )}
            </div>
          </div>

          {/* **La fila de tarjetas pequeñas** de la maqueta, a todo lo ancho y por debajo de las
              dos columnas: lo que se consulta de un vistazo y no se decide en un turno. */}
          <section aria-label="valores pasivos" className="grid gap-s3 sm:grid-cols-3">
            <PercepcionPasiva valor={sheet.derived.passivePerception} />
            <DadosDeGolpe
              campaignId={campaignId}
              characterId={characterId}
              puedeEditar={puedeEditar}
            />
            <SalvacionesDeMuerte
              campaignId={campaignId}
              characterId={characterId}
              deathSaves={deathSaves}
              puedeEditar={puedeEditar}
            />
          </section>

          <AtaquesYLanzamiento campaignId={campaignId} characterId={characterId} sheet={sheet} />

          {/* El pie: lo que se lee una vez por sesión y no se consulta en mitad de un turno. */}
          <div className="grid items-start gap-s4 lg:grid-cols-2">
            <RasgosYAptitudes features={sheet.features} />
            <Personalidad bio={character.bio} />
          </div>
        </div>
      </HojaDeVitela>
    </div>
  );
}
