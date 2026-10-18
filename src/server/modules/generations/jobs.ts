import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { AppError } from "../../lib/errors";
import { newId } from "../../lib/ids";

export const JobError = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type JobError = z.infer<typeof JobError>;

export const JobState = z.object({
  id: z.string(),
  status: z.enum(["running", "succeeded", "failed"]),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  generationId: z.string().optional(),
  error: JobError.optional(),
});
export type JobState = z.infer<typeof JobState>;

const NOTICE_FILE = "last-job-failure.json";

/**
 * The single generation slot (ADR-0005): at most one job runs; the last finished job is kept until
 * the next start or a dismiss. A failure notice is persisted so it survives a restart (AC-17).
 */
export function createJobSlot(dataDir: string, now: () => Date = () => new Date()) {
  const noticePath = join(dataDir, NOTICE_FILE);
  let state: JobState | null = null;
  if (existsSync(noticePath)) {
    const parsed = JobState.safeParse(JSON.parse(readFileSync(noticePath, "utf8")));
    state = parsed.success ? parsed.data : null;
  }
  const clearNotice = () => rmSync(noticePath, { force: true });
  const ensureIdle = () => {
    if (state?.status === "running")
      throw new AppError("GENERATION_IN_PROGRESS", "A generation is already in progress — wait until it finishes", 409);
  };

  return {
    current: (): JobState | null => state,

    start(): JobState {
      ensureIdle();
      clearNotice();
      state = { id: newId(), status: "running", startedAt: now().toISOString() };
      return state;
    },

    succeed(generationId: string): void {
      if (state) state = { ...state, status: "succeeded", finishedAt: now().toISOString(), generationId };
    },

    fail(error: JobError): void {
      if (!state) return;
      state = { ...state, status: "failed", finishedAt: now().toISOString(), error };
      writeFileSync(noticePath, JSON.stringify(state));
    },

    dismiss(): void {
      ensureIdle();
      clearNotice();
      state = null;
    },
  };
}

export type JobSlot = ReturnType<typeof createJobSlot>;
