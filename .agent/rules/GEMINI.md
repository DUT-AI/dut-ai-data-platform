---
trigger: always_on
---

# Antigravity Project Rules

This project uses shared skills from `.agent/skills`.

## Mandatory Agent & Skill Protocol

Before frontend, UI, styling, design, browser debugging, testing, or fix work:

1. Classify the task domain.
2. Select the relevant agent from `.agent/agents`.
3. Read that agent file and inspect its `skills:` frontmatter.
4. Read only the relevant `.agent/skills/<skill>/SKILL.md` files.
5. Follow referenced files only when the selected `SKILL.md` requires extra detail.
6. Do not load every skill at once.
7. Briefly state which agent and skill were selected before implementation.
8. For every frontend or UI task, enter through `.agent/rules/frontend-design/README.md`; this folder is the single canonical UI rule package.
9. Read `core-rules.md` completely, then the matching page rule. Read `component-rules.md` when changing an interaction or shared component.
10. Complete the Purpose Gate in `core-rules.md` before adding or changing a page, section, component, action, metric, or color.
11. Validate the finished work against the acceptance gate in `core-rules.md` and the matching page rule before reporting completion.

## Agent Routing

| Task                                                  | Agent                                  |
| ----------------------------------------------------- | -------------------------------------- |
| Frontend implementation, React, Next.js, components   | `.agent/agents/frontend-specialist.md` |
| Backend implementation, Python, FastAPI, DDD          | `.agent/agents/backend-specialist.md`  |
| UI/UX design, visual direction, design systems        | `.agent/agents/ui-ux-designer.md`      |
| Bugs, browser issues, hydration, broken UI behavior   | `.agent/agents/debugger.md`            |
| Validation, tests, final checks, UI regression checks | `.agent/agents/test-engineer.md`       |

## Skill Routing

| Task                                                              | Read                                           |
| ----------------------------------------------------------------- | ---------------------------------------------- |
| Frontend implementation                                           | `.agent/skills/frontend-development/SKILL.md`  |
| Backend implementation                                            | `.agent/skills/backend-development/SKILL.md`   |
| Next.js, React app structure, monorepo setup                      | `.agent/skills/web-frameworks/SKILL.md`        |
| UI/UX, product screens, layouts                                   | `.agent/skills/frontend-design/SKILL.md`       |
| Landing pages, portfolios, redesigns, anti-generic frontend taste | `.agent/skills/design-taste-frontend/SKILL.md` |
| High-quality UI direction                                         | `.agent/skills/ui-ux-pro-max/SKILL.md`         |
| Web design rules                                                  | `.agent/skills/web-design-guidelines/SKILL.md` |
| Tailwind, shadcn, styling systems                                 | `.agent/skills/ui-styling/SKILL.md`            |
| Design tokens and systematic design                               | `.agent/skills/design-system/SKILL.md`         |
| Brand and visual identity                                         | `.agent/skills/brand/SKILL.md`                 |
| Browser inspection and automation                                 | `.agent/skills/chrome-devtools/SKILL.md`       |
| Preview workflows                                                 | `.agent/skills/preview/SKILL.md`               |
| Tests                                                             | `.agent/skills/test/SKILL.md`                  |
| Debugging                                                         | `.agent/skills/debugging/SKILL.md`             |
| Fix workflows                                                     | `.agent/skills/fix/SKILL.md`                   |
| Code review                                                       | `.agent/skills/code-review/SKILL.md`           |
| 3D and Three.js                                                   | `.agent/skills/threejs/SKILL.md`               |
| Shaders and GLSL                                                  | `.agent/skills/shader/SKILL.md`                |
| Docs                                                              | `.agent/skills/docs/SKILL.md`                  |
| Diagrams                                                          | `.agent/skills/mermaidjs-v11/SKILL.md`         |
| Git workflow                                                      | `.agent/skills/git/SKILL.md`                   |

## Operating Rules

- Prefer the selected skill over generic model defaults.
- Keep context focused: one primary skill first, then add supporting skills only if the task crosses domains.
- Antigravity-style workflows live in `.agent/workflows`.
- If no skill matches, proceed normally and mention that no project skill was applicable.
- Never use browser-native `alert()`, `confirm()`, or `prompt()` for product interactions. Use an in-app dialog, confirmation box, sheet, toast, or inline message with clear consequence and recovery guidance.
- Validate UI at phone and desktop widths before completion. The minimum checkpoints are 390px and 1440px.
- UI implementation must be feature/module-based. Route files compose module views, and long multi-responsibility views must be split into named reusable components.
- Do not wait for editor format-on-save. Format only task-touched files (never a repository-wide write format in a dirty worktree), then pass scoped Prettier check, lint, typecheck, and production build before reporting UI work done.
- Production routes and feature modules are the only runtime UI source of truth. `/demo` routes were retired after migration; never recreate mock production paths or import `features/demo` into production.

## Available Workflows

- `/ui-ux-pro-max`: design, build, review, or improve frontend UI.
- `/debug`: investigate and fix frontend defects.
- `/test`: validate frontend changes.
- `/preview`: start or inspect a frontend preview.
