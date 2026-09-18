import { useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "../../../../ui/Button";
import { IconoMas, IconoPluma, IconoQuitar } from "../../../../ui/Iconos";
import { ApiError } from "../../../../lib/api";
import { IconoDeTipo } from "../../../entities/iconos";
import { ETIQUETA_DE_TIPO } from "../../../entities/resumen";
import type { Entity } from "../../../entities/api";
import { useCreateLink, useDeleteLink } from "../../../links/hooks";
import { relacionesSugeridas } from "../../../links/relaciones";
import type { Vecino } from "./arbolDelMundo";
import { Punta } from "./Punta";
import { normalizarTexto as normalizar } from "../../../../lib/texto";

// **El editor de hilos** (Task 14 bis, D-CF-64): la lista de hilos de la ficha abierta —una fila
// por hilo: ficha · rótulo · cambiar · quitar, con iconos dibujados— y el gesto de añadir uno
// con **dos desplegables con buscador**: hacia qué ficha, y qué rótulo (primero lo sugerido para
// el par de tipos por `relacionesSugeridas`, y si no, una frase libre).
//
// Los dos desplegables son DATOS y no opciones con significado, por eso no son radios: la regla
// de `docs/04-convenciones.md` («una opción con significado no se esconde en un desplegable»)
// habla de tres o cuatro alternativas que hay que explicar, no de cuarenta fichas. El patrón es
// el de `inventory/SelectorDeObjeto.tsx`: un buscador de cliente sobre una lista que ya llegó
// filtrada por `canView` desde el servidor.
//
// **La autorización la impone el servidor.** `POST /entities/:id/links` exige DM
// (`links.service.ts`, `requireDM`) y `DELETE /links/:id` DM o creador de la ficha de origen;
// aquí no se esconde nada por rol: se pinta, y el rechazo se lee en línea con `role="alert"`, sin
// borrar lo elegido.
//
// **Cambiar un rótulo es crear y luego quitar**, en ese orden y a propósito: no hay `PATCH` de
// enlaces, y si el `POST` falla el hilo viejo sigue ahí; si falla el `DELETE`, quedan los dos a
// la vista y el viejo se quita a mano. Al revés —quitar y luego crear— un fallo dejaba el mundo
// sin ese hilo y sin aviso. Solo se ofrece sobre los hilos que SALEN de la ficha abierta: los que
// entran los escribió la otra ficha y se reescriben desde ella.

interface Opcion {
  id: string;
  texto: string;
  /** Lo que va a la derecha, en gris: el tipo legible de una ficha. */
  detalle?: string;
  icono?: ReactNode;
}

function mensajeDeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Algo ha ido mal. Vuelve a intentarlo.";
}

/**
 * Un desplegable con buscador: un botón que dice lo elegido, y al abrirlo un campo de búsqueda
 * sobre la lista. Con `permiteLibre`, lo escrito que no encaja con ninguna opción se ofrece como
 * «Usar «…»»: es lo que hace del rótulo una frase libre además de una sugerencia.
 */
