import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { FilterChip } from "../../../../ui/Collection";
import { IconoLupa } from "../../../../ui/Iconos";
import { IconoDeTipo } from "../../../entities/iconos";
import { ETIQUETA_DE_TIPO } from "../../../entities/resumen";
import type { ArbolDelMundo, NodoDelMundo, RaizDeTipo } from "./arbolDelMundo";
import { Punta } from "./Punta";
import { normalizarTexto as normalizar } from "../../../../lib/texto";

// **El desglose del mundo** (Task 14 bis, D-CF-64): un `tree` WAI-ARIA. **El fichero se llama
// `DesgloseDelMundo` y no `ArbolDelMundo`** porque `./ArbolDelMundo` y `./arbolDelMundo` (el módulo
// puro de al lado) son el mismo nombre en un sistema de ficheros que no distingue mayúsculas
// —Windows, donde se desarrolla esto—: el resolutor probaba `.ts` antes que `.tsx` y el
// componente llegaba `undefined`. Un `tree` WAI-ARIA con las raíces por tipo
// —con su contador— y, debajo de cada ficha, las que cuelgan de ella por un rótulo de
// jerarquía, con ese rótulo en gris a la derecha y «también en …» cuando tiene más de un padre.
//
// **Teclado, el mismo modelo que `ui/Tabs`**: un solo elemento alcanzable con Tab (tabindex
// rotatorio), y desde él las flechas mueven el foco entre los elementos VISIBLES. Arriba y abajo
// recorren la lista aplanada; la derecha despliega, y si ya está desplegado baja al primer hijo;
// la izquierda pliega, y si ya está plegado sube al padre; Enter y Espacio eligen (o alternan,
// en una raíz de tipo); Inicio y Fin van a los extremos. Es el patrón «tree view» de la guía
// WAI-ARIA, sin la búsqueda por letra.
//
// **Una ficha puede aparecer dos veces** (dos padres), así que la identidad de un nodo en
// pantalla no es su `id` sino su CAMINO —`LOCATION/l1/n1`—: desplegar la Torre no despliega
// también al Gremio, y el foco sabe en cuál de las dos apariciones está.
//
// El buscador y el chip «Sin hilos» son filtros de pantalla, no control de acceso: la lista ya
// llegó filtrada por `canView` desde el servidor.

interface Fila {
  clave: string;
  padre: string | null;
  nivel: number;
  id: string | null;
  nombre: string;
  tieneHijos: boolean;
  expandido: boolean;
}

/** Recorta el árbol a lo que encaja con la búsqueda, dejando el camino hasta cada acierto. */
function podar(nodos: NodoDelMundo[], buscado: string): NodoDelMundo[] {
  const salida: NodoDelMundo[] = [];
  for (const n of nodos) {
    const hijos = podar(n.hijos, buscado);
    if (normalizar(n.name).includes(buscado) || hijos.length > 0) salida.push({ ...n, hijos });
  }
  return salida;
}

/** Las claves de todos los nodos con hijos, para desplegarlos de golpe. */
function clavesConHijos(nodos: NodoDelMundo[], prefijo: string, salida: Set<string>): void {
  for (const n of nodos) {
    const clave = `${prefijo}/${n.id}`;
    if (n.hijos.length > 0) {
      salida.add(clave);
      clavesConHijos(n.hijos, clave, salida);
    }
  }
}

/** Todos los caminos hasta cada aparición de la ficha elegida, para revelarla. */
function caminosHasta(raices: RaizDeTipo[], id: string): string[][] {
  const caminos: string[][] = [];
  function bajar(nodos: NodoDelMundo[], camino: string[]) {
    for (const n of nodos) {
      const clave = `${camino[camino.length - 1]}/${n.id}`;
      if (n.id === id) caminos.push([...camino, clave]);
      bajar(n.hijos, [...camino, clave]);
    }
  }
  for (const r of raices) bajar(r.hijos, [r.type]);
  return caminos;
}

