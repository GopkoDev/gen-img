import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { HOST } from "./config";
import { onError } from "./errors";
import { requestGuard } from "./request-guard";

const app = new Hono();
app.onError(onError);
app.use("*", requestGuard([8787, 5173]));
app.get("/x", (c) => c.text("ok"));

const get = (headers: Record<string, string>) => app.request("http://127.0.0.1:8787/x", { headers });

describe("requestGuard", () => {
  it.each([
    [{ host: "127.0.0.1:8787" }],
    [{ host: "localhost:8787", origin: "http://localhost:8787", "sec-fetch-site": "same-origin" }],
    [{ host: "127.0.0.1:5173", origin: "http://127.0.0.1:5173", "sec-fetch-site": "same-origin" }],
    [{ host: "127.0.0.1:8787", "sec-fetch-site": "none" }],
  ])("lets gen-img's own pages and local tools through: %o", async (headers) => {
    expect((await get(headers)).status).toBe(200);
  });

  it.each([
    [{ host: "evil.example:8787" }],
    [{ host: "127.0.0.1:3000" }],
    [{ host: "127.0.0.1:8787", origin: "http://localhost:3000" }],
    [{ host: "127.0.0.1:8787", origin: "https://evil.example" }],
    [{ host: "127.0.0.1:8787", origin: "null" }],
    [{ host: "127.0.0.1:8787", "sec-fetch-site": "cross-site" }],
    [{ host: "127.0.0.1:8787", "sec-fetch-site": "same-site" }],
  ])("refuses foreign pages and DNS rebinding: %o", async (headers) => {
    const res = await get(headers);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: { code: "FORBIDDEN", message: "Request refused: gen-img only answers its own pages" },
    });
  });
});

describe("bind address", () => {
  it("is the loopback address only", () => {
    expect(HOST).toBe("127.0.0.1");
  });
});
