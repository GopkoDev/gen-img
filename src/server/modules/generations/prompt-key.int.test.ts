import { afterEach, describe, expect, it } from "vitest";
import { clearPromptKey, seedGeneration } from "../../../../tests/helpers/generations";
import { createTestApp } from "../../../../tests/helpers/test-app";
import { promptKey } from "./promptKey";
import { createGenerationsRepo } from "./repo";

let t: ReturnType<typeof createTestApp>;
afterEach(() => t.cleanup());

const keyOf = (id: string) => t.db.prepare("SELECT prompt_key FROM generations WHERE id = ?").pluck().get(id);

describe("prompt key persistence", () => {
  it("a saved generation carries the key of its prompt", () => {
    t = createTestApp();
    const g = seedGeneration(t.db, t.dataDir, { prompt: "a cat\n" });
    expect(keyOf(g.id)).toBe(promptKey("a cat\n"));
  });

  it("boot backfills 1 000 keyless generations within 2 s, then updates nothing", () => {
    t = createTestApp();
    const ids = Array.from(
      { length: 1000 },
      (_, i) => seedGeneration(t.db, t.dataDir, { prompt: `prompt ${i % 300}` }).id,
    );
    for (const id of ids) clearPromptKey(t.db, id);

    const start = performance.now();
    t.restart();
    expect(performance.now() - start).toBeLessThan(2000);

    const nulls = t.db.prepare("SELECT count(*) FROM generations WHERE prompt_key IS NULL").pluck().get();
    expect(nulls).toBe(0);
    expect(keyOf(ids[5] as string)).toBe(promptKey("prompt 5"));

    expect(createGenerationsRepo(t.db).backfillPromptKeys()).toBe(0);
  });
});
