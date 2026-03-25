# UI Audit And Simplification Plan

This document audits the current ConceptVault UI before any implementation changes. It is based on:

- code inspection across the primary UI routes and shared components
- server-side service outputs used by those routes
- local database state
- a local runtime check

Runtime limitation:

- The app runs locally, but unauthenticated page access redirects through NextAuth.
- `NEXTAUTH_URL` currently points to `http://localhost:3000`, while this repo’s dev server started on `http://localhost:3001`.
- That blocked full signed-in browser inspection without changing local config, so this audit is grounded in code, service outputs, route behavior, and local data instead of an end-to-end authenticated browser session.

## Current UI Summary

### What the UI currently contains

The product currently exposes these user-facing surfaces:

- `agent-control-center` / `today`
  - Current home surface.
  - Includes workflow education, topic creation, topic readiness, launch actions, review queue, active items, and run history.
- `web-scout`
  - Used for live workflow execution and run inspection.
  - Handles report generation, topic refreshes, source-finding runs, and concept extraction runs.
- `library`
  - Shows imported documents, favorites, collections, search, and document detail pages.
- `ingest`
  - Adds new content via text, file upload, or URL import.
- `reports`
  - Shows approved research reports and report detail pages.
- `artifacts/[id]`
  - Shows raw artifact metadata, raw JSON content, and raw source refs.
- `chat`
  - Secondary assistant surface for asking about the vault and saving answers into the library.

There are also supporting or partial surfaces/components that affect the experience:

- a global sticky nav in `app/layout.tsx`
- dark-theme research surfaces and a separate light-theme chat surface
- shared primitives such as `Card`, `Badge`, `EmptyState`, and `Toast`
- duplicated page-local primitives in `app/today/page.tsx` and `app/web-scout/WebScoutRunClient.tsx`
- an unused `SourceWatchlistPanel` component in `app/web-scout/SourceWatchlistPanel.tsx`

### What the main workflows appear to be

The current product flow, as implemented today, is:

1. Add content in `ingest`.
2. Create or select a topic on the dashboard.
3. Run a source/report workflow from the dashboard.
4. Review proposals on the dashboard.
5. Open completed reports on `reports`.
6. Browse or edit source material in `library`.
7. Optionally use `chat` for follow-up questions or to save assistant output into the library.

The system’s core operational modes are exposed to users as:

- `Generate Report`
- `Refresh Topic`
- `Find New Sources`
- `Refresh Concepts`

### What current product behavior looks like with local data

Current local data and service outputs make the UX issues more concrete:

- `12` documents are currently present in the library.
- `4` saved topics exist.
- `4` approved research reports exist.
- `621` artifacts exist in total.
- The largest artifact groups are:
  - `293` proposed flashcards
  - `197` proposed concepts
  - `65` proposed web proposals
- Despite that backlog, `getAgentControlCenterView()` currently returns:
  - `0` inbox items
  - `0` active items

That mismatch happens because the dashboard service filters proposed and approved artifacts to `day = today`, while the actual backlog lives on earlier days.

Recent local runs also show the technical flavor of the current UX:

- multiple recent runs are marked `partial`
- recent step errors include raw low-level messages such as:
  - `400 Invalid schema for function 'checkVaultDuplicate': In context=('properties', 'urls', 'items'), 'uri' is not a valid format.`

### What kind of user the current UI seems optimized for

The current UI appears optimized for a technical operator who:

- understands agents, runs, artifacts, statuses, and stage timelines
- is comfortable with debug-style inspection
- can infer workflow meaning from internal system terms
- is likely the builder or sole owner of the system

It is not currently optimized for a user who simply wants to:

- add knowledge
- build a topic
- review sources
- generate a report
- understand what to do next

## Major UX Problems

### 1. The dashboard is overloaded and asks the user to do too many different jobs at once

`app/today/page.tsx` currently combines:

- a workflow explainer
- topic management
- topic creation
- workflow launching
- review inbox
- active items
- run timeline and error inspection

