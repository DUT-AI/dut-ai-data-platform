# Historical Production UI Implementation and Parity Plan

> Reference only. This document records the completed migration approach and is not part of the mandatory frontend rulebook. Current agents must follow `.agent/rules/frontend-design/README.md`.

## Copy-ready agent prompt

You are migrating the approved DUT AI Data Platform `/demo` design into the existing production frontend. Work module by module. Preserve every current production behavior and API contract. The demo is a visual and interaction reference, not a replacement data model and not a source of production mock data.

Before editing:

1. Read `AGENTS.md` and `.agent/rules/GEMINI.md`.
2. Select `.agent/agents/frontend-specialist.md` for implementation and `.agent/agents/ui-ux-designer.md` for design decisions.
3. Read the selected agent's skill frontmatter and only the required skill entry points.
4. Always read `.agent/skills/data-platform-ui/SKILL.md`.
5. Read `.agent/rules/frontend-design/core-rules.md`, `component-rules.md`, and the matching page rule.
6. Inspect the corresponding `/demo` route and its module under `web/src/features/demo`.
7. Inspect the existing production route, feature module, hooks, API adapter, types, permissions, and all interaction states before editing.
8. Write the Purpose Gate answers for every new section or action.

Do not commit, push, deploy, change backend contracts, delete production behavior, or run a repository-wide write formatter unless the user explicitly expands the task.

Implementation ownership is intentionally split:

- The frontend implementation agent connects each screen to the existing real API adapters, hooks, types, permissions, and production state. It performs focused checks for the module it changed.
- The final integration reviewer performs the independent end-to-end verification across frontend, API, and backend after modules are integrated. A frontend agent must not represent a mocked, compile-only, or isolated component check as full-system validation.

## 1. Product objective

Create a calm, modern, timeless workspace for managing data and performing repetitive AI-data labeling work. The interface must be visually separated enough to scan quickly, but it must not become decorative, noisy, or dashboard-heavy.

The target experience must:

- Put the user's current work and next action before generic statistics.
- Put the project AI problem and measurable goal before technical version metadata.
- Make dataset browsing feel like opening a structured data folder.
- Make ontology versions understandable as an annotation contract.
- Keep repetitive annotation comfortable, keyboard-friendly, and focused.
- Explain Draft, Published, Submitted, Approved, Rejected, archived, unsaved, and permission states in text as well as color.
- Preserve all existing working capabilities while improving information hierarchy and interaction quality.

## 2. Current technical and domain baseline

The frontend is a Next.js application under `web/`. Production UI is already organized into business features:

- `web/src/features/auth`
- `web/src/features/dashboard`
- `web/src/features/projects`
- `web/src/features/dataset`
- `web/src/features/ontology`
- `web/src/features/annotation`
- `web/src/features/users`

The backend is a modular FastAPI application. Do not infer or rewrite backend contracts from demo data. Read the production TypeScript types and API adapters first.

The core data flow is:

```text
Project
  -> Dataset
    -> Dataset Version
      -> Asset
        -> Annotation Revision
```

The ontology contract is:

```text
Ontology
  -> Ontology Version
    -> ordered Inputs
      -> linked Outputs
        -> optional Categories
```

Important ontology behavior:

- A project has one official ontology context.
- Inputs, Outputs, and Categories are reusable catalog entities owned by an ontology.
- An Input defines media/data kind, item scope, accepted formats, and item schema.
- Input format has two levels: `InputDefinition.allowed_formats` defines the supported ceiling, while `OntologyInput.input_schema.allowed_extensions` stores the selected subset for the concrete ontology contract.
- An Output links to an Input and defines task type, required/multiple behavior, and value schema.
- Categories are optional and only apply when an Output needs a controlled label set.
- Supported concepts include image, tabular, video, audio, document, object, and link inputs.
- Output concepts include classification, bounding box, polygon, keypoint, video segment, audio segment, text, named entity, relation, number, and custom object.
- Only one Draft version may exist at a time.
- A Draft can derive from a Published version and is editable.
- A Published version is immutable and has a schema hash.
- Validation must cover at least one Input and Output, same-ontology links, accepted formats, schemas, and category constraints.
- Read access and write access differ by project role. Never expose an edit control when the production permission contract denies the action.

