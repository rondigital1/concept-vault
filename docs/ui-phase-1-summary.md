# UI Phase 1 Summary

## What changed

- The Research queue now shows pending review work from all days instead of only `day = today`.
- The queue UI now explains that backlog from earlier runs remains visible and shows only the newest items per section while keeping total counts truthful.
- Empty-state copy was updated so the page no longer implies there is no work when backlog exists elsewhere in the queue.
- The main user-facing naming was aligned around one scheme:
  - product brand: `Concept Vault`
  - home surface: `Research`
  - chat utility: `Ask Vault`
  - ingest surface: `Add Content`
  - run surface titles: `Generate Report`, `Refresh Topic`, `Find Sources`, `Extract Concepts`, `Run Details`
- The legacy `/agent-control-center` route now redirects to `/today`, and the main nav/back links point to `Research`.
- Dashboard section labels were tightened to match the audit direction:
  - `Topics`
  - `Ready to Generate`
  - `Review Queue`
  - `Source Candidates`
  - `Concepts and Flashcards`
  - `Recently Approved`
  - `Recent Activity`

## Why

- The previous dashboard could return an empty review queue even when large unresolved backlog existed on earlier days, which made the home surface untrustworthy.
- The product language mixed implementation terms with user tasks, which made it harder to understand where to start and what each surface was for.
- This phase keeps the backend behavior intact while making the current workflow easier to orient around.

## Files touched

- `server/services/today.service.ts`
- `app/today/page.tsx`
- `app/layout.tsx`
- `app/page.tsx`
- `app/agent-control-center/page.tsx`
- `app/web-scout/page.tsx`
- `app/web-scout/WebScoutRunClient.tsx`
- `app/reports/page.tsx`
- `app/ingest/page.tsx`

## Follow-up issues discovered

- The Research page now loads all proposed and approved artifacts across all days so counts are truthful. If backlog grows much larger, pagination or server-side per-section limits with aggregate counts will be worth adding.
- Several API routes still redirect to `/agent-control-center`; the new redirect keeps the user on `/today`, but the old path still exists internally for compatibility.
- The run view still exposes raw run IDs and low-level technical detail more prominently than a normal user needs.
- The raw artifact detail page is still reachable from review items for technical inspection.
- Repo-facing naming drift remains outside this phase, including `README.md` still using `Knowledge Distiller`.

## Recommended next phase

- Simplify the `Research` and run-result surfaces further so they lead with user outcomes and next actions, while pushing technical trace data behind secondary disclosure.
