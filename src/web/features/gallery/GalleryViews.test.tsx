import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Sparkles } from "lucide-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "@/App";
import { api } from "@/lib/api";
import { SECTIONS } from "@/sections";
import { summary } from "@/test-utils";
import type { ModelGroup } from "../../../shared/generations";
import { Gallery, resetGalleryScroll } from "./Gallery";
import { GalleryViews } from "./GalleryViews";
import { viewSearch } from "./galleryView";

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: {
    health: vi.fn(),
    providers: vi.fn(),
    currentJob: vi.fn(),
    generations: vi.fn(),
    generationModels: vi.fn(),
    promptGroups: vi.fn(),
  },
}));
const m = vi.mocked(api);

const group = (model: string, count: number, provider: ModelGroup["provider"] = "openrouter"): ModelGroup => ({
  provider,
  model,
  count,
  latestId: summary(1).id,
  items: [summary(1)],
});
const SEEDREAM = group("Seedream 4", 12);
const GEMINI = group("Gemini Image", 5, "vercel");

const at = (url: string) => window.history.replaceState(null, "", url);
const address = () => window.location.pathname + window.location.search;
const setScrollY = (y: number) => Object.defineProperty(window, "scrollY", { value: y, configurable: true });
const popTo = (url: string) =>
  act(() => {
    at(url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });

function renderViews() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ui = render(
    <QueryClientProvider client={client}>
      <GalleryViews />
      <Gallery />
    </QueryClientProvider>,
  );
  return { ...ui, client };
}

beforeEach(() => {
  vi.resetAllMocks();
  resetGalleryScroll();
  window.scrollTo = vi.fn();
  setScrollY(0);
  at("/gallery");
  m.generations.mockImplementation(async (_c, _l, filter) => ({
    items: filter ? [summary(7, { model: filter.model })] : [summary(3), summary(2)],
    nextCursor: null,
  }));
  m.generationModels.mockResolvedValue({ models: [SEEDREAM, GEMINI] });
});
afterEach(() => at("/"));

describe("view switch (SCR-02)", () => {
  it("starts on All; «By model» pushes the address and shows the By model view without loading the grid", async () => {
    renderViews();
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "By model" })).toHaveAttribute("aria-pressed", "false");
    await screen.findByText("A test prompt number 3");
    m.generations.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "By model" }));
    expect(address()).toBe("/gallery?view=models");
    expect(await screen.findByRole("heading", { name: "Seedream 4" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "By model" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "false");
    expect(m.generations).not.toHaveBeenCalled();
  });

  it("«By prompt» pushes ?view=prompts and shows the prompt cards without loading the grid", async () => {
    m.promptGroups.mockResolvedValue({
      groups: [
        {
          key: "0123456789abcdef0123456789abcdef",
          prompt: "Shared prompt",
          count: 3,
          images: 3,
          models: [],
          moreModels: 0,
          latestId: summary(1).id,
          cover: { url: "/x.png", width: 1, height: 1 },
        },
      ],
      nextCursor: null,
    });
    renderViews();
    await screen.findByText("A test prompt number 3");
    m.generations.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "By prompt" }));
    expect(address()).toBe("/gallery?view=prompts");
    expect(await screen.findByText("3 generations · 3 images")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "By prompt" })).toHaveAttribute("aria-pressed", "true");
    expect(m.promptGroups).toHaveBeenCalledWith(undefined, false);
    expect(m.generations).not.toHaveBeenCalled();
  });

  it("«All» returns to the full grid and the plain address", async () => {
    at("/gallery?view=models");
    renderViews();
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(address()).toBe("/gallery");
    expect(await screen.findByText("A test prompt number 3")).toBeInTheDocument();
  });
});

