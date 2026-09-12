import { useState, type ComponentType, type CSSProperties } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs } from "../../ui/Tabs";
import { EmptyState } from "../../ui/Collection";
import { useCharacterSheet } from "./hooks";
import { Cabecera } from "./Cabecera";
import { TarjetaDeHoja } from "./Tarjeta";
import { Caracteristicas, FichaEditable } from "./IdentidadEditable";
import { Numeros } from "./pestanas/Numeros";
import { Objetos } from "./pestanas/Objetos";
import { Ataques } from "./pestanas/Ataques";
import { Recursos } from "./pestanas/Recursos";
import { Estado } from "./pestanas/Estado";
import { Rasgos } from "./pestanas/Rasgos";
import { Conjuros } from "./pestanas/Conjuros";
import { lanzaConjuros } from "./pestanas/lanzaConjuros";
import {
  PESTANAS_DE_LA_HOJA,
  type Disposicion,
  type PestanaId,
  type PropsDePestana,
} from "./pestanas/tipos";

// Tarea 2A.10 — la pantalla de la hoja de personaje: lee `GET .../sheet` y reparte lo que trae.
// Desde la Tarea 7 (spec 2026-09-11, «la hoja a página completa») esto SOLO orquesta: carga, la
// rama «a medias», la `Cabecera` fija y las pestañas. Cada tarjeta vive en su pestaña
// (`pestanas/`) con su comentario largo; la forma que decidió la maqueta (2026-09-03) está en
// `Tarjeta.tsx` y `Cabecera.tsx`. La atribución del SRD la pinta `AppShell` en el pie, no esto.

const COMPONENTE_DE_PESTANA: Record<PestanaId, ComponentType<PropsDePestana>> = {
  numeros: Numeros,
  objetos: Objetos,
  ataques: Ataques,
  recursos: Recursos,
  estado: Estado,
  rasgos: Rasgos,
  conjuros: Conjuros,
};

function esPestana(x: string | null): x is PestanaId {
  return PESTANAS_DE_LA_HOJA.some((p) => p.id === x);
}

export function HojaCalculada({
  campaignId,
  characterId,
  puedeEditar,
  disposicion,
}: {
  campaignId: string;
  characterId: string;
  puedeEditar: boolean;
  disposicion: Disposicion;
}) {
  const { data, isLoading, isError } = useCharacterSheet(campaignId, characterId);
  // En la página la pestaña vive en la URL (enlazable, sin estado escondido); en la mesa es
  // local y arranca en Números: un cajón que se abre no hereda la pestaña de otra vez. Hooks
  // ANTES de cualquier `return` temprano (rules-of-hooks); la activa se resuelve más abajo.
  const [searchParams, setSearchParams] = useSearchParams();
  const [activaEnMesa, setActivaEnMesa] = useState<PestanaId>("numeros");
  // Anexo #6/#17 — el alto REAL de la banda fija, medido por `Cabecera` (`ResizeObserver`) y no
  // supuesto. `--tira-fija-top` (el escalón de `AppShell`) no incluye el alto de la banda misma:
  // un sticky que solo sumara el escalón se metía 60px bajo ella, porque la banda mide más que
  // el escalón. Se publica como variable CSS en el envoltorio de abajo para que cualquier sticky
  // de una pestaña (hoy, `DetalleDeObjeto.tsx`) la lea sin que esta pantalla conozca a sus hijos.
  const [altoDeBanda, setAltoDeBanda] = useState(0);
  const pedida = disposicion === "pagina" ? searchParams.get("pestana") : activaEnMesa;
  const cambiar = (id: string) => {
    if (!esPestana(id)) return;
    if (disposicion === "pagina") setSearchParams({ pestana: id }, { replace: true });
    else setActivaEnMesa(id);
  };

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
  const { sheet, reason, character } = data;

  if (!sheet) {
    // La rama «a medias» se queda como estaba: Ficha + Características + el aviso, y **una ficha
    // a medias se completa aquí, no en otra pantalla** (antes un botón abría un diálogo aparte).
    // Las claves emparejan estos hermanos DENTRO de esta rama, para que un reordenado no desmonte
    // el `<input>` que alguien está usando («element was detached from the DOM», lo decía el
    // navegador). El salto hacia la rama derivable de abajo ya NO está protegido desde la Tarea
    // 4: allí `Características` vive en la pestaña `Numeros` y `Ficha` en `Rasgos`, otro árbol en
    // esta posición, así que React desmonta y monta al cambiar de rama. **Es un coste aceptado**:
    // `EdicionEnSitio.tsx` guarda cada campo al perder el foco, así que lo único que se pierde es
    // el indicador transitorio «guardando…» de un campo que ya se guardó — nunca el valor.
    return (
      <div className="flex flex-col gap-s4">
        <TarjetaDeHoja key="ficha" titulo="Ficha" etiqueta="ficha del personaje">
          <FichaEditable
            campaignId={campaignId}
            characterId={characterId}
            character={character}
            puedeEditar={puedeEditar}
          />
        </TarjetaDeHoja>
        <TarjetaDeHoja key="caracteristicas" titulo="Características" etiqueta="características">
          <Caracteristicas
            campaignId={campaignId}
            characterId={characterId}
            character={character}
            sheet={null}
            puedeEditar={puedeEditar}
          />
        </TarjetaDeHoja>
        <EmptyState key="aviso" title="La hoja de 5.ª edición está a medias">
          {reason ?? "Faltan datos para calcular la hoja."}
        </EmptyState>
      </div>
    );
  }

  const props: PropsDePestana = {
    campaignId,
    characterId,
    data: { ...data, sheet },
    puedeEditar,
    disposicion,
  };
  // `Conjuros` solo para quien lanza (`lanzaConjuros`): un guerrero sin trucos no tiene nada aquí.
  const items = PESTANAS_DE_LA_HOJA.filter((p) => p.id !== "conjuros" || lanzaConjuros(sheet)).map(
    (p) => {
      const Pestana = COMPONENTE_DE_PESTANA[p.id];
      return { id: p.id, label: p.label, content: <Pestana {...props} /> };
    },
  );
  // «Desconocida → Números» es «no ofrecida → Números»: se resuelve contra lo que ESTA hoja
  // ofrece — `?pestana=conjuros` en quien no lanza dejaba a `Tabs` sin activa y el cuerpo vacío.
  const activa: PestanaId = items.find((p) => p.id === pedida)?.id ?? "numeros";

  return (
    <div
      className="flex flex-col gap-s4"
      style={{ "--banda-fija-alto": `${altoDeBanda}px` } as CSSProperties}
    >
      {/* La cabecera fija es HERMANA del cuerpo, nunca su padre — `sticky` se pega dentro de su
          padre; la nota completa está en `Cabecera.tsx`. */}
      <Cabecera {...props} onAlto={setAltoDeBanda} />
      <div data-piel="cromado">
        <Tabs
          items={items}
          active={activa}
          onChange={cambiar}
          layout={disposicion === "pagina" ? "sidebar" : "strip"}
        />
      </div>
    </div>
  );
}