## 3. Reference implementation boundary

The approved reference lives only in:

- Routes: `web/src/app/demo`
- Feature code: `web/src/features/demo`
- Visual board: `/demo/design-system`
- Rules: `.agent/rules/frontend-design`

`/demo/design-system` is an internal developer/agent review board. It must not appear in normal product navigation and must not be migrated as an Admin feature. After production UI acceptance, the product owner may remove it or replace it with internal Storybook/documentation.

The demo intentionally uses mock state and simplified interactions. Reuse visual hierarchy, responsive behavior, component contracts, and interaction patterns. Do not copy mock IDs, people, emails, counts, asset URLs, or fake state into production.

The production code is the behavioral source of truth. For every migrated screen, the implementation agent must inspect and map the existing:

- React components and local state transitions.
- Query hooks, mutation hooks, cache keys, invalidation, and optimistic updates.
- API/service functions, request payloads, response mappers, and error normalization.
- TypeScript types, validation schemas, defaults, and derived values.
- Route parameters, query parameters, navigation, and refresh behavior.
- Permission checks and role-dependent controls.
- Upload queues, progress, cancellation, retry, and duplicate handling.
- Editor selection, save/revision state, keyboard shortcuts, and review workflow.

The agent may reorganize these responsibilities into clearer module boundaries, but it must not replace them with demo `useState`, static arrays, fake callbacks, or assumed endpoints. Any behavior that cannot be mapped must be listed as a parity gap before code is accepted.

### Preferred implementation method: reuse the demo presentation

Do not redesign the approved screens again. Reuse or adapt the demo's presentational JSX, Tailwind classes, responsive layout, section ordering, status treatments, dialog shells, empty states, and reusable visual components, then reconnect them to the equivalent production behavior.

For each demo module:

1. Identify the matching production route and feature module.
2. Copy or promote only the visual component structure that has been approved.
3. Replace demo arrays, IDs, counters, `useState` simulations, and fake callbacks with the existing production queries, mutations, services, types, permissions, validation, and router state.
4. Place each existing production action in its equivalent approved demo location.
5. Keep production-only functions that the simplified demo does not show; integrate them into the nearest matching panel, menu, dialog, or workspace region.
6. Compare the result with both the demo screenshot/route and the pre-migration production parity ledger.

Pure presentational demo components may be moved into the appropriate production or shared module when their contract is generic. Demo mock data and demo-only state must remain under `features/demo` and must never be imported by production routes.

The goal is a visual transplant with behavioral reconnection, not a second redesign and not a production rewrite.

### Ontology preservation rule

The production ontology editor is the behavioral and interaction baseline. Keep its existing connected canvas and editing model, including draggable nodes, visible connections, connect/disconnect behavior, Input/Output/Category CRUD dialogs, schema field builder, presets and preset review, version creation and selection, validation results, publish lifecycle, node details, and schema export.

The simplified `/demo` ontology graph demonstrates hierarchy, status color, selected-version presentation, and responsive region styling only. Do not replace the production canvas with the demo graph. Apply approved visual tokens and section hierarchy around the existing editor, and change its interaction architecture only through a separately approved product task.

For ontology specifically, reuse the demo page header, colored regions, version selector treatment, lifecycle metadata, accepted-format presentation, responsive layout, and dialog styling. Mount or restyle the existing production `OntologyCanvas`, node dialogs, connection controls, preset review, validation result, and schema export inside those equivalent regions.

Preserve the current ontology schema contracts and API calls. In particular, retain Input Definition formats, selected Input extensions, Input item schema, Output default/value schema, categories, composition ordering, schema hash, and immutable Published versions.

Production provider isolation for `/demo` is intentional. Do not use it as a pattern to bypass production authentication or API state.

## 4. Route and module mapping

