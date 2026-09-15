import { useEffect, useRef, useState, type AnimationEvent, type CSSProperties } from "react";
import {
  claseDeTarjeta,
  colorDeCondicion,
  detectarEfectos,
  efectoDePantalla,
  textoDeEfecto,
  type Efecto,
  type Instantanea,
} from "./detectarEfectos";
import { usePantallaStore } from "./pantalla.store";
import "./efectos.css";

// **Los efectos de una tarjeta del elenco** (2026-09-15, a partir de `rpg_fx_lab.html`).
//
// La tarjeta ya recibe su hoja y sus condiciones por TanStack Query, recargadas por el canal en
// vivo o por el sondeo. Este gancho guarda la lectura anterior, la compara con la nueva
// (`detectarEfectos`) y de la diferencia saca: un texto que flota («−7», «Envenenado»), una
// clase que sacude/ilumina la tarjeta, y —si la tarjeta es la de MI personaje— un efecto en la
// pantalla entera. Todo el mundo ve la tarjeta; la pantalla solo la ve el afectado.
//
// Se dispara por **cambio de dato**, no por aviso: funciona igual para quien aplica el daño,
// para quien lo recibe por SSE y para quien llega por sondeo. Y como solo compara lo que la
// tarjeta ya pinta, no enseña nada que `canView` no haya dejado pasar.

interface Flotante {
  id: number;
  texto: string;
  tono: string;
  rotulo: boolean;
  retardoMs: number;
}

const COLOR_DE_DESTELLO_DE_TARJETA: Partial<Record<Efecto["tipo"], string>> = {
  dano: "var(--danger)",
  cae: "var(--danger)",
  muerte: "var(--danger)",
  cura: "var(--voz-salvia)",
  "en-pie": "var(--voz-salvia)",
  nivel: "var(--warning)",
};

let contador = 0;

export function useEfectosDeFicha({
  instantanea,
  esMio,
}: {
  /** `null` mientras la hoja no ha llegado: no hay con qué comparar y no se anima nada. */
  instantanea: Instantanea | null;
  /** El personaje que llevo yo: sus golpes van también a mi pantalla entera. */
  esMio: boolean;
}) {
  const anterior = useRef<Instantanea | null>(null);
  const [flotantes, setFlotantes] = useState<Flotante[]>([]);
  const [tarjeta, setTarjeta] = useState<{ id: number; clase: string } | null>(null);
  const [destello, setDestello] = useState<{ id: number; color: string } | null>(null);
  const lanzarEnPantalla = usePantallaStore((s) => s.lanzar);

  useEffect(() => {
    if (!instantanea) return;
    const efectos = detectarEfectos(anterior.current, instantanea);
    anterior.current = instantanea;
    if (efectos.length === 0) return;

    setFlotantes((lista) => [
      ...lista,
      ...efectos.map((e, i) => ({ id: ++contador, ...textoDeEfecto(e), retardoMs: i * 250 })),
    ]);

    const clase = claseDeTarjeta(efectos);
    if (clase) {
      // Quitar y volver a poner en el siguiente cuadro: si la clase ya estaba (dos golpes
      // seguidos), el navegador no reinicia una animación cuyo nombre no cambió.
      setTarjeta(null);
      const id = ++contador;
      requestAnimationFrame(() => setTarjeta({ id, clase }));
    }

    const conDestello = efectos.find((e) => COLOR_DE_DESTELLO_DE_TARJETA[e.tipo]);
    const condicion = efectos.find((e) => e.tipo === "condicion");
    const colorDeLaCondicion =
      condicion?.tipo === "condicion" ? colorDeCondicion(condicion.clave) : null;
    const color = conDestello
      ? COLOR_DE_DESTELLO_DE_TARJETA[conDestello.tipo]!
      : colorDeLaCondicion;
    if (color) setDestello({ id: ++contador, color });

    if (esMio) {
      const enPantalla = efectoDePantalla(efectos);
      if (enPantalla) lanzarEnPantalla(enPantalla);
    }
  }, [instantanea, esMio, lanzarEnPantalla]);

  const quitarFlotante = (id: number) => setFlotantes((lista) => lista.filter((f) => f.id !== id));

  /** Para el `onAnimationEnd` de la tarjeta: solo la suya, no la de un hijo que burbujea. */
  const alTerminarAnimacion = (e: AnimationEvent<HTMLElement>) => {
    if (e.target === e.currentTarget) setTarjeta(null);
  };

  const capa = (
    <>
      {destello && (
        <span
          key={destello.id}
          aria-hidden="true"
          className="fx-destello"
          style={{ "--fx-color": destello.color } as CSSProperties}
          onAnimationEnd={() => setDestello(null)}
        />
      )}
      {flotantes.length > 0 && (
        <span className="fx-flotantes" aria-hidden="true">
          {flotantes.map((f) => (
            <span
              key={f.id}
              className={`fx-flotante fx-tono-${f.tono}${f.rotulo ? " fx-flotante--rotulo" : ""}`}
              style={{ "--fx-retardo": `${f.retardoMs}ms` } as CSSProperties}
              onAnimationEnd={() => quitarFlotante(f.id)}
            >
              {f.texto}
            </span>
          ))}
        </span>
      )}
    </>
  );

  return {
    /** La clase de la tarjeta, o `""`. Se pone en el `<li>`, que ya es `relative`. */
    clase: tarjeta?.clase ?? "",
    alTerminarAnimacion,
    /** El destello y los textos: se pintan DENTRO del `<li>`. */
    capa,
  };
}
