import { useState } from "react";
import type { ChangeSetMemberInput } from "@dnd/shared";
import { Button } from "../../ui/Button";
import { fieldControlClass } from "../../ui/Field";
import { EmptyState } from "../../ui/Collection";
import { IconoMas } from "../../ui/Iconos";
import { useMembers } from "../campaigns/members";
import { useCharacters } from "../characters/hooks";
import { useAllEntities } from "../entities/hooks";
import {
  useAddSetMember,
  useCreateSet,
  useFlags,
  useRaiseSignal,
  useRemoveSetMember,
  useSetFlag,
  useSets,
} from "./hooks";
import {
  NOMBRE_TIPO_DE_MIEMBRO,
  NOMBRE_TIPO_DE_MIEMBRO_CORTO,
  TIPOS_DE_MIEMBRO,
} from "./vocabulario";

// **La pantalla que le faltaba a 2A.15.** Marcas, conjuntos y señales existían en el servidor
// desde la fase 2A y **ninguna pantalla las llamaba** (auditoría de la mesa, §8.1): el DM no
// podía poner la primera marca de una cadena de reglas, así que una regla que espera una marca
// no se disparaba nunca.
//
// **Es, literalmente, «Marcas del mundo» y «Conjuntos» de la solapa «Lo que sabe la mesa» del
// taller** (`prototipo/src/taller/LoQueSabeLaMesa.tsx`). Vive aquí, junto a su capa de datos, y
// se monta hoy en la pestaña de Reglas —que es donde estas tres cosas se usan— para que se
// pueda jugar con ellas. El día que el taller exista, se mueve entero, o el taller consume los
// hooks de `./hooks.ts` y monta su propia disposición: por eso los hooks son la frontera
// exportada y no este componente.
//
// **El identificador de un miembro no se teclea.** Un conjunto guarda cuids, y pedirle a un DM
// que copie un cuid a mano es garantizar que el conjunto acabe con basura. Se ofrecen las
// personas, los personajes y las fichas de la campaña por su nombre, y lo que viaja es su id.

/** El nombre legible de un miembro ya guardado, o su id si ya no está (se borró, por ejemplo). */
function useNombreDeMiembro(campaignId: string) {
  const miembros = useMembers(campaignId);
  const personajes = useCharacters(campaignId);
  const entidades = useAllEntities(campaignId);

  const candidatos: Record<ChangeSetMemberInput["memberType"], { id: string; nombre: string }[]> = {
    user: (miembros.data ?? []).map((m) => ({ id: m.userId, nombre: m.displayName })),
    character: (personajes.data ?? []).map((c) => ({ id: c.id, nombre: c.name })),
    entity: (entidades.data ?? []).map((e) => ({ id: e.id, nombre: e.name })),
  };

  function nombre(tipo: ChangeSetMemberInput["memberType"], id: string): string {
    // **Si no se encuentra, se dice el id, no se inventa un nombre.** Un miembro puede quedar
    // apuntando a algo que ya no existe, y esconderlo dejaría al DM sin poder quitarlo.
    return candidatos[tipo].find((c) => c.id === id)?.nombre ?? id;
  }

  return { candidatos, nombre };
}

