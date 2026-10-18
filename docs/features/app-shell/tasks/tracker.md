# Tracker — app-shell

> Status: `todo` · `in_progress` · `blocked` · `review` · `done`. Step: `SELECT` · `RED` · `GREEN` · `REFACTOR` · `GATE` · `REVIEW` · `COMMIT`.

| # | Task | Layer | Owner | Estimate | Blocked by | Status | Step |
|---|---|---|---|---|---|---|---|
| T1 | Parse addresses into pages and declare sections in one registry | domain | dmytro.hopko | S | — | done | COMMIT |
| T2 | Render the app frame, the navigation bar and the not-found page (SCR-04, SCR-05) | ui | dmytro.hopko | S | T1 | done | COMMIT |
| T3 | Keep the draft across sections and show the running generation in the bar | ui | dmytro.hopko | S | T2 | todo | SELECT |
| T4 | Point gallery and detail navigation at the sections | ui | dmytro.hopko | S | T3 | todo | SELECT |
| T5 | Prove section addresses get the app page and the API stays guarded | ports | dmytro.hopko | S | T1 | todo | SELECT |

**Total:** 5 tasks, ~1.5 person-days.
