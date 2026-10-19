import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { navigate, replace } from "@/lib/router";
import { summary } from "@/test-utils";
import type { Generation, GenerationSummary } from "../../../shared/generations";
import { RecentGenerations } from "../generate/RecentGenerations";
import { patchCard } from "./cardPatch";
import { Gallery, resetGalleryScroll } from "./Gallery";

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: { generations: vi.fn(), generationModels: vi.fn(), generation: vi.fn() },
}));
const m = vi.mocked(api);

const A = "model/a";
const B = "model/b";
const MODEL_A = `/gallery?provider=openrouter&model=${encodeURIComponent(A)}`;
let store: GenerationSummary[] = [];

/** Mocked calls by kind: the unfiltered list, a model's list, the recent strip, the models read. */
const reads = () => ({
  all: m.generations.mock.calls.filter(([, l, f]) => !f && l === undefined).length,
  model: m.generations.mock.calls.filter(([, , f]) => f).length,
  recent: m.generations.mock.calls.filter(([, l]) => l === 10).length,
  models: m.generationModels.mock.calls.length,
});
const delta = (before: ReturnType<typeof reads>) => {
  const now = reads();
  return {
    all: now.all - before.all,
    model: now.model - before.model,
    recent: now.recent - before.recent,
    models: now.models - before.models,
  };
};

let client: QueryClient;
function renderApp() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Gallery />
      <RecentGenerations />
    </QueryClientProvider>,
  );
}
const show = async (path: string, text: string | RegExp) => {
  act(() => navigate(path));
  await screen.findByText(text);
  await act(async () => {});
};
const settle = () => act(async () => {});

beforeEach(() => {
  vi.resetAllMocks();
  resetGalleryScroll();
  window.scrollTo = vi.fn();
  replace("/gallery", null);
  store = [1, 2, 3, 4, 5].map((i) => summary(i, { model: i % 2 ? A : B })).reverse();
  m.generations.mockImplementation(async (cursor, limit, filter) => {
    const rest = store.filter((g) => (!filter || g.model === filter.model) && (!cursor || g.id < cursor));
    const size = limit ?? 2;
    const items = rest.slice(0, size);
    return { items, nextCursor: rest.length > size ? (items[size - 1]?.id ?? null) : null };
  });
  m.generationModels.mockImplementation(async () => ({
    models: [A, B].map((model) => {
      const mine = store.filter((g) => g.model === model);
      return { provider: "openrouter" as const, model, count: mine.length, latestId: mine[0]?.id ?? "", items: mine };
    }),
  }));
});
afterEach(() => {
  vi.useRealTimers();
  replace("/", null);
});

describe("requests per view (spec §6)", () => {
  it("reads each view on its first visit and a revisit of an unchanged view costs nothing", async () => {
    renderApp();
    await screen.findByText("A test prompt number 5");
    await show(MODEL_A, "A test prompt number 3");
    await show("/gallery?view=models", B);
    const before = reads();
    await show("/gallery", "A test prompt number 5");
    await show(MODEL_A, "A test prompt number 3");
    await show("/gallery?view=models", B);
    expect(delta(before)).toEqual({ all: 0, model: 0, recent: 0, models: 0 });
  });

  it("a change re-reads only the view on screen (one request per loaded page) and the recent strip; cached views re-read when next shown, once", async () => {
    renderApp();
    await screen.findByText("A test prompt number 5");
    await show("/gallery?view=models", B);
    await show(MODEL_A, "A test prompt number 3"); // on screen: model A, one page of two loaded
    const before = reads();
    store = [summary(6, { model: A }), ...store];
    await act(async () => {
      await client.invalidateQueries({ queryKey: ["generations"] });
    });
    expect(await screen.findByText("A test prompt number 6")).toBeInTheDocument();
    // the model view's heading reads the models (count): that read is on screen too, so it is re-read once
    expect(delta(before)).toEqual({ all: 0, model: 1, recent: 1, models: 1 });

    const afterChange = reads();
    await show("/gallery", "A test prompt number 6");
    expect(delta(afterChange)).toMatchObject({ all: 1, models: 0 });
    const afterAll = reads();
    await show("/gallery?view=models", A);
    expect(delta(afterAll)).toMatchObject({ models: 0, all: 0 }); // already re-read while its count was on screen
    const settled = reads();
    await show("/gallery", "A test prompt number 6");
    await show(MODEL_A, "A test prompt number 6");
    expect(delta(settled)).toEqual({ all: 0, model: 0, recent: 0, models: 0 });
  });

  it("with several pages loaded the on-screen view costs at most one request per page", async () => {
    renderApp();
    await screen.findByText("A test prompt number 5");
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await screen.findByText("A test prompt number 3");
    const before = reads();
    await act(async () => {
      await client.invalidateQueries({ queryKey: ["generations"] });
    });
    expect(delta(before).all).toBeLessThanOrEqual(2);
    expect(delta(before).model).toBe(0);
  });

  it("a curation change costs no list read", async () => {
    renderApp();
    await screen.findByText("A test prompt number 5");
    await show(MODEL_A, "A test prompt number 3");
    const before = reads();
    act(() => patchCard(client, summary(3).id, { tags: ["x"] }));
    expect(await screen.findByText("x")).toBeInTheDocument();
    await settle();
    expect(delta(before)).toMatchObject({ all: 0, model: 0, models: 0 });
  });
});

describe("pending cost (ADR-0031)", () => {
  it("is polled once per generation across views, at most every 10 s, asking only for that generation", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    store = store.map((g) => (g.id === summary(5).id ? { ...g, costStatus: "pending" as const, costMicros: null } : g));
    m.generation.mockImplementation(
      async (id) => ({ ...(store.find((g) => g.id === id) as GenerationSummary) }) as unknown as Generation,
    );
    renderApp();
    await screen.findByText("A test prompt number 5");
    await act(async () => vi.advanceTimersByTimeAsync(25_000));
    await show(MODEL_A, "A test prompt number 5");
    await act(async () => vi.advanceTimersByTimeAsync(10_000));
    await waitFor(() => expect(m.generation).toHaveBeenCalled());
    // 35 s: the first read at mount, then one per 10 s; never a second watcher per view
    expect(m.generation.mock.calls.length).toBeLessThanOrEqual(4);
    expect(m.generation.mock.calls.every(([id]) => id === summary(5).id)).toBe(true);
  });
});
