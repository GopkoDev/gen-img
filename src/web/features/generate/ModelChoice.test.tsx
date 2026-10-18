import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { renderWithQuery } from "@/test-utils";
import type { Generation } from "../../../shared/generations";
import type { ModelPreference } from "../../../shared/models";
import type { ImageModel, ProviderId } from "../../../shared/providers";
import { GeneratePanel } from "./GeneratePanel";

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: {
    providers: vi.fn(),
    models: vi.fn(),
    modelPreferences: vi.fn(),
    setModelPreference: vi.fn(),
    price: vi.fn(),
    currentJob: vi.fn(),
    startGeneration: vi.fn(),
    dismissJob: vi.fn(),
    generation: vi.fn(),
  },
}));
const m = vi.mocked(api);

const model = (id: string, name: string, inputs = false): ImageModel => ({
  id,
  name,
  params: inputs ? { inputs: { min: 0, max: 2 } } : {},
});
const A = model("x/a", "Alpha");
const B = model("x/b", "Bravo");
const C = model("x/c", "Charlie");
const B_IN = model("x/b", "Bravo", true);
const C_IN = model("x/c", "Charlie", true);
const V1 = model("v/one", "Vone");
const V2 = model("v/two", "Vtwo");
const V3 = model("v/three", "Vthree");

const pref = (provider: ProviderId, id: string, over: Partial<ModelPreference>): ModelPreference => ({
  provider,
  model: id,
  favorite: false,
  hidden: false,
  updatedAt: "2026-10-19T10:00:00.000Z",
  ...over,
});

