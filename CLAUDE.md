# Interactive Education Webapp

## Project Structure

```
src/
  registry.ts              # Top-level registry: Subject[] (slug, title, description)
  types.ts                 # Shared types: Section, Concept
  app/                     # Next.js App Router — generalized routing
    [subject]/
      [section]/
        [concept]/
  subjects/                # Compartmentalized per-subject directories
    music-theory/
      curriculum.ts        # Sections + concepts for this subject
      lessons/             # All lesson components for this subject
        rhythm/
          time-signatures/
            index.tsx
```

## Data Model

```
Subject → Section → Concept → Lesson
```

- **Subject** = top-level discipline (Music Theory, Biology, etc.)
- **Section** = topic area within a subject (Rhythm, Melody, etc.)
- **Concept** = individual lesson topic (Time Signatures, Note Values, etc.)
- **Lesson** = the interactive page for a concept

## Critical Rules

### 1. Every new lesson MUST update the registry

- New **subject**: add entry to `src/registry.ts` + create `src/subjects/[slug]/curriculum.ts`
- New **section/concept**: update the subject's `curriculum.ts` in `src/subjects/[subject-slug]/`
- New **lesson component**: create at `src/subjects/[subject]/lessons/[section]/[concept]/index.tsx`

### 2. Subjects are compartmentalized

Each subject lives in its own directory under `src/subjects/`. Different teams own different subjects. **Never put cross-subject code in a subject directory.** Shared code goes in `src/types.ts` or `src/registry.ts`.

### 3. Lessons are standalone

Each lesson owns its entire page — no shared layout or shell imposed. Only convention: include a back link to the parent section in the top-left. Lessons use `"use client"` when they need interactivity.

## Adding Content

See `docs/data-model.md` for the full data model documentation.
See `docs/adding-content.md` for step-by-step guides on adding subjects, sections, and lessons.

## Stack

- Next.js 14+ (App Router), React, TypeScript, Tailwind CSS
- No backend, no auth, no database

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — Run ESLint
