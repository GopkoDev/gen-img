export type Neighbours = {
  newer: string | null;
  older: string | null;
  atEnd: boolean;
  inOrder: boolean;
};

/** Neighbours of `id` in a newest-first list; out-of-order ids have none. */
export function neighbours(items: readonly { id: string }[], id: string): Neighbours {
  const i = items.findIndex((item) => item.id === id);
  if (i === -1) return { newer: null, older: null, atEnd: false, inOrder: false };
  return {
    newer: items[i - 1]?.id ?? null,
    older: items[i + 1]?.id ?? null,
    atEnd: i === items.length - 1,
    inOrder: true,
  };
}
