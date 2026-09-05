import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCampaign } from "../features/campaigns/hooks";
import { useMyRole } from "../features/campaigns/members";
import { useEntityDetail } from "../features/entities/hooks";
import { BotonEjecutar } from "../features/entities/BotonEjecutar";
import { BotonRevelar } from "../features/entities/BotonRevelar";
import { EntityEditor } from "../features/entities/EntityEditor";
import { Markdown } from "../features/entities/Markdown";
import { ETIQUETA_DE_TIPO } from "../features/entities/resumen";
import { LinksPanel } from "../features/links/LinksPanel";
import { CommentThread } from "../features/comments/CommentThread";
import { CHECKING_PERMISSIONS } from "../features/campaigns/PermissionStatus";
import { useAuthStore } from "../store/auth.store";
import { AppShell, AppHeader, PageHeader } from "../ui/AppShell";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/Collection";
import { OrnamentRule } from "../ui/Ornament";

// Reseño 2026-09-02 — the reading view this product never had.
//
// Until now the ONLY way to see what an NPC was, was to open the editor: a modal full of form
// controls, with the description sitting in a <textarea>. That is a fine way to change
// something and a terrible way to read it at the table, which is what a DM actually does with
// this screen — mid-session, with players waiting.
//
// So the world gets its own surface here (Panel tone="vellum", the manual's voice) and editing
// becomes a deliberate act behind a button, instead of the only door in.
//
// Authorisation is unchanged and stays where it belongs: the server decided whether you may
// see this entity at all (canView), and whether you may save changes (requireEditable). This
// page only decides whether the editor opens read-only, exactly like the list row did.

/**
 * El lápiz de «Editar». **Dibujado, no un glifo** (docs/04-convenciones.md): hereda
 * `currentColor` y se dimensiona en `1em` porque vive dentro de una línea de texto, así que
 * escala con ella. Es decorativo — la palabra de al lado ya dice lo que hace el botón.
 */
function IconoLapiz() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="h-[1em] w-[1em] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M11.4 2.6a1.6 1.6 0 0 1 2.3 2.3L5.6 13 2.5 13.5 3 10.4z" />
      <path d="M10.2 3.8 12.5 6.1" />
    </svg>
  );
}

