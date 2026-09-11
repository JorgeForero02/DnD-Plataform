import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuthStore } from "../../../store/auth.store";
import { ApiError } from "../../../lib/api";
import * as authApi from "../api";
import { useAuthRehydration } from "../hooks";

describe("useAuthRehydration", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ token: null, user: null });
    vi.restoreAllMocks();
  });

  it("does nothing when there is no token: no call, no flicker into a logged-out state", () => {
    const fetchMe = vi.spyOn(authApi, "fetchMe");
    renderHook(() => useAuthRehydration());
    expect(fetchMe).not.toHaveBeenCalled();
  });

  it("does nothing when the user is already in the store (fresh login, no reload)", () => {
    const fetchMe = vi.spyOn(authApi, "fetchMe");
    useAuthStore.setState({
      token: "tok",
      user: { id: "1", email: "a@b.com", displayName: "Gandalf", isAdmin: false },
    });
    renderHook(() => useAuthRehydration());
    expect(fetchMe).not.toHaveBeenCalled();
  });

  it("fetches /auth/me and fills the user when there is a token but no user (post-reload)", async () => {
    useAuthStore.setState({ token: "tok", user: null });
    vi.spyOn(authApi, "fetchMe").mockResolvedValue({
      id: "1",
      email: "a@b.com",
      displayName: "Gandalf",
      isAdmin: false,
    });

    renderHook(() => useAuthRehydration());

    await waitFor(() => expect(useAuthStore.getState().user?.displayName).toBe("Gandalf"));
    // The token that was already there is untouched by this — only the user is filled in.
    expect(useAuthStore.getState().token).toBe("tok");
  });

  it("logs out and reports an invalid token when /auth/me rejects with a 401 (expired or bad token)", async () => {
    useAuthStore.setState({ token: "tok-caducado", user: null });
    vi.spyOn(authApi, "fetchMe").mockRejectedValue(new ApiError("Unauthorized", 401));

    const { result } = renderHook(() => useAuthRehydration());

    await waitFor(() => expect(result.current.invalidToken).toBe(true));
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  // Fix 3 of 1.15-fix: the API restarting, a 502 from Vite's dev proxy mid-request, or a
  // plain network hiccup all used to be treated exactly like an expired token — the token
  // got wiped and (with fix 2) the user landed back on the login screen mid-session. None of
  // those is proof the session is invalid, only that one request failed.
  it("leaves the token alone when /auth/me fails for a reason other than 401", async () => {
    useAuthStore.setState({ token: "tok-vivo", user: null });
    vi.spyOn(authApi, "fetchMe").mockRejectedValue(new ApiError("Internal Server Error", 500));

    const { result } = renderHook(() => useAuthRehydration());

    // Give the rejected promise a tick to settle.
    await waitFor(() => expect(authApi.fetchMe).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));

    expect(result.current.invalidToken).toBe(false);
    expect(useAuthStore.getState().token).toBe("tok-vivo");
  });

  it("also leaves the token alone on a plain network failure (fetch rejecting outright)", async () => {
    useAuthStore.setState({ token: "tok-vivo", user: null });
    vi.spyOn(authApi, "fetchMe").mockRejectedValue(new TypeError("Failed to fetch"));

    renderHook(() => useAuthRehydration());

    await waitFor(() => expect(authApi.fetchMe).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));

    expect(useAuthStore.getState().token).toBe("tok-vivo");
  });
});
