/** One stored choice about a model, as the picker needs it (the provider is implied by the list). */
export type ModelFlags = { model: string; favorite: boolean; hidden: boolean };

export type ArrangedModels<M> = {
  /** Visible favorites, in the provider's order. */
  favorites: M[];
  /** Every other visible model, in the provider's order — led by `hiddenSelected` when there is one. */
  others: M[];
  /** The selected model when it is hidden: listed (marked) only while it stays selected (spec AC-10). */
  hiddenSelected: M | null;
};

/**
 * What the Owner sees in the picker (SAD §4 item 4): favorites first, hidden models left out, preferences of
 * models the provider no longer lists ignored. `prefs = null` (unreadable) → one plain list of every model (AC-13).
 */
export function arrangeModels<M extends { id: string }>(
  models: readonly M[],
  prefs: readonly ModelFlags[] | null,
  selectedId?: string,
): ArrangedModels<M> {
  if (prefs === null) return { favorites: [], others: [...models], hiddenSelected: null };
  const byModel = new Map(prefs.map((p) => [p.model, p]));
  const favorites: M[] = [];
  const others: M[] = [];
  let hiddenSelected: M | null = null;
  for (const model of models) {
    const p = byModel.get(model.id);
    if (p?.hidden) {
      if (model.id === selectedId) hiddenSelected = model;
    } else if (p?.favorite) favorites.push(model);
    else others.push(model);
  }
  return { favorites, others: hiddenSelected ? [hiddenSelected, ...others] : others, hiddenSelected };
}

/**
 * The model Ukiyo may choose by itself (AC-11): the first suitable favorite, else the first suitable visible
 * model, never a hidden one; `undefined` when no visible model is suitable.
 */
export function pickModel<M extends { id: string }>(
  arranged: ArrangedModels<M>,
  suitable: (model: M) => boolean = () => true,
): M | undefined {
  const visible = [...arranged.favorites, ...arranged.others.filter((x) => x !== arranged.hiddenSelected)];
  return visible.find(suitable);
}
