/** Which slice of the library the gallery shows; it lives in the address (`?provider=&model=` / `?view=models`). */
export type GalleryView = { kind: "all" } | { kind: "model"; provider: string; model: string } | { kind: "models" };

export function parseView(search: string): GalleryView {
  const p = new URLSearchParams(search);
  const provider = p.get("provider");
  const model = p.get("model");
  if (provider && model) return { kind: "model", provider, model };
  if (!provider && !model && p.get("view") === "models") return { kind: "models" };
  return { kind: "all" };
}

export function viewSearch(view: GalleryView): string {
  if (view.kind === "all") return "";
  if (view.kind === "models") return "?view=models";
  return `?${new URLSearchParams({ provider: view.provider, model: view.model }).toString()}`;
}

export function viewKey(view: GalleryView): readonly string[] {
  if (view.kind === "all") return ["generations"];
  if (view.kind === "models") return ["generations", "models"];
  return ["generations", "model", view.provider, view.model];
}

function viewFromState(v: unknown): GalleryView | undefined {
  const o = v as { kind?: unknown; provider?: unknown; model?: unknown } | null | undefined;
  if (o?.kind === "all" || o?.kind === "models") return { kind: o.kind };
  if (o?.kind === "model" && typeof o.provider === "string" && typeof o.model === "string")
    return { kind: "model", provider: o.provider, model: o.model };
  return undefined;
}

/** The views a dialog visit carries in its history state (sad §8): the grid behind it and the list it steps through. */
export function dialogViews(state: unknown): { grid?: GalleryView; order?: GalleryView } {
  const s = state as { grid?: unknown; order?: unknown } | null | undefined;
  return { grid: viewFromState(s?.grid), order: viewFromState(s?.order) };
}
