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

A topic area within a subject. For Music Theory, sections might be Rhythm, Melody, Harmony, etc.

- Defined in the subject's `curriculum.ts` file
- Array order = learning progression = display order

```typescript
// src/subjects/[subject]/curriculum.ts
type Section = {
  slug: string;       // URL segment
  title: string;
  description: string;
  concepts: Concept[];
};
```

## Concept

An individual lesson topic within a section. For Rhythm, concepts might be Time Signatures, Note Values, Tempo, etc.

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

All routing pages are generalized — they read from the registry and subject curricula dynamically. No new route files are needed when adding content.

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
      cells/
        cell-structure/
          index.tsx
```

Subjects are isolated directories. A team working on biology never touches the music-theory directory, and vice versa. The only shared touchpoints are:

1. `src/registry.ts` — one line per subject
2. `src/types.ts` — shared Section/Concept type definitions
3. `src/app/` — generalized routing (teams don't touch this)
