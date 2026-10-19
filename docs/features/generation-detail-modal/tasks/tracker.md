# Tracker — generation-detail-modal

> Status of every task in the epic. `implement` updates **Status** and **Step** after every
> subagent it runs (and commits them with the task), so this table shows where the run is right now.
> Status: `todo` · `in_progress` · `blocked` · `review` · `done`.
> Step: `SELECT` · `RED` · `GREEN` · `REFACTOR` · `GATE` · `REVIEW` · `COMMIT` (`—` before the task starts).

| # | Task | Layer | Owner | Estimate | Blocked by | Status | Step |
|---|---|---|---|---|---|---|---|
| T1 | Carry a dialog state in history and keep one Gallery instance under it | app | dmytro.hopko | M | — | done | COMMIT |
| T2 | Find a generation's newer and older neighbours in the loaded order | domain | dmytro.hopko | S | — | done | COMMIT |
| T3 | Show the generation in a dialog over the grid and step through neighbours | ui | dmytro.hopko | L | T1, T2 | todo | — |
| T4 | Make the detail body safe and dialog-aware: busy, lineage, re-run and in-place card edits | ui | dmytro.hopko | M | T1, T3 | todo | — |
| T5 | Delete from the dialog and move to a neighbour | ui | dmytro.hopko | S | T4 | todo | — |
| T6 | Prove the dialog's timing, request counts and preloads | tests | dmytro.hopko | S | T5 | todo | — |

**Total:** 6 tasks, ~5 person-days.
