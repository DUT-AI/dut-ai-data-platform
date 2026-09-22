# Shared Component and Interaction Rules

## Page composition

Use one page heading, one short purpose sentence, and at most one visually primary action. Panels have a visible title and, when needed, a one-line explanation of the decision they support.

## Dialogs, sheets, and notifications

- **Create/edit:** modal on desktop, full-width sheet/dialog on phone. Keep the initiating context visible when possible.
- **Delete/archive/publish/role change:** confirmation dialog inside the app. Name the target, describe impact, show Cancel first and the explicit action second.
- **Irreversible broad deletion:** require typing the object name; focus Cancel initially.
- **Success:** non-blocking toast with a plain-language result.
- **Recoverable error:** inline alert with retry. Field validation sits under the field.
- **Never:** browser `alert()`, `confirm()`, `prompt()`, extension notifications, or color-only warnings.

## Cards and tables

Cards summarize and lead to one action; they do not duplicate an entire detail page. Tables are for comparison. At phone widths, convert dense rows into labeled cards instead of shrinking text.

## Status and category

Status badges use semantic color plus text and optional icon. Category swatches use the stable category palette and always show the category name/key.

## Forms

Use persistent labels, helper text only when it changes the answer, required markers, clear errors, disabled/loading submit state, dirty-state indication, and a safe cancel path.
