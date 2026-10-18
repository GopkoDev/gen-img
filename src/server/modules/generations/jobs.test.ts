import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createJobSlot } from "./jobs";

describe("job slot", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "gen-img-jobs-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("keeps the failure in memory when the notice can't be written", () => {
    const slot = createJobSlot(join(dir, "missing-subdir"));
    slot.start();
    expect(() => slot.fail({ code: "STORAGE_ERROR", message: "disk full" })).not.toThrow();
    expect(slot.current()).toMatchObject({ status: "failed", error: { message: "disk full" } });
  });

  it("treats a corrupt notice file as no notice", () => {
    writeFileSync(join(dir, "last-job-failure.json"), '{"id":"J1","status":"fai');
    expect(createJobSlot(dir).current()).toBeNull();
  });

  it("writes the notice atomically (no temp files left behind)", () => {
    const slot = createJobSlot(dir);
    slot.start();
    slot.fail({ code: "PROVIDER_ERROR", message: "x" });
    expect(readdirSync(dir)).toEqual(["last-job-failure.json"]);
    expect(createJobSlot(dir).current()).toMatchObject({ status: "failed" });
  });
});
