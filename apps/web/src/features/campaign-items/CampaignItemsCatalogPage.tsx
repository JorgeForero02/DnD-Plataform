import { useState } from "react";
import type { ItemKind } from "@dnd/shared";
import { CabeceraDeSeccion } from "../entities/CabeceraDeSeccion";
import { CHECKING_PERMISSIONS, RetryPermissions } from "../campaigns/PermissionStatus";
import { useMyRole } from "../campaigns/members";
import { Button } from "../../ui/Button";
import { fieldControlClass } from "../../ui/Field";
import { EmptyState, Toolbar } from "../../ui/Collection";
import { FilterChip } from "../../ui/FilterChip";
import { IconoMas } from "../../ui/Iconos";
import { CampaignItemEditor } from "./CampaignItemEditor";
import { FilaDeObjeto } from "./FilaDeObjeto";
import { ItemDetail } from "./ItemDetail";
import { IconoDeObjeto } from "./iconos";
import { TIPOS_DE_OBJETO, NOMBRE_TIPO } from "./vocabulario";
import { useSrdItems, useCampaignItems } from "./hooks";
import type { CampaignItem } from "./api";

// Carril B2 — el punto de montaje único del catálogo de objetos, calcado del molde de
// `features/rules/PanelDeReglas.tsx`: un solo componente exportado que recibe `campaignId` por
// props, para que el orquestador lo cuelgue de la navegación sin tocar nada más de este carril.
//
// **A diferencia de `PanelDeReglas`, esta pantalla no es solo del DM.** El servidor la abre a
// cualquier miembro de la campaña (`requireMember` en `campaign-items.service.ts`) y solo exige
// DM para escribir (`requireDM` al crear, el `requireEditable` de `update`/`remove`) — así que
// aquí `useMyRole` decide qué **botones** se ofrecen, nunca si la lista se ve.
//
// **Lista y ficha viven en el mismo componente**, alternadas por un estado local
// (`seleccionado`), en vez de una ruta propia: el orquestador solo tiene que montar esta pantalla
// una vez, con `campaignId`, y todo lo demás —incluida la navegación entre el catálogo y la
// ficha de un objeto— queda resuelto dentro del carril.
/** El rótulo del buscador: mismo tratamiento que los rótulos de casilla del resto de pantallas. */
const ROTULO_DE_BUSQUEDA =
  "mb-1 block font-chrome text-chrome-xs uppercase tracking-wide text-muted";

