import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "@/lib/api";
import { isDialogVisit, replace, useRoute } from "@/lib/router";
import { summary } from "@/test-utils";
import type { Generation, GenerationSummary, PromptGroup } from "../../../shared/generations";
import { Gallery, resetGalleryScroll } from "./Gallery";
import { GenerationDialog } from "./GenerationDialog";

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: {
    generations: vi.fn(),
    generationModels: vi.fn(),
    generation: vi.fn(),
    deleteGeneration: vi.fn(),
    promptGroup: vi.fn(),
  },
}));
const m = vi.mocked(api);

const KEY = "0123456789abcdef0123456789abcdef";
const SHARED = "Shared prompt";
const PAGE = 2;
let store: GenerationSummary[] = [];
const seed = (shared: number[], others: number[]) => {
  store = [
    ...shared.map((i) => summary(i, { prompt: SHARED })),
    ...others.map((i) => summary(i, { prompt: `Other prompt ${i}` })),
  ].sort((a, b) => (a.id < b.id ? 1 : -1));
};
const groupOf = (prompt = SHARED): PromptGroup => {
  const mine = store.filter((g) => g.prompt === SHARED);
  return {
    key: KEY,
    prompt,
    count: mine.length,
    images: mine.length,
    models: [],
    moreModels: 0,
    latestId: mine[0]?.id ?? "",
    cover: { url: "/x.png", width: 1, height: 1 },
  };
};

function serve(prompt = SHARED) {
  m.generations.mockImplementation(async (cursor, _l, filter) => {
    const f = filter as { prompt?: string } | undefined;
    const rest = store.filter((g) => (!f?.prompt || g.prompt === SHARED) && (!cursor || g.id < cursor));
    const items = rest.slice(0, PAGE);
    return { items, nextCursor: rest.length > PAGE ? (items[PAGE - 1]?.id ?? null) : null };
  });
  m.promptGroup.mockImplementation(async () => {
    if (!store.some((g) => g.prompt === SHARED)) throw new ApiError(404, "NOT_FOUND", "no");
    return groupOf(prompt);
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
const idOf = (i: number) => summary(i).id;
const UNKNOWN = "No generations use this prompt any more.";

beforeEach(() => {
  vi.resetAllMocks();
  resetGalleryScroll();
  window.scrollTo = vi.fn();
  seed([1, 3, 5, 7, 9], [2, 4]);
  serve();
  replace(`/gallery?prompt=${KEY}`, null);
});
afterEach(() => replace("/", null));

describe("prompt grid (SCR-02, AC-02)", () => {
  it("shows only that prompt's cards under the full prompt, the count and both links", async () => {
    renderApp();
    expect(await screen.findByRole("heading", { name: SHARED })).toBeInTheDocument();
    expect(m.generations).toHaveBeenCalledWith(undefined, undefined, { prompt: KEY });
    expect(m.promptGroup).toHaveBeenCalledWith(KEY);
    expect(await screen.findByText("5 generations")).toBeInTheDocument();
    expect(screen.queryByText("Other prompt 2")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to prompts" })).toHaveAttribute("href", "/gallery?view=prompts");
    expect(screen.getByRole("link", { name: "Show all generations" })).toHaveAttribute("href", "/gallery");
  });

  it("collapses a prompt beyond 6 lines behind Show more / Show less", async () => {
    serve(Array.from({ length: 8 }, (_, i) => `line ${i}`).join("\n"));
    renderApp();
    const heading = await screen.findByRole("heading", { name: /line 0/ });
    expect(heading.className).toMatch(/whitespace-pre-wrap/);
    fireEvent.click(screen.getByRole("button", { name: "Show more" }));
    expect(screen.getByRole("button", { name: "Show less" })).toBeInTheDocument();
  });
});

describe("unknown key (AC-07)", () => {
  it("a malformed key shows the unknown state with no request", async () => {
    replace("/gallery?prompt=xyz", null);
    renderApp();
    expect(await screen.findByText(UNKNOWN)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to prompts" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Show all generations" })).toBeInTheDocument();
    expect(m.generations).not.toHaveBeenCalled();
    expect(m.promptGroup).not.toHaveBeenCalled();
  });

  it("a 404 from the one-group read, or an empty first page, shows it", async () => {
    seed([], [2]);
    renderApp();
    expect(await screen.findByText(UNKNOWN)).toBeInTheDocument();
  });
});

describe("dialog from a prompt grid (AC-03)", () => {
  it("carries grid = order = the prompt and steps within it only", async () => {
    renderApp();
    await screen.findByText("5 generations");
    fireEvent.click(document.querySelector(`[data-generation-id="${idOf(9)}"]`) as Element);
    await screen.findByRole("dialog");
    expect(window.history.state).toMatchObject({
      dialog: "gallery",
      grid: { kind: "prompt", key: KEY },
      order: { kind: "prompt", key: KEY },
    });
    const older = () => screen.getByRole("button", { name: /^Older/ });
    for (const i of [7, 5, 3]) {
      await waitFor(() => expect(older()).not.toHaveAttribute("aria-disabled", "true"));
      fireEvent.click(older());
      await waitFor(() => expect(here()).toBe(`/generations/${idOf(i)}`));
    }
    expect(m.generations).not.toHaveBeenCalledWith(undefined);
  });

  it("deleting the prompt's last generation closes onto the unknown state", async () => {
    seed([1], [2]);
    renderApp();
    await screen.findByText("1 generation");
    fireEvent.click(document.querySelector(`[data-generation-id="${idOf(1)}"]`) as Element);
    const d = await screen.findByRole("dialog");
    fireEvent.click(await within(d).findByRole("button", { name: "Delete" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete generation" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText(UNKNOWN)).toBeInTheDocument();
  });

  it("deleting a middle one shows the neighbour and refreshes the heading count", async () => {
    renderApp();
    await screen.findByText("5 generations");
    fireEvent.click(document.querySelector(`[data-generation-id="${idOf(9)}"]`) as Element);
    const d = await screen.findByRole("dialog");
    fireEvent.click(await within(d).findByRole("button", { name: "Delete" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete generation" }));
    await waitFor(() => expect(here()).toBe(`/generations/${idOf(7)}`));
    expect(await screen.findByText("4 generations")).toBeInTheDocument();
  });
});
