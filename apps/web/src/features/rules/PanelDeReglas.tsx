import { useState } from "react";
import type { CreateRuleInput, RuleStatus, RuleTrigger } from "@dnd/shared";
import { Button, Tabs } from "../../ui";
import { useAllEntities } from "../entities/hooks";
import { useMyRole } from "../campaigns/members";
import type { RuleRow } from "./api";
import { EditorDeRegla } from "./EditorDeRegla";
import { EnsayoEnSeco } from "./EnsayoEnSeco";
import { ListaDeReglas } from "./ListaDeReglas";
import { Propuestas } from "./Propuestas";
import { TrazaDeReglas } from "./TrazaDeReglas";
import { useCreateRule, useDeleteRule, useDryRun, useRules, useUpdateRule } from "./hooks";
import { IconoPropuesta, IconoTraza } from "./iconos";

// Tarea 2A.17 — el punto de montaje único de la pantalla del motor de reglas.
//
// **Es la pantalla del DM.** El servidor ya lo impone (`requireDM` en
// `rules-engine.service.ts`): esconder la pantalla no es control de acceso. Lo que se evita
// aquí es enseñar botones que van a devolver 403, que es una cortesía, no una defensa.
//
// `useMyRole` distingue tres cosas y no dos: «todavía no sé», «no eres DM» y «eres DM». Un
// error de carga se trata como «todavía no sé» — nunca como «no tienes permiso».

export function PanelDeReglas({ campaignId }: { campaignId: string }) {
  const { role, isLoading: cargandoRol, isError: errorDeRol, retry } = useMyRole(campaignId);
  const esDM = role === "DM";

  const [pestana, setPestana] = useState("reglas");
  const [editando, setEditando] = useState<{ regla?: RuleRow } | null>(null);
  const [ensayando, setEnsayando] = useState<RuleRow | null>(null);

  const reglas = useRules(campaignId, { enabled: esDM });
  const entidades = useAllEntities(campaignId);
  const crear = useCreateRule(campaignId);
  const actualizar = useUpdateRule(campaignId);
  const borrar = useDeleteRule(campaignId);
  const ensayo = useDryRun(campaignId);

  if (cargandoRol) {
    return (
      <p className="font-chrome text-chrome-sm text-muted">Comprobando tu papel en la mesa…</p>
    );
  }

  if (errorDeRol) {
    return (
      <div className="space-y-s2">
        <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
          No se pudo comprobar tu papel en esta campaña, así que no se sabe qué enseñar todavía.
        </p>
        <Button variant="secondary" type="button" onClick={retry}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (!esDM) {
    return (
      <p className="rounded-radius-sm border border-muted/60 p-s3 font-chrome text-chrome-sm text-muted">
        El motor de reglas es de quien dirige. El servidor solo se lo abre al DM de esta campaña.
      </p>
    );
  }

  const filas = reglas.data ?? [];
  const entities = entidades.data ?? [];

  function guardar(input: CreateRuleInput) {
    if (editando?.regla) {
      actualizar.mutate(
        { ruleId: editando.regla.id, input },
        { onSuccess: () => setEditando(null) },
      );
    } else {
      crear.mutate(input, { onSuccess: () => setEditando(null) });
    }
  }

  function cambiarEstado(regla: RuleRow, status: RuleStatus) {
    actualizar.mutate({ ruleId: regla.id, input: { status } });
  }

  function simular(trigger: RuleTrigger) {
    if (!ensayando) return;
    ensayo.mutate({ ruleId: ensayando.id, trigger });
  }

  const panelDeReglas = (
    <div className="space-y-s3">
      <div className="flex items-center justify-between gap-s3">
        <p className="font-chrome text-chrome-sm text-muted">
          Una regla es una frase: <strong>cuando</strong> pase esto, <strong>si</strong> se cumple
          aquello, <strong>entonces</strong> haz esto otro.
        </p>
        <Button type="button" onClick={() => setEditando({})}>
          Nueva regla
        </Button>
      </div>

      {reglas.isLoading && (
        <p className="font-chrome text-chrome-sm text-muted">Cargando reglas…</p>
      )}
      {reglas.isError && (
        <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
          No se pudieron cargar las reglas. {(reglas.error as Error).message}
        </p>
      )}
      {reglas.isSuccess && (
        <ListaDeReglas
          reglas={filas}
          entities={entities}
          cambiandoEstado={actualizar.isPending}
          onCambiarEstado={cambiarEstado}
          onEditar={(regla) => setEditando({ regla })}
          onEnsayar={(regla) => {
            ensayo.reset();
            setEnsayando(regla);
          }}
          onBorrar={(regla) => borrar.mutate(regla.id)}
        />
      )}
      {borrar.isError && (
        <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
          {(borrar.error as Error).message}
        </p>
      )}
    </div>
  );

  return (
    <section aria-label="Motor de reglas" className="space-y-s3">
      <Tabs
        active={pestana}
        onChange={setPestana}
        items={[
          { id: "reglas", label: "Reglas", content: panelDeReglas },
          {
            id: "propuestas",
            label: "Propuestas",
            badge: <IconoPropuesta />,
            content: (
              <Propuestas
                campaignId={campaignId}
                entities={entities}
                reglas={filas}
                activo={pestana === "propuestas"}
              />
            ),
          },
          {
            id: "traza",
            label: "Traza",
            badge: <IconoTraza />,
            content: (
              <TrazaDeReglas
                campaignId={campaignId}
                entities={entities}
                reglas={filas}
                activo={pestana === "traza"}
              />
            ),
          },
        ]}
      />

      {editando && (
        <EditorDeRegla
          // Remontar al cambiar de regla: el borrador se inicializa una sola vez por montaje.
          key={editando.regla?.id ?? "nueva"}
          abierto
          regla={editando.regla}
          entities={entities}
          reglas={filas}
          guardando={crear.isPending || actualizar.isPending}
          error={
            crear.isError
              ? (crear.error as Error).message
              : actualizar.isError
                ? (actualizar.error as Error).message
                : undefined
          }
          onGuardar={guardar}
          onCerrar={() => setEditando(null)}
        />
      )}

      {ensayando && (
        <EnsayoEnSeco
          key={ensayando.id}
          abierto
          regla={ensayando}
          entities={entities}
          simulando={ensayo.isPending}
          resultado={ensayo.data}
          error={ensayo.isError ? (ensayo.error as Error).message : undefined}
          onSimular={simular}
          onCerrar={() => {
            ensayo.reset();
            setEnsayando(null);
          }}
        />
      )}
    </section>
  );
}
