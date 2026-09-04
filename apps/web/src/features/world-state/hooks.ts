import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChangeSetMemberInput, CreateSetInput, RaiseSignalInput } from "@dnd/shared";
// El módulo se importa por su espacio de nombres para que las llamadas sigan siendo espiables
// desde las pruebas — la misma trampa de vitest que documenta docs/04-convenciones.md.
import * as worldStateApi from "./api";

// **Estos hooks son la puerta que C4 va a consumir.** Las «Marcas del mundo» y los «Conjuntos»
// de la solapa «Lo que sabe la mesa» del taller son literalmente esto: la misma consulta y las
// mismas mutaciones. Se exportan limpios, sin pantalla dentro, para que el taller monte su
// propia disposición sin volver a escribir la capa de datos.

export const flagsKey = (campaignId: string) => ["campaigns", campaignId, "flags"] as const;
export const setsKey = (campaignId: string) => ["campaigns", campaignId, "sets"] as const;

// Todo lo que escribe un suceso invalida el registro de la partida: poner una marca y añadir a
// alguien a un conjunto escriben `FLAG_SET` y `SET_CHANGED`, y la mesa los está leyendo. Es la
// misma razón que ya está escrita en `features/character-sheet/hooks.ts`.
function invalidarRegistro(qc: ReturnType<typeof useQueryClient>, campaignId: string) {
  void qc.invalidateQueries({ queryKey: ["campaigns", campaignId, "events"] });
}

export function useFlags(campaignId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: flagsKey(campaignId),
    queryFn: () => worldStateApi.fetchFlags(campaignId),
    enabled: Boolean(campaignId) && (options?.enabled ?? true),
  });
}

export function useSets(campaignId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: setsKey(campaignId),
    queryFn: () => worldStateApi.fetchSets(campaignId),
    enabled: Boolean(campaignId) && (options?.enabled ?? true),
  });
}

export function useSetFlag(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { key: string; value: boolean }) =>
      worldStateApi.setFlag(campaignId, vars.key, vars.value),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: flagsKey(campaignId) });
      invalidarRegistro(qc, campaignId);
      // Una marca puesta puede disparar una regla, y una regla disparada cambia `fireCount` y
      // `lastFiredAt`. Sin esto, la lista de reglas seguiría diciendo «nunca» hasta que algo
      // más la invalidara.
      void qc.invalidateQueries({ queryKey: ["campaigns", campaignId, "rules"] });
    },
  });
}

export function useCreateSet(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSetInput) => worldStateApi.createSet(campaignId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: setsKey(campaignId) }),
  });
}

export function useAddSetMember(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { key: string } & ChangeSetMemberInput) =>
      worldStateApi.addSetMember(campaignId, vars.key, {
        memberType: vars.memberType,
        memberId: vars.memberId,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: setsKey(campaignId) });
      invalidarRegistro(qc, campaignId);
    },
  });
}

export function useRemoveSetMember(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { key: string } & ChangeSetMemberInput) =>
      worldStateApi.removeSetMember(campaignId, vars.key, {
        memberType: vars.memberType,
        memberId: vars.memberId,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: setsKey(campaignId) });
      invalidarRegistro(qc, campaignId);
    },
  });
}

/**
 * Levantar una señal. **No invalida ninguna lista de señales porque no hay ninguna**: una señal
 * no se guarda, se levanta, y lo único que deja es un suceso `DM_ONLY` en el registro.
 */
export function useRaiseSignal(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RaiseSignalInput) => worldStateApi.raiseSignal(campaignId, input),
    onSuccess: () => {
      invalidarRegistro(qc, campaignId);
      void qc.invalidateQueries({ queryKey: ["campaigns", campaignId, "rules"] });
    },
  });
}
