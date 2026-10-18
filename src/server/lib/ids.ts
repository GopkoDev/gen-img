import { monotonicFactory } from "ulid";

const next = monotonicFactory();

/** Time-sortable ULID — newest-first ordering falls out of `ORDER BY id DESC`. */
export function newId(now: number = Date.now()): string {
  return next(now);
}
