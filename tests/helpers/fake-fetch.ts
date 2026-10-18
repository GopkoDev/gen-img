import { readFileSync } from "node:fs";
import { join } from "node:path";

export const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(join(import.meta.dirname, "..", "fixtures", name), "utf8"));

export type FakeReply = { status?: number; body?: unknown } | "hang" | "network-error";
type Route = (url: string, init: RequestInit) => FakeReply;

/** A `fetch` stand-in for provider HTTP: answers from fixtures, records every call, can hang until aborted. */
export function fakeFetch(route: Route) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    const reply = route(url, init);
    if (reply === "network-error") throw new TypeError("fetch failed");
    if (reply === "hang")
      return new Promise<Response>((_, reject) => {
        const signal = init.signal;
        signal?.addEventListener("abort", () => reject(signal.reason ?? new DOMException("Aborted", "AbortError")));
      });
    return new Response(JSON.stringify(reply.body ?? {}), {
      status: reply.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  return Object.assign(fn, { calls });
}
