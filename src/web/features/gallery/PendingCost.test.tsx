import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { renderWithQuery, summary } from "@/test-utils";
import type { Generation } from "../../../shared/generations";
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

  it("gallery marks pending tiles and re-reads until they resolve", async () => {
    m.generations
      .mockResolvedValueOnce({
        items: [summary(1, { provider: "vercel", costStatus: "pending", costMicros: null })],
        nextCursor: null,
      })
      .mockResolvedValue({
        items: [summary(1, { provider: "vercel", costStatus: "unavailable", costMicros: null })],
        nextCursor: null,
      });
    renderWithQuery(<Gallery />);
    expect(await screen.findByText("cost pending")).toBeInTheDocument();
    expect(screen.getByText(/vercel · /)).toBeInTheDocument();
    await tick(10_000);
    await vi.waitFor(() => expect(screen.queryByText("cost pending")).not.toBeInTheDocument());
  });
});