function DesplegableConBuscador({
  etiqueta,
  etiquetaDeBusqueda,
  placeholder,
  valor,
  opciones,
  onElegir,
  permiteLibre = false,
  vacio,
}: {
  etiqueta: string;
  etiquetaDeBusqueda: string;
  placeholder: string;
  valor: string | null;
  opciones: Opcion[];
  onElegir: (opcion: Opcion) => void;
  permiteLibre?: boolean;
  /** Qué decir cuando no hay ninguna opción que ofrecer (antes de escribir nada). */
  vacio: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const idEtiqueta = useId();
  const idValor = useId();

  const filtradas = useMemo(() => {
    const buscado = normalizar(texto);
    if (!buscado) return opciones;
    return opciones.filter((o) => normalizar(o.texto).includes(buscado));
  }, [opciones, texto]);
  const libre = texto.trim();
  const ofreceLibre =
    permiteLibre &&
    libre !== "" &&
    !opciones.some((o) => normalizar(o.texto) === normalizar(libre));

  const elegir = (opcion: Opcion) => {
    onElegir(opcion);
    setTexto("");
    setAbierto(false);
  };

  return (
    <div className="flex flex-col gap-1">
      <span id={idEtiqueta} className="font-chrome text-chrome-xs text-muted">
        {etiqueta}
      </span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-labelledby={`${idEtiqueta} ${idValor}`}
        onClick={() => setAbierto((a) => !a)}
        className="flex w-full items-center justify-between gap-s2 rounded-radius-sm border border-muted bg-surface px-2 py-1.5 text-left font-chrome text-chrome-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span id={idValor} className={valor ? "text-text" : "text-muted"}>
          {valor ?? placeholder}
        </span>
        <span className="text-muted">
          <Punta abierta={abierto} />
        </span>
      </button>
      {abierto && (
        <div
          className="rounded-radius-sm border border-muted bg-surface p-s2"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              setAbierto(false);
            }
          }}
        >
          <input
            type="search"
            autoFocus
            aria-label={etiquetaDeBusqueda}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={etiquetaDeBusqueda}
            className="mb-s2 w-full rounded-radius-sm border border-muted bg-bg px-2 py-1 font-chrome text-chrome-sm text-text outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          {filtradas.length === 0 && !ofreceLibre ? (
            <p className="px-1 font-chrome text-chrome-xs text-muted">
              {libre ? `Nada encaja con «${libre}».` : vacio}
            </p>
          ) : (
            <ul aria-label={etiqueta} className="max-h-48 overflow-y-auto">
              {ofreceLibre && (
                <li>
                  <button
                    type="button"
                    onClick={() => elegir({ id: `libre:${libre}`, texto: libre })}
                    className="flex w-full items-center gap-s2 rounded-radius-sm px-2 py-1 text-left font-chrome text-chrome-sm text-accent-text hover:bg-bg focus-visible:bg-bg"
                  >
                    <IconoMas />
                    Usar «{libre}»
                  </button>
                </li>
              )}
              {filtradas.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => elegir(o)}
                    className="flex w-full items-center gap-s2 rounded-radius-sm px-2 py-1 text-left hover:bg-bg focus-visible:bg-bg"
                  >
                    {o.icono && <span className="text-copper-text">{o.icono}</span>}
                    <span className="min-w-0 flex-1 truncate font-chrome text-chrome-sm text-text">
                      {o.texto}
                    </span>
                    {o.detalle && (
                      <span className="shrink-0 font-chrome text-chrome-xs text-muted">
                        {o.detalle}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

type Modo = { tipo: "cerrado" } | { tipo: "nuevo" } | { tipo: "cambiar"; vecino: Vecino };

export function EditorDeHilos({
  campaignId,
  ficha,
  entidades,
  vecinos,
}: {
  campaignId: string;
  ficha: Entity;
  entidades: Entity[];
  vecinos: Vecino[];
}) {
  const [modo, setModo] = useState<Modo>({ tipo: "cerrado" });
  const [destino, setDestino] = useState<Entity | null>(null);
  const [rotulo, setRotulo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const crear = useCreateLink(ficha.id, campaignId);
  const quitar = useDeleteLink(ficha.id, campaignId);

  const cerrar = () => {
    setModo({ tipo: "cerrado" });
    setDestino(null);
    setRotulo(null);
    setError(null);
  };

  const abrirNuevo = () => {
    setModo({ tipo: "nuevo" });
    setDestino(null);
    setRotulo(null);
    setError(null);
  };

  const abrirCambio = (vecino: Vecino) => {
    const otra = entidades.find((e) => e.id === vecino.id) ?? null;
    setModo({ tipo: "cambiar", vecino });
    setDestino(otra);
    setRotulo(vecino.label?.trim() || null);
    setError(null);
  };

  const candidatas = useMemo(
    () =>
      entidades
        .filter((e) => e.id !== ficha.id)
        .sort((a, b) => a.name.localeCompare(b.name, "es"))
        .map<Opcion>((e) => ({
          id: e.id,
          texto: e.name,
          detalle: ETIQUETA_DE_TIPO[e.type],
          icono: <IconoDeTipo type={e.type} />,
        })),
    [entidades, ficha.id],
  );

  const sugeridas = useMemo<Opcion[]>(
    () =>
      destino
        ? relacionesSugeridas(ficha.type, destino.type).map((r) => ({
            id: r.desde,
            texto: r.desde,
          }))
        : [],
    [ficha.type, destino],
  );

  const confirmar = async () => {
    if (!destino) {
      setError("Elige hacia qué ficha va el hilo.");
      return;
    }
    setError(null);
    const label = rotulo?.trim() || undefined;
    // Un rótulo sin cambiar no se manda: crear y quitar el mismo hilo no es «guardar».
    if (modo.tipo === "cambiar" && label === (modo.vecino.label?.trim() || undefined)) {
      cerrar();
      return;
    }
    let creado = false;
    try {
      await crear.mutateAsync({ toId: destino.id, label });
      creado = true;
      if (modo.tipo === "cambiar")
        await quitar.mutateAsync({ id: modo.vecino.hiloId, otherEntityId: modo.vecino.id });
      cerrar();
    } catch (err) {
      const mensaje = mensajeDeError(err);
      // Crear salió bien y quitar no: hay dos hilos a la vista y el viejo hay que quitarlo a mano.
      setError(
        creado
          ? `El hilo nuevo ya existe, pero el viejo no se pudo quitar (${mensaje}). Quítalo a mano desde la lista.`
          : mensaje,
      );
    }
  };

  const quitarHilo = (vecino: Vecino) => {
    setError(null);
    quitar.mutate(
      { id: vecino.hiloId, otherEntityId: vecino.id },
      { onError: (err) => setError(mensajeDeError(err)) },
    );
  };

  return (
    <section aria-label={`Hilos de ${ficha.name}`} className="flex flex-col gap-s3">
      <h4 className="font-chrome text-chrome-xs uppercase tracking-[0.16em] text-muted">Hilos</h4>

      {vecinos.length > 0 && (
        <ul aria-label={`Hilos de ${ficha.name}`} className="flex flex-col">
          {vecinos.map((v) => (
            <li
              key={v.hiloId}
              className="flex items-center gap-s2 border-b border-muted py-s2 last:border-b-0"
            >
              <span className="text-copper-text">
                <IconoDeTipo type={v.type} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-chrome text-chrome-sm text-text">
                  {v.name}
                </span>
                <span className="block font-chrome text-chrome-xs text-muted">
                  {ETIQUETA_DE_TIPO[v.type]}
                  {v.literal ? ` · dice «${v.literal}»` : ""}
                </span>
              </span>
              <span className="shrink-0 font-chrome text-chrome-xs text-copper-text">
                {v.rotulo}
              </span>
              {v.direccion === "sale" && (
                <button
                  type="button"
                  aria-label={`Cambiar el rótulo del hilo con ${v.name}`}
                  onClick={() => abrirCambio(v)}
                  className="rounded-radius-sm p-1 text-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <IconoPluma />
                </button>
              )}
              <button
                type="button"
                aria-label={`Quitar el hilo con ${v.name}`}
                onClick={() => quitarHilo(v)}
                className="rounded-radius-sm p-1 text-muted hover:text-danger-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <IconoQuitar />
              </button>
            </li>
          ))}
        </ul>
      )}

      {vecinos.some((v) => v.direccion === "entra") && (
        <p className="font-chrome text-chrome-xs text-muted">
          Los hilos que entran se cambian desde su ficha.
        </p>
      )}

      {modo.tipo === "cerrado" ? (
        <div>
          <Button type="button" variant="secondary" onClick={abrirNuevo}>
            <IconoMas /> Añadir hilo
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-s3 rounded-radius-sm border border-muted bg-bg p-s3">
          <div className="flex items-center justify-between gap-s2">
            <h5 className="font-chrome text-chrome-sm font-semibold text-text">
              {modo.tipo === "cambiar"
                ? `Cambiar el rótulo del hilo con ${modo.vecino.name}`
                : "Añadir un hilo"}
            </h5>
            <Button type="button" variant="ghost" onClick={cerrar}>
              Cerrar
            </Button>
          </div>

          {modo.tipo === "nuevo" ? (
            <DesplegableConBuscador
              etiqueta="Hacia qué ficha"
              etiquetaDeBusqueda="Buscar ficha por nombre"
              placeholder="Elige una ficha…"
              valor={destino?.name ?? null}
              opciones={candidatas}
              vacio="No hay otra ficha en el mundo todavía."
              onElegir={(o) => {
                setDestino(entidades.find((e) => e.id === o.id) ?? null);
                setRotulo(null);
              }}
            />
          ) : (
            <p className="font-chrome text-chrome-sm text-text">
              <span className="text-muted">Hacia </span>
              {destino?.name ?? modo.vecino.name}
            </p>
          )}

          <DesplegableConBuscador
            etiqueta="Rótulo"
            etiquetaDeBusqueda="Buscar o escribir un rótulo"
            placeholder={destino ? "Elige o escribe un rótulo…" : "Primero elige la ficha"}
            valor={rotulo}
            opciones={sugeridas}
            permiteLibre
            vacio="No hay sugerencias para este par: escribe la frase."
            onElegir={(o) => setRotulo(o.texto)}
          />

          {/* Nunca se deshabilita: un rechazo del servidor se explica debajo y conserva lo
              elegido (regla del carril, `docs/04-convenciones.md`). */}
          <div>
            <Button type="button" variant="primary" onClick={confirmar}>
              {modo.tipo === "cambiar" ? (
                <>
                  <IconoPluma /> Guardar el rótulo
                </>
              ) : (
                <>
                  <IconoMas /> Añadir hilo
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="font-chrome text-chrome-xs text-danger-text">
          {error}
        </p>
      )}
    </section>
  );
}
