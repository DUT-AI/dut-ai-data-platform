# Agent Instructions

## Shared Skill Registry

This project stores reusable agent skills in `.agent/skills`.

Use these skills for frontend, UI, design, browser debugging, testing, and related development work. Any agent working in this repo should treat each `.agent/skills/<skill-name>/SKILL.md` file as the entry point for that skill.

## Markee-Style Agent Setup

- Rules: `.agent/rules/GEMINI.md`
- Agents: `.agent/agents/*.md`
- Skills: `.agent/skills/*/SKILL.md`
- Workflows: `.agent/workflows/*.md`

Follow the same flow as Markee:

```text
request -> .agent/rules/GEMINI.md -> select agent -> read agent skills -> apply selected SKILL.md
```

## How To Use Skills

1. Inspect `.agent/agents` and select the relevant agent.
2. Read that agent's `skills:` frontmatter.
3. Read only the matching `.agent/skills/<skill-name>/SKILL.md` files.
4. Follow references from that `SKILL.md` only when the task needs the extra detail.
5. Prefer the existing project conventions and the selected skill instructions over generic defaults.
6. Do not load every skill at once; keep context focused.

## Agent Selection

- Frontend implementation: `frontend-specialist`
- Backend implementation: `backend-specialist`
- UI/UX and product screens: `ui-ux-designer`
- Debugging and fixes: `debugger`
- Validation and final checks: `test-engineer`

## Skill Selection

- Frontend implementation: `frontend-development`, `web-frameworks`
- Backend implementation: `backend-development`
- UI/UX and product screens: `design-taste-frontend`, `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`
- Styling systems: `ui-styling`, `design-system`, `brand`
- Visual assets: `assets-organizing`, `banner-design`, `logo-design`, `youtube-thumbnail-design`
- 3D and graphics: `threejs`, `shader`
- Browser inspection: `chrome-devtools`, `preview`
- Quality and fixes: `test`, `debugging`, `fix`, `code-review`
- Documentation and diagrams: `docs`, `mermaidjs-v11`
- Git workflow: `git`

## Minimal Prompt For Other Agents

When using an agent that does not automatically discover this file, include:

```text
Use this repo's Markee-style .agent setup. Before working, inspect AGENTS.md and .agent/rules/GEMINI.md, choose the relevant .agent/agents file, read its skills frontmatter, then load only the needed .agent/skills/<skill>/SKILL.md files.
```
