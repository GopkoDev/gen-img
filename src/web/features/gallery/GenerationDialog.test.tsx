import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "@/lib/api";
import { dialogState, isDialogVisit, navigate, replace, useRoute } from "@/lib/router";
import { summary } from "@/test-utils";
import { intersect } from "../../../../tests/helpers/intersection";
import type { Generation, GenerationPage } from "../../../shared/generations";
import { Gallery, resetGalleryScroll } from "./Gallery";
import { GenerationDialog } from "./GenerationDialog";

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: {
    generations: vi.fn(),
    generation: vi.fn(),
    setComment: vi.fn(),
    addTag: vi.fn(),
    removeTag: vi.fn(),
    deleteGeneration: vi.fn(),
  },
}));
const generations = vi.mocked(api.generations);
const generation = vi.mocked(api.generation);

const idOf = (i: number) => summary(i).id;
const gen = (i: number, over: Partial<Generation> = {}): Generation => ({
  id: idOf(i),
  provider: "openrouter",
  model: "bytedance-seed/seedream-4.5",
  prompt: `Detail prompt ${i}`,
  requestedParams: { n: 2 },
  acceptedParams: null,
  imagesRequested: 2,
  images: [1, 2].map((position) => ({
    position,
    url: `/api/files/generations/${idOf(i)}/output-${position}.png`,
    mediaType: "image/png" as const,
    width: 4,
    height: 3,
    byteSize: 100,
  })),
  inputs: [],
  costMicros: 40000,
  costStatus: "known",
  createdAt: "2026-10-18T14:02:11.000Z",
  durationMs: 23_400,
  rawRequest: {},
  rawResponse: {},
  tags: [],
  comment: null,
  source: null,
  derived: { items: [], total: 0 },
  ...over,
});

const PAGE = 2;
/** Cursor-paged list over ids `n`..1 (newest first). */
function serve(n: number) {
  generations.mockImplementation(async (cursor) => {
    const all = Array.from({ length: n }, (_, i) => summary(n - i));
    const rest = cursor ? all.filter((g) => g.id < cursor) : all;
    const items = rest.slice(0, PAGE);
    return { items, nextCursor: rest.length > PAGE ? (items[PAGE - 1]?.id ?? null) : null } satisfies GenerationPage;
  });
}

/** What App renders: the grid at a fixed place and, on a dialog visit, the dialog over it. */
function Harness({ busy }: { busy?: boolean }) {
  const route = useRoute();
  return (
    <>
      <Gallery />
      {route.name === "detail" && isDialogVisit(route) && <GenerationDialog id={route.id} busy={busy} />}
    </>
  );
}
const renderApp = (props: { busy?: boolean } = {}) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <Harness {...props} />
      </QueryClientProvider>,
    ),
  };
};
const here = () => window.location.pathname;
const dialog = () => screen.findByRole("dialog");
const newer = () => screen.getByRole("button", { name: /^Newer/ });
const older = () => screen.getByRole("button", { name: /^Older/ });
const openCard = async (i: number) => {
  fireEvent.click(await screen.findByText(`A test prompt number ${i}`));
  return dialog();
};
const setScrollY = (y: number) => Object.defineProperty(window, "scrollY", { value: y, configurable: true });

beforeEach(() => {
  generations.mockReset();
  generation.mockReset();
  generation.mockImplementation(async (id) => gen(Number(id.slice(3))));
  setScrollY(0);
  window.scrollTo = vi.fn();
  replace("/gallery", null);
});
afterEach(() => {
  resetGalleryScroll();
  vi.restoreAllMocks();
});