| Production route                    | Demo reference                       | Production owner                       | Required outcome                                                                                                                      |
| ----------------------------------- | ------------------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `/login`                            | `/demo/login`                        | `features/auth`                        | Clear labeled form, inline validation, password reveal, error and loading states                                                      |
| `/dashboard`                        | `/demo/dashboard`                    | `features/dashboard`                   | Personal command center with a distinct welcome region, assigned work, projects, quality, alerts, and activity                        |
| `/projects`                         | `/demo/projects`                     | `features/projects`                    | Searchable/filterable project catalog with role, status, progress, current versions, and create flow                                  |
| `/projects/new`                     | Project create dialog/pattern        | `features/projects`                    | Keep all current create fields, validation, authorization, success, and failure behavior                                              |
| `/projects/[id]`                    | `/demo/projects/prj_traffic_da_nang` | `features/projects` plus child modules | URL-backed Overview, Datasets, Ontology, Members, and Settings navigation                                                             |
| Project Overview tab                | Demo Overview                        | `features/projects`                    | AI problem and goal first, then current contract versions, work state, quality, and activity                                          |
| Dataset tab                         | `?tab=datasets`                      | `features/dataset`                     | Dataset/version folder browser, preview, metadata, provenance, filters, upload/version actions, then annotation handoff               |
| Ontology tab                        | `?tab=ontology`                      | `features/ontology`                    | One selected version at a time, connected Input -> Output -> Categories graph, Draft editing, validation, publish, and create version |
| Members tab                         | `?tab=members`                       | `features/projects`                    | Role-aware members, invitations, role changes, access removal, and confirmation dialogs                                               |
| Settings tab                        | `?tab=settings`                      | `features/projects`                    | Metadata, export contract, archive/delete impact, permission and confirmation states                                                  |
| `/projects/[id]/annotate/[assetId]` | Demo annotation route                | `features/annotation`                  | Preserve editor dispatch and editing capabilities inside the focused responsive workspace                                             |
| `/users`                            | `/demo/users`                        | `features/users`                       | Admin user search, status, role/access actions, desktop table, and mobile cards                                                       |

## 5. Functional parity inventory

This list is a floor, not permission to remove capabilities that are discovered in the current code.

### Authentication and shell

- Login, current-user loading, logout, protected-route behavior, and authorization errors.
- Desktop sidebar and phone drawer without hiding primary navigation.
- Current project/user context and clear active navigation.
- No production request should be replaced by demo mock state.

### Projects

- List, search, filter, create, update, archive, and any existing delete/recovery behavior.
- Project roles and permission-sensitive actions.
- Member invitation, role change, removal, pending invite, and error handling.
- Preserve current fields even if the demo shows a smaller summary.

### Dataset and assets

- Dataset create, rename/update, archive/delete if currently supported.
- Dataset version create, inherit/derive, Draft/Published lifecycle, and immutable Published behavior.
- Drag-and-drop and direct file selection.
- Upload progress, validation, duplicate handling, cancellation/retry where supported, and server errors.
- Gallery and list views, filters, search, pagination or incremental loading.
- Asset preview and metadata: type, dimensions/duration/schema, size, source, ingestion state, and annotation state when available.
- Clear transition from browsing an Asset into annotation. The dataset page itself is not the labeling workspace.

### Ontology

- Ontology creation, update, delete/archive where supported.
- Input, Output, and Category CRUD.
- Version create/derive/update/delete according to the backend lifecycle.
- Version composition, ordering, link validation, validation result display, publish, schema hash, export, and presets where currently implemented.
- Draft controls are enabled only for authorized users.
- Published controls are read-only and cannot imply editability.
- Show only the selected version's graph; never merge multiple version contracts into one diagram.

### Annotation workspace

- Preserve editor selection by the actual `OutputDefinition` and data type.
- Preserve every implemented task mode, including current image, classification, bounding-box, polygon, brush, audio, video, text/NER/QA, tabular, relation, or other production editors.
- Preserve save, autosave/manual save status, submit, review, approve/reject/return, revision history, shortcuts, undo/redo, navigation, and permission behavior where present.
- Use the dark focused canvas only for the annotation work surface. Management pages remain light.
- On phone, stack the work areas or use an accessible sheet; do not shrink three desktop columns into unusable slivers.

### Users and settings

- Preserve admin-only actions, project settings fields, export semantics, archive/delete impact, and existing validation.
- All high-impact changes require an in-app confirmation surface.

