import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { dialogState, replace, useRoute } from "@/lib/router";
import { summary } from "@/test-utils";
import type { Generation } from "../../../shared/generations";
import { GenerationDialog } from "./GenerationDialog";

const ALL_VIEWS = { grid: { kind: "all" }, order: { kind: "all" } } as const;

// generation-detail-modal spec §6 row 1: ≤ 100 ms p95 from a step to the dialog rendering the large image and
// the metadata, for an already read generation (details pre-read in the cache). jsdom has no paint timing.
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: { generations: vi.fn(), generation: vi.fn() },
}));
const p95 = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.ceil(xs.length * 0.95) - 1] ?? Number.NaN;

const COUNT = 22; // warm-up step + 20 measured + the starting one
const gen = (i: number): Generation => ({
  id: summary(i).id,
  provider: "openrouter",
  model: "bytedance-seed/seedream-4.5",
  prompt: `Detail prompt ${i}`,
  requestedParams: { n: 2 },
  acceptedParams: null,
  imagesRequested: 2,
  images: [1, 2].map((position) => ({
    position,
    url: `/api/files/generations/${summary(i).id}/output-${position}.png`,
    mediaType: "image/png" as const,
    width: 4,
    height: 3,
    byteSize: 100,
  })),
  inputs: [],
  costMicros: 40000,
  costStatus: "known",
  createdAt: "2026-10-18T14:02:11.000Z",
  durationMs: 23_400,
  rawRequest: {},
  rawResponse: {},
  tags: [],
  comment: null,
  source: null,
  derived: { items: [], total: 0 },
});

function Shell() {
  const route = useRoute();
  return route.name === "detail" ? <GenerationDialog id={route.id} /> : null;
}

describe("generation dialog NFRs", () => {
  it("steps to an already read generation ≤ 100 ms p95 over 20 steps", async () => {
    const ids = Array.from({ length: COUNT }, (_, i) => COUNT - i); // newest first
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(["generations"], {
      pages: [{ items: ids.map((i) => summary(i)), nextCursor: null }],
      pageParams: [undefined],
    });
    for (const i of ids) client.setQueryData(["generation", summary(i).id], gen(i));
    replace(`/generations/${summary(COUNT).id}`, dialogState(ALL_VIEWS));
    render(
      <QueryClientProvider client={client}>
        <Shell />
      </QueryClientProvider>,
    );
    await screen.findByText(`Detail prompt ${COUNT}`, {}, { timeout: 5000 });

    const times: number[] = [];
    for (let step = 1; step <= 21; step++) {
      const i = COUNT - step;
      const t0 = performance.now();
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
      await waitFor(
        () => {
          expect(screen.getByText(`Detail prompt ${i}`)).toBeInTheDocument();
          expect(screen.getAllByAltText(/^Output \d+ of:/)[0]).toHaveAttribute(
            "src",
            expect.stringContaining(`${summary(i).id}/output-1.png`),
          );
        },
        { timeout: 5000, interval: 1 },
      );
      if (step > 1) times.push(performance.now() - t0); // the first step pays for warm-up
    }
    cleanup();
    expect(times).toHaveLength(20);
    expect(api.generation).not.toHaveBeenCalled(); // all from the cache
    expect(p95(times)).toBeLessThanOrEqual(100);
  }, 60_000);
});
