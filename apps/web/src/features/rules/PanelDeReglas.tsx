import { useState } from "react";
import type { CreateRuleInput, RuleStatus, RuleTrigger } from "@dnd/shared";
import { Button, Tabs } from "../../ui";
import { useAllEntities } from "../entities/hooks";
import { useMyRole } from "../campaigns/members";
import type { RuleRow } from "./api";
import { EditorDeRegla } from "./EditorDeRegla";
import { EnsayoEnSeco } from "./EnsayoEnSeco";
import { ListaDeReglas } from "./ListaDeReglas";
import { PlantillasDeRegla } from "./PlantillasDeRegla";
import type { PlantillaDeRegla } from "./plantillas";
import { Propuestas } from "./Propuestas";
import { TrazaDeReglas } from "./TrazaDeReglas";
import { useCreateRule, useDeleteRule, useDryRun, useRules, useUpdateRule } from "./hooks";
import { IconoPropuesta, IconoTraza } from "./iconos";
// Auditoría de la mesa §8.1 — marcas, conjuntos y señales llevaban desde 2A en el servidor sin
// una sola llamada desde la web. Se montan aquí, y no en una pestaña propia de la campaña,
// porque son lo que las reglas leen y escriben: el DM que arma una cadena necesita poder poner
// su primera marca sin cambiar de pantalla. El taller del DM (carril C4) las quiere en «Lo que
// sabe la mesa»; cuando exista, consume `features/world-state/hooks.ts` o se lleva este panel
// entero.
import { PanelDeEstadoDelMundo } from "../world-state/PanelDeEstadoDelMundo";

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
  const [editando, setEditando] = useState<{
    regla?: RuleRow;
    /** Tarea F6 — la plantilla clonada con la que arranca el borrador, si se vino de una. */
    plantilla?: PlantillaDeRegla;
  } | null>(null);
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
      <p className="rounded-radius-sm border border-muted p-s3 font-chrome text-chrome-sm text-muted">
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

  /**
   * Tarea F5 — el arreglo que ofrece el aviso de «reversión ausente», hecho de verdad: crea una
   * regla **aparte** que quita la marca al cerrarse la sesión. No cierra el editor y no toca el
   * borrador que se está escribiendo; en cuanto la lista se invalida, el aviso desaparece solo
   * porque el detector deja de encontrar la marca sin quien la quite.
   */
  function crearReversion(name: string, key: string) {
    crear.mutate({
      name,
      trigger: { kind: "SESSION_CLOSED" },
      conditions: [],
      effects: [{ kind: "SET_FLAG", key, value: false }],
      mode: "AUTOMATIC",
      maxFires: null,
    });
  }

  function cambiarEstado(regla: RuleRow, status: RuleStatus) {
    actualizar.mutate({ ruleId: regla.id, input: { status } });
  }

  function simular(trigger: RuleTrigger) {
    if (!ensayando) return;
    ensayo.mutate({ ruleId: ensayando.id, trigger });
  }

  const editor = editando && (
    <EditorDeRegla
      // Remontar al cambiar de regla o de plantilla: el borrador se inicializa una sola vez.
      key={editando.regla?.id ?? editando.plantilla?.id ?? "nueva"}
      abierto
      regla={editando.regla}
      borradorInicial={editando.plantilla?.borrador}
      entities={entities}
      reglas={filas}
      guardando={crear.isPending || actualizar.isPending}
      aplicandoArreglo={crear.isPending}
      error={
        crear.isError
          ? (crear.error as Error).message
          : actualizar.isError
            ? (actualizar.error as Error).message
            : undefined
      }
      onGuardar={guardar}
      onCrearReversion={crearReversion}
      onCerrar={() => setEditando(null)}
    />
  );

  // Tarea R1-fix — **el editor ya no es un diálogo**: ocupa la pestaña entera en lugar de la
  // lista. El motivo está medido y contado en la cabecera de `EditorDeRegla.tsx`; en dos líneas,
  // dentro de una ventana de 85vh la paleta y los carriles no cabían a la vez en pantalla, y
  // arrastrar una pieza a una ranura que no se ve es imposible por bien escrito que esté el
  // código. `ui/Dialog.tsx` no se toca: lo usa media aplicación y no tenía la culpa.
  const panelDeReglas = editor ?? (
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
      {/*
        Tarea F6 — las plantillas, solo con la campaña vacía. El análisis de 224 590 reglas de
        IFTTT dice que la gente clona antes que escribir; una pantalla vacía con un botón pide
        crear de cero, y una con cuatro reglas ya escritas pide editar, que es mucho más barato.
      */}
      {reglas.isSuccess && filas.length === 0 && (
        <PlantillasDeRegla onUsar={(plantilla) => setEditando({ plantilla })} />
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
                activo={pestana === "propuestas"}
              />
            ),
          },
          {
            id: "mundo",
            label: "Estado del mundo",
            content: <PanelDeEstadoDelMundo campaignId={campaignId} />,
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
