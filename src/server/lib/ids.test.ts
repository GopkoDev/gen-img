import { describe, expect, it } from "vitest";
import { AppError } from "./errors";
import { newId } from "./ids";

describe("newId", () => {
  it("returns a 26-char ULID", () => {
    expect(newId()).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it("sorts by creation time, even within the same millisecond", () => {
    const now = Date.now();
    const ids = [newId(now), newId(now), newId(now + 1)];
    expect([...ids].sort()).toEqual(ids);
  });
});

describe("AppError", () => {
  it("carries code, status and details", () => {
    const err = new AppError("PROVIDER_ERROR", "upstream failed", 502, { provider: "openrouter", upstreamStatus: 500 });
    expect(err).toBeInstanceOf(Error);
    expect(err).toMatchObject({ code: "PROVIDER_ERROR", status: 502, details: { provider: "openrouter" } });
  });
});
