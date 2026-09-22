# DUT AI Data Platform — UI/UX Rules

This is the mandatory source of truth for product hierarchy, visual language, interaction behavior, and responsive acceptance on every production screen. New UI must follow this file, the matching page rule, and `component-rules.md` before it is accepted. It is self-contained; historical implementation plans are not part of the rules.

## 1. Product principles

1. **Work before decoration.** Every block must support a real decision or next action.
2. **Context before metrics.** Show the AI problem, goal, role, current dataset, and ontology contract before secondary charts.
3. **Calm density.** Prefer bordered surfaces, whitespace, clear grouping, and short labels over gradients, oversized cards, or decorative effects.
4. **Explicit state.** Draft, Published, Submitted, Approved, Rejected, archived, disabled, and unsaved must be readable without relying on color.
5. **Version-aware by default.** Dataset, ontology, workflow, and configuration values always name their active version and timestamp where relevant.
6. **Safe operations.** Risky actions explain impact before execution and provide recovery guidance.

## 2. Purpose Gate

Before adding or changing a page, section, component, action, metric, or color, write down all eight answers:

1. **User** — who needs it and which project role may use it.
2. **Purpose** — the job or decision it helps complete.
3. **Data** — the real entity, API, or state that supplies it; never invent production facts.
4. **Action** — the single primary next action it enables.
5. **Placement** — why it belongs on this page and at this hierarchy level.
6. **Reuse** — which existing pattern or component can satisfy it; justify any new pattern.
7. **States** — loading, empty, error, disabled, permission-denied, success, and unsaved behavior where applicable.
8. **Responsive** — what changes at 390px; hiding critical information is not a solution.

If any answer is missing, resolve the product requirement before implementation.

## 3. Information architecture

- **Dashboard:** work due now, assigned projects, personal throughput/quality, alerts and recent activity.
- **Projects:** find and compare projects using problem type, role, status, progress, versions, and last update.
- **Project Overview:** AI problem and measurable goal → active version contract → work status → quality/distribution → activity.
- **Datasets:** browse Dataset → Version → Asset like a data folder; prioritize preview, metadata, provenance, and version state. Annotation is a secondary handoff.
- **Ontology:** manage the schema contract, not merely colors or labels. See `pages/ontology.md`.
- **Members:** roles, permissions, invitations, and access changes.
- **Settings:** project metadata, export contract, archive/delete operations.
- **Annotation Workspace:** focused production surface for an asset, ontology version, revision, save/submit/review state.

## 4. Visual language

- Direction: modern, timeless, quiet, and operational. Avoid visual novelty that slows repeated labeling work.
- Typography: Fira Sans or a highly legible system sans for UI; Fira Code/monospace for IDs, hashes, versions, hotkeys, and measurements.
- Spacing: 4px base; common gaps 8, 12, 16, 24, 32.
- Radius: controls 8px; cards/dialogs 12px; full pill only for compact status badges.
- Elevation: border first, subtle shadow second. No glowing surfaces or decorative gradients in work areas.
- Region separation: use a restrained tinted header, section border, or soft neutral/semantic background to separate major work zones. Do not stack indistinguishable white cards on a white canvas.
- Page composition: keep at most three visually dominant regions in one viewport. Use color to explain hierarchy and state, not as decoration.
- Icons: Lucide only. No emoji as structural UI.
- Motion: 150–200ms for state change. Never use `transition-all`; respect reduced motion.

## 5. Color contract

- Primary/selection/focus: blue.
- Success/published/approved: emerald.
- Warning/draft/pending: amber.
- Error/rejected/destructive: rose.
- Information/submitted/review: sky.
- Archived/disabled/unknown: slate.

Category colors are data colors, separate from status colors. Assign a stable color by category key from Blue → Emerald → Amber → Rose → Violet → Cyan → Orange → Lime. Use color on dots, borders, and annotation overlays—not whole navigation surfaces. Overlay fill is 12–18%. Pair every color with a name, icon, pattern, or text label.

## 6. Responsive contract

- Design mobile-first and verify at 390, 768, 1024, and 1440px.
- At phone widths: sidebar becomes an in-app drawer; data tables become cards or horizontal regions with an explicit label; tab rows scroll; primary actions stay reachable; dialogs fit the viewport; annotation inspector becomes a bottom sheet or stacked panel.
- Touch targets are at least 44×44px. No horizontal page overflow.

## 7. Accessibility and states

- Visible `:focus-visible` ring for every interactive control.
- Form controls require visible labels. Icon-only buttons require `aria-label`.
- Use semantic controls; do not attach click handlers to generic `div` or `span`.
- Every data region defines loading, empty, error, disabled, permission-denied, and success states.
- Text and essential controls meet WCAG AA contrast.

## 8. Acceptance gate

The mandatory order is: format touched files, Prettier check, ESLint, typecheck, production build, route smoke checks, console review, keyboard pass, 390px/1440px visual pass, dialog behavior, overflow check, and `alert|confirm|prompt|transition-all` source scan. Editor save must not be required to reveal lint or formatting errors.

Source code is part of the system quality: JSX and logic must remain multi-line and reviewable according to the repository Prettier/ESLint configuration. Do not trade readability for compact one-line code.

Frontend code is organized by business module. Route files compose module views. Reusable primitives live in a shared UI module; dataset, ontology, annotation, member, settings, auth, and user behavior remain within their own module. Reassess files above 360 lines and extract named sections, hooks, or dialogs only when responsibilities can be separated. This is a review signal, not a mandatory split rule.
