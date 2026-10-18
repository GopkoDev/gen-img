# Tracker — models-page

> Status of every task in the epic. `implement` updates **Status** and **Step** after every
> subagent it runs (and commits them with the task), so this table shows where the run is right now.
> Status: `todo` · `in_progress` · `blocked` · `review` · `done`.
> Step: `SELECT` · `RED` · `GREEN` · `REFACTOR` · `GATE` · `REVIEW` · `COMMIT` (`—` before the task starts).

| # | Task | Layer | Owner | Estimate | Blocked by | Status | Step |
|---|---|---|---|---|---|---|---|
| T1 | Accept preference writes that only turn flags off without checking the provider | ports | dmytro.hopko | S | — | done | COMMIT |
| T2 | Share preference reads and a per-flag optimistic mutation between the picker and the Models page | app | dmytro.hopko | M | — | done | COMMIT |
| T3 | Describe a model's supported parameters for the table | domain | dmytro.hopko | S | — | done | COMMIT |
| T4 | Build the Models page section | ui | dmytro.hopko | L | T1, T2, T3 | todo | — |
| T5 | Say in the generate form when the suitable models are hidden | ui | dmytro.hopko | S | T2 | todo | — |
| T6 | Measure the Models page rendering in a serial web timing project | tests | dmytro.hopko | S | T4 | todo | — |

**Total:** 6 tasks, ~4 person-days.