export function EntityDetailPage() {
  const { id = "", entityId = "" } = useParams();
  const { data: campaign } = useCampaign(id);
  const { data: entity, isLoading, isError } = useEntityDetail(id, entityId);
  const { role, isLoading: roleLoading, isError: roleError } = useMyRole(id);
  const userId = useAuthStore((s) => s.user?.id);
  const { user, logout } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();

  const roleUnresolved = roleLoading || roleError;
  // **Mientras el rol no se sabe, no eres DM**: «no lo sé» nunca se trata como «sí».
  const esDM = !roleUnresolved && role === "DM";
  const puedeEditar =
    !roleUnresolved && entity !== undefined && (role === "DM" || entity.createdById === userId);
  const motivo = roleUnresolved
    ? CHECKING_PERMISSIONS
    : puedeEditar
      ? undefined
      : "Solo el DM o quien lo creó puede editarlo.";

  const header = <AppHeader userName={user?.displayName} onLogout={logout} />;
  // La miga de la campaña vuelve a la SECCIÓN de la que salió esta ficha, no al resumen:
  // desde una ficha, el sitio al que quieres volver es la lista donde estaba.
  const volverALaLista = entity ? `/campaigns/${id}?seccion=${entity.type}` : `/campaigns/${id}`;
  const migas = [
    { label: "Tus crónicas", to: "/" },
    { label: campaign?.name ?? "Campaña", to: volverALaLista },
  ];

  if (isError) {
    return (
      <AppShell header={header}>
        <PageHeader title="Ficha no disponible" crumbs={migas} />
        <EmptyState title="Esta entrada no existe o no puedes verla">
          Igual que con las campañas, no se distingue entre "no existe" y "no tienes acceso":
          decirlo sería contar justo lo que la visibilidad esconde.
        </EmptyState>
      </AppShell>
    );
  }

  if (isLoading || !entity) {
    return (
      <AppShell header={header}>
        <PageHeader title="Cargando…" crumbs={migas} />
      </AppShell>
    );
  }

  const cuerpo = entity.body?.text?.trim();

  return (
    <AppShell header={header}>
      <PageHeader
        crumbs={[...migas, { label: ETIQUETA_DE_TIPO[entity.type] }]}
        title={entity.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-s2">
            <span className="font-chrome text-chrome-xs uppercase tracking-[0.16em] text-copper-text">
              {ETIQUETA_DE_TIPO[entity.type]}
            </span>
            <Badge visibility={entity.visibility} />
            {Array.from(new Set(entity.tags)).map((tag) => (
              <span
                key={tag}
                className="rounded-radius-sm border border-muted px-1.5 py-0.5 font-chrome text-chrome-xs text-muted"
              >
                {tag}
              </span>
            ))}
          </span>
        }
        actions={
          <span className="flex flex-wrap items-center gap-s2">
            {/* Auditoría de la mesa §8.4 — **el botón que dice «Revelar»**. Hasta hoy revelar
                era cambiar un desplegable dentro del formulario de edición, y el suceso
                `ENTITY_REVEALED` que el motor de reglas escucha dependía de que alguien
                recordara cuál. Se pinta solo cuando de verdad haría crecer el conjunto de
                quien la ve (`sePuedeRevelar`). */}
            {/* **La batuta** (I19), junto a revelar y no dentro de un menú: son los dos gestos de
                dirección sobre esta ficha. Solo el DM — el servidor lo impone con `requireDM`, y
                aquí no se ofrece porque un botón que va a dar 403 promete algo falso. */}
            {esDM && <BotonEjecutar campaignId={id} entityId={entity.id} />}
            {puedeEditar && (
              <BotonRevelar
                campaignId={id}
                type={entity.type}
                entityId={entity.id}
                visibility={entity.visibility}
              />
            )}
            <Button variant="secondary" onClick={() => setEditing(true)} title={motivo}>
              <span className="inline-flex items-center gap-s2">
                <IconoLapiz />
                {puedeEditar ? "Editar" : "Ver el texto completo"}
              </span>
            </Button>
          </span>
        }
      />

      <div className="grid gap-s6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-s5">
          {cuerpo ? (
            // Reseño 2026-09-03 — **la hoja ocupa la columna, y la medida corta la lleva el
            // texto.** Petición literal del autor: «mejor diseño de la hoja rasgada». Lo que
            // había era un rectángulo pardo de 537 px perdido en una columna de 1014: la hoja
            // heredaba el `max-w-[66ch]` del `Panel`, así que la MEDIDA —que es una regla
            // tipográfica sobre el renglón— acababa encogiendo el papel. La maqueta hace lo
            // contrario y tiene razón: la superficie de lectura llena su columna y el que se
            // queda en 66 caracteres es el párrafo. Aquí se corrige desde fuera —`ui/Panel.tsx`
            // está fuera de la frontera de esta tarea— soltando el tope de la hoja y poniéndoselo
            // a los párrafos, con lo que **la medida se sigue cumpliendo** (lo mide
            // `ficha-lectura.spec.ts` dividiendo el ancho del párrafo entre el de un dígito) y el
            // desgarro pasa a ser el borde superior de una página entera en vez de la esquina de
            // un recorte. El filete va en **cobre**: lo que se lee pertenece al mundo.
            //
            // El `Panel tone="vellum"` sigue siendo el de `Markdown.tsx` y sigue habiendo **uno
            // solo** (lo comprueba `EntityDetailPage.test.tsx`): esto lo viste, no lo duplica.
            //
            // La capitular. Es la marca de que aquí empieza la voz del mundo y no la de la
            // aplicación, y es lo único de esta página que se permite ser grande sin ser un
            // control: un grabado la imprimiría igual. Va en cobre —lo que pertenece al mundo—
            // y no en azul, que en esta interfaz significa «esto se pulsa».
            //
            // Se escribe como variante de descendiente, y no dentro de `Markdown`, por dos
            // razones: `features/entities/Markdown.tsx` está fuera de la frontera de esta tarea
            // y, sobre todo, la capitular es una decisión de ESTA página —la pantalla de
            // lectura—, no de todo texto Markdown de la aplicación. El primer párrafo se elige
            // con `p:first-of-type` para que un cuerpo que empiece por un encabezado no reciba
            // capitular en mitad del documento.
            //
            // Y dos arreglos de lectura que el cuerpo no tenía. **Los párrafos no se separaban
            // entre sí**: `Markdown.tsx` pone su `space-y-2` en el `Panel`, cuyo único hijo es
            // el relleno que despeja el borde rasgado, así que la regla nunca llegaba a los
            // párrafos — se ve en cuanto un cuerpo tiene dos. Y el interlineado era el de por
            // defecto, que para una serif de 17 px leída en voz alta se queda corto. Los dos se
            // arreglan aquí, desde fuera, porque `Markdown.tsx` y `ui/Panel.tsx` quedan fuera de
            // la frontera de esta tarea; la causa raíz está en el informe.
            <article
              data-cuerpo-del-mundo
              className="[&_[data-tone=vellum]]:max-w-none [&_[data-tone=vellum]]:border-copper [&_p]:max-w-[66ch] [&_p]:leading-relaxed [&_p+p]:mt-s3 [&_p:first-of-type]:first-letter:mr-1 [&_p:first-of-type]:first-letter:mt-1 [&_p:first-of-type]:first-letter:float-left [&_p:first-of-type]:first-letter:font-title [&_p:first-of-type]:first-letter:text-[3.2em] [&_p:first-of-type]:first-letter:leading-[0.82] [&_p:first-of-type]:first-letter:text-copper-text"
            >
              <Markdown text={cuerpo} />
            </article>
          ) : (
            <EmptyState
              title="Sin nada escrito todavía"
              action={
                puedeEditar ? (
                  <Button variant="primary" onClick={() => setEditing(true)}>
                    Escribir
                  </Button>
                ) : undefined
              }
            >
              Esta ficha existe pero está vacía. Un par de líneas bastan: quién es, qué quiere y qué
              sabe que los demás no.
            </EmptyState>
          )}

          <section>
            <OrnamentRule className="mb-s3" />
            <CommentThread campaignId={id} entityId={entity.id} />
          </section>
        </div>

        {/* El vecindario se consulta MIENTRAS se lee, no después: en una ficha larga el panel
            se quedaba mil píxeles más arriba que el párrafo que hacía preguntarse quién era
            quién. Pegajoso a partir de la anchura en la que hay dos columnas; por debajo cae
            detrás del cuerpo, que es el orden correcto para leerlo en un móvil. */}
        <aside className="space-y-s5 lg:sticky lg:top-24 lg:self-start">
          <LinksPanel
            campaignId={id}
            entityId={entity.id}
            entityName={entity.name}
            entityCreatedById={entity.createdById}
          />
        </aside>
      </div>

      {editing && (
        <EntityEditor
          campaignId={id}
          type={entity.type}
          entity={entity}
          onClose={() => setEditing(false)}
          // Deleting the thing this page is about: go back to its list rather than leave the
          // reader on a page whose subject no longer exists.
          onDeleted={() => navigate(`/campaigns/${id}?seccion=${entity.type}`, { replace: true })}
          readOnly={!puedeEditar}
          readOnlyReason={motivo}
        />
      )}
    </AppShell>
  );
}
