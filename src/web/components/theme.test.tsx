import { readFileSync } from "node:fs";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ModeToggle } from "./mode-toggle";
import { ThemeProvider } from "./theme-provider";

const KEY = "gen-img:theme";
const root = document.documentElement;

/** A controllable `prefers-color-scheme: dark` media query. */
function systemPrefers(dark: boolean) {
  const listeners = new Set<() => void>();
  const original = window.matchMedia;
  const state = { dark };
  window.matchMedia = ((query: string) => ({
    media: query,
    get matches() {
      return query.includes("prefers-color-scheme: dark") ? state.dark : false;
    },
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  return {
    change(next: boolean) {
      state.dark = next;
      for (const l of listeners) l();
    },
    restore: () => {
      window.matchMedia = original;
    },
  };
}

async function pick(name: "Light" | "Dark" | "System") {
  fireEvent.pointerDown(screen.getByRole("button", { name: "Toggle theme" }), { button: 0, pointerType: "mouse" });
  await act(async () => fireEvent.click(await screen.findByRole("menuitem", { name })));
}

const ui = () => (
  <ThemeProvider>
    <ModeToggle />
  </ThemeProvider>
);

describe("theme (ADR-0024)", () => {
  let media: ReturnType<typeof systemPrefers>;
  beforeEach(() => {
    localStorage.clear();
    root.className = "";
  });
  afterEach(() => {
    media?.restore();
    vi.restoreAllMocks();
    localStorage.clear();
    root.className = "";
  });

  it("follows the system by default, also when the system changes (AC-11)", () => {
    media = systemPrefers(true);
    render(ui());
    expect(root).toHaveClass("dark");
    act(() => media.change(false));
    expect(root).toHaveClass("light");
    expect(root).not.toHaveClass("dark");
  });

  it("applies Light, Dark and System from the toggle and remembers the choice (AC-11)", async () => {
    media = systemPrefers(false);
    render(ui());
    await pick("Dark");
    expect(root).toHaveClass("dark");
    expect(localStorage.getItem(KEY)).toBe("dark");
    act(() => media.change(false)); // a chosen theme ignores the system
    expect(root).toHaveClass("dark");
    await pick("Light");
    expect(root).toHaveClass("light");
    await pick("System");
    expect(root).toHaveClass("light");
    expect(localStorage.getItem(KEY)).toBe("system");
  });

  it("starts from the remembered choice; an unknown stored value means system", () => {
    media = systemPrefers(false);
    localStorage.setItem(KEY, "dark");
    const { unmount } = render(ui());
    expect(root).toHaveClass("dark");
    unmount();
    localStorage.setItem(KEY, "purple");
    render(ui());
    expect(root).toHaveClass("light");
  });

  it("keeps working when the browser refuses storage (AC-12)", async () => {
    media = systemPrefers(true);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    render(ui());
    expect(root).toHaveClass("dark");
    await pick("Light");
    expect(root).toHaveClass("light");
  });
});

describe("pre-paint theme script in index.html (no flash, AC-11/AC-12)", () => {
  const html = readFileSync("index.html", "utf8");
  const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1] ?? "";
  let media: ReturnType<typeof systemPrefers>;
  afterEach(() => {
    media?.restore();
    vi.restoreAllMocks();
    localStorage.clear();
    root.className = "";
  });

  it("is an inline script placed before the app bundle", () => {
    expect(script).toContain("gen-img:theme");
    expect(html.indexOf("<script>")).toBeLessThan(html.indexOf('<script type="module"'));
  });

  it.each([
    ["dark", false, "dark"],
    ["light", true, "light"],
    ["system", true, "dark"],
    [null, false, "light"],
    ["purple", true, "dark"],
  ])("stored %s, system dark %s → %s", (stored, systemDark, expected) => {
    media = systemPrefers(systemDark);
    if (stored) localStorage.setItem("gen-img:theme", stored);
    new Function(script)();
    expect(root.className).toBe(expected);
  });

  it("falls back to the system when storage throws", () => {
    media = systemPrefers(true);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(() => new Function(script)()).not.toThrow();
    expect(root.className).toBe("dark");
  });
});
