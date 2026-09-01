import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { allEntitiesKey, entitiesKey, useCreateEntity, useUpdateEntity } from "../hooks";
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
});
