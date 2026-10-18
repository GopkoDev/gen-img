# Changelog — curate-gallery

## curate-gallery — comment, tag and delete generations

**What:** On a generation's detail page the Owner can write one comment (explicit Save/Cancel, line breaks kept, blank removes it), add and remove up to 10 tags (normalized: trimmed, lower-case, letters of any alphabet/digits/space/-/_, 1–32 characters; saved on every change), and delete the generation after a confirmation dialog that names its prompt. Gallery tiles show the first 3 tags with «+N» and a comment marker. Deletion removes the record, comment, tags, output images and input copies together; the Owner lands on the gallery with a «Generation deleted.» notice, the generate panel stops showing a deleted latest result, and a pending price lookup for it is cancelled.

**Why:** The gallery kept everything but let the Owner neither record their judgment nor remove noise ([spec](./spec.md) §1/§2). Key decisions: all-or-nothing deletion by moving the generation directory into staging inside the delete transaction ([ADR-0014](./adr/0014-delete-generations-atomically-by-moving-their-directory-to-staging-inside-the-delete-transaction.md)), tags as normalized rows ([ADR-0015](./adr/0015-store-tags-as-normalized-rows-in-a-generation-tags-table.md)), per-tag changes and whole-comment replace ([ADR-0016](./adr/0016-change-tags-one-at-a-time-and-replace-the-comment-whole.md)).

**How to use:** open a generation → Notes card (comment, tags) and Delete. API ([openapi.yaml](./contracts/openapi.yaml)): `PUT /api/generations/{id}/comment` `{body}`, `POST /api/generations/{id}/tags` `{tag}`, `DELETE /api/generations/{id}/tags/{tag}`, `DELETE /api/generations/{id}`; gallery items gain `tags` + `hasComment`, the detail gains `tags` + `comment`.

**Operational notes:**
- Migration: adds `0006_create_generation_curation` (`generation_comments`, `generation_tags`, both cascading with the generation) — applied on server start; `pnpm db:rollback` reverts it.
- Deletion is irreversible (no trash). A crash between commit and purge leaves the files in `<data dir>/.staging/<id>.deleted`, removed on the next start.
- Feature flag / config: none.
- Rollback: revert the branch and run `pnpm db:rollback` once.

**Acceptance criteria delivered:** AC-01 … AC-15 (spec §5).
