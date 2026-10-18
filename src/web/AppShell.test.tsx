import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { navigate } from "@/lib/router";
import { renderWithQuery, summary } from "@/test-utils";
import type { Generation, Job } from "../shared/generations";
import type { ImageModel } from "../shared/providers";
import { App } from "./App";

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: {
    health: vi.fn(),
    providers: vi.fn(),
    models: vi.fn(),
    currentJob: vi.fn(),
    dismissJob: vi.fn(),
    deleteGeneration: vi.fn(),
    generations: vi.fn(),
    generation: vi.fn(),
    price: vi.fn(),
    costHistory: vi.fn(),
  },
}));
const m = vi.mocked(api);

const SEEDY: ImageModel = {
  id: "x/seedy",
  name: "Seedy",
  params: { seed: {}, n: { max: 4 }, inputs: { min: 0, max: 4 } },
};
const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 2, 0, 0, 0, 3,
]);
const SOURCE: Generation = {
  id: "01SRC",
  provider: "openrouter",
  model: "x/seedy",
  prompt: "A cat in a neon city",
  requestedParams: { n: 2, seed: 42 },
  acceptedParams: null,
  imagesRequested: 2,
  images: [1, 2].map((position) => ({
    position,
    url: `/api/files/generations/01SRC/output-${position}.png`,
    mediaType: "image/png" as const,
    width: 4,
    height: 3,
    byteSize: 100,
  })),
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
const job = (over: Partial<Job>): Job => ({
  id: "J1",
  status: "running",
  startedAt: new Date().toISOString(),
  ...over,
});

function at(path: string) {
  window.history.replaceState(null, "", path);
  return renderWithQuery(<App />);
}
const entry = (name: string) =>
  within(screen.getByRole("navigation", { name: "Sections" })).getByRole("link", { name: new RegExp(`^${name}`) });
const prompt = () => screen.getByLabelText("Prompt");

describe("App shell — draft, job and carried sources across sections", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    m.health.mockResolvedValue({ status: "ok" });
    m.providers.mockResolvedValue({ providers: [{ id: "openrouter", name: "OpenRouter", configured: true }] });
    m.models.mockResolvedValue({ models: [SEEDY], fetchedAt: new Date().toISOString() });
    m.price.mockResolvedValue({ price: { kind: "unknown" }, fetchedAt: new Date().toISOString() });
    m.currentJob.mockResolvedValue({ job: null });
    m.generations.mockResolvedValue({ items: [], nextCursor: null });
    m.generation.mockResolvedValue(SOURCE);
  });
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("keeps the prompt, the settings and the attached images through Gallery and back (AC-05)", async () => {
    at("/");
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Model" })).toHaveTextContent("Seedy"));
    fireEvent.change(prompt(), { target: { value: "A red fox" } });
    fireEvent.change(screen.getByLabelText("Seed"), { target: { value: "7" } });
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Choose files"), {
        target: { files: [new File([PNG], "fox.png", { type: "image/png" })] },
      });
    });
    expect(screen.getByRole("button", { name: "Remove fox.png" })).toBeVisible();

    fireEvent.click(entry("Gallery"));
    expect(
      await within(await screen.findByRole("region", { name: "Gallery" })).findByText("No generations yet."),
    ).toBeVisible();
    expect(prompt()).not.toBeVisible();

    fireEvent.click(entry("Generate"));
    expect(prompt()).toBeVisible();
    expect(prompt()).toHaveValue("A red fox");
    expect(screen.getByLabelText("Seed")).toHaveValue(7);
    expect(screen.getByRole("button", { name: "Remove fox.png" })).toBeVisible();

    // The browser's back button returns to Generate the same way.
    fireEvent.click(entry("Gallery"));
    act(() => {
      window.history.replaceState(null, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(prompt()).toHaveValue("A red fox");
  });

  it("shows a running generation on the Generate entry from the Gallery, and the saved one lands there (AC-06)", async () => {
    let current: Job | null = job({});
    m.currentJob.mockImplementation(async () => ({ job: current }));
    at("/gallery");
    await waitFor(() => expect(entry("Generate")).toHaveTextContent("generation running"));
    const listed = m.generations.mock.calls.length;

    current = job({ status: "succeeded", finishedAt: new Date().toISOString(), generationId: "01NEW" });
    await waitFor(() => expect(entry("Generate")).not.toHaveTextContent("generation running"), { timeout: 3000 });
    await waitFor(() => expect(m.generations.mock.calls.length).toBeGreaterThan(listed));
  });

  it("flags a failure waiting for dismissal on the Generate entry (AC-06)", async () => {
    m.currentJob.mockResolvedValue({
      job: job({
        status: "failed",
        finishedAt: new Date().toISOString(),
        error: { code: "PROVIDER_ERROR", message: "No credits" },
      }),
    });
    at("/gallery");
    await waitFor(() => expect(entry("Generate")).toHaveTextContent("generation failed"));
  });

  it("clears the failure flag once the Owner dismisses the notice on Generate (AC-06)", async () => {
    m.currentJob.mockResolvedValue({
      job: job({
        status: "failed",
        finishedAt: new Date().toISOString(),
        error: { code: "PROVIDER_ERROR", message: "No credits" },
      }),
    });
    m.dismissJob.mockResolvedValue(null);
    at("/gallery");
    await waitFor(() => expect(entry("Generate")).toHaveTextContent("generation failed"));
    fireEvent.click(entry("Generate"));
    await act(async () => fireEvent.click(await screen.findByRole("button", { name: "Dismiss" })));
    await waitFor(() => expect(entry("Generate")).not.toHaveTextContent("generation failed"));
  });

  it("does not reload an already visited gallery or detail page when coming back (spec §6)", async () => {
    m.generations.mockResolvedValue({ items: [summary(1)], nextCursor: null });
    at("/gallery");
    await screen.findByText("A test prompt number 1");
    const lists = m.generations.mock.calls.length;
    fireEvent.click(entry("Generate"));
    fireEvent.click(entry("Gallery"));
    await screen.findByText("A test prompt number 1");
    act(() => navigate("/generations/01SRC"));
    await screen.findByRole("button", { name: "Delete" });
    const details = m.generation.mock.calls.length;
    act(() => navigate("/gallery"));
    act(() => navigate("/generations/01SRC"));
    await screen.findByRole("button", { name: "Delete" });
    await new Promise((r) => setTimeout(r, 50));
    expect(m.generations.mock.calls.length).toBe(lists);
    expect(m.generation.mock.calls.length).toBe(details);
  });

  it("refreshes an open detail page when a generation finishes — its lineage may have changed", async () => {
    let current: Job | null = job({});
    m.currentJob.mockImplementation(async () => ({ job: current }));
    at("/generations/01SRC");
    await screen.findByRole("button", { name: "Delete" });
    const reads = () => m.generation.mock.calls.filter(([id]) => id === "01SRC").length;
    const details = reads();
    current = job({ status: "succeeded", finishedAt: new Date().toISOString(), generationId: "01NEW" });
    await waitFor(() => expect(reads()).toBeGreaterThan(details), { timeout: 3000 });
  });

  it("deletes from the detail page and lands on the Gallery section with the notice (AC-08)", async () => {
    m.deleteGeneration.mockResolvedValue(null);
    at("/generations/01SRC");
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    await act(async () => fireEvent.click(await screen.findByRole("button", { name: "Delete generation" })));
    expect(await screen.findByText("Generation deleted.")).toBeVisible();
    expect(entry("Gallery")).toHaveAttribute("aria-current", "page");
    expect(window.location.pathname + window.location.search).toBe("/gallery");
  });

  it("drops a pending prompt focus when the prompt can't take it after loading (job running)", async () => {
    let current: Job | null = job({});
    m.currentJob.mockImplementation(async () => ({ job: current }));
    at("/gallery");
    await waitFor(() => expect(entry("Generate")).toHaveTextContent("generation running"));
    act(() => navigate("/?focus=prompt"));
    await waitFor(() => expect(prompt()).toBeDisabled());
    expect(prompt()).not.toHaveFocus();
    current = job({ status: "succeeded", finishedAt: new Date().toISOString(), generationId: "01NEW" });
    await waitFor(() => expect(prompt()).toBeEnabled(), { timeout: 3000 });
    expect(prompt()).not.toHaveFocus();
  });

  it("drops a pending prompt focus when the Owner leaves Generate before it is ready", async () => {
    let ready: (v: Awaited<ReturnType<typeof api.providers>>) => void = () => {};
    m.providers.mockReturnValue(new Promise((r) => (ready = r)));
    at("/gallery");
    act(() => navigate("/?focus=prompt"));
    act(() => navigate("/gallery"));
    await act(async () => ready({ providers: [{ id: "openrouter", name: "OpenRouter", configured: true }] }));
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Model", hidden: true })).toHaveTextContent("Seedy"),
    );
    fireEvent.click(entry("Generate"));
    await new Promise((r) => setTimeout(r, 50));
    expect(prompt()).not.toHaveFocus();
  });

  it("a carried source cleans the address at once, and a slower earlier load never wins the draft", async () => {
    const OTHER: Generation = { ...SOURCE, id: "01OTHER", prompt: "A dog on the moon" };
    let first: (g: Generation) => void = () => {};
    m.generation.mockImplementation((id) =>
      id === "01SRC" ? new Promise((r) => (first = r)) : Promise.resolve(OTHER),
    );
    at("/gallery");
    act(() => navigate("/?rerun=01SRC"));
    expect(window.location.search).toBe(""); // Back never re-applies it
    act(() => navigate("/?rerun=01OTHER"));
    await waitFor(() => expect(prompt()).toHaveValue("A dog on the moon"));
    await act(async () => first(SOURCE));
    expect(prompt()).toHaveValue("A dog on the moon");
  });

  it("a carried source that loads after the Owner left Generate does not fill the draft", async () => {
    let load: (g: Generation) => void = () => {};
    m.generation.mockImplementation(() => new Promise((r) => (load = r)));
    at("/gallery");
    act(() => navigate("/?rerun=01SRC"));
    act(() => navigate("/gallery"));
    await act(async () => load(SOURCE));
    fireEvent.click(entry("Generate"));
    expect(prompt()).toHaveValue("");
  });

  it("applies a re-run carried in the address on every arrival, then cleans the address (AC-07)", async () => {
    at("/gallery");
    act(() => navigate("/?rerun=01SRC"));
    await waitFor(() => expect(prompt()).toHaveValue("A cat in a neon city"));
    expect(entry("Generate")).toHaveAttribute("aria-current", "page");
    await waitFor(() => expect(window.location.search).toBe(""));

    fireEvent.change(prompt(), { target: { value: "Changed" } });
    act(() => navigate("/gallery"));
    act(() => navigate("/?rerun=01SRC"));
    await waitFor(() => expect(prompt()).toHaveValue("A cat in a neon city"));
    expect(m.generation).toHaveBeenCalledTimes(2);
  });

  it("applies use-as-input carried in the address on arrival (AC-07)", async () => {
    at("/gallery");
    act(() => navigate("/?reuse=01SRC&output=2"));
    expect(await screen.findByRole("button", { name: "Remove output-2" })).toBeVisible();
    await waitFor(() => expect(window.location.search).toBe(""));
  });

  it("focuses the prompt when the address asks for it, then cleans the address (AC-07)", async () => {
    at("/gallery");
    act(() => navigate("/?focus=prompt")); // before the model list is in: the field is not ready yet
    await waitFor(() => expect(prompt()).toHaveFocus());
    expect(window.location.search).toBe("");
  });

  it("«Write a prompt» on the empty gallery lands on Generate with the prompt focused (AC-07)", async () => {
    at("/gallery");
    fireEvent.click(await screen.findByRole("link", { name: "Write a prompt" }));
    expect(entry("Generate")).toHaveAttribute("aria-current", "page");
    await waitFor(() => expect(prompt()).toHaveFocus());
  });

  it("the detail page's «Gallery» link returns to the Gallery section (AC-02)", async () => {
    at("/generations/01SRC");
    await screen.findByRole("button", { name: "Delete" });
    const crumbs = screen.getByRole("navigation", { name: "breadcrumb" });
    const back = within(screen.getByRole("main"))
      .getAllByRole("link", { name: /Gallery/ })
      .find((l) => !crumbs.contains(l));
    fireEvent.click(back as HTMLElement);
    expect(window.location.pathname).toBe("/gallery");
    expect(entry("Gallery")).toHaveAttribute("aria-current", "page");
  });

  it("shows the recent generations next to the form and refreshes them once when a generation finishes (AC-13, AC-14)", async () => {
    let current: Job | null = job({});
    m.currentJob.mockImplementation(async () => ({ job: current }));
    m.generations.mockResolvedValue({ items: [summary(1)], nextCursor: null });
    at("/");
    const panel = await screen.findByRole("region", { name: "Recent generations" });
    await waitFor(() => expect(within(panel).getAllByRole("link")).toHaveLength(1));
    expect(panel.closest("[class*='lg:grid-cols-']")).not.toBeNull(); // two columns from lg, stacked below
    const recent = () => m.generations.mock.calls.filter(([, limit]) => limit === 10).length;
    expect(recent()).toBe(1);
    m.generations.mockResolvedValue({ items: [summary(2), summary(1)], nextCursor: null });
    current = job({ status: "succeeded", finishedAt: new Date().toISOString(), generationId: "01NEW" });
    await waitFor(() => expect(within(panel).getAllByRole("link")).toHaveLength(2), { timeout: 3000 });
    expect(recent()).toBe(2);
  });

  it("drops a deleted generation from the recent panel (AC-14)", async () => {
    m.deleteGeneration.mockResolvedValue(null);
    m.generations.mockResolvedValue({ items: [summary(1)], nextCursor: null });
    at("/generations/01SRC");
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    m.generations.mockResolvedValue({ items: [], nextCursor: null });
    await act(async () => fireEvent.click(await screen.findByRole("button", { name: "Delete generation" })));
    await screen.findByText("Generation deleted.");
    fireEvent.click(entry("Generate"));
    const panel = screen.getByRole("region", { name: "Recent generations" });
    expect(await within(panel).findByText("No generations yet.")).toBeVisible();
  });

  it("applies nothing carried on a detail deep link (the panel is hidden there)", async () => {
    at("/generations/01SRC?rerun=01SRC");
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Model", hidden: true })).toHaveTextContent("Seedy"),
    );
    expect(prompt()).toHaveValue("");
    expect(window.location.search).toBe("?rerun=01SRC");
  });
});