describe("model choice (AC-01, AC-07)", () => {
  it("lists name, provider and count, and choosing one shows only its generations and names it on the trigger", async () => {
    renderViews();
    fireEvent.click(screen.getByRole("button", { name: "Choose a model" }));
    expect(await screen.findByText("Loading models…")).toBeInTheDocument();
    expect(m.generationModels).toHaveBeenCalledWith(4);
    const row = await screen.findByRole("button", { name: /Seedream 4/ });
    expect(row).toHaveTextContent("OpenRouter");
    expect(row).toHaveTextContent("12");
    expect(screen.getByRole("button", { name: /Gemini Image/ })).toHaveTextContent("Vercel AI Gateway");
    fireEvent.click(row);
    expect(address()).toBe("/gallery?provider=openrouter&model=Seedream+4");
    await waitFor(() => expect(m.generations).toHaveBeenLastCalledWith(undefined, undefined, SEL));
    expect(await screen.findByRole("button", { name: "Model: Seedream 4" })).toBeInTheDocument();
    expect(screen.queryByText("Loading models…")).not.toBeInTheDocument();
  });

  it("explains a failed read with Try again and leaves the grid usable", async () => {
    m.generationModels.mockRejectedValueOnce(new Error("boom"));
    renderViews();
    await screen.findByText("A test prompt number 3");
    fireEvent.click(screen.getByRole("button", { name: "Choose a model" }));
    expect(await screen.findByText("Couldn't load your models.")).toBeInTheDocument();
    expect(screen.getByText("A test prompt number 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("button", { name: /Seedream 4/ })).toBeInTheDocument();
  });

  it("keeps any model id intact through the address (odd characters)", async () => {
    const odd = "black-forest-labs/Flux 1.1+pro&x=y#z?é/";
    m.generationModels.mockResolvedValue({ models: [group(odd, 2)] });
    renderViews();
    fireEvent.click(screen.getByRole("button", { name: "Choose a model" }));
    fireEvent.click(await screen.findByRole("button", { name: new RegExp(odd.replace(/[.+?/]/g, "\\$&")) }));
    expect(address()).toBe(`/gallery${viewSearch({ kind: "model", provider: "openrouter", model: odd })}`);
    await waitFor(() =>
      expect(m.generations).toHaveBeenLastCalledWith(undefined, undefined, { provider: "openrouter", model: odd }),
    );
  });
});

const SEL = { provider: "openrouter", model: "Seedream 4" };
const MODEL_URL = "/gallery?provider=openrouter&model=Seedream+4";

describe("one model (AC-01, AC-06)", () => {
  it("shows «<model> · <provider> · N generations» with «Show all generations»", async () => {
    at(MODEL_URL);
    renderViews();
    expect(
      await screen.findByRole("heading", { name: "Seedream 4 · OpenRouter · 12 generations" }),
    ).toBeInTheDocument();
    expect(m.generations).toHaveBeenCalledWith(undefined, undefined, SEL);
    fireEvent.click(screen.getByRole("button", { name: "Show all generations" }));
    expect(address()).toBe("/gallery");
    expect(await screen.findByText("A test prompt number 3")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Seedream 4/ })).not.toBeInTheDocument();
  });

  it("shows the heading without N when the models read has no such model", async () => {
    at(MODEL_URL);
    m.generationModels.mockRejectedValue(new Error("boom"));
    renderViews();
    expect(await screen.findByRole("heading", { name: "Seedream 4 · OpenRouter" })).toBeInTheDocument();
  });

  it("says plainly that there are no generations with the model, never «No generations yet»", async () => {
    at("/gallery?provider=vercel&model=old%2Fmodel");
    m.generations.mockResolvedValue({ items: [], nextCursor: null });
    renderViews();
    expect(await screen.findByText("No generations with old/model (Vercel AI Gateway).")).toBeInTheDocument();
    expect(screen.queryByText("No generations yet.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show all generations" }));
    expect(address()).toBe("/gallery");
  });
});

