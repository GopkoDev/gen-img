# Tracker — model-picker-preferences

> Status of every task in the epic. `implement` updates **Status** and **Step** after every
> subagent it runs (and commits them with the task), so this table shows where the run is right now.
> Status: `todo` · `in_progress` · `blocked` · `review` · `done`.
> Step: `SELECT` · `RED` · `GREEN` · `REFACTOR` · `GATE` · `REVIEW` · `COMMIT` (`—` before the task starts).

| # | Task | Layer | Owner | Estimate | Blocked by | Status | Step |
|---|---|---|---|---|---|---|---|
| T1 | Promote the model_preferences migration | migration | dmytro.hopko | S | — | done | COMMIT |
| T2 | Read and set model preferences through a models module | ports | dmytro.hopko | M | T1 | done | COMMIT |
| T3 | Share in-flight price lookups, cap them at 4 and cache failures for a minute | infra | dmytro.hopko | M | — | done | COMMIT |
| T4 | Arrange models into favorites and others and pick models for automatic choices | domain | dmytro.hopko | S | — | done | COMMIT |
| T5 | Build the ModelPicker popover with prices and favorite toggles | ui | dmytro.hopko | L | T2, T4 | done | COMMIT |
| T6 | Use ModelPicker and pickModel in the generate panel | ui | dmytro.hopko | M | T5 | todo | — |
| T7 | Prove the preference timings in the nfr project | tests | dmytro.hopko | S | T2 | done | COMMIT |

**Total:** 7 tasks, ~5 person-days.
