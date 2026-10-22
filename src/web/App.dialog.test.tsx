import { act, screen, within } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "@/lib/api";
import { APP_LOAD, dialogState, navigate } from "@/lib/router";
import { renderWithQuery } from "@/test-utils";
import { App } from "./App";

const ALL_VIEWS = { grid: { kind: "all" }, order: { kind: "all" } } as const;

const mounts = vi.hoisted(() => ({ count: 0 }));
vi.mock("@/features/gallery/Gallery", async (orig) => ({
  ...(await orig<typeof import("@/features/gallery/Gallery")>()),
  Gallery: () => {
    useEffect(() => {
      mounts.count += 1;
    }, []);
    return <div data-testid="grid">grid</div>;
  },
}));
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: {
    health: vi.fn(),
    providers: vi.fn(),
    models: vi.fn(),
    currentJob: vi.fn(),
    generations: vi.fn(),
    generation: vi.fn(),
    price: vi.fn(),
    costHistory: vi.fn(),
  },
}));
const m = vi.mocked(api);

const popTo = (path: string, state: unknown) =>
  act(() => {
    window.history.replaceState(state, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });

describe("dialog visit over the gallery (ADR-0033)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mounts.count = 0;
    m.health.mockResolvedValue({ status: "ok" });
    m.providers.mockResolvedValue({ providers: [] });
    m.currentJob.mockResolvedValue({ job: null });
    m.generations.mockResolvedValue({ items: [], nextCursor: null });
    m.generation.mockRejectedValue(new ApiError(404, "NOT_FOUND", "Generation not found"));
  });
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("renders the grid plus a dialog for this load's dialog state, Gallery staying current", () => {
    window.history.replaceState(dialogState(ALL_VIEWS), "", "/generations/01ABC");
    renderWithQuery(<App />);
    expect(screen.getByTestId("grid")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Generation" })).toHaveTextContent("Loading…");
    expect(
      // the modal dialog hides the rest of the page from assistive tech, so look past that
      within(screen.getByRole("navigation", { name: "Sections", hidden: true })).getByRole("link", {
        name: /^Gallery/,
        hidden: true,
      }),
    ).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Generation", { selector: "[aria-current=page]" })).toBeInTheDocument();
  });

  it.each([
    ["an older load", { dialog: "gallery", load: `${APP_LOAD}-old` }],
    ["no state", null],
  ])("renders the full detail page for %s", async (_n, state) => {
    window.history.replaceState(state, "", "/generations/01ABC");
    renderWithQuery(<App />);
    expect(screen.queryByTestId("grid")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await screen.findByText("This generation no longer exists.")).toBeInTheDocument();
  });

  it("never remounts the Gallery going /gallery -> dialog -> back -> forward", () => {
    window.history.replaceState(null, "", "/gallery");
    renderWithQuery(<App />);
    const grid = screen.getByTestId("grid");
    expect(mounts.count).toBe(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    act(() => navigate("/generations/01ABC", dialogState(ALL_VIEWS)));
    expect(screen.getByRole("dialog", { name: "Generation" })).toBeInTheDocument();
    expect(screen.getByTestId("grid")).toBe(grid);

    popTo("/gallery", null);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("grid")).toBe(grid);

    popTo("/generations/01ABC", dialogState(ALL_VIEWS));
    expect(screen.getByRole("dialog", { name: "Generation" })).toBeInTheDocument();
    expect(screen.getByTestId("grid")).toBe(grid);
    expect(mounts.count).toBe(1);
  });
});