describe("opening (AC-01)", () => {
  it("a card opens the dialog over the grid and the address becomes the generation's own", async () => {
    serve(3);
    renderApp();
    const d = await openCard(3);
    expect(here()).toBe(`/generations/${idOf(3)}`);
    expect(window.history.state).toMatchObject({ dialog: "gallery" });
    expect(await within(d).findByText("Detail prompt 3")).toBeInTheDocument();
    expect(screen.getByText("A test prompt number 2")).toBeInTheDocument(); // the grid stays under it
    expect(within(d).getByRole("heading", { name: "A test prompt number 3" })).toBeInTheDocument(); // title = prompt excerpt
  });

  it("shows the images left and the metadata right, with output choices", async () => {
    serve(3);
    renderApp();
    const d = await openCard(3);
    await within(d).findByText("Provider");
    expect(within(d).getByText("OpenRouter")).toBeInTheDocument();
    expect(within(d).getByRole("button", { name: "Show output 2" })).toBeInTheDocument();
    expect(d.className).toMatch(/sm:max-w-6xl/);
    expect(d.className).toMatch(/h-\[90vh\]/);
    expect(d.querySelector('[class*="lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"]')).not.toBeNull();
    // the large image is the first output; picking another makes it large
    const large = () => within(d).getByAltText(/^Output \d+ of:/);
    expect(large()).toHaveAttribute("src", expect.stringContaining("output-1.png"));
    fireEvent.click(within(d).getByRole("button", { name: "Show output 2" }));
    expect(large()).toHaveAttribute("src", expect.stringContaining("output-2.png"));
  });
});

describe("stepping (AC-02, AC-09)", () => {
  it("has no Newer on the newest and steps with the buttons, replacing the address", async () => {
    serve(3);
    renderApp();
    const d = await openCard(3);
    await within(d).findByText("Detail prompt 3");
    expect(newer()).toHaveAttribute("aria-disabled", "true");
    fireEvent.focus(newer());
    expect((await screen.findAllByText("No newer generation")).length).toBeGreaterThan(0);
    const len = window.history.length;
    fireEvent.click(older());
    expect(await within(d).findByText("Detail prompt 2")).toBeInTheDocument();
    expect(here()).toBe(`/generations/${idOf(2)}`);
    expect(window.history.length).toBe(len);
    expect(window.history.state).toMatchObject({ dialog: "gallery" });
    fireEvent.click(newer());
    expect(await within(d).findByText("Detail prompt 3")).toBeInTheDocument();
  });

  it("steps with → (older) and ← (newer)", async () => {
    serve(3);
    renderApp();
    const d = await openCard(3);
    await within(d).findByText("Detail prompt 3");
    fireEvent.keyDown(d, { key: "ArrowRight" });
    expect(await within(d).findByText("Detail prompt 2")).toBeInTheDocument();
    fireEvent.keyDown(d, { key: "ArrowLeft" });
    expect(await within(d).findByText("Detail prompt 3")).toBeInTheDocument();
  });

  it("ignores the arrows while a text field has focus", async () => {
    serve(3);
    renderApp();
    const d = await openCard(3);
    const tag = await within(d).findByPlaceholderText("Add a tag…");
    fireEvent.keyDown(tag, { key: "ArrowRight", bubbles: true });
    expect(here()).toBe(`/generations/${idOf(3)}`);
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    d.appendChild(editable);
    fireEvent.keyDown(editable, { key: "ArrowRight" });
    expect(here()).toBe(`/generations/${idOf(3)}`);
  });

  it("is unavailable while busy: both buttons disabled with a tooltip, keys ignored", async () => {
    serve(3);
    renderApp({ busy: true });
    const d = await openCard(2);
    await within(d).findByText("Detail prompt 2");
    expect(older()).toBeDisabled();
    expect(newer()).toBeDisabled();
    fireEvent.keyDown(d, { key: "ArrowRight" });
    fireEvent.keyDown(d, { key: "ArrowLeft" });
    expect(here()).toBe(`/generations/${idOf(2)}`);
  });

  it("hides Newer/Older and says so for a generation outside the loaded order", async () => {
    serve(3);
    renderApp();
    await screen.findByText("A test prompt number 3");
    act(() => navigate(`/generations/${idOf(9)}`, dialogState()));
    const d = await dialog();
    expect(await within(d).findByText("Not in the gallery's current order")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Older/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Newer/ })).not.toBeInTheDocument();
  });
});

