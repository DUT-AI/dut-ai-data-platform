---
description: Preview or inspect frontend UI using browser and preview skills.
---

# /preview

$ARGUMENTS

## Purpose

Start, inspect, or troubleshoot a frontend preview.

## Agent

Read `.agent/agents/frontend-specialist.md`.

## Required Skills

Read in this order as needed:

1. `.agent/skills/preview/SKILL.md`
2. `.agent/skills/chrome-devtools/SKILL.md`
3. `.agent/skills/web-design-guidelines/SKILL.md` for UI review

## Behavior

1. Detect the app/framework and available dev command.
2. Start or use an existing preview server.
3. Inspect the UI visually or through browser tooling when applicable.
4. Report URL, findings, and fixes needed.

## Examples

```text
/preview start app
/preview check dashboard
/preview inspect mobile layout
```