export function DesgloseDelMundo({
  arbol,
  seleccionId,
  onSeleccion,
}: {
  arbol: ArbolDelMundo;
  seleccionId: string | null;
  onSeleccion: (id: string) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [soloSinHilos, setSoloSinHilos] = useState(false);
  // Las raíces de tipo CON hijos empiezan desplegadas: un desglose que hay que abrir siete veces
  // antes de ver una ficha no es un desglose. Una raíz sin ninguna ficha (o con todas colgando de
  // otro tipo) nace plegada — abrirla solo enseña la nota «Ninguna todavía»/«Todas cuelgan de otra
  // ficha», que ya se lee sin desplegar en el contador de la cabecera (Mundo · menor, 2026-09-17).
  const [abiertos, setAbiertos] = useState<Set<string>>(
    () => new Set(arbol.raices.filter((r) => r.hijos.length > 0).map((r) => r.type)),
  );
  const [foco, setFoco] = useState<string | null>(null);
  const refs = useRef(new Map<string, HTMLLIElement>());

  const buscado = normalizar(busqueda);

  const raices = useMemo<RaizDeTipo[]>(() => {
    if (soloSinHilos) {
      return arbol.raices.map((r) => ({
        ...r,
        hijos: arbol.sinHilos
          .filter((s) => s.type === r.type)
          .map((s) => ({ ...s, rotulo: null, tambienEn: [], hijos: [] })),
      }));
    }
    if (!buscado) return arbol.raices;
    return arbol.raices.map((r) => ({ ...r, hijos: podar(r.hijos, buscado) }));
  }, [arbol, soloSinHilos, buscado]);

  // Con búsqueda, todo lo que queda se enseña desplegado: lo que encaja está al fondo.
  const forzados = useMemo(() => {
    if (!buscado) return null;
    const salida = new Set<string>();
    for (const r of raices) {
      salida.add(r.type);
      clavesConHijos(r.hijos, r.type, salida);
    }
    return salida;
  }, [raices, buscado]);

  // Revelar la ficha elegida: se abren los caminos hasta cada una de sus apariciones. Se vuelve
  // a hacer cuando cambia el árbol —un hilo nuevo puede haberla movido bajo otra ficha— y no
  // solo cuando cambia la elección. Es el patrón «ajustar el estado cuando cambia una prop» de la
  // documentación de React —comparar con lo último visto y fijar el estado DURANTE el render—,
  // y no un efecto: `react-hooks/set-state-in-effect` lo prohíbe, con razón (un render de más).
  const [revelado, setRevelado] = useState<{ arbol: ArbolDelMundo; id: string | null } | null>(
    null,
  );
  if (revelado?.arbol !== arbol || revelado?.id !== seleccionId) {
    setRevelado({ arbol, id: seleccionId });
    const caminos = seleccionId ? caminosHasta(arbol.raices, seleccionId) : [];
    if (caminos.length > 0) {
      setAbiertos((previos) => {
        const siguiente = new Set(previos);
        for (const camino of caminos) for (const clave of camino.slice(0, -1)) siguiente.add(clave);
        return siguiente;
      });
    }
  }

  // La lista aplanada de lo VISIBLE, en orden de lectura: es sobre lo que se mueven las flechas.
  const filas = useMemo<Fila[]>(() => {
    const estaAbierto = (clave: string) => (forzados ? forzados.has(clave) : abiertos.has(clave));
    const salida: Fila[] = [];
    function bajar(nodos: NodoDelMundo[], padre: string, nivel: number) {
      for (const n of nodos) {
        const clave = `${padre}/${n.id}`;
        const expandido = estaAbierto(clave);
        salida.push({
          clave,
          padre,
          nivel,
          id: n.id,
          nombre: n.name,
          tieneHijos: n.hijos.length > 0,
          expandido,
        });
        if (expandido) bajar(n.hijos, clave, nivel + 1);
      }
    }
    for (const r of raices) {
      const expandido = estaAbierto(r.type);
      salida.push({
        clave: r.type,
        padre: null,
        nivel: 0,
        id: null,
        nombre: r.etiqueta,
        tieneHijos: r.hijos.length > 0,
        expandido,
      });
      if (expandido) bajar(r.hijos, r.type, 1);
    }
    return salida;
  }, [raices, abiertos, forzados]);

  const focoEfectivo = filas.some((f) => f.clave === foco) ? foco : (filas[0]?.clave ?? null);

  const alternar = (clave: string) =>
    setAbiertos((previos) => {
      const siguiente = new Set(previos);
      if (siguiente.has(clave)) siguiente.delete(clave);
      else siguiente.add(clave);
      return siguiente;
    });

  const enfocar = (clave: string) => {
    setFoco(clave);
    refs.current.get(clave)?.focus();
  };

  const activar = (fila: Fila) => {
    if (fila.id) onSeleccion(fila.id);
    else alternar(fila.clave);
  };

  const teclado = (e: KeyboardEvent<HTMLLIElement>, fila: Fila) => {
    if (e.target !== e.currentTarget) return;
    const indice = filas.findIndex((f) => f.clave === fila.clave);
    let siguiente: string | null = null;
    switch (e.key) {
      case "ArrowDown":
        siguiente = filas[Math.min(indice + 1, filas.length - 1)]?.clave ?? null;
        break;
      case "ArrowUp":
        siguiente = filas[Math.max(indice - 1, 0)]?.clave ?? null;
        break;
      case "Home":
        siguiente = filas[0]?.clave ?? null;
        break;
      case "End":
        siguiente = filas[filas.length - 1]?.clave ?? null;
        break;
      case "ArrowRight":
        if (!fila.tieneHijos) return;
        if (!fila.expandido) {
          if (forzados) return;
          alternar(fila.clave);
        } else siguiente = filas[indice + 1]?.clave ?? null;
        break;
      case "ArrowLeft":
        if (fila.expandido && fila.tieneHijos) {
          if (forzados) return;
          alternar(fila.clave);
        } else siguiente = fila.padre;
        break;
      case "Enter":
      case " ":
        activar(fila);
        break;
      default:
        return;
    }
    e.preventDefault();
    if (siguiente) enfocar(siguiente);
  };

  const pulsar = (e: MouseEvent<HTMLLIElement>, fila: Fila) => {
    e.stopPropagation();
    setFoco(fila.clave);
    activar(fila);
  };

  function filaDe(clave: string): Fila | undefined {
    return filas.find((f) => f.clave === clave);
  }

  function nodo(n: NodoDelMundo, padre: string, nivel: number) {
    const clave = `${padre}/${n.id}`;
    const fila = filaDe(clave);
    if (!fila) return null;
    const elegido = seleccionId === n.id;
    return (
      <li
        key={clave}
        ref={(el) => {
          if (el) refs.current.set(clave, el);
          else refs.current.delete(clave);
        }}
        role="treeitem"
        aria-label={n.name}
        aria-selected={elegido}
        aria-expanded={fila.tieneHijos ? fila.expandido : undefined}
        aria-level={nivel + 1}
        tabIndex={focoEfectivo === clave ? 0 : -1}
        onKeyDown={(e) => teclado(e, fila)}
        onClick={(e) => pulsar(e, fila)}
        className="outline-none"
      >
        <div
          style={{ paddingLeft: `${nivel * 1.1}rem` }}
          className={[
            "flex items-center gap-s1 rounded-radius-sm px-s2 py-1 transition-colors",
            "[li:focus-visible>&]:outline [li:focus-visible>&]:outline-2 [li:focus-visible>&]:outline-accent",
            elegido ? "bg-[color:var(--accent-tint)] text-accent-text" : "text-text hover:bg-bg",
          ].join(" ")}
        >
          {fila.tieneHijos ? (
            <button
              type="button"
              tabIndex={-1}
              aria-label={`${fila.expandido ? "Plegar" : "Desplegar"} ${n.name}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!forzados) alternar(clave);
              }}
              className="flex shrink-0 items-center rounded-radius-sm text-muted hover:text-text"
            >
              <Punta abierta={fila.expandido} />
            </button>
          ) : (
            <span aria-hidden="true" className="inline-block w-[1em] shrink-0" />
          )}
          <span className="text-copper-text">
            <IconoDeTipo type={n.type} />
          </span>
          <span className="sr-only">{ETIQUETA_DE_TIPO[n.type]}</span>
          <span className="min-w-0 flex-1 truncate font-chrome text-chrome-sm">{n.name}</span>
          {n.rotulo && (
            <span className="shrink-0 font-chrome text-chrome-xs text-muted">{n.rotulo}</span>
          )}
          {n.cicloCortado && (
            <span className="shrink-0 font-chrome text-chrome-xs text-muted">ciclo</span>
          )}
        </div>
        {n.tambienEn.length > 0 && (
          <p
            style={{ paddingLeft: `${nivel * 1.1 + 2.6}rem` }}
            className="font-chrome text-chrome-xs text-muted"
          >
            también en {n.tambienEn.join(", ")}
          </p>
        )}
        {fila.tieneHijos && fila.expandido && (
          <ul role="group">{n.hijos.map((h) => nodo(h, clave, nivel + 1))}</ul>
        )}
      </li>
    );
  }

  const nadaEncaja = buscado !== "" && raices.every((r) => r.hijos.length === 0);

  return (
    <div className="flex flex-col gap-s3 lg:min-h-0">
      <div className="flex flex-wrap items-center gap-s2">
        <label className="flex min-w-[10rem] flex-1 items-center gap-s2 rounded-radius-sm border border-muted px-s2 py-1.5">
          <IconoLupa className="shrink-0 text-muted" />
          <span className="sr-only">Buscar en el mundo</span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar en el mundo…"
            className="w-full border-none bg-transparent font-chrome text-chrome-sm text-text outline-none"
          />
        </label>
        <FilterChip active={soloSinHilos} onClick={() => setSoloSinHilos((s) => !s)}>
          Sin hilos
        </FilterChip>
      </div>

      {nadaEncaja ? (
        <p className="font-chrome text-chrome-sm text-muted">
          Nada en el mundo encaja con «{busqueda.trim()}».
        </p>
      ) : (
        <ul
          role="tree"
          aria-label="El mundo"
          // El scroll propio del árbol solo en `lg:`, con columna acotada; en estrecho es un
          // bloque más y scrollea el taller (ronda 1: con `overflow` y `min-h-0` siempre, a 390 px
          // el detalle se montaba encima del árbol).
          className="scroll-quiet lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
        >
          {raices.map((r) => {
            const fila = filaDe(r.type);
            if (!fila) return null;
            return (
              <li
                key={r.type}
                ref={(el) => {
                  if (el) refs.current.set(r.type, el);
                  else refs.current.delete(r.type);
                }}
                role="treeitem"
                aria-label={r.etiqueta}
                aria-selected={false}
                aria-expanded={fila.expandido}
                aria-level={1}
                tabIndex={focoEfectivo === r.type ? 0 : -1}
                onKeyDown={(e) => teclado(e, fila)}
                onClick={(e) => pulsar(e, fila)}
                className="mb-s1 outline-none"
              >
                <div className="flex items-center gap-s2 rounded-radius-sm px-s2 py-1 [li:focus-visible>&]:outline [li:focus-visible>&]:outline-2 [li:focus-visible>&]:outline-accent">
                  <span className="text-muted">
                    <Punta abierta={fila.expandido} />
                  </span>
                  <span className="font-chrome text-chrome-xs uppercase tracking-[0.16em] text-copper-text">
                    {r.etiqueta}
                  </span>
                  <span aria-hidden="true" className="h-px flex-1 bg-copper/40" />
                  <span className="font-data text-chrome-xs text-muted">{r.total}</span>
                </div>
                {fila.expandido && (
                  <ul role="group">
                    {r.hijos.length === 0 ? (
                      // `role="none"`: es una nota, no un elemento del árbol; sin él un lector de
                      // pantalla la contaría como hijo. Y no miente: con fichas del tipo que cuelgan
                      // todas de otra ficha, «Ninguna todavía» era falso (ronda 1).
                      <li
                        role="none"
                        className="px-s2 py-1 pl-s5 font-chrome text-chrome-xs text-muted"
                      >
                        {soloSinHilos
                          ? "Todas tienen algún hilo."
                          : r.total > 0
                            ? "Todas cuelgan de otra ficha."
                            : "Ninguna todavía."}
                      </li>
                    ) : (
                      r.hijos.map((h) => nodo(h, r.type, 1))
                    )}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
