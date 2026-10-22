/** Which slice of the library the gallery shows; it lives in the address (`?provider=&model=` / `?view=models`). */
export type GalleryView =
  | { kind: "all" }
  | { kind: "model"; provider: string; model: string }
  | { kind: "models" }
  | { kind: "prompts"; single: boolean }
  | { kind: "prompt"; key: string; single?: true; invalid?: true };

const PROMPT_KEY = /^[0-9a-f]{32}$/;

export function parseView(search: string): GalleryView {
  const p = new URLSearchParams(search);
  const provider = p.get("provider");
  const model = p.get("model");
  if (provider && model) return { kind: "model", provider, model };
  if (!provider && !model && p.get("view") === "models") return { kind: "models" };
  if (!provider && !model) {
    if (p.get("view") === "prompts") return { kind: "prompts", single: p.get("single") === "1" };
    const prompt = p.get("prompt");
    if (prompt !== null) {
      const single = p.get("single") === "1" ? ({ single: true } as const) : {};
      return PROMPT_KEY.test(prompt)
        ? { kind: "prompt", key: prompt, ...single }
        : { kind: "prompt", key: prompt, ...single, invalid: true };
    }
  }
  return { kind: "all" };
}

export function viewSearch(view: GalleryView): string {
  if (view.kind === "all") return "";
  if (view.kind === "models") return "?view=models";
  if (view.kind === "prompts") return view.single ? "?view=prompts&single=1" : "?view=prompts";
  if (view.kind === "prompt") {
    const q = `?${new URLSearchParams({ prompt: view.key }).toString()}`;
    return view.single ? `${q}&single=1` : q;
  }
  return `?${new URLSearchParams({ provider: view.provider, model: view.model }).toString()}`;
}

export function viewKey(view: GalleryView): readonly (string | boolean)[] {
  if (view.kind === "all") return ["generations"];
  if (view.kind === "models") return ["generations", "models"];
  if (view.kind === "prompts") return ["generations", "prompts", view.single];
  if (view.kind === "prompt") return ["generations", "prompt", view.key];
  return ["generations", "model", view.provider, view.model];
}

function viewFromState(v: unknown): GalleryView | undefined {
  const o = v as
    | { kind?: unknown; provider?: unknown; model?: unknown; single?: unknown; key?: unknown; invalid?: unknown }
    | null
    | undefined;
  if (o?.kind === "prompts") return { kind: "prompts", single: o.single === true };
  if (o?.kind === "prompt" && typeof o.key === "string") {
    const single = o.single === true ? ({ single: true } as const) : {};
    return o.invalid === true
      ? { kind: "prompt", key: o.key, ...single, invalid: true }
      : { kind: "prompt", key: o.key, ...single };
  }
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
