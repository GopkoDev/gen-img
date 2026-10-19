import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { renderWithQuery } from "@/test-utils";
import type { Generation } from "../../../shared/generations";
import { GenerationDetail } from "./GenerationDetail";

vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: { generation: vi.fn() } }));
const generation = vi.mocked(api.generation);

const img = (position: number, byteSize = 100, mediaType: "image/png" | "image/webp" = "image/png") => ({
  position,
  url: `/api/files/generations/01X/output-${position}.png`,
  mediaType,
  width: 4,
  height: 3,
  byteSize,
});
const gen = (over: Partial<Generation> = {}): Generation => ({
  id: "01X",
  provider: "openrouter",
  model: "m",
  prompt: "A cat in a neon city",
  requestedParams: { n: 2 },
  acceptedParams: null,
  imagesRequested: 2,
  images: [img(1), img(2, 11 * 1024 * 1024)],
  inputs: [],
  costMicros: 1,
  costStatus: "known",
  createdAt: "2026-10-18T12:00:00.000Z",
  durationMs: 1,
  rawRequest: {},
  rawResponse: {},
  tags: [],
  comment: null,
  source: null,
  derived: { items: [], total: 0 },
  ...over,
});

describe("GenerationDetail — re-run, reuse and lineage (SCR-03)", () => {
  beforeEach(() => {
    generation.mockReset();
  });
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("offers Re-run and Use as input per output, and refuses an output that can't be an input in place", async () => {
    generation.mockResolvedValue(gen());
    renderWithQuery(<GenerationDetail id="01X" />);
    expect(await screen.findByRole("link", { name: /Re-run/ })).toHaveAttribute("href", "/?rerun=01X");
    const uses = screen.getAllByRole("button", { name: /Use as input/ });
    expect(uses).toHaveLength(2);
    fireEvent.click(uses[0] as HTMLElement);
    expect(window.location.pathname + window.location.search).toBe("/?reuse=01X&output=1");

    window.history.replaceState(null, "", "/generations/01X");
    fireEvent.click(uses[1] as HTMLElement);
    expect(screen.getByText("Can't be used as an input: larger than 10 MB")).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("hides the lineage card when there is neither a source nor anything derived", async () => {
    generation.mockResolvedValue(gen());
    renderWithQuery(<GenerationDetail id="01X" />);
    await screen.findAllByRole("button", { name: /Use as input/ });
    expect(screen.queryByText("Lineage")).not.toBeInTheDocument();
  });

  it("links to the source, or says it was deleted", async () => {
    generation.mockResolvedValue(
      gen({ source: { id: "01SRC", relation: "reuse", output: 2, exists: true, prompt: "A dog on the moon" } }),
    );
    const { unmount } = renderWithQuery(<GenerationDetail id="01X" />);
    expect(await screen.findByRole("link", { name: "Made from output 2 of «A dog on the moon»" })).toHaveAttribute(
      "href",
      "/generations/01SRC",
    );
    unmount();
    generation.mockResolvedValue(
      gen({ source: { id: "01SRC", relation: "rerun", output: null, exists: false, prompt: null } }),
    );
    renderWithQuery(<GenerationDetail id="01Y" />);
    expect(await screen.findByText("Re-run of a generation — source deleted")).toBeInTheDocument();
  });

  it("lists derived generations newest first and says how many more there are", async () => {
    const items = [
      {
        id: "01D2",
        relation: "reuse" as const,
        output: 1,
        createdAt: new Date().toISOString(),
        prompt: "Make it blue",
      },
      {
        id: "01D1",
        relation: "rerun" as const,
        output: null,
        createdAt: new Date().toISOString(),
        prompt: "A cat in a neon city",
      },
    ];
    generation.mockResolvedValue(gen({ derived: { items, total: 53 } }));
    renderWithQuery(<GenerationDetail id="01X" />);
    const links = await screen.findAllByRole("link", { name: /«/ });
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/generations/01D2", "/generations/01D1"]);
    expect(screen.getByText("Output 1 reused")).toBeInTheDocument();
    expect(screen.getByText("Re-run", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("and 51 more")).toBeInTheDocument();
  });

  it("a lineage link pushes a history entry on the full page", async () => {
    generation.mockResolvedValue(
      gen({ source: { id: "01SRC", relation: "rerun", output: null, exists: true, prompt: "A dog" } }),
    );
    renderWithQuery(<GenerationDetail id="01X" />);
    const len = window.history.length;
    fireEvent.click(await screen.findByRole("link", { name: /Re-run of/ }));
    expect(window.location.pathname).toBe("/generations/01SRC");
    expect(window.history.length).toBe(len + 1);
  });
});