export function CampaignItemsCatalogPage({ campaignId }: { campaignId: string }) {
  const { role, isLoading: cargandoRol, isError: errorDeRol, retry } = useMyRole(campaignId);
  const esDM = role === "DM";

  const items = useCampaignItems(campaignId);
  // **Las dos procedencias en la misma lista** (pantalla 22 del prototipo). El SRD es el mismo
  // para todas las mesas y se pide aparte; lo que distingue una fila de otra es su marca, no en
  // qué lista está — cuando un objeto se comporta raro, lo primero que se pregunta es de dónde
  // salió.
  const srd = useSrdItems();
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState<"nuevo" | CampaignItem | null>(null);
  // Anexo #21 — filtros por tipo de objeto y por origen, con chips, como el bestiario
  // (`PanelDeBestiario.tsx`). Estado de cliente, nunca control de acceso: la lista ya llega
  // filtrada por `canView`, así que esto solo puede quitar de la vista filas que quien mira ya
  // tenía derecho a ver.
  const [tipo, setTipo] = useState<ItemKind | "todos">("todos");
  const [origen, setOrigen] = useState<"todos" | "SRD" | "CAMPAIGN">("todos");

  const propios = items.data ?? [];
  const delSrd = srd.data ?? [];
  const todas = [...propios, ...delSrd].sort((a, b) => a.name.localeCompare(b.name, "es"));
  // Un objeto del SRD **no se edita ni se borra**: es contenido de la obra, no de la campaña.
  // Quien quiera una espada larga distinta se crea la suya, que es justo para lo que existe el
  // homebrew (`NOTICE.md`: lo que trae el producto de serie es solo SRD).
  const esDelSrd = (id: string) => id.startsWith("SRD:");
  // **Filtro de cliente, y nunca control de acceso** (regla de `docs/04-convenciones.md`): opera
  // sobre una lista que el servidor ya filtró por `canView`, así que solo puede quitar de la
  // vista filas que quien mira ya tenía derecho a ver. Con sesenta y cinco objetos del SRD, una
  // lista sin buscador —y sin poder acotar por tipo u origen— es una lista que nadie recorre.
  const filas = todas.filter(
    (i) =>
      (busqueda.trim() === "" || i.name.toLowerCase().includes(busqueda.trim().toLowerCase())) &&
      (tipo === "todos" || i.kind === tipo) &&
      (origen === "todos" || (origen === "SRD") === esDelSrd(i.id)),
  );
  const hayFiltrosActivos = tipo !== "todos" || origen !== "todos";
  const objetoSeleccionado = filas.find((i) => i.id === seleccionado);

  if (items.isLoading || srd.isLoading || cargandoRol) {
    return <p className="font-chrome text-chrome-sm text-muted">Cargando el catálogo…</p>;
  }

  if (items.isError) {
    return (
      <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
        No se pudo cargar el catálogo de objetos.
      </p>
    );
  }

  // La ficha reemplaza el catálogo entera, como en la maqueta (pantalla 21): no es un modal
  // encima de la lista, es su propia pantalla dentro de este carril.
  if (objetoSeleccionado) {
    return (
      <>
        <ItemDetail
          item={objetoSeleccionado}
          onBack={() => setSeleccionado(null)}
          onEdit={() => setEditando(objetoSeleccionado)}
          puedeEditar={esDM && !esDelSrd(objetoSeleccionado.id)}
        />
        {editando && editando !== "nuevo" && (
          <CampaignItemEditor
            campaignId={campaignId}
            item={editando}
            onClose={() => setEditando(null)}
            onDeleted={() => {
              setEditando(null);
              setSeleccionado(null);
            }}
          />
        )}
      </>
    );
  }

  return (
    <div>
      <CabeceraDeSeccion
        grupo="Herramientas"
        titulo="Catálogo de objetos"
        paraQue="El catálogo del SRD y los objetos propios de esta campaña, con su dato: peso, valor, daño o Clase de Armadura, y lo que suman al motor de reglas."
        accion={
          esDM ? (
            <Button type="button" onClick={() => setEditando("nuevo")}>
              {/* Anexo #22 — el `+` era un glifo de fuente haciendo de icono, y la regla de
                  iconos ya lo prohíbe (docs/04-convenciones.md): se dibuja, no se teclea. */}
              <IconoMas />
              Crear objeto
            </Button>
          ) : errorDeRol ? (
            // "Todavía no sé", no "no eres DM" — un fallo al cargar el papel no se trata como
            // un "no tienes permiso" (mismo criterio que PanelDeReglas.tsx y CampaignSettings.tsx).
            <span className="font-chrome text-chrome-xs text-muted">
              {CHECKING_PERMISSIONS}
              <RetryPermissions onRetry={retry} />
            </span>
          ) : undefined
        }
      />

      <label className="mb-s3 block">
        <span className={ROTULO_DE_BUSQUEDA}>Buscar objeto por nombre</span>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Espada, cota, cuerda…"
          className={fieldControlClass}
        />
      </label>

      <Toolbar
        filters={
          <>
            <FilterChip active={tipo === "todos"} onClick={() => setTipo("todos")}>
              Todos
            </FilterChip>
            {TIPOS_DE_OBJETO.map((k) => (
              <FilterChip
                key={k}
                active={tipo === k}
                onClick={() => setTipo(k)}
                icon={<IconoDeObjeto kind={k} />}
              >
                {NOMBRE_TIPO[k]}
              </FilterChip>
            ))}
          </>
        }
      />
      <Toolbar
        filters={
          <>
            <FilterChip active={origen === "todos"} onClick={() => setOrigen("todos")}>
              De todas partes
            </FilterChip>
            <FilterChip active={origen === "SRD"} onClick={() => setOrigen("SRD")}>
              Del catálogo
            </FilterChip>
            <FilterChip active={origen === "CAMPAIGN"} onClick={() => setOrigen("CAMPAIGN")}>
              De la campaña
            </FilterChip>
          </>
        }
      />

      {filas.length === 0 && (busqueda.trim() || hayFiltrosActivos) ? (
        <EmptyState
          title={
            busqueda.trim() && hayFiltrosActivos
              ? "Ningún objeto se llama así con esos filtros."
              : busqueda.trim()
                ? "Ningún objeto se llama así."
                : "Ningún objeto queda con esos filtros."
          }
        >
          Prueba con otra palabra o cambia los filtros, o crea uno propio si lo que buscas no está
          en el catálogo.
        </EmptyState>
      ) : filas.length === 0 ? (
        <EmptyState title="No hay ningún objeto que mirar.">
          {esDM
            ? "El catálogo del SRD no ha cargado; crea uno propio con «Crear objeto» o vuelve a intentarlo."
            : "El catálogo del SRD no ha cargado y el DM aún no ha añadido ningún objeto propio."}
        </EmptyState>
      ) : (
        <div className="rounded-radius-sm border border-muted">
          {filas.map((item) => (
            <FilaDeObjeto
              key={item.id}
              item={item}
              procedencia={esDelSrd(item.id) ? "SRD" : "CAMPAIGN"}
              onSelect={() => setSeleccionado(item.id)}
            />
          ))}
        </div>
      )}

      {editando === "nuevo" && (
        <CampaignItemEditor campaignId={campaignId} onClose={() => setEditando(null)} />
      )}
    </div>
  );
}
