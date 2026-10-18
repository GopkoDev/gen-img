import { fireEvent, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "@/lib/api";
import { renderWithQuery } from "@/test-utils";
import type { ModelPrice } from "../../../shared/pricing";
import { EstimateLine, PriceLine } from "./PricePreview";

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: { price: vi.fn(), costHistory: vi.fn() },
}));
const m = vi.mocked(api);

const perImage = (min: number, max = min, input: number | null = null): ModelPrice => ({
  kind: "per-image",
  output: { minUsd: min, maxUsd: max },
  input: input === null ? null : { minUsd: input, maxUsd: input },
});

function show(props: { provider?: "openrouter" | "vercel"; model?: string; images?: number; inputs?: number }) {
  const p = {
    provider: props.provider ?? "openrouter",
    model: props.model ?? "x/m",
    images: props.images ?? 1,
    inputs: props.inputs ?? 0,
  };
  return renderWithQuery(
    <div>
      <PriceLine provider={p.provider} model={p.model} />
      <EstimateLine {...p} />
    </div>,
  );
}

describe("PricePreview (SCR-01)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    m.costHistory.mockResolvedValue({ count: 0, perImageMicros: null });
  });

  it("shows loading, then the price per image and a labelled estimate for the number of images", async () => {
    m.price.mockResolvedValue({ price: perImage(0.0184), fetchedAt: "2026-10-18T12:00:00.000Z" });
    show({ images: 2 });
    expect(screen.getByText("Price: loading…")).toBeInTheDocument();
    expect(await screen.findByText("$0.0184 / image")).toBeInTheDocument();
    expect(screen.getByText("Estimate ≈ $0.04 for 2 images")).toBeInTheDocument();
    expect(m.price).toHaveBeenCalledWith("openrouter", "x/m");
    expect(m.costHistory).not.toHaveBeenCalled(); // history only for per-token models
  });

  it("adds input images billed per image, and shows ranges as ranges", async () => {
    m.price.mockResolvedValueOnce({ price: perImage(0.02, 0.02, 0.01), fetchedAt: "x" });
    const a = show({ images: 2, inputs: 1 });
    expect(await screen.findByText("Estimate ≈ $0.05 for 2 images + 1 input")).toBeInTheDocument();
    a.unmount();
    m.price.mockResolvedValueOnce({ price: perImage(0.045, 0.151), fetchedAt: "x" });
    show({ images: 2, model: "x/range" });
    expect(await screen.findByText("$0.045–$0.151 / image")).toBeInTheDocument();
    expect(screen.getByText("Estimate ≈ $0.09–$0.31 for 2 images")).toBeInTheDocument();
  });

  it("estimates per-token models from known past costs, or says there is no estimate", async () => {
    m.price.mockResolvedValue({ price: { kind: "per-token" }, fetchedAt: "x" });
    m.costHistory.mockResolvedValueOnce({ count: 5, perImageMicros: 60_000 });
    const a = show({ images: 2 });
    expect(await screen.findByText("priced per token")).toBeInTheDocument();
    expect(await screen.findByText("Estimate ≈ $0.12 for 2 images, from your last 5 generations")).toBeInTheDocument();
    expect(m.costHistory).toHaveBeenCalledWith("openrouter", "x/m");
    a.unmount();
    show({ images: 2, model: "x/new" });
    expect(await screen.findByText("No estimate before generating")).toBeInTheDocument();
  });

  it("says «price unknown» — never $0 — when nothing is published or loading failed", async () => {
    m.price.mockResolvedValueOnce({ price: { kind: "unknown" }, fetchedAt: "x" });
    const a = show({ images: 2 });
    expect(await screen.findByText("Price unknown")).toBeInTheDocument();
    expect(screen.queryByText(/Estimate/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\$0\b/)).not.toBeInTheDocument();
    a.unmount();
    m.price.mockImplementationOnce(async () => {
      throw new ApiError(502, "PROVIDER_ERROR", "busy");
    });
    show({ model: "x/fails" });
    expect(await screen.findByText("Price unknown — couldn't load")).toBeInTheDocument();
  });

  it("shows the new model's price after a switch", async () => {
    m.price.mockImplementation(async (_p, model) => ({
      price: perImage(model === "x/a" ? 0.01 : 0.03),
      fetchedAt: "x",
    }));
    function Switcher() {
      const [sel, setSel] = useState<{ provider: "openrouter" | "vercel"; model: string }>({
        provider: "openrouter",
        model: "x/a",
      });
      return (
        <div>
          <button type="button" onClick={() => setSel({ provider: "vercel", model: "x/b" })}>
            switch
          </button>
          <PriceLine provider={sel.provider} model={sel.model} />
        </div>
      );
    }
    renderWithQuery(<Switcher />);
    expect(await screen.findByText("$0.01 / image")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "switch" }));
    await waitFor(() => expect(screen.getByText("$0.03 / image")).toBeInTheDocument());
    expect(m.price).toHaveBeenLastCalledWith("vercel", "x/b");
  });
});
