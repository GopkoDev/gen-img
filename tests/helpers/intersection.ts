/**
 * A controllable IntersectionObserver for jsdom, which has none. Default: nothing intersects until a test says so
 * (`intersect(el)` / `intersectAll()`); an element already made visible reports at once when observed later.
 * `resetIntersections()` runs after every test (setup-dom.ts).
 */
type Entry = Pick<IntersectionObserverEntry, "target" | "isIntersecting">;
const observers = new Set<IntersectionObserverDouble>();
const visible = new Set<Element>();
let allVisible = false;

class IntersectionObserverDouble {
  readonly targets = new Set<Element>();
  constructor(readonly callback: (entries: Entry[]) => void) {
    observers.add(this);
  }
  observe(el: Element) {
    this.targets.add(el);
    if (allVisible || visible.has(el)) this.callback([{ target: el, isIntersecting: true }]);
  }
  unobserve(el: Element) {
    this.targets.delete(el);
  }
  disconnect() {
    this.targets.clear();
    observers.delete(this);
  }
  takeRecords() {
    return [];
  }
}

export function installIntersectionObserver() {
  if (typeof globalThis.IntersectionObserver !== "function")
    globalThis.IntersectionObserver = IntersectionObserverDouble as unknown as typeof IntersectionObserver;
}

/** Bring one element into view. */
export function intersect(el: Element) {
  visible.add(el);
  for (const o of observers) if (o.targets.has(el)) o.callback([{ target: el, isIntersecting: true }]);
}

/** Bring every observed element into view, now and for elements observed later. */
export function intersectAll() {
  allVisible = true;
  for (const o of observers) for (const el of o.targets) o.callback([{ target: el, isIntersecting: true }]);
}

export function resetIntersections() {
  visible.clear();
  allVisible = false;
}
