# UI Phase 3 Summary

## New dashboard structure

- `Research` now leads with a single `Start Here` card that picks one next action in a fixed order:
  - review pending work
  - generate a report for the first ready topic
  - refresh the first topic that still needs sources
  - create a topic
- The page now follows one hierarchy:
  - primary action
  - work needing attention
  - topics that can move forward
  - recent outputs
  - recent activity
- The review queue is now one unified section instead of separate source and concept/flashcard queues.
- Topics are now one unified list instead of split readiness buckets.
- Topic creation is still available on the dashboard, but it is now secondary disclosure inside the `Topics` section.
- `Recent Activity` is still available, but it now sits behind collapsed disclosure instead of competing with the main task flow.

## Removed or merged sections

- Removed the standalone `Research Workflow` explainer card.
- Removed the standalone dashboard action strip for `Find Sources`, `Extract Concepts`, and `Open Reports`.
- Merged `Ready to Generate` and `Needs More Sources` into one `Topics` section.
- Merged `Source Candidates` and `Concepts and Flashcards` into one `Review Queue`.
- Replaced `Recently Approved` with `Recent Outputs`, which tells a clearer “finished work” story.
- Removed dashboard keyboard shortcuts and the keyboard shortcuts help overlay from the normal user path.

## Rationale for the new hierarchy

- The dashboard now answers the first question immediately: what should I do next?
- Review backlog is treated as the strongest “needs attention now” signal, so it wins the top action when present.
- Topics remain visible because they are the main control surface for the workflow, but they no longer compete through multiple sub-sections and extra CTA rows.
- Recent outputs stay easy to reach, with the newest report promoted first because reports are the clearest finished outcome.
- Recent activity is still available for troubleshooting, but it no longer competes with the normal research flow.

## Remaining technical debt

- Topic linked-document counts for not-yet-ready topics still rely on existing saved topic metadata when no ready-topic count is available.
- The dashboard still uses page-local helper components instead of shared Research UI primitives.
- Route and repo names such as `web-scout` and `agent-control-center` still reflect implementation history even though the visible UI is simplified.
- `TodayBackground` remains in place; if future clarity testing shows it competing with readability, it should be reconsidered.
- The dashboard still depends on full cross-day artifact lists from `getAgentControlCenterView()`. If data volume grows, server-side section limits plus separate aggregate counts will be worth adding.
