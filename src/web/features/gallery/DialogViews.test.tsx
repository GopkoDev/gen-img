import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { isDialogVisit, replace, useRoute } from "@/lib/router";
import { summary } from "@/test-utils";
import type { Generation, GenerationSummary } from "../../../shared/generations";
import { Gallery, resetGalleryScroll } from "./Gallery";
import { GalleryViews } from "./GalleryViews";
import { GenerationDialog } from "./GenerationDialog";

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: {
    generations: vi.fn(),
    generationModels: vi.fn(),
    generation: vi.fn(),
    deleteGeneration: vi.fn(),
  },
}));
const m = vi.mocked(api);

const A = "model/a";
const B = "model/b";
const PAGE = 2;
/** The library: ids 1..N, model A for odd ids, B for even. Newest first. */
let store: GenerationSummary[] = [];
const seed = (ids: Record<string, number[]>) => {
  store = Object.entries(ids)
    .flatMap(([model, list]) => list.map((i) => summary(i, { model })))
    .sort((a, b) => (a.id < b.id ? 1 : -1));
};

function serve() {
  m.generations.mockImplementation(async (cursor, _l, filter) => {
    const rest = store.filter((g) => (!filter || g.model === filter.model) && (!cursor || g.id < cursor));
    const items = rest.slice(0, PAGE);
    return { items, nextCursor: rest.length > PAGE ? (items[PAGE - 1]?.id ?? null) : null };
  });
  m.generationModels.mockImplementation(async () => {
    const models = [...new Set(store.map((g) => g.model))].map((model) => {
      const mine = store.filter((g) => g.model === model);
      return {
        provider: "openrouter" as const,
        model,
        count: mine.length,
        latestId: mine[0]?.id ?? "",
        items: mine.slice(0, 4),
      };
    });
    return { models: models.sort((a, b) => (a.latestId < b.latestId ? 1 : -1)) };
  });
  m.generation.mockImplementation(async (id) => {
    const s = store.find((g) => g.id === id) ?? summary(Number(id.slice(3)));
    return {
      ...s,
      requestedParams: {},
      acceptedParams: null,
      images: [],
      inputs: [],
      rawRequest: {},
      rawResponse: {},
      comment: null,
      source: null,
      derived: { items: [], total: 0 },
    } as unknown as Generation;
  });
  m.deleteGeneration.mockImplementation(async (id) => {
    store = store.filter((g) => g.id !== id);
    return null;
  });
}

function Harness() {
  const route = useRoute();
  return (
    <>
      <GalleryViews />
      <Gallery />
      {route.name === "detail" && isDialogVisit(route) && <GenerationDialog id={route.id} />}
    </>
  );
}
const renderApp = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Harness />
    </QueryClientProvider>,
  );
const here = () => window.location.pathname;
const MODEL_A = `/gallery?provider=openrouter&model=${encodeURIComponent(A)}`;
const dialog = () => screen.findByRole("dialog");
const openCard = async (i: number) => {
  fireEvent.click(await screen.findByText(`A test prompt number ${i}`));
  return dialog();
};
const older = () => screen.getByRole("button", { name: /^Older/ });
const idOf = (i: number) => summary(i).id;

beforeEach(() => {
  vi.resetAllMocks();
  resetGalleryScroll();
  window.scrollTo = vi.fn();
  replace("/gallery", null);
  seed({ [A]: [1, 3, 5, 7, 9], [B]: [2, 4] });
  serve();
});
afterEach(() => replace("/", null));

