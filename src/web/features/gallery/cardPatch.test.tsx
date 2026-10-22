import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { patchCard } from "./cardPatch";

/** An observed query whose first read hangs (in flight, from before the tag) and whose later reads settle. */
function inFlight(qc: QueryClient, queryKey: string[]) {
  const queryFn = vi
    .fn()
    .mockImplementationOnce(() => new Promise(() => {}))
    .mockResolvedValue({ models: [] });
  qc.setQueryData(queryKey, { models: [] }); // a refresh only restarts a read that has data
  const unsubscribe = new QueryObserver(qc, { queryKey, queryFn, staleTime: Number.POSITIVE_INFINITY }).subscribe(
    () => {},
  );
  void qc.invalidateQueries({ queryKey, exact: true }); // the refresh now in flight, read before the tag
  return { queryFn, unsubscribe };
}

describe("patchCard — a list read already in flight", () => {
  it.each([
    ["a filtered list", ["generations", "model", "p", "m"]],
    ["the models read", ["generations", "models"]],
    ["the all list", ["generations"]],
  ])("is refreshed again after a tag: %s", async (_n, key) => {
    const qc = new QueryClient();
    const { queryFn, unsubscribe } = inFlight(qc, key);
    expect(queryFn).toHaveBeenCalledTimes(1);
    patchCard(qc, "01A", { tags: ["x"] });
    await vi.waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));
    unsubscribe();
  });

  it("refreshes the recent strip once through its own invalidation", async () => {
    const qc = new QueryClient();
    const { queryFn, unsubscribe } = inFlight(qc, ["generations", "recent"]);
    patchCard(qc, "01A", { tags: ["x"] });
    // recent is refreshed by its own invalidation, once
    await vi.waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));
    unsubscribe();
  });
});
