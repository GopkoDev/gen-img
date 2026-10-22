# Tracker — gallery-by-model

> Status of every task in the epic. `implement` updates **Status** and **Step** after every
> subagent it runs (and commits them with the task), so this table shows where the run is right now.
> Status: `todo` · `in_progress` · `blocked` · `review` · `done`.
> Step: `SELECT` · `RED` · `GREEN` · `REFACTOR` · `GATE` · `REVIEW` · `COMMIT` (`—` before the task starts).

| # | Task | Layer | Owner | Estimate | Blocked by | Status | Step |
|---|---|---|---|---|---|---|---|
| T1 | Promote the by-model index migration | migration | dmytro.hopko | S | — | done | COMMIT |
| T2 | Filter the list by model and read the models with counts and latest cards | ports | dmytro.hopko | M | T1 | done | COMMIT |
| T3 | Parse gallery views from the address and patch summaries in every view | app | dmytro.hopko | M | — | done | COMMIT |
| T4 | Add the view switch, the model choice and the filtered grid | ui | dmytro.hopko | M | T2, T3 | done | COMMIT |
| T5 | Show the gallery grouped by model | ui | dmytro.hopko | S | T4 | done | COMMIT |
| T6 | Step, close and delete in the dialog within the view it was opened from | ui | dmytro.hopko | M | T5 | done | COMMIT |
| T7 | Prove that changes re-read only the views on screen | tests | dmytro.hopko | S | T6 | done | COMMIT |

**Total:** 7 tasks, ~5 person-days.
