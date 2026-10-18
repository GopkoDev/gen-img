---
id: T5
title: "Build the file store: stage, commit, discard, sweep, recorded reads"
layer: "infra"
deps: []
blocks: ["T7"]
acs: ["AC-08", "AC-12"]
files_hint: ["src/server/modules/storage/file-store.ts", "src/server/modules/storage/file-store.int.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "M"
status: "todo"
step: ""
---

# T5 — Build the file store: stage, commit, discard, sweep, recorded reads

## Place in the sequence

- **Blocked by:** — · **Blocks:** T7 — Run generations as a single-slot job and save results atomically.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** each successful generation saved on my machine with its output images and full metadata
> **So that** no prompt or result is lost and I can repeat the request later
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)

This task delivers: build the file store: stage, commit, discard, sweep, recorded reads.

## Inlined context

> write files to `<data>/.staging/<id>/`; in one SQLite transaction insert the rows and, as its last step, rename the staging dir to `<data>/generations/<id>/`; a failed rename aborts the transaction; on boot delete `.staging/*` and any `generations/<id>/` without a row. … The rename is synchronous (`renameSync`) … if anything throws after the rename (including COMMIT), the moved dir is removed before the error propagates … The file route serves only paths recorded in `generation_images`.
>
> — `adr/0006, option 1 + Decision outcome, abridged` · full text: [ADR-0006](../adr/0006-commit-generations-atomically-via-staging-dir-and-boot-sweep.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-08 — domain invariant

> **Given** the Owner generates successfully but saving the output images on the machine fails part-way (e.g. the disk is full)
> **When** the save is attempted
> **Then** the system keeps the invariant «a generation is saved only together with all its output images»: no partial generation appears in the gallery, and the Owner is told the result could not be stored and why
>
> — `spec.md §5, AC-08, verbatim` · full text: [spec.md](../spec.md)

### AC-12 — authorization

> **Given** the Owner (or a crafted link) asks the app for an image file
> **When** the requested file is not an image stored under the app's own data folder
> **Then** the system does not reveal it or whether it exists — only stored generation images are ever served
>
> — `spec.md §5, AC-12, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `createFileStore(dataDir)` in `file-store.ts`: `stage(id, images)` writes `<data>/.staging/<id>/output-<pos>.<ext>` and returns relative final paths `generations/<id>/output-<pos>.<ext>`
- [ ] `commitSync(id)` → `renameSync(.staging/<id>, generations/<id>)`; `discard(id)` → rm staging and final dir (force)
- [ ] `sweep(knownIds: Set<string>)` → rm `.staging/*`, rm `generations/<dir>` not in knownIds
- [ ] `resolveRecorded(relPath)` → absolute path under the data dir (caller guarantees it came from a DB row); refuse `..`/absolute anyway (defense in depth)

## Edge cases

| Case | Behaviour |
|---|---|
| disk full on 2nd image | stage throws; caller discards |
| rename target exists | throws; caller discards |
| path with `..` or absolute | refused |

## Definition of Done

- [ ] integration tests on a temp data dir: staged files invisible until commit; commit is a sync rename; discard removes staging + moved dir; sweep removes .staging/* and dirs not in the known-id set; read rejects any path not passed as recorded
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
