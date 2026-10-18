import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import { createQueryClient } from "./query-client";

describe("query client", () => {
  const retry = createQueryClient().getDefaultOptions().queries?.retry as (n: number, e: unknown) => boolean;

  it("never retries a client error such as «not found», so a deleted generation shows at once", () => {
    expect(retry(0, new ApiError(404, "NOT_FOUND", "Generation not found"))).toBe(false);
    expect(retry(0, new ApiError(409, "GENERATION_IN_PROGRESS", "busy"))).toBe(false);
  });

  it("retries server and network errors up to three times", () => {
    expect(retry(0, new ApiError(502, "PROVIDER_ERROR", "down"))).toBe(true);
    expect(retry(2, new TypeError("fetch failed"))).toBe(true);
    expect(retry(3, new TypeError("fetch failed"))).toBe(false);
  });
});
