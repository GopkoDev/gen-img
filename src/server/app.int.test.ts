import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestApp } from "../../tests/helpers/test-app";
import { ErrorResponse } from "../shared/errors";
import { HealthResponse } from "../shared/health";

describe("app boot smoke test", () => {
  let t: ReturnType<typeof createTestApp>;
  beforeEach(() => {
    t = createTestApp();
  });
  afterEach(() => t.cleanup());

  it("GET /api/health → 200 { status: ok }", async () => {
    const res = await t.app.request("/api/health");
    expect(res.status).toBe(200);
    expect(HealthResponse.parse(await res.json())).toEqual({ status: "ok" });
  });

  it("unknown /api route → 404 in the unified error envelope", async () => {
    const res = await t.app.request("/api/does-not-exist");
    expect(res.status).toBe(404);
    const body = ErrorResponse.parse(await res.json());
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
