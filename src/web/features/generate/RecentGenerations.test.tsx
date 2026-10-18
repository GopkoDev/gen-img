import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { renderWithQuery, summary } from "@/test-utils";
import { RecentGenerations } from "./RecentGenerations";

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: { generations: vi.fn() },
}));
const m = vi.mocked(api);

describe("RecentGenerations (SCR-06)", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("asks for ten and shows one thumbnail per generation, newest first, each opening its detail (AC-13)", async () => {
    m.generations.mockResolvedValue({ items: [summary(3), summary(2), summary(1)], nextCursor: "x" });
    renderWithQuery(<RecentGenerations />);
    const panel = await screen.findByRole("region", { name: "Recent generations" });
    await waitFor(() => expect(within(panel).getAllByRole("link")).toHaveLength(3));
    expect(m.generations).toHaveBeenCalledWith(undefined, 10);
    const links = within(panel).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual([3, 2, 1].map((i) => `/generations/${summary(i).id}`));
    expect(within(links[0] as HTMLElement).getByRole("img")).toHaveAttribute("src", summary(3).thumbnail?.url);
    expect(within(links[0] as HTMLElement).getByRole("img")).toHaveAccessibleName("A test prompt number 3");
    expect(within(panel).queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
    fireEvent.click(links[1] as HTMLElement);
    expect(window.location.pathname).toBe(`/generations/${summary(2).id}`);
  });

  it("never shows more than ten (AC-14)", async () => {
    m.generations.mockResolvedValue({ items: Array.from({ length: 12 }, (_, i) => summary(12 - i)), nextCursor: null });
    renderWithQuery(<RecentGenerations />);
    const panel = await screen.findByRole("region", { name: "Recent generations" });
    await waitFor(() => expect(within(panel).getAllByRole("link")).toHaveLength(10));
  });

  it("shows loading, then «No generations yet.» when there are none (AC-15)", async () => {
    let answer: (v: Awaited<ReturnType<typeof api.generations>>) => void = () => {};
    m.generations.mockReturnValue(new Promise((r) => (answer = r)));
    renderWithQuery(<RecentGenerations />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    answer({ items: [], nextCursor: null });
    expect(await screen.findByText("No generations yet.")).toBeInTheDocument();
  });

  it("says when it couldn't load and retries on request (AC-15)", async () => {
    m.generations.mockRejectedValueOnce(new Error("down")).mockResolvedValue({ items: [summary(1)], nextCursor: null });
    renderWithQuery(<RecentGenerations />);
    expect(await screen.findByText("Couldn't load recent generations")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getAllByRole("link")).toHaveLength(1));
  });

  it("shows a placeholder when a thumbnail file can't be loaded", async () => {
    m.generations.mockResolvedValue({ items: [summary(1)], nextCursor: null });
    renderWithQuery(<RecentGenerations />);
    fireEvent.error(await screen.findByRole("img"));
    expect(await screen.findByText("Image unavailable")).toBeInTheDocument();
  });
});
