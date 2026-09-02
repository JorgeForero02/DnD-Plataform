import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getPreferredTheme, setTheme, applyTheme, getStoredTheme } from "../theme";

function mockMatchMedia(prefersLight: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === "(prefers-color-scheme: light)" ? prefersLight : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe("theme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to dark when nothing is stored and the OS prefers dark", () => {
    mockMatchMedia(false);
    expect(getPreferredTheme()).toBe("dark");
  });

  it("honours prefers-color-scheme: light on first visit (nothing stored)", () => {
    mockMatchMedia(true);
    expect(getPreferredTheme()).toBe("light");
  });

  it("an explicit stored choice wins over the OS preference", () => {
    mockMatchMedia(true);
    setTheme("dark");
    expect(getPreferredTheme()).toBe("dark");
    expect(getStoredTheme()).toBe("dark");
  });

  it("applyTheme stamps data-theme on the root element", () => {
    applyTheme("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    applyTheme("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("setTheme persists to localStorage and applies immediately", () => {
    setTheme("light");
    expect(localStorage.getItem("dnd-theme")).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  // Fix round 1: the reviewer confirmed this handling was already correct, and asked for the
  // two cheap tests that prove it rather than leaving it undemonstrated.
  it("treats a corrupt stored value as nothing stored, not a crash", () => {
    localStorage.setItem("dnd-theme", "purple");
    expect(getStoredTheme()).toBeNull();
    mockMatchMedia(false);
    expect(getPreferredTheme()).toBe("dark");
  });

  it("falls back to the OS preference when localStorage throws (private browsing)", () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new DOMException("blocked");
    };
    try {
      expect(getStoredTheme()).toBeNull();
      mockMatchMedia(true);
      expect(getPreferredTheme()).toBe("light");
    } finally {
      Storage.prototype.getItem = original;
    }
  });
});
