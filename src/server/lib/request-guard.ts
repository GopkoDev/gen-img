import type { MiddlewareHandler } from "hono";
import { AppError } from "./errors";

const LOCAL_HOSTNAMES = new Set(["127.0.0.1", "localhost"]);

function isLocal(hostPort: string, ports: number[]): boolean {
  const m = /^([^:]+)(?::(\d+))?$/.exec(hostPort);
  if (!m?.[1] || !LOCAL_HOSTNAMES.has(m[1])) return false;
  // No port in the Host header means the default port; a real request only arrives on the port we listen on.
  return m[2] === undefined || ports.includes(Number(m[2]));
}

/**
 * Answers only Ukiyo's own pages (ADR-0007): a local Host on an allowed port (defeats DNS rebinding),
 * an own Origin when one is sent, and no cross-site Fetch Metadata. Everything else is refused.
 */
export function requestGuard(ports: number[]): MiddlewareHandler {
  return async (c, next) => {
    const host = c.req.header("host") ?? new URL(c.req.url).host;
    const origin = c.req.header("origin");
    const site = c.req.header("sec-fetch-site");

    let ok = isLocal(host, ports);
    if (ok && origin !== undefined) {
      const url = URL.canParse(origin) ? new URL(origin) : null;
      ok = url !== null && url.protocol === "http:" && isLocal(url.host, ports);
    }
    if (ok && site !== undefined) ok = site === "same-origin" || site === "none";

    if (!ok) throw new AppError("FORBIDDEN", "Request refused: Ukiyo only answers its own pages", 403);
    await next();
  };
}
