import { useState } from "react";
import type {
  CharacterSpellState,
  ModeloDePreparacion,
  SpellbookEntry,
  SpellSchool,
} from "@dnd/shared";
import { fraseDeTope, NOMBRE_ESCUELA, NOMBRE_NIVEL_CONJURO } from "../../dominio/conjuros";
import { TarjetaDeHoja } from "../character-sheet/Tarjeta";
import { EmptyState, FilterChip } from "../../ui/Collection";
import { fieldControlClass } from "../../ui/Field";
import { normalizarTexto } from "../../lib/texto";
import { FilaDeConjuro } from "./FilaDeConjuro";
import { LanzarConjuro } from "./LanzarConjuro";
import { useSetSpellState, useSpellbook } from "./hooks";

// Tarea 6 de 3A.2 («elegir, lanzar y usar») — la pestaña «Conjuros»: elegir. Dos zonas (spec §5):
// «Listos para lanzar» (lo que ya se puede lanzar hoy) y «Disponibles» (lo que se puede preparar,
// aprender o añadir al libro), con un buscador y filtros por nivel y escuela en la segunda.
//
// **Ningún botón se deshabilita por tope.** El servidor cuenta y avisa (`avisos`,
// `SPELLBOOK_CHANGED.fueraDeRegla`); esta pantalla nunca decide que algo «no se puede» —eso lo
// decide el DM en la mesa, y a veces una emergencia justifica preparar de más.

function ordenar(entradas: SpellbookEntry[]): SpellbookEntry[] {
  return [...entradas].sort((a, b) => a.level - b.level || a.nameEs.localeCompare(b.nameEs, "es"));
}

/**
 * El verbo de la acción de «Listos para lanzar»: quitar del todo, salvo el mago con un conjuro
 * PREPARADO, que solo baja un peldaño hasta EN_EL_LIBRO (ruling de la Task 3: `estado: null` en
 * ese caso concreto es DESPREPARADO, no OLVIDADO — la copia del libro no se pierde).
 */
function rotuloDeQuitar(modelo: ModeloDePreparacion, esTruco: boolean): string {
  return modelo === "LIBRO" && !esTruco ? "Dejar de preparar" : "Quitar";
}

/** El verbo (y el estado nuevo) de la acción de «Disponibles», según el modelo de la clase. */
function accionDisponible(
  entrada: SpellbookEntry,
  modelo: ModeloDePreparacion,
): { rotulo: string; estado: CharacterSpellState } {
  if (entrada.level === 0) return { rotulo: "Conocer", estado: "CONOCIDO" };
  if (modelo === "LIBRO") {
    if (entrada.estado === "EN_EL_LIBRO") return { rotulo: "Preparar", estado: "PREPARADO" };
    return { rotulo: "Añadir al libro", estado: "EN_EL_LIBRO" };
  }
  if (modelo === "CONOCIDOS") return { rotulo: "Aprender", estado: "CONOCIDO" };
  // PREPARA_DE_LISTA (clérigo, druida...): siempre se prepara directamente de la lista.
  return { rotulo: "Preparar", estado: "PREPARADO" };
}

interface Filtro {
  texto: string;
  /** `0` es «Truco»; `null` es «todos los niveles». */
  nivel: number | null;
  escuela: SpellSchool | null;
}

const SIN_FILTRO: Filtro = { texto: "", nivel: null, escuela: null };

const ORDEN_ESCUELAS: SpellSchool[] = ["abj", "con", "div", "enc", "evo", "ill", "nec", "trs"];

