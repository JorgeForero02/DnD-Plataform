import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  allEntitiesKey,
  entitiesKey,
  useCreateEntity,
  useUpdateEntity,
  useDeleteEntity,
} from "../hooks";
import { linksKey } from "../../links/hooks";
import { commentsKey } from "../../comments/hooks";
import { campaignsKey } from "../../campaigns/hooks";
import * as entitiesApi from "../api";
import type { Entity } from "../api";

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const created: Entity = {
  id: "e1",
  campaignId: "c1",
  type: "NPC",
  name: "Acererak",
  tags: [],
  visibility: "OWNER_DM",
  createdById: "u1",
  createdAt: "x",
};

describe("entities hooks — cache invalidation across the two key branches (fix 2)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creating an entity invalidates the unfiltered list key, not just the typed one", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // Seed both branches so we can observe invalidation rather than mere absence of data.
    qc.setQueryData(entitiesKey("c1", "NPC"), []);
    qc.setQueryData(allEntitiesKey("c1"), []);
    vi.spyOn(entitiesApi, "createEntity").mockResolvedValue(created);

    const { result } = renderHook(() => useCreateEntity("c1", "NPC"), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync({
        type: "NPC",
        name: "Acererak",
        tags: [],
        visibility: "OWNER_DM",
      });
    });

    await waitFor(() => expect(qc.getQueryState(allEntitiesKey("c1"))?.isInvalidated).toBe(true));
    expect(qc.getQueryState(entitiesKey("c1", "NPC"))?.isInvalidated).toBe(true);
  });

  it("updating an entity invalidates the unfiltered list key, not just the typed one", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(entitiesKey("c1", "NPC"), []);
    qc.setQueryData(allEntitiesKey("c1"), []);
    vi.spyOn(entitiesApi, "updateEntity").mockResolvedValue(created);

    const { result } = renderHook(() => useUpdateEntity("c1", "NPC"), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync({ entityId: "e1", input: { name: "Acererak, El Vivo" } });
    });

    await waitFor(() => expect(qc.getQueryState(allEntitiesKey("c1"))?.isInvalidated).toBe(true));
    expect(qc.getQueryState(entitiesKey("c1", "NPC"))?.isInvalidated).toBe(true);
  });

  // Found while building task 1.16's real-browser cascade test: deleting an entity cascades
  // (schema.prisma, onDelete: Cascade in both directions on EntityLink) to links that some
  // *other* entity's LinksPanel already has cached under its own linksKey(otherEntityId) — a
  // key this hook can't name directly, since it has no way to know which other entities
  // linked to the one just deleted. Reopening that other entity's editor within staleTime
  // (queryClient.ts, 30s) painted the deleted entity as still linked, straight against the
  // real API — a spy could never have shown this, because it doesn't share a real cache with
  // a second entity's LinksPanel the way this test (and the browser) does.
  it("deleting an entity invalidates another entity's links and comments too, not just its own lists", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(entitiesKey("c1", "NPC"), []);
    qc.setQueryData(allEntitiesKey("c1"), []);
    // "e-other" stands in for Zariel: an entity that links to the one being deleted, with its
    // own links/comments queries already cached — exactly the shape a mounted LinksPanel and
    // CommentThread leave behind.
    qc.setQueryData(linksKey("e-other"), []);
    qc.setQueryData(commentsKey("e-other"), []);
    vi.spyOn(entitiesApi, "deleteEntity").mockResolvedValue({ deleted: true });

    const { result } = renderHook(() => useDeleteEntity("c1", "NPC"), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync("e1");
    });

    await waitFor(() => expect(qc.getQueryState(linksKey("e-other"))?.isInvalidated).toBe(true));
    expect(qc.getQueryState(commentsKey("e-other"))?.isInvalidated).toBe(true);
    expect(qc.getQueryState(entitiesKey("c1", "NPC"))?.isInvalidated).toBe(true);
    expect(qc.getQueryState(allEntitiesKey("c1"))?.isInvalidated).toBe(true);
  });

  // Revisión final de `ficha/tanda-2-a-5`, Medium #5: la tarjeta de campaña en "Tus crónicas"
  // muestra `entityCount` (Task 33), pero ninguna mutación de fichas invalidaba
  // `campaignsKey`, así que crear, borrar o cambiar la visibilidad de una ficha dejaba ese
  // número obsoleto hasta los 30s de `staleTime` (queryClient.ts).
  it("crear una ficha también invalida campaignsKey, no solo sus propias listas", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(campaignsKey, []);
    vi.spyOn(entitiesApi, "createEntity").mockResolvedValue(created);

    const { result } = renderHook(() => useCreateEntity("c1", "NPC"), {
      wrapper: makeWrapper(qc),
    });
    await act(async () => {
      await result.current.mutateAsync({
        type: "NPC",
        name: "Acererak",
        tags: [],
        visibility: "OWNER_DM",
      });
    });

    expect(qc.getQueryState(campaignsKey)?.isInvalidated).toBe(true);
  });

  it("borrar una ficha también invalida campaignsKey", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(campaignsKey, []);
    vi.spyOn(entitiesApi, "deleteEntity").mockResolvedValue({ deleted: true });

    const { result } = renderHook(() => useDeleteEntity("c1", "NPC"), {
      wrapper: makeWrapper(qc),
    });
    await act(async () => {
      await result.current.mutateAsync("e1");
    });

    expect(qc.getQueryState(campaignsKey)?.isInvalidated).toBe(true);
  });

  // Actualizar una ficha también cambia el conteo de otros: cambiar la visibilidad de PUBLIC
  // a DM_ONLY la saca del `entityCount` de quien no es DM.
  it("actualizar una ficha (p. ej. su visibilidad) también invalida campaignsKey", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(campaignsKey, []);
    vi.spyOn(entitiesApi, "updateEntity").mockResolvedValue(created);

    const { result } = renderHook(() => useUpdateEntity("c1", "NPC"), {
      wrapper: makeWrapper(qc),
    });
    await act(async () => {
      await result.current.mutateAsync({ entityId: "e1", input: { visibility: "DM_ONLY" } });
    });

    expect(qc.getQueryState(campaignsKey)?.isInvalidated).toBe(true);
  });
});
