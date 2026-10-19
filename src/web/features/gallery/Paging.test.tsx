import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { summary } from "@/test-utils";
import { intersect } from "../../../../tests/helpers/intersection";
import type { GenerationPage } from "../../../shared/generations";
import { Gallery } from "./Gallery";

vi.mock("@/lib/api", () => ({ api: { generations: vi.fn() } }));
const generations = vi.mocked(api.generations);

const PAGE = 2;
/** A cursor-paged fake of the list endpoint over ids `n` down to 1 (newest first), `top` being the newest. */
function serve(top: () => number) {
  generations.mockImplementation(async (cursor) => {
    const all = Array.from({ length: top() }, (_, i) => top() - i).map((i) => summary(i));
    const rest = cursor ? all.filter((g) => g.id < cursor) : all;
    const items = rest.slice(0, PAGE);
    return { items, nextCursor: rest.length > PAGE ? (items[PAGE - 1]?.id ?? null) : null } satisfies GenerationPage;
  });
}

const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const ui = (client: QueryClient) => (
  <QueryClientProvider client={client}>
    <Gallery />
  </QueryClientProvider>
);
const sentinel = async () => screen.findByTestId("gallery-sentinel");
const hrefs = () => screen.getAllByRole("link").map((a) => a.getAttribute("href")?.split("/").pop());
const setScrollY = (y: number) => Object.defineProperty(window, "scrollY", { value: y, configurable: true });

describe("auto-paging (SCR-02, AC-04..AC-06, AC-08)", () => {
  beforeEach(() => {
    generations.mockReset();
    setScrollY(0);
    window.scrollTo = vi.fn();
  });

  it("requests the next page once when the sentinel comes into view, then shows it", async () => {
    serve(() => 3);
    render(ui(newClient()));
    const el = await sentinel();
    expect(generations).toHaveBeenCalledTimes(1);
    intersect(el);
    expect(await screen.findByText("A test prompt number 1")).toBeInTheDocument();
    expect(generations).toHaveBeenCalledTimes(2);
    expect(generations).toHaveBeenLastCalledWith(summary(2).id);
  });

  it("does not request again while a page is in flight", async () => {
    serve(() => 5);
    render(ui(newClient()));
    const el = await sentinel();
    let release: (p: GenerationPage) => void = () => {};
    generations.mockImplementationOnce(() => new Promise<GenerationPage>((r) => (release = r)));
    intersect(el);
    await waitFor(() => expect(generations).toHaveBeenCalledTimes(2));
    intersect(el);
    intersect(el);
    expect(generations).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("Loading more…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load more" })).toBeDisabled();
    await act(async () => release({ items: [summary(3), summary(2)], nextCursor: summary(2).id }));
    await waitFor(() => expect(screen.queryByText("Loading more…")).not.toBeInTheDocument());
  });

  it("after the last page it asks for nothing and says «That's everything»", async () => {
    serve(() => 3);
    render(ui(newClient()));
    intersect(await sentinel());
    expect(await screen.findByText("That's everything")).toBeInTheDocument();
    const calls = generations.mock.calls.length;
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
    const el = screen.queryByTestId("gallery-sentinel");
    if (el) intersect(el);
    expect(generations.mock.calls.length).toBe(calls);
  });

  it("keeps «Load more» as a button fallback", async () => {
    serve(() => 3);
    render(ui(newClient()));
    fireEvent.click(await screen.findByRole("button", { name: "Load more" }));
    expect(await screen.findByText("A test prompt number 1")).toBeInTheDocument();
    expect(generations).toHaveBeenCalledTimes(2);
  });

  it("keeps the cards on a failed next page, shows Try again, and never retries by itself", async () => {
    serve(() => 3);
    render(ui(newClient()));
    const el = await sentinel();
    generations.mockRejectedValueOnce(new Error("boom"));
    intersect(el);
    expect(await screen.findByText("Couldn't load more.")).toBeInTheDocument();
    expect(hrefs()).toHaveLength(2);
    expect(screen.queryByText("Couldn't load the gallery")).not.toBeInTheDocument();
    intersect(el);
    await act(async () => {});
    expect(generations).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("A test prompt number 1")).toBeInTheDocument();
    expect(generations).toHaveBeenCalledTimes(3);
    expect(screen.queryByText("Couldn't load more.")).not.toBeInTheDocument();
  });

  it("keeps the cards when a refresh fails and says they may be out of date", async () => {
    serve(() => 3);
    const client = newClient();
    render(ui(client));
    await screen.findByText("A test prompt number 3");
    generations.mockRejectedValue(new Error("boom"));
    await act(async () => {
      await client.invalidateQueries({ queryKey: ["generations"] });
    });
    expect(await screen.findByText("These cards may be out of date.")).toBeInTheDocument();
    expect(screen.getByText("A test prompt number 3")).toBeInTheDocument();
    expect(screen.queryByText("Couldn't load the gallery")).not.toBeInTheDocument();
  });

  it("restores the scroll on return without a list request", async () => {
    serve(() => 3);
    const client = newClient();
    const first = render(ui(client));
    await screen.findByText("A test prompt number 3");
    setScrollY(740);
    first.unmount();
    const calls = generations.mock.calls.length;
    render(ui(client));
    await screen.findByText("A test prompt number 3");
    expect(window.scrollTo).toHaveBeenCalledWith(0, 740);
    await act(async () => {});
    expect(generations.mock.calls.length).toBe(calls);
  });

  it("shows each generation once across a page boundary after a new one arrives on top", async () => {
    let top = 5;
    serve(() => top);
    const client = newClient();
    render(ui(client));
    fireEvent.click(await screen.findByRole("button", { name: "Load more" }));
    await screen.findByText("A test prompt number 3");
    top = 6;
    await act(async () => {
      await client.invalidateQueries({ queryKey: ["generations"] });
    });
    await screen.findByText("A test prompt number 6");
    const ids = hrefs();
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([6, 5, 4, 3].map((i) => summary(i).id));
  });
});
