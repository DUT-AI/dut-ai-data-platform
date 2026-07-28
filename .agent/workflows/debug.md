---
description: Debug frontend issues using systematic debugging and browser inspection skills.
---

# /debug - Frontend Debug Workflow

$ARGUMENTS

## Purpose

Investigate and fix frontend defects with systematic debugging.

## Required Skills

Read `.agent/agents/debugger.md`, then read relevant skills:

Read in this order as needed:

1. `.agent/skills/debugging/SKILL.md`
2. `.agent/skills/chrome-devtools/SKILL.md` for browser/runtime issues
3. `.agent/skills/fix/SKILL.md` for fix workflow
4. `.agent/skills/test/SKILL.md` for verification

## Behavior

1. Gather symptoms, reproduction steps, expected behavior, and recent changes.
2. Form hypotheses ordered by likelihood.
3. Test hypotheses with code inspection, logs, browser inspection, or tests.
4. Apply the smallest correct fix.
5. Verify the fix and explain the root cause.

## Examples

```text
/debug modal does not close
/debug hydration error on dashboard
/debug CSS layout broken on mobile
```
