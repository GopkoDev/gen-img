# Tracker — vercel-ai-gateway

> Status of every task in the epic. `implement` updates **Status** and **Step** after every
> subagent it runs (and commits them with the task), so this table shows where the run is right now.
> Status: `todo` · `in_progress` · `blocked` · `review` · `done`.
> Step: `SELECT` · `RED` · `GREEN` · `REFACTOR` · `GATE` · `REVIEW` · `COMMIT` (`—` before the task starts).

| # | Task | Layer | Owner | Estimate | Blocked by | Status | Step |
|---|---|---|---|---|---|---|---|
| T1 | Promote the cost_ref migration | migration | dmytro.hopko | S | — | done | COMMIT |
| T2 | Add the provider id, the port's cost reference and the pending-cost rule | domain | dmytro.hopko | S | — | done | COMMIT |
| T3 | Build the Vercel adapter: catalog and the three call paths | infra | dmytro.hopko | M | T2 | done | COMMIT |
| T4 | Look up Vercel prices and register the adapter | infra | dmytro.hopko | S | T3 | todo | — |
| T5 | Store cost references and resolve pending costs in the repo | infra | dmytro.hopko | S | T1, T2 | todo | — |
| T6 | Resolve pending costs in the background and resume them on boot | app | dmytro.hopko | M | T4, T5 | todo | — |
| T7 | Run the Vercel flow end to end through the API | ports | dmytro.hopko | S | T6 | todo | — |
| T8 | Add the provider selector to the generate panel | ui | dmytro.hopko | M | T7 | todo | — |
| T9 | Show pending costs that update themselves, and provider names | ui | dmytro.hopko | S | T7 | todo | — |
| T10 | Prove OpenRouter is unchanged and the NFRs hold with two providers | tests | dmytro.hopko | S | T7 | todo | — |

**Total:** 10 tasks, ~6 person-days.
