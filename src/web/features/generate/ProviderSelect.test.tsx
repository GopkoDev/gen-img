import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { renderWithQuery } from "@/test-utils";
import type { Job } from "../../../shared/generations";
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

const QWEN: ImageModel = {
  id: "qwen/qwen-image",
  name: "Qwen Image",
  params: { aspectRatio: { values: ["1:1"] }, n: { max: 4 }, seed: {} },
};
const FLUX: ImageModel = { id: "bfl/flux-2-pro", name: "FLUX.2 [pro]", params: { n: { max: 4 } } };
const GEMINI: ImageModel = {
  id: "google/gemini-3.1-flash-image",
  name: "Gemini Image",
  params: { inputs: { min: 0, max: 8 } },
};

function providers(openrouter: boolean, vercel: boolean) {
  m.providers.mockResolvedValue({
    providers: [
      { id: "openrouter", name: "OpenRouter", configured: openrouter },
      { id: "vercel", name: "Vercel AI Gateway", configured: vercel },
    ],
  });
  m.modelPreferences.mockResolvedValue({ preferences: [] });
  m.models.mockImplementation(async (id) => ({
    models: id === "vercel" ? [FLUX, GEMINI] : [QWEN],
    fetchedAt: new Date().toISOString(),
  }));
}

async function pick(label: string, name: RegExp) {
  if (label === "Model") {
    fireEvent.click(await screen.findByRole("button", { name: "Model" }));
    fireEvent.click(await screen.findByRole("button", { name }));
    return;
  }
  fireEvent.pointerDown(await screen.findByRole("combobox", { name: label }), {
    button: 0,
    ctrlKey: false,
    pointerType: "mouse",
  });
  fireEvent.click(await screen.findByRole("option", { name }));
}

describe("GeneratePanel — provider selector (SCR-01)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    m.currentJob.mockResolvedValue({ job: null });
    try {
      sessionStorage.clear();
    } catch {}
  });

  it("preselects the first configured provider and loads its models", async () => {
    providers(false, true);
    renderWithQuery(<GeneratePanel />);
    expect(await screen.findByRole("combobox", { name: "Provider" })).toHaveTextContent("Vercel AI Gateway");
    expect(await screen.findByRole("button", { name: "Model" })).toHaveTextContent("FLUX.2 [pro]");
    expect(m.models).toHaveBeenCalledWith("vercel");
  });

  it("switches the model list and offers no seed or aspect ratio for Vercel models", async () => {
    providers(true, true);
    m.startGeneration.mockResolvedValue({ job: { id: "J", status: "running", startedAt: new Date().toISOString() } });
    renderWithQuery(<GeneratePanel />);
    expect(await screen.findByLabelText("Seed")).toBeInTheDocument(); // OpenRouter model first
    await pick("Provider", /Vercel AI Gateway/);
    await waitFor(() => expect(screen.getByRole("button", { name: "Model" })).toHaveTextContent("FLUX.2 [pro]"));
    expect(screen.queryByLabelText("Seed")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Aspect ratio" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Images")).toHaveAttribute("max", "4");

    await pick("Model", /^Gemini Image/);
    expect(screen.getByLabelText("Images")).toHaveAttribute("max", "1");
    fireEvent.change(screen.getByLabelText("Prompt"), { target: { value: "A red square" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    await waitFor(() =>
      expect(m.startGeneration.mock.calls[0]?.[0]).toEqual({
        provider: "vercel",
        model: "google/gemini-3.1-flash-image",
        prompt: "A red square",
        params: { n: 1 },
      }),
    );
  });

  it("explains how to configure Vercel while OpenRouter stays usable", async () => {
    providers(true, false);
    renderWithQuery(<GeneratePanel />);
    await pick("Provider", /Vercel AI Gateway/);
    expect(await screen.findByText("Vercel AI Gateway is not configured.")).toBeInTheDocument();
    expect(screen.getByText("AI_GATEWAY_API_KEY")).toBeInTheDocument();
    expect(screen.queryByLabelText("Prompt")).not.toBeInTheDocument();
    await pick("Provider", /^OpenRouter/);
    expect(await screen.findByLabelText("Prompt")).toBeInTheDocument();
  });

  it("locks the provider while any generation runs", async () => {
    providers(true, true);
    const running: Job = { id: "J", status: "running", startedAt: new Date().toISOString() };
    m.currentJob.mockResolvedValue({ job: running });
    renderWithQuery(<GeneratePanel />);
    await screen.findByRole("button", { name: /Generating/ });
    expect(screen.getByRole("combobox", { name: "Provider" })).toBeDisabled();
  });
});
