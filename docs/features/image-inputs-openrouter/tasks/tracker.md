# Tracker — image-inputs-openrouter

> Status of every task in the epic. `implement` updates **Status** and **Step** after every
> subagent it runs (and commits them with the task), so this table shows where the run is right now.
> Status: `todo` · `in_progress` · `blocked` · `review` · `done`.
> Step: `SELECT` · `RED` · `GREEN` · `REFACTOR` · `GATE` · `REVIEW` · `COMMIT` (`—` before the task starts).

| # | Task | Layer | Owner | Estimate | Blocked by | Status | Step |
|---|---|---|---|---|---|---|---|
| T1 | Promote the generation_inputs migration | migration | dmytro.hopko | S | — | todo | — |
| T2 | Validate input images and model input ranges in shared code | domain | dmytro.hopko | S | — | todo | — |
| T3 | Send input images through the OpenRouter adapter | infra | dmytro.hopko | S | T2 | todo | — |
| T4 | Stage and record input copies with the generation | infra | dmytro.hopko | S | T1 | todo | — |
| T5 | Accept multipart starts with input images and expose inputs in the API | ports | dmytro.hopko | M | T3, T4 | todo | — |
| T6 | Add the input-images area to the generate panel (SCR-01) | ui | dmytro.hopko | M | T5 | todo | — |
| T7 | Show the inputs hint on tiles and the inputs section on the detail page | ui | dmytro.hopko | S | T5 | todo | — |
| T8 | Verify the input-image NFRs | tests | dmytro.hopko | S | T5 | todo | — |

**Total:** 8 tasks, ~4 person-days.