export function LibroDeConjuros({
  campaignId,
  characterId,
  puedeEditar,
}: {
  campaignId: string;
  characterId: string;
  puedeEditar: boolean;
}) {
  const { data, isLoading, isError } = useSpellbook(campaignId, characterId);
  const setEstado = useSetSpellState(campaignId, characterId);
  const [filtro, setFiltro] = useState<Filtro>(SIN_FILTRO);

  if (isError) {
    return (
      <p role="alert" className="font-chrome text-chrome-xs text-danger-text">
        No se ha podido cargar tu libro de conjuros.
      </p>
    );
  }

  if (isLoading || !data) {
    return <p className="font-chrome text-chrome-xs text-muted">Cargando conjuros…</p>;
  }

  if (data.modelo === "NINGUNO") {
    // Casi nunca se ve: `HojaCalculada` solo monta esta pestaña cuando `lanzaConjuros(sheet)`.
    return <EmptyState title="Esta clase no lanza conjuros" />;
  }

  const errorDe = (spellKey: string): string | undefined =>
    setEstado.isError && setEstado.variables?.spellKey === spellKey
      ? (setEstado.error as Error).message
      : undefined;

  const listos = ordenar(data.entradas.filter((e) => e.lanzable));
  const disponiblesTodas = ordenar(data.entradas.filter((e) => !e.lanzable));

  const nivelesPresentes = [...new Set(disponiblesTodas.map((e) => e.level))].sort((a, b) => a - b);
  const escuelasPresentes = ORDEN_ESCUELAS.filter((esc) =>
    disponiblesTodas.some((e) => e.school === esc),
  );

  const texto = normalizarTexto(filtro.texto);
  const disponiblesFiltradas = disponiblesTodas.filter((e) => {
    if (filtro.nivel !== null && e.level !== filtro.nivel) return false;
    if (filtro.escuela !== null && e.school !== filtro.escuela) return false;
    if (texto && !normalizarTexto(e.nameEs).includes(texto)) return false;
    return true;
  });

  const contador = (["preparados", "trucos", "libro", "conocidos"] as const)
    .filter((clave) => data.topes[clave] !== undefined)
    .map((clave) => fraseDeTope(clave, data.topes[clave]!))
    .join(" · ");

  return (
    <div className="flex flex-col gap-s4">
      <TarjetaDeHoja titulo="Listos para lanzar" etiqueta="listos para lanzar">
        {contador && (
          <p className="mb-s2 font-data text-chrome-xs tabular-nums text-muted">{contador}</p>
        )}
        {data.avisos.length > 0 && (
          <p role="status" className="mb-s2 font-chrome text-chrome-xs text-warning-text">
            Por encima del tope: el DM decide.
          </p>
        )}
        {listos.length === 0 ? (
          <p className="font-chrome text-chrome-xs text-muted">
            Todavía no tienes ningún conjuro listo para lanzar.
          </p>
        ) : (
          <ul>
            {listos.map((entrada) => {
              const esTruco = entrada.level === 0;
              return (
                <FilaDeConjuro
                  key={entrada.key}
                  campaignId={campaignId}
                  characterId={characterId}
                  entrada={entrada}
                  error={errorDe(entrada.key)}
                  accion={
                    puedeEditar
                      ? {
                          rotulo: rotuloDeQuitar(data.modelo, esTruco),
                          ocupado:
                            setEstado.isPending && setEstado.variables?.spellKey === entrada.key,
                          onClick: () => setEstado.mutate({ spellKey: entrada.key, estado: null }),
                        }
                      : undefined
                  }
                  // Task 7: el botón «Lanzar», gated por el mismo `puedeEditar` que la acción de
                  // preparar — dueño o DM, igual que el resto de controles que escriben sobre
                  // este personaje.
                  accionPrincipal={
                    puedeEditar ? (
                      <LanzarConjuro
                        campaignId={campaignId}
                        characterId={characterId}
                        entrada={entrada}
                        espacios={data.espacios}
                      />
                    ) : undefined
                  }
                />
              );
            })}
          </ul>
        )}
      </TarjetaDeHoja>

      <TarjetaDeHoja titulo="Disponibles" etiqueta="disponibles">
        <div className="mb-s3 flex flex-col gap-s2">
          <input
            type="search"
            aria-label="Buscar conjuro"
            placeholder="Buscar conjuro"
            value={filtro.texto}
            onChange={(e) => setFiltro({ ...filtro, texto: e.target.value })}
            className={fieldControlClass}
          />
          <div className="flex flex-wrap items-center gap-s2">
            {nivelesPresentes.map((nivel) => (
              <FilterChip
                key={nivel}
                active={filtro.nivel === nivel}
                onClick={() =>
                  setFiltro({ ...filtro, nivel: filtro.nivel === nivel ? null : nivel })
                }
              >
                {NOMBRE_NIVEL_CONJURO(nivel)}
              </FilterChip>
            ))}
          </div>
          {escuelasPresentes.length > 0 && (
            <div className="flex flex-wrap items-center gap-s2">
              {escuelasPresentes.map((escuela) => (
                <FilterChip
                  key={escuela}
                  active={filtro.escuela === escuela}
                  onClick={() =>
                    setFiltro({ ...filtro, escuela: filtro.escuela === escuela ? null : escuela })
                  }
                >
                  {NOMBRE_ESCUELA[escuela]}
                </FilterChip>
              ))}
            </div>
          )}
        </div>
        {disponiblesFiltradas.length === 0 ? (
          <p className="font-chrome text-chrome-xs text-muted">
            Ningún conjuro coincide con la búsqueda.
          </p>
        ) : (
          <ul>
            {disponiblesFiltradas.map((entrada) => {
              const { rotulo, estado } = accionDisponible(entrada, data.modelo);
              return (
                <FilaDeConjuro
                  key={entrada.key}
                  campaignId={campaignId}
                  characterId={characterId}
                  entrada={entrada}
                  error={errorDe(entrada.key)}
                  fueraDelLibro={
                    data.modelo === "LIBRO" && entrada.estado === null && entrada.level > 0
                  }
                  accion={
                    puedeEditar
                      ? {
                          rotulo,
                          variant: "primary",
                          ocupado:
                            setEstado.isPending && setEstado.variables?.spellKey === entrada.key,
                          onClick: () => setEstado.mutate({ spellKey: entrada.key, estado }),
                        }
                      : undefined
                  }
                />
              );
            })}
          </ul>
        )}
      </TarjetaDeHoja>
    </div>
  );
}
