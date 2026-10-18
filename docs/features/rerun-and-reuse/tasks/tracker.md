# Tracker — rerun-and-reuse

> Status of every task in the epic. `implement` updates **Status** and **Step** after every
> subagent it runs (and commits them with the task), so this table shows where the run is right now.
> Status: `todo` · `in_progress` · `blocked` · `review` · `done`.
> Step: `SELECT` · `RED` · `GREEN` · `REFACTOR` · `GATE` · `REVIEW` · `COMMIT` (`—` before the task starts).

| # | Task | Layer | Owner | Estimate | Blocked by | Status | Step |
|---|---|---|---|---|---|---|---|
| T1 | Promote the lineage migration | migration | dmytro.hopko | S | — | done | COMMIT |
| T2 | Extend the shared start and detail schemas and add the parameter carry-over rule | domain | dmytro.hopko | S | — | done | COMMIT |
| T3 | Store lineage and look up stored images and derived generations in the repo | infra | dmytro.hopko | M | T1, T2 | done | COMMIT |
| T4 | Resolve stored-image references and record lineage when starting a generation | app | dmytro.hopko | M | T3 | done | COMMIT |
| T5 | Expose stored-image inputs and lineage through the routes | ports | dmytro.hopko | S | T4 | done | COMMIT |
| T6 | Fill the generate panel from a re-run or reuse source | ui | dmytro.hopko | M | T5 | todo | — |
| T7 | Keep supported parameters and name removed ones when the model changes | ui | dmytro.hopko | S | T6, T2 | todo | — |
| T8 | Add Re-run, Use as input and the lineage card to the detail view | ui | dmytro.hopko | M | T5 | todo | — |
| T9 | Verify derived generations survive source deletion and the NFRs | tests | dmytro.hopko | S | T5 | todo | — |

**Total:** 9 tasks, ~6 person-days.
