import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "@/lib/api";
import { renderWithQuery } from "@/test-utils";
import type { Generation } from "../../../shared/generations";
import type { ImageModel } from "../../../shared/providers";
import { GeneratePanel } from "./GeneratePanel";

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: {
    providers: vi.fn(),
    models: vi.fn(),
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
const EDITOR: ImageModel = { id: "x/editor", name: "Editor", params: { inputs: { min: 1, max: 2 } } };

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
  m.models.mockResolvedValue({ models, fetchedAt: new Date().toISOString() });
  m.currentJob.mockResolvedValue({ job: null });
  m.generation.mockImplementation(source);
  m.startGeneration.mockResolvedValue({ job: { id: "J", status: "running", startedAt: new Date().toISOString() } });
  renderWithQuery(<GeneratePanel />);
}

describe("GeneratePanel — draft from a source (SCR-01)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("fills a re-run with the source's provider, model, prompt, parameters and stored inputs, then cleans the address", async () => {
    setup([TEXT, SEEDY], "/?rerun=01SRC");
    expect(await screen.findByText(/Re-run of/)).toBeInTheDocument();
    expect(screen.getByText("Sends the same inputs again — results can differ.")).toBeInTheDocument();
    expect(screen.getByLabelText("Prompt")).toHaveValue("A cat in a neon city");
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Model" })).toHaveTextContent("Seedy"));
    expect(screen.getByLabelText("Seed")).toHaveValue(42);
    expect(screen.getByLabelText("Images")).toHaveValue(2);
    expect(screen.getByRole("button", { name: "Remove cat.png" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove input-2" })).toBeInTheDocument();
    expect(window.location.search).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    await waitFor(() =>
      expect(m.startGeneration).toHaveBeenCalledWith({
        provider: "openrouter",
        model: "x/seedy",
        prompt: "A cat in a neon city",
        params: { n: 2, seed: 42, aspectRatio: "16:9" },
        source: { id: "01SRC", relation: "rerun" },
        inputs: [
          { stored: { generationId: "01SRC", kind: "input", position: 1 } },
          { stored: { generationId: "01SRC", kind: "input", position: 2 } },
        ],
      }),
    );
  });

  it("drops the link to the source when the Owner removes it", async () => {
    setup([SEEDY], "/?rerun=01SRC");
    fireEvent.click(await screen.findByRole("button", { name: "Remove the link to the source" }));
    expect(screen.queryByText(/Re-run of/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    await waitFor(() => expect(m.startGeneration).toHaveBeenCalled());
    expect(m.startGeneration.mock.calls[0]?.[0]).not.toHaveProperty("source");
  });

  it("reuses one output with an empty prompt and switches to a model that takes input images", async () => {
    setup([TEXT, EDITOR], "/?reuse=01SRC&output=2");
    expect(await screen.findByText(/Made from output 2 of/)).toBeInTheDocument();
    expect(screen.getByLabelText("Prompt")).toHaveValue("");
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Model" })).toHaveTextContent("Editor"));
    expect(screen.getByText("Switched to Editor — it takes input images.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove output-2" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Prompt"), { target: { value: "Make it blue" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    await waitFor(() =>
      expect(m.startGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "x/editor",
          source: { id: "01SRC", relation: "reuse", output: 2 },
          inputs: [{ stored: { generationId: "01SRC", kind: "output", position: 2 } }],
        }),
      ),
    );
  });

  it("says when no model of the provider takes input images and keeps Generate blocked", async () => {
    setup([TEXT], "/?reuse=01SRC&output=1");
    expect(await screen.findByText("No OpenRouter model takes input images — switch provider.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate" })).toBeDisabled();
  });

  it("keeps the draft and says so when the original model is no longer offered", async () => {
    setup([TEXT, EDITOR], "/?rerun=01SRC");
    expect(
      await screen.findByText(
        "The original model x/seedy isn't available — choose another. The prompt, parameters and images are kept.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Prompt")).toHaveValue("A cat in a neon city");
    expect(screen.getByRole("button", { name: "Remove cat.png" })).toBeInTheDocument();
  });

  it("carries the source's parameters over to the replacement model, names what was dropped, and can generate", async () => {
    setup([EDITOR], "/?rerun=01SRC"); // x/seedy is gone; Editor takes inputs but no seed / aspect ratio, 1 image
    expect(await screen.findByText(/The original model x\/seedy isn't available/)).toBeInTheDocument();
    expect(await screen.findByText(/Not supported by this model: .*seed/)).toBeInTheDocument();
    expect(screen.getByText(/Images lowered to 1/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled());
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Generate" })));
    await waitFor(() =>
      expect(m.startGeneration).toHaveBeenCalledWith(expect.objectContaining({ model: "x/editor", params: { n: 1 } })),
    );
  });

  it("says the source no longer exists when it can't be loaded", async () => {
    setup([SEEDY], "/?rerun=01GONE", async () => {
      throw new ApiError(404, "NOT_FOUND", "Generation not found");
    });
    expect(await screen.findByText("The source generation no longer exists.")).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("shows the server's «source no longer exists» and lets the Owner drop the link", async () => {
    setup([SEEDY], "/?rerun=01SRC");
    await screen.findByText(/Re-run of/);
    await waitFor(() => expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled());
    m.startGeneration.mockImplementation(async () => {
      throw new ApiError(400, "VALIDATION_ERROR", "Some fields need fixing", {
        fields: { source: "The source generation no longer exists" },
      });
    });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Generate" })));
    expect(await screen.findByText("The source generation no longer exists.")).toBeInTheDocument();
    // its stored images can't be sent any more — they are taken off the draft and that is said
    expect(screen.queryByRole("button", { name: "Remove cat.png" })).not.toBeInTheDocument();
    expect(screen.getByText(/Images from the deleted source were removed/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove the link" }));
    expect(screen.queryByText("The source generation no longer exists.")).not.toBeInTheDocument();
    expect(screen.queryByText(/Re-run of/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Prompt")).toHaveValue("A cat in a neon city");
  });
});
