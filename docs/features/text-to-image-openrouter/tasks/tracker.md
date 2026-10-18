# Tracker — text-to-image-openrouter

> Status of every task in the epic. `implement` updates **Status** and **Step** after every
> subagent it runs (and commits them with the task), so this table shows where the run is right now.
> Status: `todo` · `in_progress` · `blocked` · `review` · `done`.
> Step: `SELECT` · `RED` · `GREEN` · `REFACTOR` · `GATE` · `REVIEW` · `COMMIT` (`—` before the task starts).

| # | Task | Layer | Owner | Estimate | Blocked by | Status | Step |
|---|---|---|---|---|---|---|---|
| T1 | Promote the generations migration into the live tree | migration | dmytro.hopko | S | — | done | COMMIT |
| T2 | Implement generation domain rules: validation, params, cost conversion | domain | dmytro.hopko | S | — | done | COMMIT |
| T3 | Detect usable images: media type and dimensions from bytes | domain | dmytro.hopko | S | — | done | COMMIT |
| T4 | Define the ImageProvider port and build the OpenRouter adapter | infra | dmytro.hopko | M | T3 | done | COMMIT |
| T5 | Build the file store: stage, commit, discard, sweep, recorded reads | infra | dmytro.hopko | S | — | done | COMMIT |
| T6 | Write the generations repo: atomic insert, gallery page, detail, recorded path lookup | infra | dmytro.hopko | M | T1, T2 | done | COMMIT |
| T7 | Run generations as a single-slot job and save results atomically | app | dmytro.hopko | M | T4, T5, T6 | done | COMMIT |
| T8 | Guard every API request by Host, Origin and Fetch Metadata | wiring | dmytro.hopko | S | — | done | COMMIT |
| T9 | Expose providers and the cached model catalog | ports | dmytro.hopko | S | T4 | done | COMMIT |
| T10 | Expose generations, job and file routes and wire the app | ports | dmytro.hopko | M | T7, T8, T9 | done | COMMIT |
| T11 | Add the typed web API client and the two-route router | ui | dmytro.hopko | S | T10 | done | COMMIT |
| T12 | Build the generate panel (SCR-01) in all its states | ui | dmytro.hopko | M | T11 | todo | — |
| T13 | Build the gallery (SCR-02) with paging and empty state | ui | dmytro.hopko | S | T11 | done | COMMIT |
| T14 | Build the generation detail page (SCR-03) | ui | dmytro.hopko | S | T11 | done | COMMIT |
| T15 | Verify the performance and durability NFRs | tests | dmytro.hopko | S | T10 | done | COMMIT |

**Total:** 15 tasks, ~8 person-days.
