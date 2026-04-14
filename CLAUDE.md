# Music Education Webapp

## Project Structure

- `src/curriculum.ts` — Central curriculum registry. Single source of truth for all sections, concepts, and lesson metadata.
- `src/app/` — Next.js App Router pages. Dynamic routes `[section]` and `[concept]` resolve against the registry.
- `src/lessons/` — Interactive lesson components organized by `section/concept/`.

## Critical Rule: Curriculum Registry

**Every new lesson MUST be registered in `src/curriculum.ts`.**

When adding a new lesson:
1. Add the concept entry to the appropriate section in `src/curriculum.ts` (slug, title, description)
2. Create the lesson component at `src/lessons/[section]/[concept]/index.tsx`
3. The home page and section pages auto-update from the registry

See `docs/curriculum-registry.md` for full documentation.

## Conventions

- Lessons are fully standalone — no shared layout or shell. Each lesson owns its entire page.
- Only convention per lesson: include a back link to the parent section in the top-left.
- Lessons are client components (`"use client"`) when they need interactivity.
- Array order in the curriculum registry = learning progression = display order.

## Stack

- Next.js 14+ (App Router), React, TypeScript, Tailwind CSS
- No backend, no auth, no database

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — Run ESLint
