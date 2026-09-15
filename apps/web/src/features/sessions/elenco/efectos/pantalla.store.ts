import { create } from "zustand";
import type { EfectoDePantalla } from "./detectarEfectos";

// **Lo que sacude la pantalla entera, y solo la del jugador afectado.**
//
// La ficha de MI personaje detecta el golpe (`useEfectosDeFicha`, con `esMio`) y lo deja aquí;
// la raíz de la mesa (`MesaDeSesion`) lo lee y se anima. Es un store y no una prop porque entre
// la ficha y la raíz hay cuatro componentes que no tienen por qué saber de esto.
//
// **El DM no lo recibe nunca**: lleva cinco fichas y le sacudiría la pantalla cada asalto
// (decisión del autor, 2026-09-15). Solo dispara la ficha que tiene `esMio`, y el DM no tiene
// ninguna.

interface EstadoDePantalla {
  /** El `id` cambia en cada disparo para que dos golpes seguidos reinicien la animación. */
  efecto: { id: number; tipo: EfectoDePantalla } | null;
  lanzar: (tipo: EfectoDePantalla) => void;
}

/** Más larga que cualquier animación de pantalla (`efectos.css`, la más larga dura 1,4 s). */
const VIDA_MS = 1600;

let contador = 0;

export const usePantallaStore = create<EstadoDePantalla>((set, get) => ({
  efecto: null,
  lanzar: (tipo) => {
    const id = ++contador;
    set({ efecto: { id, tipo } });
    // Se limpia por tiempo y no por `animationend`: no todos los efectos animan la raíz, y el
    // que no lo hace no avisaría nunca. Solo se borra el que se puso: si llegó otro, sigue vivo.
    window.setTimeout(() => {
      if (get().efecto?.id === id) set({ efecto: null });
    }, VIDA_MS);
  },
}));

/**
 * La clase que sacude/apaga la raíz de la mesa. La raíz la aplica ella misma porque la animación
 * es SUYA (transform sobre todo el árbol); esto solo dice cuál. Vive aquí y no junto al
 * componente del destello porque un fichero de componentes no exporta ganchos (fast refresh).
 */
export function useClaseDePantalla(): string {
  const efecto = usePantallaStore((s) => s.efecto);
  return efecto ? `fx-pantalla-${efecto.tipo}` : "";
}