describe("dialog from a filtered grid (AC-04)", () => {
  it("carries grid = order = the model, steps within it only and keeps the filtered grid behind", async () => {
    replace(MODEL_A, null);
    renderApp();
    const d = await openCard(9);
    expect(window.history.state).toMatchObject({
      dialog: "gallery",
      grid: { kind: "model", provider: "openrouter", model: A },
      order: { kind: "model", provider: "openrouter", model: A },
    });
    fireEvent.click(older());
    await waitFor(() => expect(here()).toBe(`/generations/${idOf(7)}`));
    fireEvent.click(older());
    await waitFor(() => expect(here()).toBe(`/generations/${idOf(5)}`));
    fireEvent.click(older()); // past the loaded page of two: loads the next page of the same model
    await waitFor(() => expect(here()).toBe(`/generations/${idOf(3)}`));
    expect(window.history.state).toMatchObject({ grid: { kind: "model", model: A } });
    expect(m.generations).not.toHaveBeenCalledWith(undefined); // never the unfiltered list
    expect(screen.queryByText("A test prompt number 4")).not.toBeInTheDocument();
    expect(d).toBeInTheDocument();
  });

  it("deleting the model's last generation closes onto the empty-model state", async () => {
    seed({ [A]: [1], [B]: [2] });
    replace(MODEL_A, null);
    renderApp();
    const d = await openCard(1);
    fireEvent.click(await within(d).findByRole("button", { name: "Delete" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete generation" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText(`No generations with ${A} (OpenRouter).`)).toBeInTheDocument();
  });

  it("deleting a middle one shows the neighbour from the model's order", async () => {
    replace(MODEL_A, null);
    renderApp();
    const d = await openCard(9);
    fireEvent.click(await within(d).findByRole("button", { name: "Delete" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete generation" }));
    await waitFor(() => expect(here()).toBe(`/generations/${idOf(7)}`));
  });

  it("brings the last shown card into view on close", async () => {
    replace(MODEL_A, null);
    renderApp();
    const into = vi.fn();
    Element.prototype.scrollIntoView = into;
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ top: 5000, bottom: 5100 } as DOMRect);
    await openCard(9);
    fireEvent.click(screen.getByRole("button", { name: "Close", hidden: true }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(into).toHaveBeenCalled();
  });
});

describe("dialog from «By model» (AC-04)", () => {
  const byModel = () => replace("/gallery?view=models", null);

  it("carries grid = models, order = the card's model, keeps the sections behind and steps through all of that model", async () => {
    byModel();
    renderApp();
    const section = within(await screen.findByRole("region", { name: A }));
    fireEvent.click(await section.findByText("A test prompt number 9"));
    await dialog();
    expect(window.history.state).toMatchObject({
      grid: { kind: "models" },
      order: { kind: "model", provider: "openrouter", model: A },
    });
    expect(screen.getByRole("region", { name: B, hidden: true })).toBeInTheDocument(); // the sections stay behind
    for (const i of [7, 5, 3, 1]) {
      await waitFor(() => expect(older()).not.toHaveAttribute("aria-disabled", "true"));
      fireEvent.click(older());
      await waitFor(() => expect(here()).toBe(`/generations/${idOf(i)}`)); // 1 is beyond the four cards shown
    }
    expect(window.location.search).toBe("");
    expect(screen.getByRole("region", { name: B, hidden: true })).toBeInTheDocument();
  });

  it("keeps its scroll on close (no scroll into view)", async () => {
    byModel();
    renderApp();
    const into = vi.fn();
    Element.prototype.scrollIntoView = into;
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ top: 5000, bottom: 5100 } as DOMRect);
    const section = within(await screen.findByRole("region", { name: A }));
    fireEvent.click(await section.findByText("A test prompt number 9"));
    await dialog();
    fireEvent.click(screen.getByRole("button", { name: "Close", hidden: true }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(into).not.toHaveBeenCalled();
    expect(screen.getByRole("region", { name: A })).toBeInTheDocument();
  });

  it("deleting the model's last generation closes onto the view without its section", async () => {
    seed({ [A]: [1, 3], [B]: [2] });
    byModel();
    renderApp();
    const section = within(await screen.findByRole("region", { name: B }));
    fireEvent.click(await section.findByText("A test prompt number 2"));
    const d = await dialog();
    fireEvent.click(await within(d).findByRole("button", { name: "Delete" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete generation" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByRole("region", { name: B })).not.toBeInTheDocument());
    expect(screen.getByRole("region", { name: A })).toBeInTheDocument();
  });
});

describe("dialog from All", () => {
  it("steps through everything as before", async () => {
    renderApp();
    await openCard(9);
    expect(window.history.state).toMatchObject({ grid: { kind: "all" }, order: { kind: "all" } });
    fireEvent.click(older());
    await waitFor(() => expect(here()).toBe(`/generations/${idOf(7)}`));
    expect(window.history.state).toMatchObject({ order: { kind: "all" } });
  });
});
