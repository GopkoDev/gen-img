import { cleanup, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { renderWithQuery } from "@/test-utils";
import type { ImageModel } from "../../../shared/providers";
import { ModelsPage } from "./ModelsPage";

// models-page spec §6 row 1: rows ≤ 300 ms p95 with 100 models + 100 preferences, lists already loaded.
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: { providers: vi.fn(), models: vi.fn(), price: vi.fn(), modelPreferences: vi.fn(), setModelPreference: vi.fn() },
}));
const m = vi.mocked(api);
const p95 = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.ceil(xs.length * 0.95) - 1] ?? Number.NaN;

const models: ImageModel[] = Array.from({ length: 100 }, (_, i) => ({
  id: `seed/model-${i}`,
  name: `Model ${i}`,
  params: { aspectRatio: { values: ["1:1", "16:9", "9:16"] }, n: { max: 4 }, inputs: { min: 0, max: 8 } },
}));

describe("models-page NFRs", () => {
  it("renders 100 rows with 100 preferences ≤ 300 ms p95 over 20 renders", async () => {
    m.providers.mockResolvedValue({ providers: [{ id: "openrouter", name: "OpenRouter", configured: true }] });
    m.models.mockResolvedValue({ models, fetchedAt: "x" });
    m.modelPreferences.mockResolvedValue({
      preferences: models.map((x, i) => ({
        provider: "openrouter" as const,
        model: x.id,
        favorite: i % 2 === 0,
        hidden: i % 3 === 0,
        updatedAt: "2026-10-19T10:00:00.000Z",
      })),
    });
    m.price.mockReturnValue(new Promise(() => {})); // rows must not wait for prices
    const times: number[] = [];
    for (let run = 0; run < 21; run++) {
      const t0 = performance.now();
      renderWithQuery(<ModelsPage />);
      await screen.findByText("Model 99", {}, { timeout: 5000 });
      if (run > 0) times.push(performance.now() - t0); // the first render pays for module warm-up
      cleanup();
    }
    expect(p95(times)).toBeLessThanOrEqual(300);
  }, 60_000); // 21 renders: the test's own timeout, not the measured bound
});