This produces a dense home screen with multiple competing centers of gravity. The page is trying to be:

- onboarding
- control panel
- queue
- reporting screen
- operational diagnostics screen

The result is high cognitive load and a weak first step.

### 2. Navigation and naming do not express one coherent product mental model

The current top-level navigation mixes several different mental models:

- `Agent Control Center`
- `LLM Chat`
- `Reports`
- `Library`
- `Ingest`

The actual product is topic-centered and proposal-first, but the UI labels present it as:

- a control room
- a separate LLM utility
- a storage area
- a report archive

That fragmentation is reinforced by route structure:

- the home experience is `agent-control-center`
- execution happens on `web-scout`
- the UI brand says `ConceptVault`
- the README still says `Knowledge Distiller`

This naming drift makes it harder to understand where to start and what the product fundamentally is.

### 3. Internal architecture leaks directly into user-facing language

The UI exposes too many internal system concepts to end users, including:

- `Agent Control Center`
- `WebScout`
- `Refresh Concepts`
- `runId`
- `mode: full_report`
- `Technical Timeline`
- raw step names such as `pipeline_resolve_targets`
- artifact lifecycle terms such as `proposed`, `approved`, `active`, `superseded`
- raw JSON content and source refs

These labels align with the implementation, but not with a simple user mental model.

### 4. The default home experience can look empty even when the system has meaningful pending work

This is one of the most important structural UX problems.

The dashboard’s view service in `server/services/today.service.ts` filters:

- proposed artifacts to `day = today`
- approved artifacts to `day = today`

That means the default review queue can appear empty even when the system contains a large unresolved backlog from prior runs.

Current local evidence:

- total artifacts: `621`
- proposed web proposals: `65`
- proposed concepts: `197`
- proposed flashcards: `293`
- dashboard inbox today: `0`
- dashboard active today: `0`

This creates a false-empty home state and hides work that still matters.

### 5. The run screen emphasizes machine progress over user outcomes

`app/web-scout/WebScoutRunClient.tsx` is more understandable than the dashboard in some places, but it still leads with internal execution detail:

- stage badges
- metrics tied to pipeline counts
- raw mode labels
- run IDs
- technical timeline
- payload dumps
- step-by-step trace output

The user outcome is secondary, even though the actual user question is usually simple:

- Did the run finish?
- What did it create?
- What should I do next?

Right now the page reads more like a trace viewer than a research task result screen.

### 6. Review and results are fragmented across too many surfaces

The current review model is spread across:

- dashboard review inbox
- dashboard active section
- reports page
- artifact detail page
- library pages

That fragmentation makes the flow harder to follow:

- source review happens in one place
- long-form output lives somewhere else
- raw artifact debug data lives somewhere else again

The system is proposal-first, but the UI does not present a single unified review model.

### 7. The artifact detail page is debug-oriented, not review-oriented

`app/artifacts/[id]/page.tsx` displays:

- metadata
- raw JSON content
- raw source refs

That is useful for debugging, but it is not a good default review surface for normal users. When dashboard links fall through to this page, the interaction model abruptly changes from product UI to internal inspection.

### 8. Library organization is based on system provenance rather than user goals

The library main page splits content into:

- `WebScout Discoveries`
- `Manual Ingest`

That distinction reflects where content came from, not how a person wants to find or use it.

The sidebar then uses a different organizational model:

- favorites
- collections
- all documents

This mixes multiple information architectures at once:

- provenance-based grouping
- personal grouping
- flat browsing

The result is more structure than the current data volume requires, with less clarity than a simpler document-first library would provide.

### 9. Content quality issues are visible, but editing and correction are not prominent enough

Current local data includes at least one document with a clearly broken title:

- `Frameworks provide structure, standardize processes, and improve collaboration. Siit helps automate workflows and track progress for effective framework implementation." name="description"/><meta cont`

That is exactly the kind of library quality problem users need to correct quickly. Today:

