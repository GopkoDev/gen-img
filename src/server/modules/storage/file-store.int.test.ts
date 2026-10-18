import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFileStore } from "./file-store";

const img = (n: number) => ({ bytes: new Uint8Array([n, n, n]), mediaType: "image/png" as const });

describe("file store", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "gen-img-files-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("stages files invisibly, then makes them visible with one rename", async () => {
    const store = createFileStore(dir);
    const paths = await store.stage("01ABC", [img(1), { bytes: new Uint8Array([2]), mediaType: "image/jpeg" }]);
    expect(paths).toEqual(["generations/01ABC/output-1.png", "generations/01ABC/output-2.jpg"]);
    expect(existsSync(join(dir, "generations", "01ABC"))).toBe(false);
    expect(readdirSync(join(dir, ".staging", "01ABC")).sort()).toEqual(["output-1.png", "output-2.jpg"]);

    store.commitSync("01ABC");
    expect(existsSync(join(dir, ".staging", "01ABC"))).toBe(false);
    expect([...readFileSync(join(dir, "generations", "01ABC", "output-1.png"))]).toEqual([1, 1, 1]);
  });

  it("stages input copies beside the outputs and moves them together", async () => {
    const store = createFileStore(dir);
    await store.stage("IN", [img(1)]);
    const inputs = await store.stageInputs("IN", [img(7), { bytes: new Uint8Array([8]), mediaType: "image/webp" }]);
    expect(inputs).toEqual(["generations/IN/input-1.png", "generations/IN/input-2.webp"]);
    store.commitSync("IN");
    expect(readdirSync(join(dir, "generations", "IN")).sort()).toEqual(["input-1.png", "input-2.webp", "output-1.png"]);
  });

  it("discard removes the staging dir and an already-moved dir", async () => {
    const store = createFileStore(dir);
    await store.stage("A", [img(1)]);
    store.discard("A");
    expect(existsSync(join(dir, ".staging", "A"))).toBe(false);

    await store.stage("B", [img(1)]);
    store.commitSync("B");
    store.discard("B");
    expect(existsSync(join(dir, "generations", "B"))).toBe(false);
  });

  it("commit fails when the target already exists", async () => {
    const store = createFileStore(dir);
    mkdirSync(join(dir, "generations", "C"), { recursive: true });
    writeFileSync(join(dir, "generations", "C", "x"), "x");
    await store.stage("C", [img(1)]);
    expect(() => store.commitSync("C")).toThrow();
  });

  it("sweep deletes leftover staging and generation dirs without a record", async () => {
    const store = createFileStore(dir);
    await store.stage("KEEP", [img(1)]);
    store.commitSync("KEEP");
    await store.stage("ORPHAN", [img(1)]);
    store.commitSync("ORPHAN");
    await store.stage("HALF", [img(1)]);

    store.sweep(new Set(["KEEP"]));
    expect(readdirSync(join(dir, "generations"))).toEqual(["KEEP"]);
    expect(readdirSync(join(dir, ".staging"))).toEqual([]);
  });

  it("resolves recorded relative paths under the data dir and refuses anything that escapes it", () => {
    const store = createFileStore(dir);
    expect(store.resolveRecorded("generations/X/output-1.png")).toBe(join(dir, "generations", "X", "output-1.png"));
    expect(() => store.resolveRecorded("../etc/passwd")).toThrow();
    expect(() => store.resolveRecorded("/etc/passwd")).toThrow();
    expect(() => store.resolveRecorded("generations/../gen-img.db")).toThrow();
  });

  it("moves a generation into staging for deletion, purges it, and the sweep clears leftovers", async () => {
    const store = createFileStore(dir);
    await store.stage("DEL", [img(1)]);
    store.commitSync("DEL");

    store.trashSync("DEL");
    expect(existsSync(join(dir, "generations", "DEL"))).toBe(false);
    expect(readdirSync(join(dir, ".staging"))).toEqual(["DEL.deleted"]);
    store.purge("DEL");
    expect(readdirSync(join(dir, ".staging"))).toEqual([]);

    expect(() => store.trashSync("NEVER")).not.toThrow(); // missing dir: nothing to move

    await store.stage("LEFT", [img(1)]);
    store.commitSync("LEFT");
    store.trashSync("LEFT"); // crash before purge
    store.sweep(new Set());
    expect(readdirSync(join(dir, ".staging"))).toEqual([]);

    await store.stage("KEPT", [img(1)]);
    store.commitSync("KEPT");
    store.trashSync("KEPT"); // moved, but its row survived (rollback / crash before commit)
    store.sweep(new Set(["KEPT"]));
    expect(existsSync(join(dir, "generations", "KEPT", "output-1.png"))).toBe(true);

    store.trashSync("KEPT");
    store.restoreSync("KEPT");
    expect(existsSync(join(dir, "generations", "KEPT", "output-1.png"))).toBe(true);
    expect(() => store.restoreSync("NEVER")).not.toThrow();
  });

  it("throws when the generation directory can't be moved", async () => {
    const store = createFileStore(dir);
    await store.stage("RO", [img(1)]);
    store.commitSync("RO");
    chmodSync(join(dir, "generations"), 0o555);
    try {
      expect(() => store.trashSync("RO")).toThrow();
      expect(existsSync(join(dir, "generations", "RO"))).toBe(true);
    } finally {
      chmodSync(join(dir, "generations"), 0o755);
    }
  });
});
