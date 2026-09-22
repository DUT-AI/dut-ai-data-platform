# DUT AI Data Platform Frontend Rulebook

This directory is the single canonical, long-lived rule package for production frontend and UI work. Every current or future agent that designs, implements, debugs, reviews, or tests UI must use this entrypoint.

## Mandatory reading order

1. Read `core-rules.md` completely for product hierarchy, Purpose Gate, visual language, architecture, responsive behavior, accessibility, and the acceptance gate.
2. Read exactly one matching specification under `pages/`; read more only when a change genuinely crosses page boundaries.
3. Read `component-rules.md` when adding or changing a control, dialog, form, status, toast, table, card, or destructive interaction.
4. Read the selected agent skills for implementation technique. Skills do not override this rulebook.
5. Before completion, re-read the acceptance gate in `core-rules.md` and the matching page rule, then report fresh evidence.

## Package map

- `core-rules.md` — universal rules and definition of done for every production UI change.
- `component-rules.md` — shared interaction and component contracts.
- `pages/*.md` — domain-specific contracts for each production screen.

## Precedence

When guidance conflicts, apply this order:

1. The user's explicit requirement for the current task.
2. `AGENTS.md` and `.agent/rules/GEMINI.md`.
3. This rulebook's `core-rules.md`.
4. The matching page rule.
5. `component-rules.md`.
6. Generic agent skills and framework defaults.

Do not silently choose between conflicting rules. Preserve production behavior, document the conflict, and stop for a product decision when the choice changes workflow, permissions, API contracts, or data lifecycle.

## Runtime boundary

Production routes and feature modules are the live implementation. `/demo` routes are retired and must not be recreated or imported into production. Historical migration plans are reference material, not rules and not required reading.