- the issue is visible
- title editing exists
- but editing is tucked behind a hover-only control on the document detail page

The UI exposes the problem without making the fix feel first-class.

Topic quality has a similar issue:

- current local topics include names like `AI Native SOftware development skills` and `CLaude Agent SDK`
- the form does not help users normalize or review the result

### 10. Ingest is the clearest flow, but it still carries unnecessary complexity

`app/ingest/page.tsx` is the simplest main surface, but even here the UI asks users to choose among:

- `Text`
- `File`
- `URL`

That split is defensible, but the page also repeats:

- similar submit sections
- similar helper copy
- multiple versions of `Ingest Content`

The page is usable, but it can be simplified further.

### 11. Chat is secondary, but the IA and styling make it feel like a co-equal product

Chat appears in the global navigation and is visually distinct:

- dark chrome everywhere else
- light, notebook-like interface in chat
- separate interaction model

That creates product sprawl. Chat can be useful, but it currently looks like a sibling app rather than a supporting tool.

There is also at least one confusing control on the chat surface:

- the attachment button appears in the composer
- it currently has no connected action

That is unnecessary UI unless or until it becomes functional.

### 12. Shared UI patterns are duplicated instead of normalized

Several important patterns are duplicated with slightly different behavior or styling:

- cards
- empty states
- status badges
- date/time helpers
- duration helpers

Examples:

- `app/components/Card.tsx` and a page-local `Card` inside `app/today/page.tsx`
- `app/components/EmptyState.tsx` and a page-local `EmptyState` inside `app/today/page.tsx`
- separate `StatusBadge` implementations in the dashboard and run screen

This increases UI inconsistency and makes the product feel less deliberate.

### 13. The visual hierarchy leans heavily on chrome and labels instead of clear task emphasis

The main research surfaces share a strong dark visual shell with:

- sticky headers
- glassy panels
- many bordered cards
- uppercase eyebrow labels
- decorative ambient effects

The Roman numeral background and layered dark panels add atmosphere, but they do not help users understand:

- what the main task is
- what is actionable right now
- what can wait

The visual system is expressive, but the hierarchy is not yet disciplined enough.

## Simplification Opportunities

### What can be removed

- Remove the dashboard’s separate `Simple Workflow` explainer once the page itself is structured like the workflow.
- Remove the chat attachment button until it has a real interaction.
- Remove raw artifact pages from the normal review path; keep them as debug-only detail.
- Remove provenance-based library grouping as the primary library structure.
- Consider removing the Roman numeral background from primary workflow surfaces if it continues to compete with clarity.
- Consider removing the dashboard keyboard shortcuts modal if it is not heavily used.
- Remove or archive `app/web-scout/SourceWatchlistPanel.tsx` if it is not part of the intended surfaced product.

### What can be combined

- Combine topic readiness and topic actions into a single topic list rather than separate “ready” and “needs more sources” sections plus separate workflow buttons below.
- Combine the two review sections into one review queue with lightweight type badges.
- Combine run summary and generated results into a single outcome-first run detail surface.
- Combine reports and recent successful runs conceptually so the product tells one story from task to report.

### What can be hidden behind progressive disclosure

- Move topic scheduling and cadence into `Advanced options`.
- Keep run traces behind `Technical details`.
- Keep raw JSON payloads behind a deeper debug-only layer.
- Keep artifact metadata and source refs behind `Technical details`.
- Hide rarely used topic controls until a topic is expanded or selected.

### What should be renamed

Top-priority renames:

- `Agent Control Center` -> `Research`
- `LLM Chat` -> `Ask Vault`
- `Choose Topic` -> `Topics`
- `Ready For Reports` -> `Ready to Generate`
- `Find New Sources` -> `Find Sources`
- `Refresh Concepts` -> `Extract Concepts`
- `Review Inbox` -> `Review Queue`
- `Found Articles` -> `Source Candidates`
- `Other Review Items` -> `Concepts and Flashcards`
- `Run Timeline` -> `Recent Activity`
- `Technical Timeline` -> `Technical Details`

