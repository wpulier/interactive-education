# Data Model

The Interactive Education platform organizes content in a four-level hierarchy:

```
Subject → Section → Concept → Lesson
```

## Subject

The top-level entity. Represents an entire discipline (Music Theory, Biology, etc.).

- Registered in `src/registry.ts`
- Each subject has its own compartmentalized directory under `src/subjects/[slug]/`
- Different teams own different subjects — code isolation is enforced by directory structure

```typescript
// src/registry.ts
type Subject = {
  slug: string;       // URL segment, matches directory name in src/subjects/
  title: string;      // Display name
  description: string;
};
```

## Section

A topic area within a subject. Sections come in two types:

### Concept-based sections (`type: "concepts"`)

Standalone topics organized by theme. Used when teaching the subject broadly.

- Music Theory → **Rhythm** (concepts: Time Signatures, Note Values, ...)
- Biology → **Cell Biology** (concepts: Cell Structure, Mitosis, ...)

### Work-based sections (`type: "work"`)

Lessons organized around a specific foundational text or opus. Used when teaching the work itself, not just the subject. The work IS the organizing principle — you're studying "On the Origin of Species," not just biology.

- Biology → **On the Origin of Species** by Charles Darwin, 1859
- Economics → **The Wealth of Nations** by Adam Smith, 1776
- Physics → **Principia** by Isaac Newton, 1687

Work-based sections include `meta` with author and year. The UI displays this metadata and uses "chapters" instead of "lessons" in counts.

```typescript
// src/subjects/[subject]/curriculum.ts
type Section = {
  slug: string;
  title: string;
  description: string;
  type: "concepts" | "work";
  meta?: {
    author?: string;
    year?: number;
  };
  concepts: Concept[];   // For works, these are chapters
};
```

### How the UI distinguishes them

The subject page groups sections under **Concepts** and **Works** headings. Work cards show the author and year. Section pages for works display the author/year beneath the title. This makes it immediately clear whether you're browsing standalone concept lessons or studying a specific text.

## Concept

An individual lesson topic within a section. For concept-based sections these are standalone topics. For work-based sections these are chapters.

- Defined inside a Section's `concepts` array
- Array order = learning progression

```typescript
type Concept = {
  slug: string;       // URL segment, matches directory name in lessons/
  title: string;
  description: string;
};
```

## Lesson

The interactive page for a concept. A React component that owns the full viewport.

- Lives at `src/subjects/[subject]/lessons/[section]/[concept]/index.tsx`
- Fully standalone — no shared layout imposed
- Only convention: back link to parent section in top-left
- Uses `"use client"` when interactive

## Routing

Routes are generated from the data model:

| Level | Route | Source |
|-------|-------|-------|
| Home | `/` | `src/registry.ts` |
| Subject | `/music-theory` | `src/registry.ts` |
| Section | `/music-theory/rhythm` | `src/subjects/music-theory/curriculum.ts` |
| Concept | `/music-theory/rhythm/time-signatures` | `src/subjects/music-theory/curriculum.ts` |

Work-based routes follow the same pattern:

| Level | Route |
|-------|-------|
| Subject | `/biology` |
| Work | `/biology/origin-of-species` |
| Chapter | `/biology/origin-of-species/variation-under-domestication` |

The URL is self-documenting — `/biology/origin-of-species/...` tells you you're in a specific work.

## Compartmentalization

```
src/subjects/
  music-theory/          ← Music team's territory
    curriculum.ts
    lessons/
      rhythm/
        time-signatures/
          index.tsx
  biology/               ← Biology team's territory
    curriculum.ts
    lessons/
      origin-of-species/
        variation-under-domestication/
          index.tsx
  economics/             ← Economics team's territory
    curriculum.ts
    lessons/
      wealth-of-nations/
        ...
      general-theory/
        ...
```

Subjects are isolated directories. A team working on biology never touches the music-theory directory, and vice versa. The only shared touchpoints are:

1. `src/registry.ts` — one line per subject
2. `src/types.ts` — shared Section/Concept type definitions
3. `src/app/` — generalized routing (teams don't touch this)
