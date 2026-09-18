import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDeleteLink, linksKey } from "../hooks";
import * as api from "../api";

// El otro extremo del hilo (revisión final 2026-09-13, cerrada el 2026-09-17): borrar un hilo
// invalidaba solo la lista de la ficha que lo borra, así que la de enfrente se quedaba con el
// hilo fantasma hasta recargar. `useDeleteLink` ahora recibe el enlace entero (`id` +
// `otherEntityId`), no solo el id, para poder invalidar también la consulta de la ficha vecina.

describe("useDeleteLink", () => {
  it("borrar un hilo invalida las dos fichas y la lista de campaña", async () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, "invalidateQueries");
    vi.spyOn(api, "deleteLink").mockResolvedValue({ deleted: true });
    const { result } = renderHook(() => useDeleteLink("A", "camp"), {
      wrapper: ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>,
    });
    await act(() => result.current.mutateAsync({ id: "h1", otherEntityId: "B" }));
    expect(spy).toHaveBeenCalledWith({ queryKey: linksKey("A") });
    expect(spy).toHaveBeenCalledWith({ queryKey: linksKey("B") });
  });
});
