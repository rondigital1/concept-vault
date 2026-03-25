# UI Phase 2 Summary

## What changed

- The run screen now leads with a plain-language run summary: current status, what the run created, and the next actions.
- The primary run actions now point to user outcomes first:
  - open the finished report
  - return to the review queue
  - go back to Research
- The results section now emphasizes user-facing outputs:
  - report
  - source candidates
  - concepts
  - flashcards
- Result items now link to readable item summaries instead of raw artifact dumps.
- The artifact page was redesigned into a summary-first view with review actions for proposed items and clearer destination links back to Research, Reports, Library, or the original source.
- Research queue links were updated so the normal path uses summary pages or first-class destinations instead of raw technical views.
- Recently approved items on Research no longer send users straight into raw artifact pages by default:
  - reports open report pages
  - approved sources open Library when a document exists
  - other items open the new summary page

## What was moved behind progressive disclosure

- Run stage progress badges
- Pipeline metrics
- Run ID
- Step-by-step trace timeline
- Step payloads
- Raw artifact JSON content
- Raw artifact source refs

These now live under explicit `Technical Details` sections instead of appearing in the main user path.

## What was removed from the normal user path

- Source candidate cards on Research no longer expose raw JSON inline.
- The default “open details” path from Research no longer lands on a raw debug screen.
- The old artifact page behavior of showing metadata + JSON + source refs as the main content is gone.

## Follow-up issues for the dashboard redesign

- Research still carries a lot of responsibilities on one screen even after the link/path cleanup.
- The review queue is still split into source candidates versus concepts and flashcards; a more unified review model is still a likely next step.
- Recent activity on Research is still trace-heavy compared with the rest of the simplified flow.
- The run screen is clearer, but it still starts runs automatically from query params, which can make the page feel system-driven instead of user-driven.
- Some repo and route names still reflect implementation history (`web-scout`, `agent-control-center`) even though the visible labels are simplified.
