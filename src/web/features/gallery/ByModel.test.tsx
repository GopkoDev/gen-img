import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { renderWithQuery, summary } from "@/test-utils";
import type { ModelGroup } from "../../../shared/generations";
import { ByModel } from "./ByModel";

vi.mock("@/lib/api", () => ({ api: { generationModels: vi.fn() } }));
const m = vi.mocked(api);

const group = (
  model: string,
  count: number,
  provider: ModelGroup["provider"],
  first: number,
  n: number,
): ModelGroup => ({
  provider,
  model,
  count,
  latestId: summary(first).id,
  items: Array.from({ length: n }, (_, i) => summary(first - i, { provider, model })),
});

beforeEach(() => {
  vi.resetAllMocks();
  window.history.replaceState(null, "", "/gallery?view=models");
});

describe("ByModel (SCR-10)", () => {
  it("shows one labelled section per model, most recent first, with count, 'Show all N' and up to four cards", async () => {
    m.generationModels.mockResolvedValue({
      models: [group("Seedream 4", 12, "openrouter", 20, 4), group("Gemini Image", 1, "vercel", 9, 1)],
    });
    renderWithQuery(<ByModel />);
    const sections = await screen.findAllByRole("region");
    expect(m.generationModels).toHaveBeenCalledWith(4);
    expect(sections).toHaveLength(2);
    const first = within(sections[0] as HTMLElement);
    expect(first.getByRole("heading", { name: "Seedream 4" })).toBeInTheDocument();
    expect(first.getByText("OpenRouter · 12 generations")).toBeInTheDocument();
    expect(first.getAllByRole("img")).toHaveLength(4);
    const all = first.getByRole("link", { name: "Show all 12" });
    expect(all).toHaveAttribute("href", "/gallery?provider=openrouter&model=Seedream+4");
    const second = within(sections[1] as HTMLElement);
    expect(second.getByRole("heading", { name: "Gemini Image" })).toBeInTheDocument();
    expect(second.getByText("Vercel AI Gateway · 1 generation")).toBeInTheDocument();
    expect(second.getAllByRole("img")).toHaveLength(1);
  });

  it("'Show all N' opens that model's grid by pushing its address", async () => {
    m.generationModels.mockResolvedValue({ models: [group("a/b c", 3, "openrouter", 5, 3)] });
    renderWithQuery(<ByModel />);
    fireEvent.click(await screen.findByRole("link", { name: "Show all 3" }));
    expect(window.location.pathname + window.location.search).toBe("/gallery?provider=openrouter&model=a%2Fb+c");
  });

  it("opens a card as the grid does (dialog address with its state)", async () => {
    m.generationModels.mockResolvedValue({ models: [group("x", 2, "openrouter", 5, 2)] });
    renderWithQuery(<ByModel />);
    const tile = (await screen.findAllByRole("link", { name: /A test prompt number/ }))[0] as HTMLElement;
    fireEvent.click(tile);
    expect(window.location.pathname).toBe(`/generations/${summary(5).id}`);
    expect(window.history.state).toMatchObject({ dialog: "gallery" });
  });

  it("says «Loading…» while the read is in flight", () => {
    m.generationModels.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<ByModel />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("explains a failed read and retries", async () => {
    m.generationModels.mockRejectedValueOnce(new Error("boom"));
    m.generationModels.mockResolvedValue({ models: [group("x", 1, "openrouter", 5, 1)] });
    renderWithQuery(<ByModel />);
    expect(await screen.findByText("Couldn't load the models.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "x" })).toBeInTheDocument());
  });

  it("keeps the sections it has when a later refresh fails, with a stale note and Try again", async () => {
    m.generationModels.mockResolvedValueOnce({ models: [group("x", 1, "openrouter", 5, 1)] });
    const { client } = renderWithQuery(<ByModel />);
    await screen.findByRole("heading", { name: "x" });
    m.generationModels.mockRejectedValueOnce(new Error("boom"));
    m.generationModels.mockResolvedValue({ models: [group("x", 2, "openrouter", 6, 2)] });
    await act(() => client.invalidateQueries({ queryKey: ["generations", "models"] }));
    expect(await screen.findByText("These may be out of date.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "x" })).toBeInTheDocument();
    expect(screen.queryByText("Couldn't load the models.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.queryByText("These may be out of date.")).not.toBeInTheDocument());
    expect(screen.getByText("OpenRouter · 2 generations")).toBeInTheDocument();
  });

  it("names every section by its own heading when model names differ only by a space or an underscore", async () => {
    m.generationModels.mockResolvedValue({
      models: [group("a b", 1, "openrouter", 5, 1), group("a_b", 1, "openrouter", 3, 1)],
    });
    renderWithQuery(<ByModel />);
    expect(await screen.findByRole("region", { name: "a b" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "a_b" })).toBeInTheDocument();
  });

  it("with no generations at all shows the main grid's empty state", async () => {
    m.generationModels.mockResolvedValue({ models: [] });
    renderWithQuery(<ByModel />);
    expect(await screen.findByText("No generations yet.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Write a prompt" }));
    expect(window.location.pathname + window.location.search).toBe("/?focus=prompt");
  });
});