## 6. Visual and interaction contract

- Use blue for primary action, selection, and focus.
- Use emerald for success/published/approved.
- Use amber for Draft/pending/warning.
- Use rose for error/rejected/destructive.
- Use sky for informational/submitted/review.
- Use slate for archived/disabled/unknown.
- Category colors are stable data colors and must not redefine status meaning.
- Separate major page regions with a restrained tint, border, or neutral background. Avoid white cards disappearing into a white page.
- Keep no more than three visually dominant regions in one viewport.
- Use borders before shadows. No glow, glass effect, decorative gradient, or oversized empty hero in operational pages.
- Use text labels with color. Never encode state by color alone.
- Use Lucide icons; do not use emoji as product structure.
- Controls use visible labels, `focus-visible` treatment, semantic HTML, and at least 44 x 44 px touch targets.
- Tabs must remain understandable and horizontally usable on narrow screens.
- Dialogs must fit the viewport, trap/focus correctly, close predictably, and expose consequence and recovery guidance.
- Never use browser-native `alert()`, `confirm()`, or `prompt()`.

## 7. Code and module architecture

Keep the production feature modules. Do not copy the entire demo tree into production.

Preferred feature shape:

```text
features/<business-module>/
  api/ or services/
  components/
    <named-section>/
  hooks/
  helpers/
  types/
  index.ts
```

Rules:

- Route `page.tsx` files resolve route parameters and compose feature views.
- State belongs to the smallest component or hook that owns the behavior.
- Cross-module primitives belong in the existing shared UI layer, not a generic catch-all feature.
- Split pages into named sections and dialogs when responsibilities differ.
- Reassess files above 360 lines. Extract only coherent responsibilities; do not split solely to satisfy a number. The threshold is a review signal, not an automatic failure.
- Do not compress JSX, callbacks, object literals, props, or chained logic into long one-line code.
- Follow repository Prettier and ESLint output. Editor save must not be needed to reveal formatting.
- Format only task-touched files. Never run a repository-wide write formatter in a dirty worktree.
- Preserve unrelated user changes and record the starting Git status before edits.

## 8. Migration sequence

Each phase must be independently reviewable and must preserve a working production route.

### Phase 0 - preflight and parity ledger

1. Record `git status --short`.
2. Read the production route, module, types, API calls, permissions, and tests.
3. Inventory all visible actions and non-happy states.
4. Capture before screenshots at 390px and 1440px.
5. Fill the Purpose Gate.
6. Write a parity checklist for that module before changing code.
7. Create a mapping table from each production query, mutation, service call, validation path, and permission check to its post-migration owner.

### Phase 1 - shared foundations

1. Map tokens, focus style, page background, region treatment, status colors, typography, spacing, radius, and elevation into the existing styling approach.
2. Build or refine shared Button, Badge, Notice, Dialog, Empty State, loading, form, and responsive navigation patterns.
3. Replace browser-native dialogs only inside the active task scope.
4. Verify shared changes against existing routes before continuing.

### Phase 2 - shell, authentication, dashboard, and users

Migrate the shell first so later screens share navigation and responsive behavior. Then migrate Login, Dashboard, and Users as separate review batches.

### Phase 3 - projects and project detail

Migrate Projects, create flow, Project Overview, Members, and Settings. Keep tab state in the URL. Verify roles and destructive-action dialogs before continuing.

### Phase 4 - dataset browser

Map the folder-browser hierarchy onto the real Dataset, Version, and Asset APIs. Preserve drag/drop, uploads, version lifecycle, preview, filters, and annotation handoff. Test large, empty, error, uploading, Draft, and Published states.

### Phase 5 - ontology editor

Map the selected-version graph onto real ontology types and hooks. Keep existing CRUD, ordering, validation, presets, export, derive/create version, publish, schema hash, and permissions. Prove that Draft can edit and Published cannot.

### Phase 6 - annotation workspace

Wrap the existing production editors in the approved workspace hierarchy without replacing editor behavior. Validate each supported task mode separately and verify keyboard, save/submit/review, revision, and phone behavior.

