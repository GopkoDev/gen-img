import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "@/lib/api";
import { renderWithQuery } from "@/test-utils";
import type { Generation } from "../../../shared/generations";
import { GenerationDetail } from "./GenerationDetail";

vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: { generation: vi.fn() } }));
const generation = vi.mocked(api.generation);

const img = (position: number, width: number, height: number) => ({
  position,
  url: `/api/files/generations/01X/output-${position}.png`,
  mediaType: "image/png" as const,
  width,
  height,
  byteSize: 100,
});

const gen = (over: Partial<Generation> = {}): Generation => ({
  id: "01X",
  provider: "openrouter",
  model: "bytedance-seed/seedream-4.5",
  prompt: "A cat in a neon city",
  requestedParams: { n: 4, aspectRatio: "16:9", seed: 42 },
  acceptedParams: null,
  imagesRequested: 4,
  images: [img(1, 1024, 576), img(2, 1024, 576)],
  inputs: [],
  costMicros: 40000,
  costStatus: "known",
  createdAt: "2026-10-18T14:02:11.000Z",
  durationMs: 23_400,
  rawRequest: { method: "POST", url: "https://openrouter.ai/api/v1/images", body: { prompt: "A cat in a neon city" } },
  rawResponse: { data: [{ b64_json: { $file: "generations/01X/output-1.png" } }] },
  tags: [],
  comment: null,
  ...over,
});

const row = (label: string) => screen.getByText(label, { selector: "dt" }).nextElementSibling as HTMLElement;

describe("GenerationDetail (SCR-03)", () => {
  beforeEach(() => {
    generation.mockReset();
  });

  it("shows the images and every piece of metadata", async () => {
    generation.mockResolvedValue(gen());
    renderWithQuery(<GenerationDetail id="01X" />);
    expect(await screen.findAllByRole("img")).toHaveLength(2);
    expect(row("Provider")).toHaveTextContent("OpenRouter");
    expect(row("Model")).toHaveTextContent("bytedance-seed/seedream-4.5");
    expect(row("Prompt")).toHaveTextContent("A cat in a neon city");
    expect(row("Created")).toHaveTextContent("2026-10-18 14:02 UTC");
    expect(row("Duration")).toHaveTextContent("23.4 s");
    expect(row("Cost")).toHaveTextContent("$0.04");
    expect(within(row("Cost")).getByText("known")).toBeInTheDocument();
    expect(row("Requested")).toHaveTextContent("aspect ratio 16:9 · seed 42 · 4 images");
    expect(row("Received")).toHaveTextContent("2 of 4 images · 1024×576, 1024×576");
    expect(row("Accepted")).toHaveTextContent("not reported");
    expect(screen.getByText("Raw exchange (redacted)")).toBeInTheDocument();
    expect(screen.getByText(/"\$file": "generations\/01X\/output-1.png"/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Gallery/ })).toHaveAttribute("href", "/");
  });

  it("shows the input images in attach order with their names", async () => {
    const input = (position: number, originalName: string | null) => ({
      position,
      url: `/api/files/generations/01X/input-${position}.png`,
      mediaType: "image/png" as const,
      width: 640,
      height: 480,
      byteSize: 10,
      originalName,
    });
    generation.mockResolvedValue(gen({ inputs: [input(1, "cat.png"), input(2, null)] }));
    renderWithQuery(<GenerationDetail id="01X" />);
    const section = await screen.findByRole("region", { name: "Inputs" });
    const imgs = within(section).getAllByRole("img");
    expect(imgs.map((i) => i.getAttribute("src"))).toEqual([
      "/api/files/generations/01X/input-1.png",
      "/api/files/generations/01X/input-2.png",
    ]);
    expect(within(section).getByText("cat.png · 640×480")).toBeInTheDocument();
    expect(within(section).getByText("input 2 · 640×480")).toBeInTheDocument();
  });

  it("has no inputs section for a text-only generation", async () => {
    generation.mockResolvedValue(gen());
    renderWithQuery(<GenerationDetail id="01X" />);
    await screen.findAllByRole("img");
    expect(screen.queryByRole("region", { name: "Inputs" })).not.toBeInTheDocument();
  });

  it("never shows an unknown cost as zero", async () => {
    generation.mockResolvedValue(gen({ costMicros: null, costStatus: "unavailable" }));
    renderWithQuery(<GenerationDetail id="01X" />);
    await screen.findAllByRole("img");
    expect(row("Cost")).not.toHaveTextContent("$");
    expect(within(row("Cost")).getAllByText("unavailable").length).toBeGreaterThan(0);
  });

  it("says when a generation does not exist", async () => {
    generation.mockImplementation(async () => {
      throw new ApiError(404, "NOT_FOUND", "Generation not found");
    });
    renderWithQuery(<GenerationDetail id="NOPE" />);
    expect(await screen.findByText("This generation no longer exists.")).toBeInTheDocument();
  });
});
