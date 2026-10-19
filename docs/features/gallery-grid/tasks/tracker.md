# Tracker — gallery-grid

> Status of every task in the epic. `implement` updates **Status** and **Step** after every
> subagent it runs (and commits them with the task), so this table shows where the run is right now.
> Status: `todo` · `in_progress` · `blocked` · `review` · `done`.
> Step: `SELECT` · `RED` · `GREEN` · `REFACTOR` · `GATE` · `REVIEW` · `COMMIT` (`—` before the task starts).

| # | Task | Layer | Owner | Estimate | Blocked by | Status | Step |
|---|---|---|---|---|---|---|---|
| T1 | Carry the duration in the gallery list summary | ports | dmytro.hopko | S | — | done | COMMIT |
| T2 | Word the cost, size and count badges | domain | dmytro.hopko | S | — | done | COMMIT |
| T3 | Show the badge strip over each card's preview | ui | dmytro.hopko | S | T1, T2 | done | COMMIT |
| T4 | Load pages as the Owner scrolls and keep the place on return | ui | dmytro.hopko | M | T3 | done | COMMIT |
| T5 | Refresh a pending cost per card instead of the whole gallery | ui | dmytro.hopko | S | T4 | todo | — |

**Total:** 5 tasks, ~4 person-days.