### Phase 7 - consolidation

After the product owner accepts production parity, remove only confirmed obsolete duplication. Keep `/demo` until the owner decides whether it remains a visual regression fixture. Never remove it as an implicit cleanup step.

### Phase 8 - independent full-stack integration review

This phase belongs to the final integration reviewer, not the module implementation agent.

1. Start the real frontend and backend with the repository-supported configuration.
2. Verify authentication and authorized project access against the real API.
3. Exercise each migrated CRUD path and read the resulting state back from the API.
4. Exercise file drag/drop and upload through ingestion, listing, preview, and annotation handoff.
5. Exercise ontology Draft editing, validation, version creation/derivation, publish, and Published immutability.
6. Exercise the supported annotation modes, revision save, submit, and review paths.
7. Verify permission failures, backend validation failures, network failures, and recovery UI.
8. Review frontend console output, API responses, backend logs, and persisted state together.
9. Repeat the critical path at desktop and phone widths.
10. Produce a separate integration report. Do not convert missing backend availability into a pass.

## 9. Definition of done per module

A module is complete only when:

- Its parity ledger has no unexplained missing action.
- Real APIs, types, permissions, and error behavior remain connected.
- Loading, empty, error, disabled, permission-denied, success, and unsaved states are represented.
- Risky edit/delete/publish/archive/role actions use in-app dialogs.
- Desktop and phone layouts have no horizontal page overflow.
- Keyboard focus is visible and main workflows are keyboard reachable.
- Text and essential controls meet WCAG AA contrast.
- The implementation matches the approved demo hierarchy and matching page rule.
- Before/after screenshots at 390px and 1440px are reviewed.
- Source formatting, scoped lint, typecheck, build, route behavior, console, and network checks pass.
- The module agent clearly separates focused frontend verification from the later independent FE-API-BE integration result.

## 10. Verification gate

Run fresh checks after the final edit batch. Adapt the explicit file list to the files actually touched.

```powershell
cd web
pnpm exec prettier --write <only-task-touched-files>
pnpm exec prettier --check <only-task-touched-files>
pnpm exec eslint <only-task-touched-files>
pnpm typecheck
pnpm build
```

Then inspect the changed routes at 390, 768, 1024, and 1440px:

- No page-level horizontal overflow.
- No console errors caused by the changed module.
- No failed requests hidden by mock fallbacks.
- Dialog open, cancel, confirm, validation, focus, and escape behavior work.
- Tab and route state survives refresh and browser navigation.
- Draft and Published behavior match the real lifecycle.
- Empty, long-name, large-list, and permission-restricted cases remain legible.

Run a scoped source scan:

```powershell
rg -n "alert\(|confirm\(|prompt\(|transition-all|focus:outline-none" <changed-paths>
```

Do not claim the whole repository is clean when only a scoped check passed. If unrelated baseline failures exist, report them separately with evidence and do not silently edit them.

The final integration reviewer must additionally verify the real backend/API path. A successful `pnpm build`, HTTP 200 page response, or mocked demo interaction is not evidence that CRUD, upload, ontology, or annotation persistence works end to end.

## 11. Review and stop conditions

- Finish and validate one module before starting the next.
- Present its before/after screenshots and parity checklist to the product owner.
- Stop for approval when a design decision changes a workflow, permission, domain field, API contract, or data lifecycle.
- Stop if the demo conflicts with current production behavior; document the conflict instead of deleting behavior.
- Do not proceed from an attractive static screen to production replacement until CRUD, drag/drop, versioning, ontology editing, annotation modes, and role behavior are accounted for.
- Do not commit, push, deploy, or modify backend behavior without explicit authorization.

## 12. Final handoff report format

Report in Vietnamese unless the user requests otherwise:

1. Module completed and routes changed.
2. Production behaviors preserved.
3. UI patterns mapped from `/demo`.
4. Files changed by module.
5. Verification commands and exact results.
6. Desktop/phone review result.
7. Remaining baseline issues or product decisions.
8. Confirmation that no commit, push, deploy, or backend contract change occurred.
9. Verification scope labeled as either focused frontend checks or independent full-stack integration.
