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
