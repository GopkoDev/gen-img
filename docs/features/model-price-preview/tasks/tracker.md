# Tracker — model-price-preview

> Status: `todo` · `in_progress` · `blocked` · `review` · `done`. Step: `SELECT` · `RED` · `GREEN` · `REFACTOR` · `GATE` · `REVIEW` · `COMMIT`.

| # | Task | Layer | Owner | Estimate | Blocked by | Status | Step |
|---|---|---|---|---|---|---|---|
| T1 | Define the shared price shape and the estimate function | domain | dmytro.hopko | S | — | done | COMMIT |
| T2 | Map OpenRouter's per-model endpoints pricing to the price shape | infra | dmytro.hopko | S | T1 | done | COMMIT |
| T3 | Map Vercel's inline model-list pricing to the price shape | infra | dmytro.hopko | S | T1, T2 | done | COMMIT |
| T4 | Expose the model price with a per-model 10-minute cache | ports | dmytro.hopko | S | T2, T3 | done | COMMIT |
| T5 | Expose the Owner's known cost history per provider and model | ports | dmytro.hopko | S | T1 | done | COMMIT |
| T6 | Show the price and the estimate in the generate panel (SCR-01) | ui | dmytro.hopko | M | T4, T5 | todo | — |

**Total:** 6 tasks, ~2 person-days.
