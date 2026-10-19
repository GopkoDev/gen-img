import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { renderWithQuery, summary } from "@/test-utils";
import type { Generation } from "../../../shared/generations";
import { RecentGenerations } from "../generate/RecentGenerations";
import { Gallery } from "./Gallery";
import { GenerationDetail } from "./GenerationDetail";

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: { generation: vi.fn(), generations: vi.fn() },
}));
const m = vi.mocked(api);

const gen = (over: Partial<Generation> = {}): Generation => ({
  id: "01V",
  provider: "vercel",
  model: "bfl/flux-2-pro",
  prompt: "A red square",
  requestedParams: { n: 1 },
  acceptedParams: null,
  imagesRequested: 1,
  images: [
    {
      position: 1,
      url: "/api/files/generations/01V/output-1.png",
      mediaType: "image/png",
      width: 4,
      height: 3,
      byteSize: 9,
    },
  ],
  inputs: [],
  costMicros: null,
  costStatus: "pending",
  createdAt: "2026-10-18T12:00:00.000Z",
  durationMs: 9000,
  rawRequest: {},
  rawResponse: {},
  tags: [],
  comment: null,
  source: null,
  derived: { items: [], total: 0 },
  ...over,
});

const tick = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

describe("pending costs (SCR-02, SCR-03)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("detail shows «pending» (never a dollar amount) and updates itself", async () => {
    m.generation.mockResolvedValueOnce(gen()).mockResolvedValue(gen({ costStatus: "known", costMicros: 67000 }));
    renderWithQuery(<GenerationDetail id="01V" />);
    expect(await screen.findByText("updates automatically")).toBeInTheDocument();
    const cost = screen.getByText("Cost", { selector: "dt" }).nextElementSibling as HTMLElement;
    expect(cost).toHaveTextContent("pending");
    expect(cost).not.toHaveTextContent("$");
    expect(screen.getByText("Vercel AI Gateway")).toBeInTheDocument();
    await tick(5_000);
    expect(await screen.findByText("$0.067")).toBeInTheDocument();
    expect(screen.queryByText("updates automatically")).not.toBeInTheDocument();
    const calls = m.generation.mock.calls.length;
    await tick(15_000);
    expect(m.generation.mock.calls.length).toBe(calls); // no polling once resolved
  });

  describe("gallery cards (ADR-0031)", () => {
    const pendingSummary = (i: number) => summary(i, { provider: "vercel", costStatus: "pending", costMicros: null });
    const idOf = (i: number) => summary(i).id;

    /** Five pages of two cards; the cards in `pending` start pending. */
    async function loadFivePages(pending: number[]) {
      const page = (n: number) => ({
        items: [n * 2 + 1, n * 2 + 2].map((i) => (pending.includes(i) ? pendingSummary(i) : summary(i))),
        nextCursor: n < 4 ? `c${n + 1}` : null,
      });
      m.generations.mockImplementation(async (cursor?: string) => page(cursor ? Number(cursor.slice(1)) : 0));
      const view = renderWithQuery(
        <>
          <Gallery />
          <RecentGenerations />
        </>,
      );
      for (let n = 1; n < 5; n++) {
        fireEvent.click(await screen.findByRole("button", { name: "Load more" }));
        await vi.waitFor(() => expect(m.generations).toHaveBeenCalledWith(`c${n}`));
        await vi.waitFor(() => expect(screen.getAllByRole("link").length).toBeGreaterThan(n * 2));
      }
      await vi.waitFor(() => expect(screen.getByText("That's everything")).toBeInTheDocument());
      m.generations.mockClear();
      m.generation.mockClear();
      return view;
    }

    it("polls only the pending card's generation, never the list, and the card turns into the amount", async () => {
      await loadFivePages([1]);
      expect(screen.getAllByText("cost pending")).toHaveLength(1);
      m.generation.mockResolvedValue(gen({ id: idOf(1), costStatus: "pending" }));
      await tick(10_000);
      await tick(10_000);
      expect(m.generation.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(m.generation.mock.calls.every(([id]) => id === idOf(1))).toBe(true);
      expect(m.generations).not.toHaveBeenCalled(); // neither the gallery pages nor the recent strip

      m.generation.mockResolvedValue(gen({ id: idOf(1), costStatus: "known", costMicros: 67000 }));
      await tick(10_000);
      expect(await screen.findByText("$0.067")).toBeInTheDocument();
      expect(screen.queryByText("cost pending")).not.toBeInTheDocument();
      expect(m.generations).not.toHaveBeenCalled(); // patched in place, no invalidation
      const calls = m.generation.mock.calls.length;
      await tick(30_000);
      expect(m.generation.mock.calls.length).toBe(calls);
    });

    it("the recent strip keeps showing the ten newest ids before and after paging", async () => {
      const all = Array.from({ length: 25 }, (_, i) => summary(25 - i));
      m.generations.mockImplementation(async (cursor?: string, limit?: number) => {
        const rest = cursor ? all.filter((g) => g.id < cursor) : all;
        const size = limit ?? 2;
        const items = rest.slice(0, size);
        return { items, nextCursor: rest.length > size ? (items[size - 1]?.id ?? null) : null };
      });
      renderWithQuery(
        <>
          <Gallery />
          <RecentGenerations />
        </>,
      );
      const recent = () =>
        within(screen.getByRole("region", { name: "Recent generations" }))
          .getAllByRole("link")
          .map((a) => a.getAttribute("href"));
      const newestTen = all.slice(0, 10).map((g) => `/generations/${g.id}`);
      await vi.waitFor(() => expect(recent()).toEqual(newestTen));
      for (let n = 0; n < 3; n++) {
        const before = screen.getAllByRole("link").length;
        fireEvent.click(await screen.findByRole("button", { name: "Load more" }));
        await vi.waitFor(() => expect(screen.getAllByRole("link").length).toBeGreaterThan(before));
      }
      expect(recent()).toEqual(newestTen);
    });

    it("pending -> unavailable says «cost unavailable» and stops polling", async () => {
      await loadFivePages([1]);
      m.generation.mockResolvedValue(gen({ id: idOf(1), costStatus: "unavailable", costMicros: null }));
      await tick(10_000);
      expect(await screen.findByText("cost unavailable")).toBeInTheDocument();
      const calls = m.generation.mock.calls.length;
      await tick(30_000);
      expect(m.generation.mock.calls.length).toBe(calls);
      expect(m.generations).not.toHaveBeenCalled();
    });

    it("two pending cards poll separately", async () => {
      await loadFivePages([1, 7]);
      m.generation.mockImplementation(async (id: string) => gen({ id, costStatus: "pending" }));
      await tick(10_000);
      const ids = new Set(m.generation.mock.calls.map(([id]) => id));
      expect(ids).toEqual(new Set([idOf(1), idOf(7)]));
      expect(m.generations).not.toHaveBeenCalled();
    });
  });
});
