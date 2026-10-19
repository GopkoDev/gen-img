import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { patchSummaries } from "./summaryPatch";

type Item = { id: string; costStatus: string; costMicros: number | null };
// biome-ignore lint/suspicious/noExplicitAny: loose cache shapes in a test
type V = any;
const card = (id: string, extra = {}) => ({ id, model: "m", costStatus: "pending", costMicros: null, ...extra });
const infinite = (...ids: string[]) => ({
  pages: [{ items: ids.map((i) => card(i)), nextCursor: null }],
  pageParams: [undefined],
});
const groups = () => ({
  models: [
    { provider: "p", model: "m", count: 2, items: [card("a"), card("b")] },
    { provider: "p", model: "n", count: 1, items: [card("c")] },
  ],
});

function setup() {
  const qc = new QueryClient();
  qc.setQueryData(["generations"], infinite("a", "b"));
  qc.setQueryData(["generations", "model", "p", "m"], infinite("a"));
  qc.setQueryData(["generations", "models"], groups());
  qc.setQueryData(["generations", "recent"], { items: [card("a")], nextCursor: null });
  return qc;
}

describe("patchSummaries", () => {
  it("patches the card in every view but not recent", () => {
    const qc = setup();
    patchSummaries(qc, "a", { costStatus: "known", costMicros: 5 } as never);
    const all = qc.getQueryData<V>(["generations"]);
    const model = qc.getQueryData<V>(["generations", "model", "p", "m"]);
    const g = qc.getQueryData<V>(["generations", "models"]);
    const recent = qc.getQueryData<V>(["generations", "recent"]);
    expect(all.pages[0].items[0]).toMatchObject({ costStatus: "known", costMicros: 5 });
    expect(all.pages[0].items[1].costStatus).toBe("pending");
    expect(model.pages[0].items[0].costMicros).toBe(5);
    expect(g.models[0].items[0].costMicros).toBe(5);
    expect(recent.items[0].costStatus).toBe("pending");
  });
  it("removes, decrements count and drops empty groups", () => {
    const qc = setup();
    patchSummaries(qc, "a", "remove");
    patchSummaries(qc, "c", "remove");
    const all = qc.getQueryData<V>(["generations"]);
    const g = qc.getQueryData<V>(["generations", "models"]);
    const recent = qc.getQueryData<V>(["generations", "recent"]);
    expect(all.pages[0].items.map((i: Item) => i.id)).toEqual(["b"]);
    expect(g.models).toHaveLength(1);
    expect(g.models[0]).toMatchObject({ count: 1 });
    expect(g.models[0].items.map((i: Item) => i.id)).toEqual(["b"]);
    expect(recent.items).toHaveLength(1);
  });
  it("leaves other shapes alone", () => {
    const qc = setup();
    qc.setQueryData(["generations", "weird"], { foo: 1 });
    patchSummaries(qc, "a", "remove");
    expect(qc.getQueryData<V>(["generations", "weird"])).toEqual({ foo: 1 });
  });
  it("skips the prompts caches and the one-group cache, patches a prompt grid", () => {
    const qc = setup();
    const groupPages = { pages: [{ groups: [{ key: "k", count: 1 }], nextCursor: null }], pageParams: [undefined] };
    qc.setQueryData(["generations", "prompts", false], groupPages);
    qc.setQueryData(["generations", "prompt", "k", "group"], groupPages);
    qc.setQueryData(["generations", "prompt", "k"], infinite("a", "b"));
    expect(() => patchSummaries(qc, "a", { costStatus: "known" } as never)).not.toThrow();
    patchSummaries(qc, "a", "remove");
    expect(qc.getQueryData<V>(["generations", "prompts", false])).toBe(groupPages);
    expect(qc.getQueryData<V>(["generations", "prompt", "k", "group"])).toBe(groupPages);
    expect(qc.getQueryData<V>(["generations", "prompt", "k"]).pages[0].items.map((i: Item) => i.id)).toEqual(["b"]);
  });
});
