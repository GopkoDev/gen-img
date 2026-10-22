import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Sparkles } from "lucide-react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Gallery, resetGalleryScroll } from "@/features/gallery/Gallery";
import { api } from "@/lib/api";
import { navigate } from "@/lib/router";
import { SECTIONS } from "@/sections";
import { summary } from "@/test-utils";
import { App } from "./App";

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: {
    health: vi.fn(),
    providers: vi.fn(),
    currentJob: vi.fn(),
    generations: vi.fn(),
    generation: vi.fn(),
  },
}));
const m = vi.mocked(api);

const sections = [
  { id: "generate", path: "/", label: "Generate", icon: Sparkles, page: () => <p>generate page</p>, keepMounted: true },
  { ...(SECTIONS.find((s) => s.id === "gallery") as (typeof SECTIONS)[number]), page: () => <Gallery /> },
];

describe("re-run from the dialog through the real App (review R9)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resetGalleryScroll();
    window.scrollTo = vi.fn();
    m.health.mockResolvedValue({ status: "ok" });
    m.providers.mockResolvedValue({ providers: [] });
    m.currentJob.mockResolvedValue({ job: null });
    m.generations.mockResolvedValue({ items: [summary(1)], nextCursor: null });
    m.generation.mockImplementation(
      async (id) =>
        ({
          ...(await import("@/test-utils")).summary(1),
          id,
          images: [],
          inputs: [],
          requestedParams: {},
          acceptedParams: null,
          rawRequest: {},
          rawResponse: {},
          durationMs: 1,
          comment: null,
          source: null,
          derived: { items: [], total: 0 },
        }) as never,
    );
    window.history.replaceState(null, "", "/");
  });
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("Back lands on the grid, a second Back leaves the gallery", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <App sections={sections} />
      </QueryClientProvider>,
    );
    act(() => navigate("/gallery"));
    fireEvent.click(await screen.findByText("A test prompt number 1"));
    const d = await screen.findByRole("dialog");
    fireEvent.click(await within(d).findByRole("link", { name: /Re-run/ }));
    await waitFor(() => expect(window.location.pathname + window.location.search).toMatch(/^\/\?rerun=/));
    await act(async () => window.history.back());
    await waitFor(() => expect(window.location.pathname).toBe("/gallery"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("A test prompt number 1")).toBeInTheDocument();
    await act(async () => window.history.back());
    await waitFor(() => expect(window.location.pathname).toBe("/"));
  });
});
