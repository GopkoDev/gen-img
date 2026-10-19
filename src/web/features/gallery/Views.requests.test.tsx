import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { navigate, replace } from "@/lib/router";
import { summary } from "@/test-utils";
import type { Generation, GenerationSummary, PromptGroup } from "../../../shared/generations";
import { RecentGenerations } from "../generate/RecentGenerations";
import { patchCard } from "./cardPatch";
import { Gallery, resetGalleryScroll } from "./Gallery";

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: {
    generations: vi.fn(),
    generationModels: vi.fn(),
    generation: vi.fn(),
    promptGroups: vi.fn(),
    promptGroup: vi.fn(),
  },
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

const KEY = "0123456789abcdef0123456789abcdef";
const SHARED = "Shared prompt";
const promptGroup = (i: number, key = KEY): PromptGroup => ({
  key,
  prompt: `Group prompt ${i}`,
  count: 3,
  images: 3,
  models: [],
  moreModels: 0,
  latestId: summary(i).id,
  cover: { url: "/x.png", width: 1, height: 1 },
});
/** The prompt-related mocked calls: group pages, the one-group read, a prompt's list, the plain All list. */
const promptReads = () => ({
  groups: m.promptGroups.mock.calls.length,
  group: m.promptGroup.mock.calls.length,
  list: m.generations.mock.calls.filter(([, , f]) => f && "prompt" in f).length,
  all: m.generations.mock.calls.filter(([, l, f]) => !f && l === undefined).length,
  recent: m.generations.mock.calls.filter(([, l]) => l === 10).length,
});
const promptDelta = (before: ReturnType<typeof promptReads>) => {
  const now = promptReads();
  return {
    groups: now.groups - before.groups,
    group: now.group - before.group,
    list: now.list - before.list,
    all: now.all - before.all,
    recent: now.recent - before.recent,
  };
};
const invalidate = () =>
  act(async () => {
    await client.invalidateQueries({ queryKey: ["generations"] });
  });

describe("requests per prompt view (R4, spec §6)", () => {
  beforeEach(() => {
    m.promptGroups.mockImplementation(async (cursor) =>
      cursor
        ? { groups: [promptGroup(2, "f".repeat(32))], nextCursor: null }
        : { groups: [promptGroup(1)], nextCursor: "c1" },
    );
    m.promptGroup.mockImplementation(async () => promptGroup(1));
    const impl = m.generations.getMockImplementation();
    m.generations.mockImplementation(async (cursor, limit, filter) => {
      if (filter && "prompt" in filter) {
        const rest = store.filter((g) => !cursor || g.id < cursor);
        const items = rest.slice(0, 2).map((g) => ({ ...g, prompt: SHARED }));
        return { items, nextCursor: rest.length > 2 ? (items[1]?.id ?? null) : null };
      }
      return (impl as NonNullable<typeof impl>)(cursor, limit, filter);
    });
  });

  it("«By prompt»: a change costs one request per loaded page and the recent strip; a revisit costs none", async () => {
    renderApp();
    await screen.findByText("A test prompt number 5");
    await show("/gallery?view=prompts", "Group prompt 1");
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await screen.findByText("Group prompt 2");
    const before = promptReads();
    await invalidate();
    await settle();
    expect(promptDelta(before)).toEqual({ groups: 2, group: 0, list: 0, all: 0, recent: 1 });

    await show("/gallery", "A test prompt number 5");
    await show("/gallery?view=prompts", "Group prompt 2");
    const settled = promptReads();
    await show("/gallery", "A test prompt number 5");
    await show("/gallery?view=prompts", "Group prompt 2");
    expect(promptDelta(settled)).toEqual({ groups: 0, group: 0, list: 0, all: 0, recent: 0 });
  });

  it("«By prompt» off screen: a change reads none of its pages", async () => {
    renderApp();
    await screen.findByText("A test prompt number 5");
    await show("/gallery?view=prompts", "Group prompt 1");
    await show("/gallery", "A test prompt number 5");
    const before = promptReads();
    await invalidate();
    await settle();
    expect(promptDelta(before)).toMatchObject({ groups: 0, group: 0, list: 0 });
  });

  it("a prompt's grid: a change costs one request per loaded page, one group read and the recent strip; a revisit costs none", async () => {
    renderApp();
    await screen.findByText("A test prompt number 5");
    await show(`/gallery?prompt=${KEY}`, "Group prompt 1");
    const before = promptReads();
    await invalidate();
    await settle();
    expect(promptDelta(before)).toEqual({ groups: 0, group: 1, list: 1, all: 0, recent: 1 });

    await show("/gallery", "A test prompt number 5");
    const settled = promptReads();
    await show(`/gallery?prompt=${KEY}`, "Group prompt 1");
    await show("/gallery", "A test prompt number 5");
    expect(promptDelta(settled).list).toBeLessThanOrEqual(1); // stale after the change: re-read once when shown
    const again = promptReads();
    await show(`/gallery?prompt=${KEY}`, "Group prompt 1");
    expect(promptDelta(again)).toEqual({ groups: 0, group: 0, list: 0, all: 0, recent: 0 });
  });

  it("a prompt's grid off screen: a change reads none of it", async () => {
    renderApp();
    await screen.findByText("A test prompt number 5");
    await show(`/gallery?prompt=${KEY}`, "Group prompt 1");
    await show("/gallery", "A test prompt number 5");
    const before = promptReads();
    await invalidate();
    await settle();
    expect(promptDelta(before)).toMatchObject({ groups: 0, group: 0, list: 0 });
  });

  it("«By prompt» with none reused: a change re-reads the one-card probe, never the All pages (R3)", async () => {
    m.promptGroups.mockResolvedValue({ groups: [], nextCursor: null });
    renderApp();
    await screen.findByText("A test prompt number 5");
    await show("/gallery?view=prompts", "No prompt is used more than once yet.");
    const before = promptReads();
    await invalidate();
    await settle();
    expect(promptDelta(before).all).toBe(0);
    expect(promptDelta(before).groups).toBe(1);
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
