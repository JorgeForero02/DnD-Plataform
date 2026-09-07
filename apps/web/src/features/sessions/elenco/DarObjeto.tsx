import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CoinKey, ContentRefInput } from "@dnd/shared";
import { COIN_KEYS } from "@dnd/shared";
import { Button } from "../../../ui/Button";
import { Dialog } from "../../../ui/Dialog";
import { IconoMochila } from "../../../ui/Iconos";
import { RadioGroup } from "../../campaign-items/RadioGroup";
import { useNpcs } from "../../bestiario/hooks";
import { fetchCharacters } from "../../characters/api";
import { charactersKey } from "../../characters/hooks";
import { useAddInventoryItem, useChangeMoney } from "../../inventory/hooks";
import { SelectorDeObjeto } from "../../inventory/SelectorDeObjeto";
import { fraseDeMoneda } from "../../inventory/vocabulario";

/**
 * **«Dar…» sin salir de la mesa** (tarea B4, 2026-09-06).
 *
 * El problema, medido en el encargo: dar un objeto exigía abrir la hoja de quien lo recibe. Con
 * cuatro jugadores y un cofre, eran cuatro pantallas y una docena de clics. Este gesto es el
 * mismo, sin cambiar de pantalla: quién lo recibe, con radios porque son pocas opciones y cada
 * una tiene nombre propio (`docs/04-convenciones.md`) — nunca un desplegable.
 *
 * **Dos modos, un solo componente** (B5 reutiliza este, no escribe uno segundo):
 *  - **Libre**, sin `entregaFija`: el DM elige destinatario y luego el objeto, con el buscador
 *    del catálogo que ya existe (`SelectorDeObjeto`). Se monta una vez elegido el destinatario,
 *    parametrizado con SU `characterId` — es la propia pantalla de añadir objetos, apuntando a
 *    otra bolsa que la del DM. **No se escribe un segundo buscador de catálogo.**
 *  - **Con `entregaFija`**: lo que se da ya viene decidido —el botín de una tirada, resuelto por
 *    el servidor con su nombre—, y lo único que falta es a quién. Aquí no hay buscador: se
 *    enseña la lista y un botón «Entregar» que manda cada objeto por `addInventoryItem` y las
 *    monedas por `changeMoney`, contra el destinatario elegido.
 *
 * **No hay reparto automático, y es a propósito** (decisión del autor, plan de botín y reparto):
 * quién se queda qué lo decide la mesa. Este componente nunca ofrece «a todos» ni «repartir».
 *
 * **`soyDm` no es control de acceso.** Filtra los destinatarios en pantalla —un jugador solo se
 * ve a sí mismo— por higiene de interfaz, pero la puerta de verdad es el servidor
 * (`requireOwnerOrDM` en `inventory.service.ts`): esconder un radio no impide una petición hecha
 * a mano. Si `soyDm` llegara equivocado, el `POST` seguiría rechazándose donde toca.
 *
 * **`disabled` NO deshabilita un botón: quita el botón entero** (arreglo de vuelta 1, sobre I5).
 * El primer intento usó un `<button disabled>` nativo razonando que, sin nada que dar, no había
 * ninguna acción detrás que perder del recorrido de teclado. La revisión lo tumbó con la propia
 * cita de `docs/04-convenciones.md`: deshabilitado, el botón sale del orden de tabulación, y el
 * motivo de al lado vivía en un `<span>` hermano sin `aria-describedby` — quien navega con
 * teclado o lector de pantalla no aterriza en el botón y por tanto tampoco oye por qué no sirve,
 * que es exactamente el daño que la regla describe. «No ofrecer el gesto» y «apagarlo» no son la
 * misma acción: para el foco, un botón muerto y ningún botón son cosas distintas. Por eso, cuando
 * `disabled` es `true`, no se pinta ningún botón — solo la frase, como texto normal.
 */

export interface CandidatoADestinatario {
  id: string;
  nombre: string;
}

export interface ObjetoAEntregar {
  ref: ContentRefInput;
  cantidad: number;
  /** Ya resuelto por el servidor: nunca se enseña la `ref` en su lugar. */
  nombre: string;
}

export interface EntregaFija {
  objetos?: ObjetoAEntregar[];
  /** Deltas positivos: lo que se suma a la bolsa de quien lo recibe. */
  monedas?: Partial<Record<CoinKey, number>>;
}

