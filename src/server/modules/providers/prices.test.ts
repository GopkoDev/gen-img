import { describe, expect, it } from "vitest";
import type { ModelPrice } from "../../../shared/pricing";
import type { ImageModel } from "../../../shared/providers";
import { createModelCatalog } from "./catalog";
import { type ImageProvider, ProviderError } from "./port";
import { createPriceCatalog } from "./prices";
import { registryOf } from "./registry";

const PRICE: ModelPrice = { kind: "per-image", output: { minUsd: 0.04, maxUsd: 0.04 }, input: null };
const flush = () => new Promise<void>((r) => setTimeout(r, 0));

type Deferred<T> = { promise: Promise<T>; resolve(v: T): void; reject(e: unknown): void };
function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const model = (id: string): ImageModel => ({ id, name: id, params: {} });

/** Fake provider whose priceOf calls stay pending until the test settles them. */
function fakeProvider(id: "openrouter" | "vercel", ids: string[], stats: { inFlight: number; max: number }) {
  const calls: { modelId: string; d: Deferred<ModelPrice> }[] = [];
  let listCalls = 0;
  const listGate = deferred<void>();
  const provider = {
    id,
    name: id,
    configured: true,
    async listModels() {
      listCalls++;
      await listGate.promise;
      return ids.map(model);
    },
    async priceOf(modelId: string) {
      const d = deferred<ModelPrice>();
      calls.push({ modelId, d });
      stats.inFlight++;
      stats.max = Math.max(stats.max, stats.inFlight);
      try {
        return await d.promise;
      } finally {
        stats.inFlight--;
      }
    },
    async generate() {
      throw new Error("unused");
    },
  } as unknown as ImageProvider;
  return { provider, calls, listCalls: () => listCalls, openList: () => listGate.resolve() };
}

function setup(ids: string[] = ["m1"], idsB: string[] = []) {
  const stats = { inFlight: 0, max: 0 };
  const a = fakeProvider("openrouter", ids, stats);
  const b = fakeProvider("vercel", idsB, stats);
  a.openList();
  b.openList();
  let t = 1_000_000;
  const clock = {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
  const registry = registryOf([a.provider, b.provider]);
  const catalog = createModelCatalog(registry, clock.now);
  const prices = createPriceCatalog(registry, catalog, clock.now);
  return { a, b, stats, clock, prices };
}

describe("price lookups: in-flight sharing", () => {
  it("two concurrent price() calls for one model make one upstream call and both get the answer", async () => {
    const { a, prices } = setup();
    const p1 = prices.price("openrouter", "m1");
    const p2 = prices.price("openrouter", "m1");
    await flush();
    expect(a.calls).toHaveLength(1);
    a.calls[0]?.d.resolve(PRICE);
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.price).toEqual(PRICE);
    expect(r2.price).toEqual(PRICE);
    expect(a.calls).toHaveLength(1);
  });
});

describe("price lookups: global cap of 4", () => {
  it("10 concurrent lookups across two providers never exceed 4 in flight", async () => {
    const orIds = Array.from({ length: 5 }, (_, i) => `or${i}`);
    const vIds = Array.from({ length: 5 }, (_, i) => `v${i}`);
    const { a, b, stats, prices } = setup(orIds, vIds);
    const all = [...orIds.map((m) => prices.price("openrouter", m)), ...vIds.map((m) => prices.price("vercel", m))];
    let settled = 0;
    const done = Promise.all(all).then(() => settled++);
    // Settle upstream calls one by one as they appear, until every lookup is answered.
    for (let guard = 0; guard < 200 && settled === 0; guard++) {
      await flush();
      expect(stats.inFlight).toBeLessThanOrEqual(4);
      const next = [...a.calls, ...b.calls].find((c) => !("done" in c));
      if (next) {
        (next as { done?: boolean }).done = true;
        next.d.resolve(PRICE);
      }
    }
    await done;
    expect(a.calls.length + b.calls.length).toBe(10);
    expect(stats.max).toBeLessThanOrEqual(4);
    expect(stats.max).toBeGreaterThan(1);
  });
});

describe("price lookups: caching", () => {
  it("a failed lookup is answered from cache for 60 s with the same ProviderError, then retried", async () => {
    const { a, clock, prices } = setup();
    const first = prices.price("openrouter", "m1");
    await flush();
    a.calls[0]?.d.reject(new ProviderError("openrouter", 503, "boom"));
    await expect(first).rejects.toBeInstanceOf(ProviderError);

    clock.advance(59_000);
    const cached = prices.price("openrouter", "m1");
    cached.catch(() => {});
    await flush();
    expect(a.calls).toHaveLength(1); // no upstream call within 60 s
    await expect(cached).rejects.toMatchObject({ name: "ProviderError", provider: "openrouter", upstreamStatus: 503 });

    clock.advance(2_000); // 61 s after the failure
    const retry = prices.price("openrouter", "m1");
    await flush();
    expect(a.calls).toHaveLength(2);
    a.calls[1]?.d.resolve(PRICE);
    expect((await retry).price).toEqual(PRICE);
  });

  it("an unloadable model list is remembered as a failure for 60 s too", async () => {
    let listCalls = 0;
    const provider = {
      id: "openrouter",
      name: "openrouter",
      configured: true,
      async listModels() {
        listCalls++;
        throw new ProviderError("openrouter", 503, "list down");
      },
      async priceOf() {
        return PRICE;
      },
    } as unknown as ImageProvider;
    let t = 1_000_000;
    const registry = registryOf([provider]);
    const prices = createPriceCatalog(
      registry,
      createModelCatalog(registry, () => t),
      () => t,
    );
    await expect(prices.price("openrouter", "m1")).rejects.toBeInstanceOf(ProviderError);
    expect(listCalls).toBe(1);
    t += 30_000;
    await expect(prices.price("openrouter", "m1")).rejects.toBeInstanceOf(ProviderError);
    expect(listCalls).toBe(1); // answered from the failure cache
    t += 31_000;
    await expect(prices.price("openrouter", "m1")).rejects.toBeInstanceOf(ProviderError);
    expect(listCalls).toBe(2);
  });

  it("successes are cached for 10 minutes", async () => {
    const { a, clock, prices } = setup();
    const first = prices.price("openrouter", "m1");
    await flush();
    a.calls[0]?.d.resolve(PRICE);
    await first;

    clock.advance(9 * 60_000);
    expect((await prices.price("openrouter", "m1")).price).toEqual(PRICE);
    expect(a.calls).toHaveLength(1);

    clock.advance(61_000); // past 10 min
    const again = prices.price("openrouter", "m1");
    await flush();
    expect(a.calls).toHaveLength(2);
    a.calls[1]?.d.resolve(PRICE);
    await again;
  });
});

describe("model catalog: in-flight list load", () => {
  it("concurrent misses share one listModels() call", async () => {
    const stats = { inFlight: 0, max: 0 };
    const a = fakeProvider("openrouter", ["m1", "m2"], stats);
    const catalog = createModelCatalog(registryOf([a.provider]), () => 1_000_000);
    const reqs = [
      catalog.models("openrouter"),
      catalog.models("openrouter"),
      catalog.find("openrouter", "m1"),
      catalog.find("openrouter", "m2"),
    ];
    await flush();
    a.openList();
    const res = await Promise.all(reqs);
    expect(a.listCalls()).toBe(1);
    expect((res[2] as ImageModel).id).toBe("m1");
    expect((res[3] as ImageModel).id).toBe("m2");
  });
});
