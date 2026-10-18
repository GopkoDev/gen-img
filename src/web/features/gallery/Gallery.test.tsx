import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { renderWithQuery, summary } from "@/test-utils";
import { Gallery } from "./Gallery";

vi.mock("@/lib/api", () => ({ api: { generations: vi.fn() } }));
const generations = vi.mocked(api.generations);

describe("Gallery (SCR-02)", () => {
  beforeEach(() => {
    generations.mockReset();
  });

  it("shows an empty state that points to the generate form", async () => {
    generations.mockResolvedValue({ items: [], nextCursor: null });
    document.body.insertAdjacentHTML("beforeend", '<textarea id="prompt"></textarea>');
    renderWithQuery(<Gallery />);
    expect(await screen.findByText("No generations yet.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Write a prompt" }));
    expect(document.activeElement?.id).toBe("prompt");
    document.getElementById("prompt")?.remove();
  });

  it("shows tiles newest first with prompt, provider · model and time, and loads more on demand", async () => {
    generations.mockImplementation(async (cursor) =>
      cursor
        ? { items: [summary(1)], nextCursor: null }
        : { items: [summary(3), summary(2)], nextCursor: summary(2).id },
    );
    renderWithQuery(<Gallery />);
    const tiles = await screen.findAllByRole("link");
    expect(tiles).toHaveLength(2);
    expect(tiles[0]).toHaveAttribute("href", `/generations/${summary(3).id}`);
    expect(screen.getByText("A test prompt number 3")).toBeInTheDocument();
    expect(screen.getAllByText("openrouter · qwen/qwen-image-2.1-turbo")).toHaveLength(2);
    expect(screen.getAllByText("2 min ago")).toHaveLength(2);
    expect(screen.getAllByRole("img")[0]).toHaveAttribute("loading", "lazy");

    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByText("A test prompt number 1")).toBeInTheDocument();
    expect(generations).toHaveBeenLastCalledWith(summary(2).id);
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("hints how many input images a generation used", async () => {
    generations.mockResolvedValue({ items: [summary(2, { inputsCount: 2 }), summary(1)], nextCursor: null });
    renderWithQuery(<Gallery />);
    expect(await screen.findByText("2 inputs")).toBeInTheDocument();
    expect(screen.getAllByText(/inputs?$/)).toHaveLength(1);
  });

  it("shows a placeholder when a thumbnail can't load", async () => {
    generations.mockResolvedValue({ items: [summary(1)], nextCursor: null });
    renderWithQuery(<Gallery />);
    fireEvent.error(await screen.findByRole("img"));
    expect(screen.getByText("Image unavailable")).toBeInTheDocument();
  });

  it("explains a failed load and retries", async () => {
    generations.mockRejectedValueOnce(new Error("boom")).mockResolvedValue({ items: [summary(1)], nextCursor: null });
    renderWithQuery(<Gallery />);
    expect(await screen.findByText("Couldn't load the gallery")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("A test prompt number 1")).toBeInTheDocument();
  });
});
