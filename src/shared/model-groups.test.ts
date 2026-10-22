import { describe, expect, it } from "vitest";
import { arrangeModels, hiddenSuitable, pickModel } from "./model-groups";

const m = (id: string, inputs = false) => ({ id, name: id.toUpperCase(), ...(inputs ? { takesInputs: true } : {}) });
const list = [m("a"), m("b", true), m("c"), m("d", true)];
const pref = (model: string, favorite: boolean, hidden = false) => ({ model, favorite, hidden });
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe("arrangeModels (spec AC-04, AC-08, AC-09, AC-10)", () => {
  it("lists favorites first and every other model below, each in the provider's order", () => {
    const r = arrangeModels(list, [pref("d", true), pref("b", true)]);
    expect(ids(r.favorites)).toEqual(["b", "d"]);
    expect(ids(r.others)).toEqual(["a", "c"]);
    expect(r.hiddenSelected).toBeNull();
  });

  it("is one plain list when there are no favorites", () => {
    const r = arrangeModels(list, []);
    expect(r.favorites).toEqual([]);
    expect(ids(r.others)).toEqual(["a", "b", "c", "d"]);
  });

  it("leaves hidden models out of both groups, even when they are favorites", () => {
    const r = arrangeModels(list, [pref("b", true, true), pref("c", false, true)]);
    expect(r.favorites).toEqual([]);
    expect(ids(r.others)).toEqual(["a", "d"]);
  });

  it("keeps a hidden model that is selected, first in «All models», marked as hidden", () => {
    const r = arrangeModels(list, [pref("c", true, true)], "c");
    expect(r.hiddenSelected?.id).toBe("c");
    expect(ids(r.others)).toEqual(["c", "a", "b", "d"]);
    expect(r.favorites).toEqual([]);
  });

  it("ignores preferences of models the provider no longer lists", () => {
    const r = arrangeModels(list, [pref("gone", true), pref("gone-too", false, true)]);
    expect(r.favorites).toEqual([]);
    expect(ids(r.others)).toEqual(["a", "b", "c", "d"]);
  });

  it("falls back to one plain list of every model, hidden included, when preferences can't be read", () => {
    const r = arrangeModels(list, null, "a");
    expect(r.favorites).toEqual([]);
    expect(ids(r.others)).toEqual(["a", "b", "c", "d"]);
    expect(r.hiddenSelected).toBeNull();
  });
});

describe("pickModel (spec AC-11)", () => {
  const takesInputs = (x: { takesInputs?: boolean }) => x.takesInputs === true;

  it("picks the first favorite, otherwise the first visible model", () => {
    expect(pickModel(arrangeModels(list, [pref("c", true)]))?.id).toBe("c");
    expect(pickModel(arrangeModels(list, []))?.id).toBe("a");
  });

  it("picks the first suitable favorite, then the first suitable visible model", () => {
    expect(pickModel(arrangeModels(list, [pref("a", true), pref("d", true)]), takesInputs)?.id).toBe("d");
    expect(pickModel(arrangeModels(list, [pref("a", true)]), takesInputs)?.id).toBe("b");
  });

  it("never picks a hidden model — not even the hidden selected one", () => {
    const arranged = arrangeModels(list, [pref("a", false, true), pref("b", true, true)], "b");
    expect(pickModel(arranged)?.id).toBe("c");
    expect(pickModel(arranged, takesInputs)?.id).toBe("d");
  });

  it("picks nothing when no visible model is suitable", () => {
    const arranged = arrangeModels(list, [pref("b", false, true), pref("d", false, true)]);
    expect(pickModel(arranged, takesInputs)).toBeUndefined();
    expect(pickModel(arrangeModels([], []))).toBeUndefined();
  });
});

describe("hiddenSuitable (spec AC-13)", () => {
  const takes = (x: { takesInputs?: boolean }) => x.takesInputs === true;

  it("is true when no visible model is suitable but a hidden one is", () => {
    expect(hiddenSuitable(list, [pref("b", false, true), pref("d", false, true)], takes)).toBe(true);
  });

  it("is false when a visible model is suitable", () => {
    expect(hiddenSuitable(list, [pref("b", false, true)], takes)).toBe(false);
  });

  it("is false when no model is suitable at all, hidden or not", () => {
    expect(hiddenSuitable([m("a"), m("c")], [pref("a", false, true)], takes)).toBe(false);
  });

  it("is false when the preferences are unreadable", () => {
    expect(hiddenSuitable(list, null, takes)).toBe(false);
  });

  it("defaults to every model being suitable: true only when all of them are hidden", () => {
    expect(hiddenSuitable([m("a"), m("b")], [pref("a", false, true), pref("b", false, true)])).toBe(true);
    expect(hiddenSuitable([m("a"), m("b")], [pref("a", false, true)])).toBe(false);
    expect(hiddenSuitable([], [])).toBe(false);
  });

  it("ignores preferences of models the provider no longer lists", () => {
    expect(hiddenSuitable([m("a")], [pref("gone", false, true)])).toBe(false);
  });
});