function Marcas({ campaignId }: { campaignId: string }) {
  const flags = useFlags(campaignId);
  const poner = useSetFlag(campaignId);
  const [nueva, setNueva] = useState("");

  return (
    <section aria-label="Marcas del mundo" className="space-y-s2">
      <header className="space-y-1">
        <h3 className="font-title text-chrome-lg text-text">Marcas del mundo</h3>
        <p className="font-chrome text-chrome-sm text-muted">
          Un hecho que la campaña recuerda: «el puente está caído». Las reglas las leen y las
          escriben, y desde aquí las pones tú.
        </p>
      </header>

      <form
        className="flex flex-wrap items-center gap-s2"
        onSubmit={(e) => {
          e.preventDefault();
          const key = nueva.trim();
          if (!key) return;
          poner.mutate({ key, value: true }, { onSuccess: () => setNueva("") });
        }}
      >
        <label className="sr-only" htmlFor="marca-nueva">
          Nombre de la marca
        </label>
        <input
          id="marca-nueva"
          className={fieldControlClass + " w-64"}
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          placeholder="puente-caido"
          maxLength={60}
        />
        <Button type="submit" variant="primary" disabled={!nueva.trim() || poner.isPending}>
          Poner la marca
        </Button>
      </form>

      {flags.isLoading && <p className="font-chrome text-chrome-sm text-muted">Cargando marcas…</p>}
      {flags.isError && (
        <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
          {(flags.error as Error).message}
        </p>
      )}
      {flags.isSuccess &&
        (flags.data.length === 0 ? (
          <EmptyState title="Todavía no hay ninguna marca">
            Escribe un nombre arriba. Una marca puesta puede disparar una regla armada sobre ella.
          </EmptyState>
        ) : (
          <ul className="space-y-1">
            {flags.data.map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-s2 rounded-radius-sm border border-muted px-s3 py-s2"
                data-testid="marca-del-mundo"
              >
                <span className="font-chrome text-chrome-sm text-text">{f.key}</span>
                <span className="flex items-center gap-s2">
                  <span
                    className={`font-chrome text-chrome-xs ${f.value ? "text-copper-text" : "text-muted"}`}
                  >
                    {f.value ? "Puesta" : "Quitada"}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={poner.isPending}
                    onClick={() => poner.mutate({ key: f.key, value: !f.value })}
                  >
                    {f.value ? "Quitarla" : "Ponerla"}
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        ))}
      {poner.isError && (
        <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
          {(poner.error as Error).message}
        </p>
      )}
    </section>
  );
}

function Conjuntos({ campaignId }: { campaignId: string }) {
  const sets = useSets(campaignId);
  const crear = useCreateSet(campaignId);
  const anadir = useAddSetMember(campaignId);
  const quitar = useRemoveSetMember(campaignId);
  const { candidatos, nombre } = useNombreDeMiembro(campaignId);

  const [clave, setClave] = useState("");
  const [rotulo, setRotulo] = useState("");
  const [tipo, setTipo] = useState<ChangeSetMemberInput["memberType"]>("user");
  const [miembro, setMiembro] = useState("");
  const [enQueConjunto, setEnQueConjunto] = useState("");

  const listaDeCandidatos = candidatos[tipo];

  return (
    <section aria-label="Conjuntos" className="space-y-s2">
      <header className="space-y-1">
        <h3 className="font-title text-chrome-lg text-text">Conjuntos</h3>
        <p className="font-chrome text-chrome-sm text-muted">
          Quién sabe qué: «los que saben lo del posadero». Añadir dos veces a la misma persona no la
          duplica.
        </p>
      </header>

      <form
        className="flex flex-wrap items-center gap-s2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!clave.trim() || !rotulo.trim()) return;
          crear.mutate(
            { key: clave.trim(), label: rotulo.trim() },
            {
              onSuccess: () => {
                setClave("");
                setRotulo("");
              },
            },
          );
        }}
      >
        <label className="sr-only" htmlFor="conjunto-clave">
          Nombre corto del conjunto
        </label>
        <input
          id="conjunto-clave"
          className={fieldControlClass + " w-48"}
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          placeholder="saben-lo-del-posadero"
          maxLength={60}
        />
        <label className="sr-only" htmlFor="conjunto-rotulo">
          Cómo se llama en la mesa
        </label>
        <input
          id="conjunto-rotulo"
          className={fieldControlClass + " w-64"}
          value={rotulo}
          onChange={(e) => setRotulo(e.target.value)}
          placeholder="Los que saben lo del posadero"
          maxLength={120}
        />
        <Button
          type="submit"
          variant="primary"
          disabled={!clave.trim() || !rotulo.trim() || crear.isPending}
        >
          <IconoMas />
          Crear el conjunto
        </Button>
      </form>
      {crear.isError && (
        <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
          {(crear.error as Error).message}
        </p>
      )}

      {sets.isLoading && (
        <p className="font-chrome text-chrome-sm text-muted">Cargando conjuntos…</p>
      )}
      {sets.isSuccess &&
        (sets.data.length === 0 ? (
          <EmptyState title="Todavía no hay ningún conjunto">
            Un conjunto es la respuesta a «¿quién sabe esto?», y una regla puede preguntar por su
            tamaño o por si alguien está dentro.
          </EmptyState>
        ) : (
          <>
            <ul className="space-y-s2">
              {sets.data.map((s) => (
                <li
                  key={s.id}
                  className="rounded-radius-sm border border-muted px-s3 py-s2"
                  data-testid="conjunto-del-mundo"
                >
                  <p className="font-chrome text-chrome-sm text-text">
                    {s.label}{" "}
                    <span className="font-chrome text-chrome-xs text-muted">({s.key})</span>
                  </p>
                  {s.members.length === 0 ? (
                    <p className="font-chrome text-chrome-xs text-muted">Todavía no hay nadie.</p>
                  ) : (
                    <ul className="mt-1 space-y-0.5">
                      {s.members.map((m) => (
                        <li
                          key={m.id}
                          className="flex items-center justify-between gap-s2 font-chrome text-chrome-xs text-muted"
                        >
                          <span>
                            {nombre(m.memberType, m.memberId)}{" "}
                            <span className="text-muted">
                              · {NOMBRE_TIPO_DE_MIEMBRO_CORTO[m.memberType]}
                            </span>
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={quitar.isPending}
                            aria-label={`Quitar a ${nombre(m.memberType, m.memberId)} de ${s.label}`}
                            onClick={() =>
                              quitar.mutate({
                                key: s.key,
                                memberType: m.memberType,
                                memberId: m.memberId,
                              })
                            }
                          >
                            Quitar
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>

            <form
              className="flex flex-wrap items-center gap-s2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!enQueConjunto || !miembro) return;
                anadir.mutate({ key: enQueConjunto, memberType: tipo, memberId: miembro });
              }}
            >
              <label className="font-chrome text-chrome-xs text-muted" htmlFor="conjunto-destino">
                Añadir a
              </label>
              <select
                id="conjunto-destino"
                className={fieldControlClass + " w-56"}
                value={enQueConjunto}
                onChange={(e) => setEnQueConjunto(e.target.value)}
              >
                <option value="">Elige un conjunto</option>
                {sets.data.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <label className="sr-only" htmlFor="conjunto-tipo">
                Qué clase de miembro
              </label>
              <select
                id="conjunto-tipo"
                className={fieldControlClass + " w-56"}
                value={tipo}
                onChange={(e) => {
                  setTipo(e.target.value as ChangeSetMemberInput["memberType"]);
                  // Cambiar de clase invalida la elección anterior: un id de personaje no vale
                  // como id de persona.
                  setMiembro("");
                }}
              >
                {TIPOS_DE_MIEMBRO.map((t) => (
                  <option key={t} value={t}>
                    {NOMBRE_TIPO_DE_MIEMBRO[t]}
                  </option>
                ))}
              </select>
              <label className="sr-only" htmlFor="conjunto-miembro">
                Quién
              </label>
              <select
                id="conjunto-miembro"
                className={fieldControlClass + " w-56"}
                value={miembro}
                onChange={(e) => setMiembro(e.target.value)}
              >
                <option value="">Elige</option>
                {listaDeCandidatos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <Button
                type="submit"
                variant="secondary"
                disabled={!enQueConjunto || !miembro || anadir.isPending}
              >
                Meterlo en el conjunto
              </Button>
            </form>
          </>
        ))}
      {(anadir.isError || quitar.isError) && (
        <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
          {((anadir.error ?? quitar.error) as Error).message}
        </p>
      )}
    </section>
  );
}

function Senales({ campaignId }: { campaignId: string }) {
  const levantar = useRaiseSignal(campaignId);
  const [clave, setClave] = useState("");
  const [motivo, setMotivo] = useState("");

  return (
    <section aria-label="Señales" className="space-y-s2">
      <header className="space-y-1">
        <h3 className="font-title text-chrome-lg text-text">Señales</h3>
        <p className="font-chrome text-chrome-sm text-muted">
          Una palanca de mesa: dispara las reglas armadas sobre ella y{" "}
          <strong>no cambia nada del mundo</strong>. No se guarda, se levanta, y solo tú la ves en
          el registro.
        </p>
      </header>
      <form
        className="flex flex-wrap items-center gap-s2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!clave.trim()) return;
          levantar.mutate(
            { key: clave.trim(), ...(motivo.trim() ? { reason: motivo.trim() } : {}) },
            {
              onSuccess: () => {
                setClave("");
                setMotivo("");
              },
            },
          );
        }}
      >
        <label className="sr-only" htmlFor="senal-clave">
          Nombre de la señal
        </label>
        <input
          id="senal-clave"
          className={fieldControlClass + " w-56"}
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          placeholder="suenan-las-campanas"
          maxLength={60}
        />
        <label className="sr-only" htmlFor="senal-motivo">
          Motivo
        </label>
        <input
          id="senal-motivo"
          className={fieldControlClass + " w-64"}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Motivo (opcional)"
          maxLength={280}
        />
        <Button type="submit" variant="primary" disabled={!clave.trim() || levantar.isPending}>
          Levantar la señal
        </Button>
      </form>
      {levantar.isSuccess && (
        <p role="status" className="font-chrome text-chrome-sm text-muted">
          Señal levantada. Si había una regla armada sobre ella, ya se ha evaluado.
        </p>
      )}
      {levantar.isError && (
        <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
          {(levantar.error as Error).message}
        </p>
      )}
    </section>
  );
}

/**
 * Marcas, conjuntos y señales, juntas.
 *
 * **No comprueba el papel de nadie**: quien la monta ya lo hizo (`PanelDeReglas` corta antes
 * para quien no es DM), y el servidor lo impone de todas formas con `requireDM`. Duplicar el
 * `useMyRole` aquí solo añadiría una tercera lectura de la misma consulta.
 */
export function PanelDeEstadoDelMundo({ campaignId }: { campaignId: string }) {
  return (
    <div className="space-y-s5">
      <Marcas campaignId={campaignId} />
      <Conjuntos campaignId={campaignId} />
      <Senales campaignId={campaignId} />
    </div>
  );
}