const SOURCE: Generation = {
  id: "01SRC",
  provider: "openrouter",
  model: "x/gone",
  prompt: "A cat in a neon city",
  requestedParams: { n: 1 },
  acceptedParams: null,
  imagesRequested: 1,
  images: [{ position: 1, url: "/o1.png", mediaType: "image/png", width: 4, height: 3, byteSize: 100 }],
  inputs: [],
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

function setup(opts: {
  models: Partial<Record<ProviderId, ImageModel[]>>;
  prefs?: Partial<Record<ProviderId, ModelPreference[]>>;
  address?: string;
  source?: Partial<Generation>;
}) {
  window.history.replaceState(null, "", opts.address ?? "/");
  m.providers.mockResolvedValue({
    providers: [
      { id: "openrouter", name: "OpenRouter", configured: true },
      { id: "vercel", name: "Vercel AI Gateway", configured: true },
    ],
  });
  m.models.mockImplementation(async (p) => ({
    models: opts.models[p as ProviderId] ?? [],
    fetchedAt: new Date().toISOString(),
  }));
  m.modelPreferences.mockImplementation(async (p) => ({ preferences: opts.prefs?.[p as ProviderId] ?? [] }));
  m.price.mockResolvedValue({ price: { kind: "unknown" }, fetchedAt: "x" });
  m.currentJob.mockResolvedValue({ job: null });
  m.generation.mockResolvedValue({ ...SOURCE, ...opts.source });
  renderWithQuery(<GeneratePanel />);
}

/** The closed model picker: a button (not a combobox) that reports aria-expanded. */
const trigger = () => screen.findByRole("button", { expanded: false });
async function expectSelected(name: string) {
  await waitFor(() => expect(screen.getByRole("button", { expanded: false })).toHaveTextContent(name), {
    timeout: 5000,
  });
}

describe("GeneratePanel — automatic model choice goes through pickModel (AC-10, AC-11)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    sessionStorage.clear();
  });
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("uses the model picker (a button with aria-expanded), not a combobox select", async () => {
    setup({ models: { openrouter: [A, B] } });
    expect(await trigger()).toHaveTextContent("Alpha");
    expect(screen.queryByRole("combobox", { name: "Model" })).not.toBeInTheDocument();
  });

  it("preselects the first favorite on first load", async () => {
    setup({
      models: { openrouter: [A, B, C] },
      prefs: { openrouter: [pref("openrouter", "x/c", { favorite: true })] },
    });
    await expectSelected("Charlie");
  });

  it("never preselects a hidden model on first load", async () => {
    setup({ models: { openrouter: [A, B, C] }, prefs: { openrouter: [pref("openrouter", "x/a", { hidden: true })] } });
    await expectSelected("Bravo");
  });

  it("after a provider switch preselects that provider's first favorite", async () => {
    setup({
      models: { openrouter: [A, B], vercel: [V1, V2, V3] },
      prefs: { vercel: [pref("vercel", "v/three", { favorite: true })] },
    });
    await expectSelected("Alpha");
    fireEvent.pointerDown(screen.getByRole("combobox", { name: "Provider" }), {
      button: 0,
      ctrlKey: false,
      pointerType: "mouse",
    });
    fireEvent.click(await screen.findByRole("option", { name: /Vercel/ }));
    await expectSelected("Vthree");
  });

  it("after a provider switch without favorites preselects the first visible model, never a hidden one", async () => {
    setup({
      models: { openrouter: [A, B], vercel: [V1, V2, V3] },
      prefs: { vercel: [pref("vercel", "v/one", { hidden: true })] },
    });
    await expectSelected("Alpha");
    fireEvent.pointerDown(screen.getByRole("combobox", { name: "Provider" }), {
      button: 0,
      ctrlKey: false,
      pointerType: "mouse",
    });
    fireEvent.click(await screen.findByRole("option", { name: /Vercel/ }));
    await expectSelected("Vtwo");
  });

  it("falls back to the first visible favorite when a re-run's model isn't offered", async () => {
    setup({
      models: { openrouter: [A, B, C] },
      prefs: {
        openrouter: [pref("openrouter", "x/a", { hidden: true }), pref("openrouter", "x/c", { favorite: true })],
      },
      address: "/?rerun=01SRC",
    });
    expect(await screen.findByText(/The original model x\/gone isn't available/)).toBeInTheDocument();
    await expectSelected("Charlie");
  });

  it("falls back to the first visible model (not a hidden one) when a re-run's model isn't offered and there are no favorites", async () => {
    setup({
      models: { openrouter: [A, B, C] },
      prefs: { openrouter: [pref("openrouter", "x/a", { hidden: true })] },
      address: "/?rerun=01SRC",
    });
    expect(await screen.findByText(/The original model x\/gone isn't available/)).toBeInTheDocument();
    await expectSelected("Bravo");
  });

  it("reuse needing inputs picks the first visible model that takes inputs", async () => {
    setup({
      models: { openrouter: [A, B_IN, C_IN] },
      prefs: { openrouter: [pref("openrouter", "x/b", { hidden: true })] },
      address: "/?reuse=01SRC&output=1",
    });
    expect(await screen.findByText("Switched to Charlie — it takes input images.")).toBeInTheDocument();
    await expectSelected("Charlie");
  });

  it("reuse prefers a favorite among the models that take inputs", async () => {
    setup({
      models: { openrouter: [A, B_IN, C_IN] },
      prefs: { openrouter: [pref("openrouter", "x/c", { favorite: true })] },
      address: "/?reuse=01SRC&output=1",
    });
    expect(await screen.findByText("Switched to Charlie — it takes input images.")).toBeInTheDocument();
  });

  it("reuse with only hidden models taking inputs selects nothing and says which model is needed", async () => {
    setup({
      models: { openrouter: [A, B_IN, C] },
      prefs: { openrouter: [pref("openrouter", "x/b", { hidden: true })] },
      address: "/?reuse=01SRC&output=1",
    });
    expect(await screen.findByText("No OpenRouter model takes input images — switch provider.")).toBeInTheDocument();
    await expectSelected("Choose a model");
    expect(screen.queryByRole("button", { expanded: false, name: /Bravo/ })).not.toBeInTheDocument();
  });

  it("keeps a re-run's hidden model selected and marks it «hidden» on the closed trigger", async () => {
    setup({
      models: { openrouter: [A, B, C] },
      prefs: { openrouter: [pref("openrouter", "x/b", { hidden: true })] },
      address: "/?rerun=01SRC",
      source: { model: "x/b" },
    });
    await expectSelected("Bravo");
    expect(await trigger()).toHaveTextContent("hidden");
    expect(screen.queryByText(/isn't available/)).not.toBeInTheDocument();
  });

  it("★ in the panel's picker changes the favorite but not the selected model", async () => {
    m.setModelPreference.mockResolvedValue(pref("openrouter", "x/c", { favorite: true }));
    setup({ models: { openrouter: [A, B, C] } });
    await expectSelected("Alpha");
    fireEvent.click(await trigger());
    fireEvent.click(await screen.findByRole("button", { name: "Favorite Charlie" }));
    await waitFor(() => expect(m.setModelPreference).toHaveBeenCalled());
    expect(m.setModelPreference).toHaveBeenCalledWith({ provider: "openrouter", model: "x/c", favorite: true });
    // still open; the closed-trigger text is unchanged once closed
    fireEvent.keyDown(screen.getByRole("button", { name: "Favorite Alpha" }), { key: "Escape" });
    await expectSelected("Alpha");
  });
});
