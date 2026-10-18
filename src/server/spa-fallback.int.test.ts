import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ErrorResponse } from "../shared/errors";
import { createApp } from "./app";
import { openDb } from "./db/client";
import { migrateUp } from "./db/migrate";

// Sections have their own addresses (ADR-0022): the built SPA must answer every one of them,
// while /api stays the guarded, enveloped API (spec AC-03, AC-09).
describe("built SPA fallback for section addresses", () => {
  let dir: string;
  let app: ReturnType<typeof createApp>;
  let db: ReturnType<typeof openDb>;
  const PAGE = "<!doctype html><title>Ukiyo</title><div id=root></div>";

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "gen-img-spa-"));
    const web = join(dir, "web");
    mkdirSync(join(web, "assets"), { recursive: true });
    writeFileSync(join(web, "index.html"), PAGE);
    writeFileSync(join(web, "assets", "app.js"), "console.log(1)");
    db = openDb(join(dir, "data"));
    migrateUp(db);
    const config = { openRouterApiKey: undefined, aiGatewayApiKey: undefined, dataDir: join(dir, "data"), port: 0 };
    app = createApp({ config, db }, { webDir: web });
  });
  afterEach(() => {
    app.stopBackground();
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it.each(["/", "/gallery", "/gallery/", "/generations/01ABC", "/no-such-page"])("%s → the app page", async (path) => {
    const res = await app.request(path);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(PAGE);
  });

  it("serves a real asset as the file, not the app page", async () => {
    const res = await app.request("/assets/app.js");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("console.log(1)");
  });

  it("keeps unknown /api addresses in the error envelope, never the app page", async () => {
    const res = await app.request("/api/gallery");
    expect(res.status).toBe(404);
    expect(ErrorResponse.parse(await res.json()).error.code).toBe("NOT_FOUND");
  });

  it("still refuses another site's request for data", async () => {
    const res = await app.request("/api/generations", { headers: { "sec-fetch-site": "cross-site" } });
    expect(res.status).toBe(403);
    expect(ErrorResponse.parse(await res.json()).error.code).toBe("FORBIDDEN");
  });
});
