import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { CampaignLinkRow } from "@dnd/shared";
import { Badge } from "../../../../ui/Badge";
import { IconoDeTipo } from "../../../entities/iconos";
import { Markdown } from "../../../entities/Markdown";
import { bodyToText } from "../../../entities/body";
import { ETIQUETA_DE_TIPO, ROTULO_PLURAL } from "../../../entities/resumen";
import type { Entity } from "../../../entities/api";
import { AnilloDeVecinos } from "./AnilloDeVecinos";
import { EditorDeHilos } from "./EditorDeHilos";
import { ORDEN_DE_TIPO, vecinosDe } from "./arbolDelMundo";

// **La mitad derecha del mundo** (Task 14 bis, D-CF-64): cabecera · vitela · anillo · hilos.
//
//  · La cabecera dice qué es (icono y tipo legible), quién lo ve (`Badge`) y abre la ficha
//    entera en su página (`/campaigns/:id/entidades/:eid`), que sigue siendo donde se edita el
//    cuerpo y se comenta.
//  · La vitela enseña el principio del cuerpo, recortado a unas seis líneas, con «Leer más» que
//    lleva a la ficha. Es `Markdown` —el único sitio de la aplicación que pinta Markdown— dentro
//    de un recorte: no se pinta una segunda vez ni se resume a mano.
//  · El anillo y el editor leen los mismos `vecinosDe`: lo que se ve en círculo es lo que se
//    lista debajo, y no dos listas que puedan discrepar.
//
// Sin ficha elegida, el hueco dice qué hacer y cuenta el mundo por tipo, sin ningún valor de
// enumeración en pantalla (`ROTULO_PLURAL`).

export function DetalleDeFicha({
  campaignId,
  ficha,
  entidades,
  hilos,
  onSeleccion,
}: {
  campaignId: string;
  ficha: Entity | null;
  entidades: Entity[];
  hilos: CampaignLinkRow[];
  onSeleccion: (id: string) => void;
}) {
  const vecinos = useMemo(
    () => (ficha ? vecinosDe(ficha.id, entidades, hilos) : []),
    [ficha, entidades, hilos],
  );

  if (!ficha) {
    const totales = new Map<string, number>();
    for (const e of entidades) totales.set(e.type, (totales.get(e.type) ?? 0) + 1);
    return (
      <div className="flex h-full flex-col items-center justify-center gap-s4 rounded-radius-sm border border-dashed border-muted px-s5 py-s8 text-center">
        <p className="font-title text-chrome-lg text-text">Elige una ficha del desglose</p>
        <p className="max-w-[44ch] font-chrome text-chrome-sm text-muted">
          Aquí se lee lo que dice, quién la ve, y con qué otras fichas está unida por un hilo.
        </p>
        <ul aria-label="Fichas por tipo" className="flex flex-wrap justify-center gap-s2">
          {ORDEN_DE_TIPO.filter((t) => (totales.get(t) ?? 0) > 0).map((t) => (
            <li
              key={t}
              className="inline-flex items-center gap-s1 rounded-radius-sm border border-muted px-s2 py-px font-chrome text-chrome-xs text-muted"
            >
              <span className="text-copper-text">
                <IconoDeTipo type={t} />
              </span>
              {ROTULO_PLURAL[t]}
              <span className="font-data text-text">{totales.get(t)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const cuerpo = bodyToText(ficha.body);
  const rutaDeLaFicha = `/campaigns/${campaignId}/entidades/${ficha.id}`;

  return (
    <article aria-label={`Detalle de ${ficha.name}`} className="flex flex-col gap-s4">
      <header className="flex flex-wrap items-center gap-s2 border-b border-copper pb-s3">
        <span className="text-copper-text [&>svg]:size-5">
          <IconoDeTipo type={ficha.type} />
        </span>
        <h3 className="min-w-0 flex-1 truncate font-title text-chrome-lg text-text">
          {ficha.name}
        </h3>
        <span className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-copper-text">
          {ETIQUETA_DE_TIPO[ficha.type]}
        </span>
        <Badge visibility={ficha.visibility} />
        <Link
          to={rutaDeLaFicha}
          className="inline-flex items-center rounded-radius-sm border border-muted px-s3 py-1 font-chrome text-chrome-xs text-text transition-colors hover:border-accent hover:text-accent-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Abrir ficha
        </Link>
      </header>

      {cuerpo ? (
        <div>
          {/* Seis líneas de `--text-world-base` con su interlineado, más el borde rasgado y el
              respiro del panel de vitela: el recorte se hace con `max-h` y `overflow-hidden`
              sobre el panel entero, no metiendo la mano en `Markdown`. */}
          <div className="max-h-[15rem] overflow-hidden">
            <Markdown text={cuerpo} />
          </div>
          <p className="mt-s1">
            <Link
              to={rutaDeLaFicha}
              className="font-chrome text-chrome-xs text-accent-text underline-offset-2 hover:underline"
            >
              Leer más
            </Link>
          </p>
        </div>
      ) : (
        <p className="font-chrome text-chrome-sm text-muted">Esta ficha no tiene cuerpo todavía.</p>
      )}

      <AnilloDeVecinos centro={ficha} vecinos={vecinos} onSeleccion={onSeleccion} />

      <EditorDeHilos
        campaignId={campaignId}
        ficha={ficha}
        entidades={entidades}
        vecinos={vecinos}
      />
    </article>
  );
}
