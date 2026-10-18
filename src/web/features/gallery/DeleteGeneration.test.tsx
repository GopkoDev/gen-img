import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "@/lib/api";
import { renderWithQuery, summary } from "@/test-utils";
import type { Generation } from "../../../shared/generations";
import { Gallery } from "./Gallery";
import { GenerationDetail } from "./GenerationDetail";

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: {
    generation: vi.fn(),
    deleteGeneration: vi.fn(),
    generations: vi.fn(),
    setComment: vi.fn(),
    addTag: vi.fn(),
    removeTag: vi.fn(),
  },
}));
const m = vi.mocked(api);

const gen = (): Generation => ({
  id: "01X",
  provider: "openrouter",
  model: "m",
  prompt: `A cat in a neon city, cinematic lighting, ${"very ".repeat(30)}detailed`,
  requestedParams: { n: 1 },
  acceptedParams: null,
  imagesRequested: 1,
  images: [
    {
      position: 1,
      url: "/api/files/generations/01X/output-1.png",
      mediaType: "image/png",
      width: 4,
      height: 3,
      byteSize: 9,
    },
  ],
  inputs: [],
  costMicros: 1,
  costStatus: "known",
  createdAt: "2026-10-18T14:02:11.000Z",
  durationMs: 1,
  rawRequest: {},
  rawResponse: {},
  tags: [],
  comment: null,
  source: null,
  derived: { items: [], total: 0 },
});

describe("Delete a generation (SCR-03)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    m.generation.mockResolvedValue(gen());
  });
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("asks for confirmation naming the prompt, and cancelling sends nothing", async () => {
    renderWithQuery(<GenerationDetail id="01X" />);
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog", { name: "Delete this generation?" });
    expect(dialog).toHaveTextContent("A cat in a neon city, cinematic lighting");
    expect(dialog).toHaveTextContent(
      "Its images and input copies will be removed from this machine. This can't be undone.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(m.deleteGeneration).not.toHaveBeenCalled();
  });

  it("deletes on confirm and lands on the gallery with a notice", async () => {
    m.deleteGeneration.mockResolvedValue(null);
    window.history.replaceState(null, "", "/generations/01X");
    renderWithQuery(<GenerationDetail id="01X" />);
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    await act(async () => fireEvent.click(await screen.findByRole("button", { name: "Delete generation" })));
    await waitFor(() => expect(window.location.pathname).toBe("/"));
    expect(m.deleteGeneration).toHaveBeenCalledWith("01X");
    expect(window.location.search).toBe("?deleted=1");
  });

  it("keeps the generation and explains when the deletion failed", async () => {
    m.deleteGeneration.mockImplementation(async () => {
      throw new ApiError(500, "STORAGE_ERROR", "The generation could not be deleted: EACCES");
    });
    renderWithQuery(<GenerationDetail id="01X" />);
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    await act(async () => fireEvent.click(await screen.findByRole("button", { name: "Delete generation" })));
    expect(await screen.findByText("Couldn't delete this generation")).toBeInTheDocument();
    expect(screen.getByText("The generation could not be deleted: EACCES")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says it no longer exists when it was deleted elsewhere", async () => {
    m.deleteGeneration.mockImplementation(async () => {
      throw new ApiError(404, "NOT_FOUND", "Generation not found");
    });
    renderWithQuery(<GenerationDetail id="01X" />);
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    m.generation.mockImplementation(async () => {
      throw new ApiError(404, "NOT_FOUND", "Generation not found");
    });
    await act(async () => fireEvent.click(await screen.findByRole("button", { name: "Delete generation" })));
    expect(await screen.findByText("This generation no longer exists.")).toBeInTheDocument();
  });

  it("the gallery shows a one-off «deleted» notice and cleans the address", async () => {
    m.generations.mockResolvedValue({ items: [summary(1)], nextCursor: null });
    window.history.replaceState(null, "", "/?deleted=1");
    renderWithQuery(<Gallery />);
    expect(await screen.findByText("Generation deleted.")).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });
});