describe("view and address (AC-03)", () => {
  it("shows the filtered grid on reload / a new tab", async () => {
    at(MODEL_URL);
    renderViews();
    expect(await screen.findByRole("button", { name: "Model: Seedream 4" })).toBeInTheDocument();
    expect(await screen.findByText("A test prompt number 7")).toBeInTheDocument();
    expect(m.generations).not.toHaveBeenCalledWith(undefined);
  });

  it("follows Back and Forward (popstate) between views", async () => {
    renderViews();
    await screen.findByText("A test prompt number 3");
    popTo(MODEL_URL);
    expect(await screen.findByText("A test prompt number 7")).toBeInTheDocument();
    popTo("/gallery?view=models");
    expect(await screen.findByRole("heading", { name: "Seedream 4" })).toBeInTheDocument();
    popTo("/gallery");
    expect(await screen.findByText("A test prompt number 3")).toBeInTheDocument();
  });

  it("keeps a scroll position per view; a view shown for the first time starts at the top", async () => {
    renderViews();
    await screen.findByText("A test prompt number 3");
    setScrollY(300);
    fireEvent.scroll(window);
    (window.scrollTo as ReturnType<typeof vi.fn>).mockClear();
    popTo(MODEL_URL);
    await screen.findByText("A test prompt number 7");
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    expect(window.scrollTo).not.toHaveBeenCalledWith(0, 300);
    setScrollY(0);
    popTo("/gallery");
    await screen.findByText("A test prompt number 3");
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 300);
  });
});

describe("scroll of «By model» (R1)", () => {
  it("keeps its own position beside All's: All 300 → By model 0 → All 300 → By model its own", async () => {
    renderViews();
    await screen.findByText("A test prompt number 3");
    setScrollY(300);
    fireEvent.scroll(window);
    (window.scrollTo as ReturnType<typeof vi.fn>).mockClear();
    popTo("/gallery?view=models");
    await screen.findByRole("heading", { name: "Seedream 4" });
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0);
    setScrollY(150);
    fireEvent.scroll(window);
    popTo("/gallery");
    await screen.findByText("A test prompt number 3");
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 300);
    setScrollY(300);
    popTo("/gallery?view=models");
    await screen.findByRole("heading", { name: "Seedream 4" });
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 150);
  });
});

describe("model choice with a failed refresh (R5)", () => {
  it("keeps the models it has, says they may be out of date and offers Try again", async () => {
    const { client } = renderViews();
    fireEvent.click(screen.getByRole("button", { name: "Choose a model" }));
    await screen.findByRole("button", { name: /Seedream 4/ });
    m.generationModels.mockRejectedValueOnce(new Error("boom"));
    await act(() => client.invalidateQueries({ queryKey: ["generations", "models"] }));
    expect(await screen.findByText("These may be out of date.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Seedream 4/ })).toBeInTheDocument();
    expect(screen.queryByText("Couldn't load your models.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.queryByText("These may be out of date.")).not.toBeInTheDocument());
  });
});

describe("sidebar entry (AC-10)", () => {
  it("goes to /gallery (All) from a filtered view; Back returns to the view left", async () => {
    m.health.mockResolvedValue({ status: "ok" });
    m.providers.mockResolvedValue({ providers: [] });
    m.currentJob.mockResolvedValue({ job: null });
    const sections = [
      { id: "generate", path: "/", label: "Generate", icon: Sparkles, page: () => <p>generate</p>, keepMounted: true },
      SECTIONS.find((s) => s.id === "gallery") as (typeof SECTIONS)[number],
    ];
    at(MODEL_URL);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <App sections={sections} />
      </QueryClientProvider>,
    );
    await screen.findByText("A test prompt number 7");
    const links = screen.getAllByRole("link", { name: "Gallery" });
    for (const l of links) expect(l).toHaveAttribute("href", "/gallery");
    fireEvent.click(links[0] as HTMLElement);
    expect(address()).toBe("/gallery");
    expect(await screen.findByText("A test prompt number 3")).toBeInTheDocument();
    popTo(MODEL_URL);
    expect(await screen.findByText("A test prompt number 7")).toBeInTheDocument();
  });
});