describe("stepping past the last loaded generation (AC-03)", () => {
  it("loads the grid's next page once and shows its first generation", async () => {
    serve(3); // pages: [3,2] [1]
    renderApp();
    const d = await openCard(2);
    await within(d).findByText("Detail prompt 2");
    fireEvent.click(older());
    expect(older()).toHaveAttribute("aria-disabled", "true");
    expect(await within(d).findByText("Detail prompt 1")).toBeInTheDocument();
    expect(generations).toHaveBeenCalledTimes(2);
    expect(here()).toBe(`/generations/${idOf(1)}`);
    expect(older()).toHaveAttribute("aria-disabled", "true"); // the oldest: no more pages
  });

  it("stays and says so when the page fails, and Try again finishes the step", async () => {
    serve(3);
    renderApp();
    const d = await openCard(2);
    await within(d).findByText("Detail prompt 2");
    generations.mockRejectedValueOnce(new ApiError(500, "UPSTREAM", "boom"));
    fireEvent.click(older());
    expect(await within(d).findByText("Couldn't load the next one.")).toBeInTheDocument();
    expect(here()).toBe(`/generations/${idOf(2)}`);
    expect(within(d).getByText("Detail prompt 2")).toBeInTheDocument();
    serve(3);
    fireEvent.click(within(d).getByRole("button", { name: "Try again" }));
    expect(await within(d).findByText("Detail prompt 1")).toBeInTheDocument();
    expect(within(d).queryByText("Couldn't load the next one.")).not.toBeInTheDocument();
  });

  it("keeps the grid's sentinel paused while the dialog is open", async () => {
    serve(5);
    renderApp();
    const sentinel = await screen.findByTestId("gallery-sentinel");
    const d = await openCard(5);
    await within(d).findByText("Detail prompt 5");
    intersect(sentinel);
    await act(async () => {});
    expect(generations).toHaveBeenCalledTimes(1);
  });
});

describe("states inside the dialog (AC-10)", () => {
  it("shows Loading… while the detail is read", async () => {
    serve(3);
    generation.mockImplementation(() => new Promise(() => {}));
    renderApp();
    const d = await openCard(3);
    expect(within(d).getByText("Loading…")).toBeInTheDocument();
  });

  it("says it couldn't load, offers Try again, and stepping still works", async () => {
    serve(3);
    generation.mockRejectedValueOnce(new ApiError(500, "X", "boom"));
    renderApp();
    const d = await openCard(3);
    expect(await within(d).findByText("Couldn't load this generation")).toBeInTheDocument();
    fireEvent.click(within(d).getByRole("button", { name: "Try again" }));
    expect(await within(d).findByText("Detail prompt 3")).toBeInTheDocument();
  });

  it("says the generation no longer exists, and stepping still works", async () => {
    serve(3);
    generation.mockRejectedValueOnce(new ApiError(404, "NOT_FOUND", "gone"));
    renderApp();
    const d = await openCard(3);
    expect(await within(d).findByText("This generation no longer exists.")).toBeInTheDocument();
    fireEvent.keyDown(d, { key: "ArrowRight" });
    expect(await within(d).findByText("Detail prompt 2")).toBeInTheDocument();
  });
});