Additional renames that would help:

- `Learning Goal` -> `What Do You Want to Learn?`
- `Track on schedule` -> `Run automatically`
- `Cadence` -> `Run frequency`
- `Approve and Save to Library` -> `Save Source`
- `Reject Source` -> `Dismiss`
- `Open full page` -> `View technical details`
- `Run Output` -> `Run Details`
- `Ingest Content` -> `Add Content`

### What should be reordered

Recommended home-page order:

1. Next action summary
2. Topics
3. Current run
4. Pending review queue
5. Recent activity

Current home-page order is much noisier and forces users to parse:

- explanatory content
- topic creation
- readiness logic
- action buttons
- review queue
- active items
- run history

before it becomes clear what matters most.

### What should become the primary path

The primary path should be explicit and consistent:

1. Add content
2. Create or choose topic
3. Find sources
4. Review candidates
5. Create report
6. Read report
7. Use library for reference

That path already exists in the product, but it is not presented as the dominant interaction model.

## Recommended New UX Direction

### A simpler mental model for the product

The product should present itself as a topic-based research workflow, not an agent operations console.

Recommended mental model:

- users build topics
- the system gathers and proposes sources
- users review what is worth keeping
- the system turns approved material into reports and learning outputs
- the library becomes the long-term reference layer

Agents are implementation detail. They should still exist, but they should not be the main story of the UI.

### Ideal top-level navigation / page structure

Recommended top-level navigation:

- `Research`
- `Library`
- `Reports`
- `Add Content`
- `Ask Vault`

Navigation notes:

- `Research` should replace `Agent Control Center` as the home surface.
- `Run details` should not appear as a separate top-level concept.
- Artifact debug views should not appear in primary navigation or primary calls to action.
- Chat should remain available, but as a secondary utility rather than a co-equal product pillar.

### Ideal main screen layout

Recommended `Research` layout:

1. Header with one-sentence product framing and the next best action.
2. Topic list with:
   - readiness state
   - last report state
   - primary action
   - optional secondary action
3. Current run summary:
   - current step in human language
   - what the run is producing
   - what the user can do next
4. Review queue:
   - grouped but unified
   - count-first
   - action-first
5. Recent activity:
   - collapsed or secondary
6. Technical details:
   - collapsed by default

This keeps the main screen focused on the workflow instead of on the system internals.

### How users should move through the product step by step

1. Add source material through `Add Content`.
2. Create a topic or select an existing topic.
3. Run `Find Sources` or `Refresh Topic` if the topic is not yet ready.
4. Review proposed sources in one unified review queue.
5. Generate a report when a topic is ready.
6. Read the report and follow links back to source material.
7. Use `Library` or `Ask Vault` for later reference and exploration.

### What the UI should emphasize vs. de-emphasize

Emphasize:

- next action
- topic readiness
- pending review counts
- latest completed report
- human-readable outcomes
- source/report quality

De-emphasize:

- agent names
- raw run IDs
- machine run modes
- low-level step names
- raw payload JSON
- internal pipeline stage terminology
- provenance-based grouping as the primary browsing model

## Prioritized Action Plan

### Must fix

- Reframe the home/dashboard around one primary task flow.
  - Why it matters: This is the densest and most important screen. Right now it splits attention across topic management, onboarding, review, and debugging.
  - User impact: Users will understand where to start and what to do next without reading the entire page.
  - Scope: medium to large UX restructuring of the home surface, without changing core backend behavior.
  - Suggested files/components to change: `app/layout.tsx`, `app/page.tsx`, `app/agent-control-center/page.tsx`, `app/today/page.tsx`, `app/today/TodayClient.tsx`

