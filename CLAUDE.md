# Interactive Education Webapp

## Project Structure

```
src/
  registry.ts              # Top-level registry: Subject[] (slug, title, description)
  types.ts                 # Shared types: Section, Concept
  app/                     # Next.js App Router — generalized routing
    [subject]/
      page.tsx             # Subject page: Concepts, Works, Community sections
      [section]/
        page.tsx           # Redirects to ./overview
        layout.tsx         # Lesson viewer: tabs, progress bar, prev/next nav
        section-tabs.tsx   # Client component: tab bar with active state
        section-nav.tsx    # Client component: prev/next footer navigation
        [concept]/
          page.tsx         # Loads lesson component (including overview)
  subjects/                # Compartmentalized per-subject directories
    music-theory/
      curriculum.ts        # Sections + concepts for this subject
      lessons/             # All lesson components for this subject
        rhythm/
          overview/        # Overview micro-lesson (every section has one)
            index.tsx
          time-signatures/
            index.tsx
```

## Data Model

```
Subject → Section → Concept → Lesson
```

- **Subject** = top-level discipline (Music Theory, Biology, etc.)
- **Section** = either a concept area (`type: "concepts"`) or a foundational work (`type: "work"`)
  - Concept sections: standalone topics (Rhythm, Melody, Cell Biology)
  - Work sections: organized around a specific text (Origin of Species, Principia, Wealth of Nations) — includes `meta` with author/year
- **Concept** = individual lesson topic or chapter within a work
- **Lesson** = the interactive page for a concept

## Critical Rules

### 1. Every new lesson MUST update the registry

- New **subject**: add entry to `src/registry.ts` + create `src/subjects/[slug]/curriculum.ts`
- New **section** (concept or work): update the subject's `curriculum.ts` — always specify `type` and `meta` for works
- New **concept/chapter**: add to the section's `concepts` array in the subject's `curriculum.ts`
- New **lesson component**: create at `src/subjects/[subject]/lessons/[section]/[concept]/index.tsx`

### 2. Every section needs an overview lesson

When creating a new section, also create `src/subjects/[subject]/lessons/[section]/overview/index.tsx`. This is a micro-lesson that introduces the section's topic. The slug `overview` is reserved — never use it as a concept slug.

### 3. Subjects are compartmentalized

Each subject lives in its own directory under `src/subjects/`. Different teams own different subjects. **Never put cross-subject code in a subject directory.** Shared code goes in `src/types.ts` or `src/registry.ts`.

### 4. Lessons are standalone

Each lesson component owns its content area. The section layout provides the chrome (back link, tabs, progress bar, prev/next nav) — lessons do NOT need to include back links or navigation. Lessons use `"use client"` when they need interactivity.

### 5. Lesson viewer

Clicking a section redirects to `/[subject]/[section]/overview`. All lessons within a section are wrapped in a shared layout that provides:
- Back link to the subject page
- Section title
- Tab bar (Overview + all concepts, current tab highlighted)
- Progress bar (position within the section)
- Prev/Next footer navigation with labeled links

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
