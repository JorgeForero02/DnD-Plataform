import { create } from "zustand";

// Task 4 de 3A.3 (T22) — **a quién apunta la barra de acciones**, y solo eso.
//
// Mismo patrón que `elenco/efectos/pantalla.store.ts`: entre la tarjeta del elenco (donde se
// elige el objetivo) y la barra de acciones (donde se usa) hay varios componentes que no tienen
// por qué saber de esto, así que vive en un store en vez de viajar por props.
//
// **No es el objetivo de un ataque o un conjuro concretos** — esos siguen teniendo su propia
// lista dentro del panel cuando hace falta elegir entre varios (`objetivos: "varios"`, o sin chip
// puesto). Esto es el **chip de la fila inferior**: un atajo de mesa, «a quién le estoy mirando
// ahora», que la barra ofrece como valor inicial y que un ataque o un conjuro de `objetivos: "uno"`
// usan para disparar sin volver a preguntar.
//
// **Un solo objetivo a la vez, y global a la pestaña** — no por personaje ni por campaña: en esta
// aplicación solo hay una mesa abierta por pestaña de navegador, la misma premisa que ya usa
// `pantalla.store.ts`.

export interface Objetivo {
  id: string;
  nombre: string;
}

interface EstadoDeObjetivo {
  objetivo: Objetivo | null;
  apuntar: (id: string, nombre: string) => void;
  quitar: () => void;
}

export const useObjetivoStore = create<EstadoDeObjetivo>((set) => ({
  objetivo: null,
  apuntar: (id, nombre) => set({ objetivo: { id, nombre } }),
  quitar: () => set({ objetivo: null }),
}));