- Stop hiding pending review work behind the `today` filter.
  - Why it matters: The current home screen can falsely imply there is nothing to review, even when a large backlog exists.
  - User impact: Users will see actual pending work and trust the queue.
  - Scope: small backend query adjustment plus some UI messaging updates.
  - Suggested files/components to change: `server/services/today.service.ts`, `app/today/page.tsx`

- Simplify the run screen into outcome first, diagnostics second.
  - Why it matters: The run view currently behaves like a trace viewer first and a task result screen second.
  - User impact: Users will understand whether a run succeeded, what it produced, and what to do next without parsing stage internals.
  - Scope: medium content and layout restructuring.
  - Suggested files/components to change: `app/web-scout/page.tsx`, `app/web-scout/WebScoutRunClient.tsx`

- Remove or redesign raw artifact-detail pages from the normal user path.
  - Why it matters: Raw JSON is a poor default review surface for normal users.
  - User impact: Lower cognitive load during review and fewer abrupt transitions into debug UI.
  - Scope: medium; can be solved by changing links, creating better review surfaces, or clearly labeling the current page as technical-only.
  - Suggested files/components to change: `app/artifacts/[id]/page.tsx`, plus links in `app/today/page.tsx`

- Unify product naming and navigation.
  - Why it matters: Current labels create mental-model drift and fragment the product.
  - User impact: Faster orientation and less confusion across surfaces.
  - Scope: medium copy and navigation update across shared layout and page headers.
  - Suggested files/components to change: `app/layout.tsx`, `app/page.tsx`, page headers across `app/today/page.tsx`, `app/web-scout/page.tsx`, `app/reports/page.tsx`, `app/ingest/page.tsx`, and repo-facing docs such as `README.md`

### Should fix

- Simplify topic creation to name + goal by default and move tracking/cadence behind advanced settings.
  - Why it matters: The form currently mixes core topic creation with scheduling and system tuning.
  - User impact: Faster topic creation and less intimidation for first-time use.
  - Scope: medium form simplification.
  - Suggested files/components to change: `app/today/page.tsx`, `app/api/topics/route.ts`

- Reorganize library around user goals instead of ingestion source type.
  - Why it matters: `WebScout Discoveries` vs `Manual Ingest` reflects system provenance, not how people look for knowledge.
  - User impact: Easier browsing and less duplicated hierarchy.
  - Scope: medium information architecture adjustment.
  - Suggested files/components to change: `app/library/page.tsx`, `app/library/layout.tsx`, `app/library/components/LibraryShell.tsx`, `app/library/components/LibrarySidebar.tsx`

- Make document cleanup and correction more visible.
  - Why it matters: Current local data already includes visibly broken document titles, and the repair path is not prominent enough.
  - User impact: Better library quality and less friction when cleaning imports.
  - Scope: small to medium.
  - Suggested files/components to change: `app/library/[id]/DocumentClient.tsx`, `app/library/page.tsx`

- Tighten ingest copy and reduce repeated controls.
  - Why it matters: Ingest is close to usable, but it still has duplicated helper text and multiple near-identical submit regions.
  - User impact: Faster scanning and faster input completion.
  - Scope: small to medium.
  - Suggested files/components to change: `app/ingest/page.tsx`

- Make reports feel like the end of the same workflow rather than a separate archive.
  - Why it matters: Reports are the clearest user-facing output, but they feel disconnected from the topic/review flow.
  - User impact: Stronger sense of completion and continuity.
  - Scope: small to medium.
  - Suggested files/components to change: `app/reports/page.tsx`, `app/reports/[id]/ReportDetailClient.tsx`

- De-emphasize chat in the global IA and align its visual system.
  - Why it matters: Chat is secondary, but it is currently promoted heavily and uses a distinct visual language.
  - User impact: Less product sprawl and a clearer primary workflow.
  - Scope: medium.
  - Suggested files/components to change: `app/layout.tsx`, `app/chat/ChatPageContent.tsx`, `app/chat/components/ChatHistorySidebar.tsx`

### Nice to have

