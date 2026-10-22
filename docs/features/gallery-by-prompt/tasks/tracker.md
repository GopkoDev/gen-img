# Tracker — gallery-by-prompt

> Status of every task in the epic. `implement` updates **Status** and **Step** after every
> subagent it runs (and commits them with the task), so this table shows where the run is right now.
> Status: `todo` · `in_progress` · `blocked` · `review` · `done`.
> Step: `SELECT` · `RED` · `GREEN` · `REFACTOR` · `GATE` · `REVIEW` · `COMMIT` (`—` before the task starts).

| # | Task | Layer | Owner | Estimate | Blocked by | Status | Step |
|---|---|---|---|---|---|---|---|
| T1 | Promote the prompt key migration | migration | dmytro.hopko | S | — | done | COMMIT |
| T2 | Write the prompt key on save and backfill older generations on boot | infra | dmytro.hopko | S | T1 | done | COMMIT |
| T3 | Read prompt groups, one group and a prompt's pages | ports | dmytro.hopko | M | T2 | done | COMMIT |
| T4 | Add the prompt views to the address and the caches | app | dmytro.hopko | S | — | done | COMMIT |
| T5 | Show the gallery grouped by prompt | ui | dmytro.hopko | M | T3, T4 | done | COMMIT |
| T6 | Show a prompt's grid and step within it in the dialog | ui | dmytro.hopko | M | T5 | done | COMMIT |

**Total:** 6 tasks, ~5 person-days.
