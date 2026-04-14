# Music Education Webapp — Design Spec

## Overview

A minimalist, interactive music education webapp built with Next.js. Content is organized as **sections > concepts > interactive lessons**. Each lesson is a fully standalone page with complete creative freedom. A central curriculum registry drives all routing and navigation.

The first section is **Rhythm**, with **Time Signatures** as the proof-of-concept lesson.

## Stack

- Next.js 14+ (App Router)
- React 18+
- TypeScript
- Tailwind CSS
- No backend, no auth, no database

## Architecture

### Curriculum Registry (`src/curriculum.ts`)

Single source of truth for all content structure. Array order = learning progression.

```ts
type Concept = {
  slug: string;       // URL segment, matches folder name under app/[section]/
  title: string;      // Display name
  description: string; // One-liner shown in section listing
};

type Section = {
  slug: string;       // URL segment, matches folder name under app/
  title: string;      // Display name
  description: string; // One-liner shown on home page
  concepts: Concept[];
};

export const curriculum: Section[] = [
  {
    slug: "rhythm",
    title: "Rhythm",
    description: "How music is organized in time.",
    concepts: [
      {
        slug: "time-signatures",
        title: "Time Signatures",
        description: "How beats are grouped into measures.",
      },
    ],
  },
];
```

### Routing

```
app/
  layout.tsx                  <- Root layout (minimal: fonts, global styles)
  page.tsx                    <- Home: lists all sections from registry
  [section]/
    page.tsx                  <- Section page: ordered list of concepts
    [concept]/
      page.tsx                <- Dynamic resolver, renders the lesson component
```

The `[section]` and `[concept]` dynamic routes validate slugs against the curriculum registry. Invalid slugs return `notFound()`.

### Lesson Pages

Each concept has its interactive lesson built as a React component. Lessons are fully standalone — no shared shell, no imposed layout. The only convention:

- A back link (`<- Section Title`) in the top-left corner
- The page occupies the full viewport

Lesson components live alongside their route or in a dedicated components directory within the concept folder — developer's choice per lesson.

### Navigation Flow

```
Home (/)
  Shows: App title, list of sections (title + description + concept count)
  Click section ->

Section (/rhythm)
  Shows: Section title, ordered numbered list of concepts (title + description)
  All concepts selectable regardless of order
  Click concept ->

Lesson (/rhythm/time-signatures)
  Shows: Fully standalone interactive lesson
  Back link to parent section
```

## Pages Detail

### Home Page (`/`)

- App title ("Music Education" or similar)
- Clean list of sections
- Each section card: title, description, concept count badge
- Centered layout, max-width ~720px
- Editorial typography: serif headings, sans body

### Section Page (`/[section]`)

- Section title + description
- Ordered list of concepts, numbered by progression order
- Each item: number, title, description
- All clickable — no gating or locking
- Same centered, minimal layout as home

### Lesson Page (`/[section]/[concept]`)

- Fully standalone — owns the entire viewport
- No shared nav bar, sidebar, or footer imposed
- Only convention: back link to parent section in top-left
- Each lesson has complete creative freedom over layout, styling, and interaction

## Styling

- Tailwind CSS with minimal shared config
- Shared font stack: DM Serif Display (headings), DM Sans (body) — matching the existing time-signatures prototype
- Shared color tokens as CSS variables for consistency, but lessons can override
- Home and section pages: clean, editorial, muted palette
- Lesson pages: no constraints — use Tailwind, custom CSS, inline styles, whatever serves the lesson

## Adding a New Lesson

1. Add an entry to `src/curriculum.ts` — slug, title, description, in the correct position within the concepts array
2. Create the lesson component/page at `app/[section]/[concept]/page.tsx`
3. Build the interactive content — fully standalone, no boilerplate required
4. Done — home and section pages auto-update from the registry

## Adding a New Section

1. Add a new section entry to `src/curriculum.ts` with an empty or populated concepts array
2. Section and home pages auto-update — no new route files needed (dynamic routes handle it)

## Documentation Deliverables

- `docs/curriculum-registry.md` — explains registry structure, adding-a-lesson workflow, conventions
- `CLAUDE.md` — project-level instructions including the rule that every new lesson must update the curriculum registry

## Proof of Concept

The existing time-signatures interactive lesson (currently `lesson_interactive/time-signatures.html`) will be ported to a React component at `app/rhythm/time-signatures/page.tsx`, preserving all existing functionality:
- Web Audio API metronome with accent-differentiated clicks
- SVG beat grid visualization with grouping
- Time signature selector (4/4, 3/4, 6/8, 2/4, 5/4, 7/8)
- Tempo slider
- Dark mode support
- Educational content (explanations, callouts)

The port validates that the framework supports standalone, interactive lessons with full creative freedom.
