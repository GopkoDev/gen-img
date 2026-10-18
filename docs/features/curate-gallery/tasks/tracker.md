# Tracker — curate-gallery

> Status of every task in the epic. `implement` updates **Status** and **Step** after every
> subagent it runs (and commits them with the task), so this table shows where the run is right now.
> Status: `todo` · `in_progress` · `blocked` · `review` · `done`.
> Step: `SELECT` · `RED` · `GREEN` · `REFACTOR` · `GATE` · `REVIEW` · `COMMIT` (`—` before the task starts).

| # | Task | Layer | Owner | Estimate | Blocked by | Status | Step |
|---|---|---|---|---|---|---|---|
| T1 | Promote the curation migration | migration | dmytro.hopko | S | — | done | COMMIT |
| T2 | Implement the shared tag and comment rules | domain | dmytro.hopko | S | — | done | COMMIT |
| T3 | Add comment, tag and atomic-delete queries to the generations repo | infra | dmytro.hopko | M | T1, T2 | done | COMMIT |
| T4 | Let the file store move a generation into staging and purge it | infra | dmytro.hopko | S | — | done | COMMIT |
| T5 | Curate and delete generations in the service without disturbing running work | app | dmytro.hopko | M | T3, T4 | done | COMMIT |
| T6 | Expose the curation and delete routes and add tags/comment to the DTOs | ports | dmytro.hopko | M | T5 | done | COMMIT |
| T7 | Build the Notes card: comment editor and tag editor (SCR-02) | ui | dmytro.hopko | M | T6 | todo | — |
| T8 | Build the delete confirmation and its after-effects (SCR-03, SCR-01 notice, SCR-04) | ui | dmytro.hopko | M | T6 | todo | — |
| T9 | Show tags and a comment marker on gallery tiles (SCR-01) | ui | dmytro.hopko | S | T6 | todo | — |
| T10 | Verify the curation and deletion NFRs | tests | dmytro.hopko | S | T6 | todo | — |

**Total:** 10 tasks, ~5 person-days.