describe("closing (AC-04)", () => {
  it("Esc and the close button go back once each", async () => {
    serve(3);
    renderApp();
    const back = vi.spyOn(window.history, "back");
    let d = await openCard(3);
    fireEvent.keyDown(d, { key: "Escape" });
    await waitFor(() => expect(back).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(here()).toBe("/gallery"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    d = await openCard(3);
    fireEvent.click(within(d).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(back).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("a click outside goes back", async () => {
    serve(3);
    renderApp();
    const back = vi.spyOn(window.history, "back");
    await openCard(3);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20)); // Radix arms its outside-click listener on the next tick
    });
    const overlay = document.querySelector("[data-slot=dialog-overlay]") as Element;
    fireEvent.pointerDown(overlay);
    fireEvent.click(overlay);
    await waitFor(() => expect(back).toHaveBeenCalledTimes(1));
  });

  it("one Back closes it however many steps were taken, and Forward shows it again", async () => {
    serve(3);
    renderApp();
    const d = await openCard(3);
    await within(d).findByText("Detail prompt 3");
    fireEvent.keyDown(d, { key: "ArrowRight" });
    await within(d).findByText("Detail prompt 2");
    act(() => window.history.back());
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(here()).toBe("/gallery");
    act(() => window.history.forward());
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(here()).toBe(`/generations/${idOf(2)}`);
  });
});

describe("close → place (AC-04)", () => {
  const rect = (top: number, bottom: number) =>
    ({ top, bottom, left: 0, right: 10, width: 10, height: bottom - top, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
  const close = async () => {
    act(() => window.history.back());
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  };

  it("scrolls the last grid generation shown into view (nearest) when it is off screen", async () => {
    serve(3);
    renderApp();
    const d = await openCard(3);
    await within(d).findByText("Detail prompt 3");
    fireEvent.keyDown(d, { key: "ArrowRight" });
    await within(d).findByText("Detail prompt 2");
    const tile = document.querySelector(`[data-generation-id="${idOf(2)}"]`) as HTMLElement;
    vi.spyOn(tile, "getBoundingClientRect").mockReturnValue(rect(2000, 2300));
    const scroll = vi.spyOn(tile, "scrollIntoView").mockImplementation(() => {});
    await close();
    expect(scroll).toHaveBeenCalledWith({ block: "nearest" });
  });

  it("keeps the scroll when that card is already visible", async () => {
    serve(3);
    renderApp();
    const d = await openCard(3);
    await within(d).findByText("Detail prompt 3");
    const tile = document.querySelector(`[data-generation-id="${idOf(3)}"]`) as HTMLElement;
    vi.spyOn(tile, "getBoundingClientRect").mockReturnValue(rect(100, 300));
    const scroll = vi.spyOn(tile, "scrollIntoView").mockImplementation(() => {});
    await close();
    expect(scroll).not.toHaveBeenCalled();
  });

  it("never loads a page by itself: the sentinel waits for the Owner's own scroll, not the scroll we caused", async () => {
    serve(5);
    renderApp();
    const sentinel = await screen.findByTestId("gallery-sentinel");
    const d = await openCard(5);
    await within(d).findByText("Detail prompt 5");
    const tile = document.querySelector(`[data-generation-id="${idOf(5)}"]`) as HTMLElement;
    vi.spyOn(tile, "getBoundingClientRect").mockReturnValue(rect(2000, 2300));
    vi.spyOn(tile, "scrollIntoView").mockImplementation(() => {});
    let now = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    await close();
    const el = await screen.findByTestId("gallery-sentinel");
    expect(el).toBe(sentinel);
    intersect(el);
    await act(async () => {});
    expect(generations).toHaveBeenCalledTimes(1);
    now += 100; // the scroll we caused
    fireEvent.scroll(window);
    intersect(el);
    await act(async () => {});
    expect(generations).toHaveBeenCalledTimes(1);
    now += 600; // the Owner's own scroll
    fireEvent.scroll(window);
    intersect(el);
    await waitFor(() => expect(generations.mock.calls.length).toBeGreaterThan(1)); // the sentinel is armed again
  });
});

describe("preload (spec §6)", () => {
  it("preloads at most the first output of the newer and older neighbours among loaded ones", async () => {
    generations.mockResolvedValue({ items: [4, 3, 2, 1].map((i) => summary(i)), nextCursor: null });
    const srcs: string[] = [];
    class FakeImage {
      set src(v: string) {
        srcs.push(v);
      }
    }
    vi.stubGlobal("Image", FakeImage);
    renderApp();
    await openCard(3);
    await waitFor(() => expect(srcs.sort()).toEqual([summary(2).thumbnail.url, summary(4).thumbnail.url].sort()));
    srcs.length = 0;
    fireEvent.keyDown(await dialog(), { key: "ArrowLeft" }); // to 4: only an older neighbour
    await waitFor(() => expect(srcs).toEqual([summary(3).thumbnail.url]));
    vi.unstubAllGlobals();
  });
});

const olderBtn = () => screen.getByRole("button", { name: /^Older/, hidden: true });
const newerBtn = () => screen.getByRole("button", { name: /^Newer/, hidden: true });
const arrows = (d: HTMLElement) => {
  fireEvent.keyDown(d, { key: "ArrowRight" });
  fireEvent.keyDown(d, { key: "ArrowLeft" });
};

describe("busy inside the dialog (AC-09)", () => {
  it("an unsaved comment draft disables stepping until it is cancelled", async () => {
    serve(3);
    renderApp();
    const d = await openCard(2);
    await within(d).findByText("Detail prompt 2");
    fireEvent.click(within(d).getByRole("button", { name: "Add comment" }));
    expect(olderBtn()).not.toBeDisabled(); // an empty draft is not unsaved
    fireEvent.change(within(d).getByLabelText("Comment"), { target: { value: "draft" } });
    await waitFor(() => expect(olderBtn()).toBeDisabled());
    expect(newerBtn()).toBeDisabled();
    arrows(d);
    expect(here()).toBe(`/generations/${idOf(2)}`);
    fireEvent.click(within(d).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(olderBtn()).not.toBeDisabled());
  });

  it("typed-but-not-added tag text disables stepping", async () => {
    serve(3);
    renderApp();
    const d = await openCard(2);
    const tag = await within(d).findByPlaceholderText("Add a tag…");
    fireEvent.change(tag, { target: { value: "cat" } });
    await waitFor(() => expect(olderBtn()).toBeDisabled());
    arrows(d);
    expect(here()).toBe(`/generations/${idOf(2)}`);
    fireEvent.change(tag, { target: { value: "" } });
    await waitFor(() => expect(olderBtn()).not.toBeDisabled());
  });

  it("an open delete confirmation and an unsaved draft both count (neither clears the other)", async () => {
    serve(3);
    renderApp();
    const d = await openCard(2);
    await within(d).findByText("Detail prompt 2");
    fireEvent.change(within(d).getByPlaceholderText("Add a tag…"), { target: { value: "cat" } });
    fireEvent.click(within(d).getByRole("button", { name: /Delete/ }));
    await screen.findByText("Delete this generation?");
    expect(olderBtn()).toBeDisabled();
    arrows(d);
    expect(here()).toBe(`/generations/${idOf(2)}`);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByText("Delete this generation?")).not.toBeInTheDocument());
    expect(olderBtn()).toBeDisabled(); // the tag text is still pending
  });
});

describe("Esc inside the dialog (AC-09)", () => {
  it("cancels an open comment edit and leaves the dialog open", async () => {
    serve(3);
    const back = vi.spyOn(window.history, "back");
    renderApp();
    const d = await openCard(2);
    await within(d).findByText("Detail prompt 2");
    fireEvent.click(within(d).getByRole("button", { name: "Add comment" }));
    fireEvent.keyDown(within(d).getByLabelText("Comment"), { key: "Escape" });
    await waitFor(() => expect(within(d).queryByLabelText("Comment")).not.toBeInTheDocument());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(back).not.toHaveBeenCalled();
    // with nothing to cancel, Esc closes as usual
    fireEvent.keyDown(d, { key: "Escape" });
    await waitFor(() => expect(back).toHaveBeenCalled());
  });
});

describe("curation inside the dialog patches the card (ADR-0034, AC-07)", () => {
  const cards = (client: QueryClient) =>
    (client.getQueryData(["generations"]) as { pages: GenerationPage[] }).pages.flatMap((p) => p.items);

  it("tag add, tag remove and comment save update the card, 0 list reads, narrow invalidation", async () => {
    serve(3);
    let tags: string[] = []; // what the server holds, so the refreshed detail agrees with each answer
    generation.mockImplementation(async (id) => gen(Number(id.slice(3)), { tags }));
    vi.mocked(api.addTag).mockImplementation(async () => {
      tags = ["cat"];
      return { tags };
    });
    vi.mocked(api.removeTag).mockImplementation(async () => {
      tags = [];
      return { tags };
    });
    vi.mocked(api.setComment).mockResolvedValue({ comment: { body: "hi", updatedAt: "2026-10-18T14:02:11.000Z" } });
    const { client } = renderApp();
    const d = await openCard(3);
    const tag = await within(d).findByPlaceholderText("Add a tag…");
    const listReads = generations.mock.calls.length;
    const invalidate = vi.spyOn(client, "invalidateQueries");

    fireEvent.change(tag, { target: { value: "cat" } });
    fireEvent.keyDown(tag, { key: "Enter" });
    await waitFor(() => expect(cards(client).find((c) => c.id === idOf(3))?.tags).toEqual(["cat"]));
    fireEvent.click(await within(d).findByRole("button", { name: "Remove tag cat" }));
    await waitFor(() => expect(cards(client).find((c) => c.id === idOf(3))?.tags).toEqual([]));
    fireEvent.click(within(d).getByRole("button", { name: "Add comment" }));
    fireEvent.change(within(d).getByLabelText("Comment"), { target: { value: "hi" } });
    fireEvent.click(within(d).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(cards(client).find((c) => c.id === idOf(3))?.hasComment).toBe(true));

    expect(generations.mock.calls.length).toBe(listReads);
    const filters = invalidate.mock.calls.map((c) => c[0]);
    expect(filters).toContainEqual({ queryKey: ["generation", idOf(3)] });
    expect(filters).toContainEqual({ queryKey: ["generations", "recent"], exact: true });
    expect(filters.some((f) => JSON.stringify(f?.queryKey) === '["generations"]')).toBe(false);
  });
});

describe("lineage, re-run and reuse inside the dialog (AC-07, AC-08)", () => {
  const withSource = () =>
    generation.mockImplementation(async (id) =>
      gen(Number(id.slice(3)), {
        source: { id: idOf(1), relation: "rerun", output: null, exists: true, prompt: "Origin" },
      }),
    );

  it("a lineage link replaces the dialog's entry: history length unchanged", async () => {
    serve(3);
    withSource();
    renderApp();
    const d = await openCard(3);
    const len = window.history.length;
    fireEvent.click(await within(d).findByRole("link", { name: /Re-run of/ }));
    await waitFor(() => expect(here()).toBe(`/generations/${idOf(1)}`));
    expect(window.history.length).toBe(len);
    expect(window.history.state).toMatchObject({ dialog: "gallery" });
  });

  it("re-run replaces the dialog's entry with the generate address; Back lands on the grid", async () => {
    serve(3);
    renderApp();
    const d = await openCard(3);
    const len = window.history.length;
    fireEvent.click(await within(d).findByRole("link", { name: /Re-run/ }));
    expect(here() + window.location.search).toBe(`/?rerun=${idOf(3)}`);
    expect(window.history.length).toBe(len);
    await act(async () => window.history.back());
    await waitFor(() => expect(here()).toBe("/gallery"));
  });

  it("use as input replaces the entry the same way", async () => {
    serve(3);
    renderApp();
    const d = await openCard(3);
    const len = window.history.length;
    fireEvent.click((await within(d).findAllByRole("button", { name: /Use as input/ }))[0] as HTMLElement);
    expect(here() + window.location.search).toBe(`/?reuse=${idOf(3)}&output=1`);
    expect(window.history.length).toBe(len);
  });
});
