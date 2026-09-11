import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useAuthStore } from "../../../store/auth.store";
import * as membersApi from "../members";
import { useMyRole } from "../members";

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("useMyRole", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ token: "tok", user: null });
  });

  it("reports loading while the user id is not known yet (before rehydration resolves)", () => {
    const fetchMembers = vi.spyOn(membersApi, "fetchMembers");
    const { result } = renderHook(() => useMyRole("c1"), { wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.role).toBeUndefined();
    // Without a user id there is nothing to match against yet: no point fetching members.
    expect(fetchMembers).not.toHaveBeenCalled();
  });

  it("reports loading while the members list is still in flight", () => {
    useAuthStore.setState({
      user: { id: "u1", email: "a@b.com", displayName: "G", isAdmin: false },
    });
    vi.spyOn(membersApi, "fetchMembers").mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useMyRole("c1"), { wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.role).toBeUndefined();
  });

  it("resolves to DM when the current user's membership says DM", async () => {
    useAuthStore.setState({
      user: { id: "u1", email: "a@b.com", displayName: "G", isAdmin: false },
    });
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
      { userId: "u1", displayName: "G", role: "DM" },
      { userId: "u2", displayName: "P", role: "PLAYER" },
    ]);
    const { result } = renderHook(() => useMyRole("c1"), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.role).toBe("DM");
  });

  it("resolves to PLAYER when the current user's membership says PLAYER", async () => {
    useAuthStore.setState({
      user: { id: "u2", email: "b@b.com", displayName: "P", isAdmin: false },
    });
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
      { userId: "u1", displayName: "G", role: "DM" },
      { userId: "u2", displayName: "P", role: "PLAYER" },
    ]);
    const { result } = renderHook(() => useMyRole("c1"), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.role).toBe("PLAYER");
  });

  // Arreglo 4 (1.15-fix): with retry: false (lib/queryClient.ts), a single failed
  // GET /campaigns/:id/members used to leave isLoading === false and role === undefined —
  // indistinguishable from "confirmed not a member". A legitimate DM would see "Solo el DM
  // puede..." on their own campaign. isError has to be its own signal so a caller can treat
  // it as "still don't know" (never as "not a member"), and there has to be a way to retry
  // instead of only recovering by accident on refetchOnWindowFocus.
  it("reports isError (not a resolved role) when the members request fails, and offers a retry", async () => {
    useAuthStore.setState({
      user: { id: "u1", email: "a@b.com", displayName: "G", isAdmin: false },
    });
    const fetchMembers = vi
      .spyOn(membersApi, "fetchMembers")
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce([{ userId: "u1", displayName: "G", role: "DM" }]);

    const { result } = renderHook(() => useMyRole("c1"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isLoading).toBe(false);
    // The failure must never read as "confirmed not a member".
    expect(result.current.role).toBeUndefined();

    result.current.retry();

    await waitFor(() => expect(result.current.role).toBe("DM"));
    expect(result.current.isError).toBe(false);
    expect(fetchMembers).toHaveBeenCalledTimes(2);
  });
});
