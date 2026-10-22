import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "@/lib/api";
import { APP_LOAD, isDialogVisit, replace, useRoute } from "@/lib/router";
import { summary } from "@/test-utils";
import type { Generation, GenerationSummary, PromptGroup } from "../../../shared/generations";
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
    promptGroup: vi.fn(),
    promptGroups: vi.fn(),
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
  m.promptGroups.mockImplementation(async (_c, single) => ({
    groups: store.some((g) => g.prompt === SHARED) ? [{ ...groupOf(prompt), prompt: SHARED }] : [],
    nextCursor: single ? null : null,
  }));
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
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } })}>
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

describe("the single-use switch survives the prompt grid (R1)", () => {
  it("«Back to prompts» from a group opened under ?view=prompts&single=1 lands on that address", async () => {
    replace("/gallery?view=prompts&single=1", null);
    renderApp();
    fireEvent.click(await screen.findByRole("link", { name: new RegExp(SHARED) }));
    expect(window.location.search).toBe(`?prompt=${KEY}&single=1`);
    const back = await screen.findByRole("link", { name: "Back to prompts" });
    expect(back).toHaveAttribute("href", "/gallery?view=prompts&single=1");
    fireEvent.click(back);
    expect(window.location.pathname + window.location.search).toBe("/gallery?view=prompts&single=1");
  });

  it("without the switch the group's address and way back stay plain", async () => {
    replace("/gallery?view=prompts", null);
    renderApp();
    fireEvent.click(await screen.findByRole("link", { name: new RegExp(SHARED) }));
    expect(window.location.search).toBe(`?prompt=${KEY}`);
    expect(await screen.findByRole("link", { name: "Back to prompts" })).toHaveAttribute(
      "href",
      "/gallery?view=prompts",
    );
  });

  it("the unknown state's «Back to prompts» keeps the switch too", async () => {
    seed([], [2]);
    replace(`/gallery?prompt=${KEY}&single=1`, null);
    renderApp();
    await screen.findByText(UNKNOWN);
    expect(screen.getByRole("link", { name: "Back to prompts" })).toHaveAttribute(
      "href",
      "/gallery?view=prompts&single=1",
    );
  });
});

describe("«By prompt» stays pressed on a prompt's grid (R7)", () => {
  it("is pressed on ?prompt=<key> and nothing else is", async () => {
    renderApp();
    await screen.findByRole("heading", { name: SHARED });
    expect(screen.getByRole("button", { name: "By prompt" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("long prompt heading (R2, R6)", () => {
  const measure = (client: number, scroll: number) => {
    Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => client });
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", { configurable: true, get: () => scroll });
  };
  afterEach(() => {
    Reflect.deleteProperty(HTMLElement.prototype, "clientHeight");
    Reflect.deleteProperty(HTMLElement.prototype, "scrollHeight");
  });

  it("always clamps to 6 lines and offers the toggle when a few very long lines overflow", async () => {
    measure(100, 240);
    serve("one single very long line that wraps over many rows");
    renderApp();
    const heading = await screen.findByRole("heading", { name: /one single very long line/ });
    expect(heading.className).toMatch(/line-clamp-6/);
    fireEvent.click(await screen.findByRole("button", { name: "Show more" }));
    expect(heading.className).not.toMatch(/line-clamp-6/);
    expect(screen.getByRole("button", { name: "Show less" })).toBeInTheDocument();
  });

  it("shows no toggle when the text fits, and re-checks on resize", async () => {
    measure(100, 100);
    serve("short");
    renderApp();
    await screen.findByRole("heading", { name: "short" });
    expect(screen.queryByRole("button", { name: /^Show (more|less)$/ })).not.toBeInTheDocument();
    measure(100, 300);
    fireEvent(window, new Event("resize"));
    expect(await screen.findByRole("button", { name: "Show more" })).toBeInTheDocument();
  });

  it("the toggle says whether it is expanded and what it controls", async () => {
    measure(100, 240);
    serve("one single very long line that wraps over many rows");
    renderApp();
    const heading = await screen.findByRole("heading", { name: /one single very long line/ });
    const toggle = await screen.findByRole("button", { name: "Show more" });
    expect(heading.id).not.toBe("");
    expect(toggle).toHaveAttribute("aria-controls", heading.id);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");
  });
});

describe("one-group read failure (R5)", () => {
  it("falls back to the first card's prompt, says the count is unavailable and retries", async () => {
    m.promptGroup.mockRejectedValueOnce(new ApiError(500, "INTERNAL", "boom"));
    m.promptGroup.mockRejectedValueOnce(new ApiError(500, "INTERNAL", "boom"));
    m.promptGroup.mockRejectedValueOnce(new ApiError(500, "INTERNAL", "boom"));
    renderApp();
    expect(await screen.findByRole("heading", { name: SHARED })).toBeInTheDocument();
    expect(await screen.findByText(/count unavailable/)).toBeInTheDocument();
    expect(screen.queryByText(UNKNOWN)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("5 generations")).toBeInTheDocument();
    expect(screen.queryByText(/count unavailable/)).not.toBeInTheDocument();
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

  it("a dialog address reached with a prompt grid/order state (reload) steps within the prompt", async () => {
    const state = {
      dialog: "gallery",
      load: APP_LOAD,
      grid: { kind: "prompt", key: KEY },
      order: { kind: "prompt", key: KEY },
    };
    replace(`/generations/${idOf(9)}`, state);
    renderApp();
    await screen.findByRole("dialog");
    expect(await screen.findByRole("heading", { name: SHARED })).toBeInTheDocument(); // the prompt grid behind
    const older = () => screen.getByRole("button", { name: /^Older/ });
    await waitFor(() => expect(older()).not.toHaveAttribute("aria-disabled", "true"));
    fireEvent.click(older());
    await waitFor(() => expect(here()).toBe(`/generations/${idOf(7)}`));
    expect(m.generations).not.toHaveBeenCalledWith(undefined);
    expect(m.generations).toHaveBeenCalledWith(undefined, undefined, { prompt: KEY });
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
