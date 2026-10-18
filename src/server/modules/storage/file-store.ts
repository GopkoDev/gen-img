import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};
const STAGING = ".staging";
const GENERATIONS = "generations";

export type StoredImageInput = { bytes: Uint8Array; mediaType: string };

/**
 * Image files of generations under the data dir (ADR-0006): files are written to `.staging/<id>/`
 * and become visible only through one synchronous rename to `generations/<id>/`, which the caller
 * runs inside the DB transaction that records them.
 */
export function createFileStore(dataDir: string) {
  const root = resolve(dataDir);
  const stagingDir = (id: string) => join(root, STAGING, id);
  const finalDir = (id: string) => join(root, GENERATIONS, id);
  mkdirSync(join(root, STAGING), { recursive: true });

  async function writeStaged(id: string, kind: "output" | "input", images: StoredImageInput[]): Promise<string[]> {
    const dir = stagingDir(id);
    await mkdir(dir, { recursive: true });
    const paths: string[] = [];
    for (const [i, image] of images.entries()) {
      const name = `${kind}-${i + 1}.${EXT[image.mediaType] ?? "bin"}`;
      await writeFile(join(dir, name), image.bytes);
      paths.push(`${GENERATIONS}/${id}/${name}`);
    }
    return paths;
  }

  return {
    /** Writes the output images to staging; returns their final paths relative to the data dir, in order. */
    stage(id: string, images: StoredImageInput[]): Promise<string[]> {
      return writeStaged(id, "output", images);
    },

    /** Writes copies of the input images beside the outputs (`input-N.<ext>`), in attach order. */
    stageInputs(id: string, images: StoredImageInput[]): Promise<string[]> {
      return writeStaged(id, "input", images);
    },

    /** Moves a staged generation into place. Synchronous so it can run inside a SQLite transaction. */
    commitSync(id: string): void {
      const target = finalDir(id);
      if (existsSync(target)) throw new Error(`Generation directory already exists: ${id}`);
      mkdirSync(join(root, GENERATIONS), { recursive: true });
      renameSync(stagingDir(id), target);
    },

    /** Removes everything written for a generation that will not be recorded. */
    discard(id: string): void {
      rmSync(stagingDir(id), { recursive: true, force: true });
      rmSync(finalDir(id), { recursive: true, force: true });
    },

    /**
     * Deletion's file step (ADR-0014): moves `generations/<id>` to `.staging/<id>.deleted` synchronously, as the
     * last step of the DB transaction. A missing directory is «nothing to move»; a failed move throws.
     */
    trashSync(id: string): void {
      const source = finalDir(id);
      if (!existsSync(source)) return;
      const target = join(root, STAGING, `${id}.deleted`);
      rmSync(target, { recursive: true, force: true });
      renameSync(source, target);
    },

    /** Undoes `trashSync` when the deletion did not commit — the generation keeps its files. */
    restoreSync(id: string): void {
      const trashed = join(root, STAGING, `${id}.deleted`);
      if (!existsSync(trashed) || existsSync(finalDir(id))) return;
      mkdirSync(join(root, GENERATIONS), { recursive: true });
      renameSync(trashed, finalDir(id));
    },

    /** Removes a deleted generation's files after the deletion committed (the boot sweep covers a crash). */
    purge(id: string): void {
      rmSync(join(root, STAGING, `${id}.deleted`), { recursive: true, force: true });
    },

    /** Boot clean-up: drops leftover staging and any generation directory without a record. */
    sweep(knownIds: Set<string>): void {
      // A deletion that never committed (crash / failed COMMIT) left a recorded generation's files in staging: put them back.
      const staging = join(root, STAGING);
      if (existsSync(staging))
        for (const name of readdirSync(staging)) {
          const id = name.endsWith(".deleted") ? name.slice(0, -".deleted".length) : null;
          if (id && knownIds.has(id) && !existsSync(finalDir(id))) {
            mkdirSync(join(root, GENERATIONS), { recursive: true });
            renameSync(join(staging, name), finalDir(id));
          }
        }
      rmSync(join(root, STAGING), { recursive: true, force: true });
      mkdirSync(join(root, STAGING), { recursive: true });
      const gens = join(root, GENERATIONS);
      if (!existsSync(gens)) return;
      for (const name of readdirSync(gens)) {
        if (!knownIds.has(name)) rmSync(join(gens, name), { recursive: true, force: true });
      }
    },

    /** Absolute path of a path recorded in the DB; refuses anything outside the data dir (defense in depth). */
    resolveRecorded(relPath: string): string {
      if (isAbsolute(relPath) || relPath.split(/[\\/]/).includes("..")) throw new Error("Invalid file path");
      const abs = resolve(root, relPath);
      if (relative(root, abs).startsWith("..")) throw new Error("Invalid file path");
      return abs;
    },
  };
}

export type FileStore = ReturnType<typeof createFileStore>;