- Consolidate duplicated UI primitives and helper logic.
  - Why it matters: Duplicated patterns create subtle inconsistencies in status, date formatting, empty states, and card behavior.
  - User impact: More coherent product feel and easier future refinement.
  - Scope: medium refactor.
  - Suggested files/components to change: shared `app/components/*`, `app/today/page.tsx`, `app/web-scout/WebScoutRunClient.tsx`

- Remove or archive unused UI like `app/web-scout/SourceWatchlistPanel.tsx` if it is not part of the intended product surface.
  - Why it matters: Dead or unsurfaced UI adds maintenance overhead and design noise.
  - User impact: Cleaner codebase and less accidental product sprawl.
  - Scope: small.
  - Suggested files/components to change: `app/web-scout/SourceWatchlistPanel.tsx`

- Fix local auth/dev routing so browser review on non-3000 ports is reliable.
  - Why it matters: Local UX QA is currently blocked by auth redirect origin issues.
  - User impact: Faster local testing and more reliable review workflows for future UI work.
  - Scope: small environment and auth configuration cleanup.
  - Suggested files/components to change: `.env`, `auth.ts`, `proxy.ts`

## Before vs After Information Architecture

| Before | After |
| --- | --- |
| Agent Control Center | Research |
| Web Scout / Run Output | Run details opened from Research |
| Ingest | Add Content |
| Library | Library |
| Reports | Reports |
| LLM Chat | Ask Vault |
| Artifact Detail raw page | Technical details / debug-only view |

## UI Copy / Labeling Changes

Top-priority labeling changes:

- `Agent Control Center` -> `Research`
- `LLM Chat` -> `Ask Vault`
- `Choose Topic` -> `Topics`
- `Ready For Reports` -> `Ready to Generate`
- `Find New Sources` -> `Find Sources`
- `Refresh Concepts` -> `Extract Concepts`
- `Review Inbox` -> `Review Queue`
- `Found Articles` -> `Source Candidates`
- `Other Review Items` -> `Concepts and Flashcards`
- `Run Timeline` -> `Recent Activity`
- `Technical Timeline` -> `Technical Details`
- Hide raw `mode: full_report`
- Hide raw `runId`
- Replace `WebScout Discoveries` and `Manual Ingest` with neutral filters or badges

Additional clarity improvements:

- `Learning Goal` -> `What Do You Want to Learn?`
- `Track on schedule` -> `Run automatically`
- `Cadence` -> `Run frequency`
- `Approve and Save to Library` -> `Save Source`
- `Reject Source` -> `Dismiss`
- `Open full page` -> `View technical details`
- `Run Output` -> `Run Details`
- `Ingest Content` -> `Add Content`
- `No report yet` -> `No report generated yet`

## Likely Removable or De-emphasized UI Elements / Components

- `Simple Workflow` explainer card on the dashboard once the page structure itself communicates the flow
- `Active` section on the dashboard if its content is better expressed as latest completed outputs or recent actions
- raw artifact detail pages as a normal destination for review work
- `TodayBackground` / `RomanNumeralsBackground` on primary workflow screens if clarity remains the priority
- `KeyboardShortcutsHelp` on the dashboard if usage is low
- chat attachment button in `app/chat/ChatPageContent.tsx` until an actual upload flow exists
- provenance-based top-level library sections (`WebScout Discoveries`, `Manual Ingest`)
- `app/web-scout/SourceWatchlistPanel.tsx` if it is not meant to be part of the user-facing product

## Deliverable Checks

- This audit covers the main pages, layouts, panels, views, and navigation.
- It covers the core user journeys:
  - starting a research task
  - understanding what the system does
  - monitoring progress
  - reviewing outputs/results
  - editing/refining inputs
  - understanding agent status / steps / state
- It is grounded in the current codebase, service behavior, database state, and a local runtime check.
- It does not propose net-new product capabilities; it recommends simplification, renaming, regrouping, and progressive disclosure.
- It keeps technical detail available where useful, but recommends moving it out of the primary path.
