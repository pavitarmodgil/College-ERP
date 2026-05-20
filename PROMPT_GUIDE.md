# College ERP — Prompt Guide

> This file defines how to get the best results from Claude Chat,
> Claude Code, and Stitch AI for this project.
> Keep it in the project root alongside CLAUDE.md and context.md.

---

## The three-tool system

Every feature in this project uses three tools for three different jobs.
Never mix their roles.

| Tool | Job | When to use |
|------|-----|-------------|
| Claude Chat | Thinking, architecture, design, the "why" | Before any build starts |
| Stitch AI | Visual UI components — tables, modals, forms, cards | When you need complex frontend UI |
| Claude Code | Backend logic, API wiring, file creation, running commands | When you're ready to build |

### The order always matters
```
1. Claude Chat  → design the feature, understand the why, get both prompts
2. Stitch AI    → generate the UI components, drop them into project
3. Claude Code  → build the backend, wire Stitch components to real data
```

Never open Claude Code without having designed in Claude Chat first.
Never skip Stitch for complex UI — it saves hours of manual component writing.

---

## How to start a Claude Chat session

Always paste this at the top of every new Claude Chat:

```
I'm working on my University Management System (College ERP).
Read my context.md before doing anything:

[paste full context.md contents here]

Current phase: Phase X
Current branch: feat/xxx
Today's task: [what you want to design or discuss]
```

Then say what you want to do. Examples:
- "Let's design Feature 2 — Course Management"
- "I have a question about how attendance should work"
- "Phase 3 is done, update context.md and let's plan Phase 4"
- "Explain why we used Enrollment as the anchor table"

---

## How to ask Claude Chat for prompts

When you're ready to build a feature, ask for both prompts at once:

```
Give me both the Stitch AI prompt and the Claude Code prompt for [feature name].
```

Claude Chat will generate:
1. A Stitch AI prompt — paste directly into Stitch
2. A Claude Code prompt — paste directly into Claude Code

Both prompts will be coordinated — Stitch generates components that
Claude Code knows to expect, and Claude Code wires those exact components.

---

## How to write a Stitch AI prompt

Stitch generates React + Tailwind UI components from a description.
Use this structure every time:

```
Design a [component name] for a University ERP admin panel.

Tech: React functional components, Tailwind CSS, dark mode via dark: classes,
lucide-react icons. No external UI libraries.

PART 1 — [Main page/component]
Layout: [describe the overall layout]
Header: [what's in the top bar]
Content: [table / cards / form — describe columns, fields, states]
Example data: [2-3 realistic rows]
States to show: loading skeleton, empty state, error state

PART 2 — [Modal or secondary component]
[describe the modal/drawer/form]
Fields: [list every field, type, validation]
Buttons: [cancel + submit with states]

Style rules (include these every time):
- Inputs: px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
  bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500
  focus:outline-none w-full
- Labels: text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block
- Primary button: bg-indigo-600 hover:bg-indigo-700 text-white
- Danger button: bg-red-600 hover:bg-red-700 text-white
- Role badges: ADMIN=purple, TEACHER=blue, STUDENT=green
- Table header: bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500
- Table rows: hover:bg-gray-50 dark:hover:bg-gray-800/50
- Active nav: bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300
```

### After Stitch generates components
1. Copy generated JSX into correct paths under `client/src/`
2. Do NOT add API calls — Claude Code does that
3. Check dark mode works on every element
4. Check loading, empty, and error states exist

---

## How to write a Claude Code prompt

Claude Code prompts have a fixed structure. Every prompt includes:

```
# Claude Code Prompt — [Phase + Feature name]

## Context
[Project name, OS, project path, GitHub URL, current branch]
[What phases are complete]
[What already exists that's relevant]

## Goal
[One clear sentence — what this session produces]

---

## Step N — [step name]
[exact commands or code]
WHY [one line explaining the reason — always include this]

[repeat for each step]

---

## Tests to run
[exact requests or browser steps to verify it works]

## What NOT to do
[explicit list of things to leave alone]

## Done signal
[exact criteria — how do you know this session is complete]
```

### Rules for Claude Code prompts
- Every step has a WHY comment — never just tell Claude Code what to do
- Include exact file paths — never say "put this somewhere appropriate"
- List what NOT to do — prevents Claude Code from over-engineering
- End with a done signal — a specific, verifiable condition
- Specify branch name at the top — always off dev, never main
- If Stitch components exist, mention them explicitly

---

## Feature prompt template

When asking Claude Chat to generate prompts for a new feature,
include this information so it can write both prompts correctly:

```
Feature: [name]
Branch: feat/[branch-name] off dev
Who uses it: [Admin / Teacher / Student]

Backend needs:
- Routes: [list the endpoints]
- Controller logic: [describe any complex logic like auto-IDs, calculations]
- Auth: [which roles can access, any special guards]

Frontend needs:
- Page: [path and layout description]
- Components: [modals, tables, forms needed]
- State: [what data needs to be fetched, filtered, paginated]

Special requirements:
- [anything unusual or important to not forget]
```

---

## Context.md update prompt

After every Claude Code session, paste this into Claude Chat:

```
Phase X Feature Y is done. Here's what was built:
[paste Claude Code session summary or key outputs]

Please:
1. Update context.md to reflect what was completed
2. Update the Phase Tracker checkboxes
3. Update Current State with what's working and what's next
```

---

## How to ask "why" questions

This project is about learning, not just building.
Ask why questions freely between tasks:

```
Before we move to the next feature, explain why [concept] works the way it does.
Use plain language first, then show me how it appears in our actual code.
```

Examples that worked well in this project:
- "Explain why Enrollment is the anchor table"
- "Why do we use httpOnly cookies for the refresh token?"
- "What's the difference between PATCH and PUT?"
- "Why did we run Promise.all for the user count query?"

Claude Chat will always explain the concept in plain language first,
then connect it back to your actual code.

---

## The summary prompt

At any point you can ask:

```
Write a detailed summary of everything built and planned in this project
so far — in plain language I could explain to someone else.
```

This is useful before job interviews, when onboarding someone new,
or just to consolidate what you've learned.

---

## Anti-patterns — what not to do

**Don't jump straight to Claude Code.** If you haven't designed it in
Claude Chat first, you'll build the wrong thing or build it wrong.

**Don't ask Claude Code to make design decisions.** Claude Code executes.
Claude Chat thinks. Architecture questions go to Chat.

**Don't skip context.md when starting a session.** Without it, Claude
starts fresh with no knowledge of your stack, decisions, or conventions.
Always paste it at the start.

**Don't ask for just one prompt.** Always ask for both — Stitch and
Claude Code together. They're written to coordinate with each other.

**Don't merge to main directly.** Always: feat/branch → dev (PR) → main (PR).
Never skip the PR step even for small changes.

**Don't let context.md get stale.** Update it after every session.
It's the single source of truth for every tool you use.

---

## Quick reference — what each file does

| File | Purpose | Update when |
|------|---------|------------|
| `context.md` | Full project state — stack, schema, phase tracker, current state | After every session |
| `CLAUDE.md` | Rules and conventions for AI assistants | When conventions change |
| `PROMPT_GUIDE.md` | This file — how to get prompts | When workflow changes |

---

## The workflow in one sentence

Design in Claude Chat → generate UI in Stitch → build and wire in Claude Code
→ update context.md → repeat for next feature.