export function DarObjeto({
  campaignId,
  soyDm,
  miPersonajeId,
  entregaFija,
  disabled = false,
  motivoDeshabilitado,
}: {
  campaignId: string;
  soyDm: boolean;
  /** El personaje propio: si no eres DM, es el único destinatario que se ofrece. */
  miPersonajeId: string;
  /** Ausente = modo libre: se elige el objeto del catálogo dentro de este mismo cajón. */
  entregaFija?: EntregaFija;
  disabled?: boolean;
  /** Por qué no hay nada que dar, si `disabled` es `true`. */
  motivoDeshabilitado?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [destinatario, setDestinatario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Cuántos objetos de la lista ya se dieron cuando algo falla a mitad de camino: `entregar()`
  // manda cada objeto y las monedas en peticiones separadas, así que un fallo en el tercero deja
  // los dos primeros ya entregados. No hay una transacción que lo revierta —cada `POST` es su
  // propia mutación del inventario del destinatario—, así que la pantalla dice hasta dónde llegó
  // en vez de callarlo.
  const [entregadosAntesDelFallo, setEntregadosAntesDelFallo] = useState(0);
  const [hecho, setHecho] = useState(false);

  // **Con `enabled: abierto`, como el catálogo de `SelectorDeObjeto`**: este mando vive en cada
  // fila del elenco, y traer la lista de personajes en cuanto se monta —en vez de en cuanto se
  // abre el cajón— sería una petición por combatiente en cada pantalla de mesa, siempre, aunque
  // nadie vaya a dar nada.
  const { data: personajes } = useQuery({
    queryKey: charactersKey(campaignId),
    queryFn: () => fetchCharacters(campaignId),
    enabled: abierto,
  });
  // **`fetchCharacters` no trae PNJ, y por eso hace falta la segunda lista** (ficha P2-3).
  // `CharactersService.list()` filtra `statblockRef: null` a propósito —esa lista es «quién se
  // sienta a la mesa»— así que un jugador con un PNJ cedido (`soyDm=false`,
  // `miPersonajeId=pnj.id`) no encontraba su propio id ahí y **el cajón se abría vacío**: un
  // gesto ofrecido sin datos para completarlo. Los PNJ ya visibles para quien mira viven en la
  // otra puerta, `GET /npcs`, filtrada por `canView` en el servidor igual que la primera.
  //
  // **Esto no mueve la autorización ni un milímetro**: quien de verdad decide si el objeto entra
  // en esa bolsa es `requireOwnerOrDM` en `inventory.service.ts`. Lo que se arregla aquí es la
  // pantalla, que prometía un gesto que no podía completar.
  const { data: pnj } = useNpcs(campaignId, { enabled: abierto });
  const candidatos = useMemo<CandidatoADestinatario[]>(() => {
    const deLaMesa = (personajes ?? [])
      .filter((p) => !p.archivedAt)
      .map((p) => ({ id: p.id, nombre: p.name }));
    // Un PNJ no se archiva —no sale del listado por esa vía—, así que aquí no hay filtro de
    // archivados que aplicar: el servidor ya decidió cuáles viajan.
    const cedidos = (pnj ?? []).map((p) => ({ id: p.id, nombre: p.name }));
    // **El mismo filtro para los dos**, y no uno por lista: un jugador se ve a sí mismo, sea su
    // personaje o el PNJ que le cedieron; el DM ve la mesa entera. Dos reglas distintas para la
    // misma pregunta es como se abre el próximo hueco.
    return [...deLaMesa, ...cedidos].filter((c) => soyDm || c.id === miPersonajeId);
  }, [personajes, pnj, soyDm, miPersonajeId]);

  const objetosDeEntregaFija = entregaFija?.objetos?.length ?? 0;

  // Los hooks de mutación no exigen el destinatario al declararse, solo al usarse: mientras no se
  // ha elegido a nadie, `dar`/`darMonedas` existen pero `entregar()` nunca los llama.
  const dar = useAddInventoryItem(campaignId, destinatario);
  const darMonedas = useChangeMoney(campaignId, destinatario);

  function cerrar() {
    setAbierto(false);
    setDestinatario("");
    setError(null);
    setEntregadosAntesDelFallo(0);
    setHecho(false);
  }

  async function entregar() {
    if (!destinatario || !entregaFija) return;
    setEnviando(true);
    setError(null);
    setEntregadosAntesDelFallo(0);
    const objetos = entregaFija.objetos ?? [];
    try {
      for (let i = 0; i < objetos.length; i++) {
        const objeto = objetos[i];
        await dar.mutateAsync({ ref: objeto.ref, quantity: objeto.cantidad, location: "CARRIED" });
        setEntregadosAntesDelFallo(i + 1);
      }
      const monedas = entregaFija.monedas ?? {};
      if (COIN_KEYS.some((clave) => (monedas[clave] ?? 0) > 0)) {
        await darMonedas.mutateAsync(monedas);
      }
      setHecho(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo ha ido mal. Vuelve a intentarlo.");
    } finally {
      setEnviando(false);
    }
  }

  // Solo tiene sentido contarlo cuando de verdad quedó algo a medias: todo entregado, o nada
  // entregado todavía, no necesita esta frase extra.
  const entregaAMedias =
    error !== null && entregadosAntesDelFallo > 0 && entregadosAntesDelFallo < objetosDeEntregaFija;

  if (!abierto) {
    // **`disabled` quita el botón, no lo apaga** (ver la nota de cabecera): un botón muerto y
    // ningún botón no son lo mismo para el foco de teclado, y la regla de `docs/04-
    // convenciones.md` es sobre eso, no solo sobre el contraste.
    if (disabled) {
      return motivoDeshabilitado ? (
        <span className="font-chrome text-chrome-xs text-muted">{motivoDeshabilitado}</span>
      ) : null;
    }
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex items-center justify-center gap-1 rounded-radius-sm border border-muted bg-surface px-3 py-1.5 font-chrome text-chrome-sm font-semibold text-text hover:border-accent"
      >
        <IconoMochila className="h-4 w-4" /> Dar
      </button>
    );
  }

  return (
    <Dialog
      open={abierto}
      onClose={cerrar}
      title="Dar…"
      size="sm"
      subtitulo="Elige a quién, y se lo lleva sin salir de la mesa."
      acciones={
        entregaFija ? (
          hecho ? (
            <Button type="button" variant="primary" onClick={cerrar}>
              Cerrar
            </Button>
          ) : (
            <>
              <Button type="button" variant="ghost" onClick={cerrar}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={!destinatario || enviando}
                onClick={() => void entregar()}
              >
                {enviando ? "Entregando…" : "Entregar"}
              </Button>
            </>
          )
        ) : undefined
      }
    >
      <RadioGroup
        name="dar-objeto-destinatario"
        legend="A quién"
        value={destinatario}
        onChange={setDestinatario}
        compact
        options={candidatos.map((c) => ({ value: c.id, label: c.nombre }))}
      />

      {entregaFija ? (
        <ul className="mt-s3 space-y-1 font-chrome text-chrome-sm text-text">
          {(entregaFija.objetos ?? []).map((objeto, indice) => (
            <li key={indice}>
              {objeto.nombre}
              {objeto.cantidad > 1 ? ` x${objeto.cantidad}` : ""}
            </li>
          ))}
          {COIN_KEYS.filter((clave) => (entregaFija.monedas?.[clave] ?? 0) > 0).map((clave) => (
            <li key={clave}>{fraseDeMoneda(clave, entregaFija.monedas![clave]!)}</li>
          ))}
        </ul>
      ) : (
        // Modo libre: **no se escribe un segundo buscador de catálogo**. Este es el mismo
        // componente que la pantalla de inventario, apuntando a la bolsa del destinatario elegido.
        destinatario && (
          <div className="mt-s3">
            <SelectorDeObjeto campaignId={campaignId} characterId={destinatario} />
          </div>
        )
      )}

      {error && (
        <p role="alert" className="mt-s3 font-chrome text-chrome-sm text-danger-text">
          {error}
          {entregaAMedias &&
            ` Ya se entregaron ${entregadosAntesDelFallo} de ${objetosDeEntregaFija} objetos antes del fallo; no se han deshecho.`}
        </p>
      )}
      {hecho && (
        <p role="status" className="mt-s3 font-chrome text-chrome-sm text-accent-text">
          Entregado.
        </p>
      )}
    </Dialog>
  );
}
