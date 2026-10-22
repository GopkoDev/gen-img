import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { renderWithQuery } from "@/test-utils";
import type { Generation } from "../../../shared/generations";
import type { ImageModel } from "../../../shared/providers";
import { GeneratePanel } from "./GeneratePanel";

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: {
    providers: vi.fn(),
    models: vi.fn(),
    modelPreferences: vi.fn(),
    setModelPreference: vi.fn(),
    currentJob: vi.fn(),
    startGeneration: vi.fn(),
    dismissJob: vi.fn(),
    generation: vi.fn(),
  },
}));
const m = vi.mocked(api);

const SEEDY: ImageModel = {
  id: "x/seedy",
  name: "Seedy",
  params: { seed: {}, aspectRatio: { values: ["1:1", "16:9"] }, n: { max: 4 }, inputs: { min: 0, max: 4 } },
};
const TEXT: ImageModel = { id: "x/text", name: "Text only", params: {} };

const img = (kind: "output" | "input", position: number) => ({
  position,
  url: `/api/files/generations/01SRC/${kind}-${position}.png`,
  mediaType: "image/png" as const,
  width: 4,
  height: 3,
  byteSize: 100,
});
const SOURCE: Generation = {
  id: "01SRC",
  provider: "openrouter",
  model: "x/seedy",
  prompt: "A cat in a neon city",
  requestedParams: { n: 2, seed: 42, aspectRatio: "16:9" },
  acceptedParams: null,
  imagesRequested: 2,
  images: [img("output", 1), img("output", 2)],
  inputs: [
    { ...img("input", 1), originalName: "cat.png" },
    { ...img("input", 2), originalName: null },
  ],
  costMicros: 10000,
  costStatus: "known",
  createdAt: "2026-10-18T12:00:00.000Z",
  durationMs: 1000,
  rawRequest: {},
  rawResponse: {},
  tags: [],
  comment: null,
  source: null,
  derived: { items: [], total: 0 },
};

function setup(models: ImageModel[], address: string, source: () => Promise<Generation> = async () => SOURCE) {
  window.history.replaceState(null, "", address);
  m.providers.mockResolvedValue({ providers: [{ id: "openrouter", name: "OpenRouter", configured: true }] });
  m.modelPreferences.mockResolvedValue({ preferences: [] });
  m.models.mockResolvedValue({ models, fetchedAt: new Date().toISOString() });
  m.currentJob.mockResolvedValue({ job: null });
  m.generation.mockImplementation(source);
  m.startGeneration.mockResolvedValue({ job: { id: "J", status: "running", startedAt: new Date().toISOString() } });
  renderWithQuery(<GeneratePanel />);
}

async function pickModel(name: string) {
  fireEvent.click(screen.getByRole("button", { name: "Model" }));
  fireEvent.click(await screen.findByRole("button", { name: new RegExp(`^${name}`) }));
}

const SMALL: ImageModel = {
  id: "x/small",
  name: "Small",
  params: { seed: {}, n: { max: 1 }, inputs: { min: 0, max: 4 } },
};

describe("GeneratePanel — model switch keeps what fits (AC-05)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("removes and names unsupported parameters, lowers the image count, and never sends a removed value", async () => {
    setup([SEEDY, SMALL], "/?rerun=01SRC");
    // the draft loads through providers → models → source; allow for a busy full-suite run
    await waitFor(() => expect(screen.getByLabelText("Seed")).toHaveValue(42), { timeout: 5000 });
    await pickModel("Small");
    expect(
      await screen.findByText("Not supported by this model: aspect ratio. Images lowered to 1."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Seed")).toHaveValue(42); // supported → kept
    expect(screen.queryByRole("combobox", { name: "Aspect ratio" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Images")).toHaveValue(1);
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    await waitFor(() => expect(m.startGeneration).toHaveBeenCalled());
    expect(m.startGeneration.mock.calls[0]?.[0]).toMatchObject({ model: "x/small", params: { n: 1, seed: 42 } });
    expect(m.startGeneration.mock.calls[0]?.[0].params).not.toHaveProperty("aspectRatio");
  });

  it("names the seed too when the new model takes none", async () => {
    setup([SEEDY, TEXT], "/?rerun=01SRC");
    // the draft loads through providers → models → source; allow for a busy full-suite run
    await waitFor(() => expect(screen.getByLabelText("Seed")).toHaveValue(42), { timeout: 5000 });
    await pickModel("Text only");
    expect(
      await screen.findByText("Not supported by this model: seed, aspect ratio. Images lowered to 1."),
    ).toBeInTheDocument();
  });
});
