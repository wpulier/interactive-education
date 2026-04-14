# Adding Content

## Adding a New Lesson

1. Add a `Concept` entry to the section's `concepts` array in `src/subjects/[subject]/curriculum.ts`
2. Create `src/subjects/[subject]/lessons/[section]/[concept]/index.tsx`
3. Done — routing and navigation auto-update

### Example: Add "Note Values" to Music Theory > Rhythm

```typescript
// src/subjects/music-theory/curriculum.ts
export const sections: Section[] = [
  {
    slug: "rhythm",
    title: "Rhythm",
    description: "How music is organized in time.",
    concepts: [
      { slug: "time-signatures", title: "Time Signatures", description: "How beats are grouped into measures." },
      { slug: "note-values", title: "Note Values", description: "How long each note lasts." },  // <- new
    ],
  },
];
```

Then create `src/subjects/music-theory/lessons/rhythm/note-values/index.tsx`.

## Adding a New Section

Add a `Section` entry to the subject's `sections` array in `src/subjects/[subject]/curriculum.ts`.

### Example: Add "Melody" section to Music Theory

```typescript
// src/subjects/music-theory/curriculum.ts
export const sections: Section[] = [
  { slug: "rhythm", title: "Rhythm", ... },
  {
    slug: "melody",
    title: "Melody",
    description: "How notes combine into musical lines.",
    concepts: [],  // add concepts as you build lessons
  },
];
```

## Adding a New Subject

1. Add entry to `src/registry.ts`:

```typescript
export const subjects: Subject[] = [
  { slug: "music-theory", title: "Music Theory", description: "Interactive lessons in how music works." },
  { slug: "biology", title: "Biology", description: "Interactive lessons in life sciences." },  // <- new
];
```

2. Create the subject directory and curriculum:

```
src/subjects/biology/
  curriculum.ts       # exports sections: Section[]
  lessons/            # lesson components go here
```

3. The curriculum file must export `sections`, `getSection`, and `getConcept`:

```typescript
// src/subjects/biology/curriculum.ts
import type { Section, Concept } from "@/types";

export const sections: Section[] = [];

export function getSection(slug: string): Section | undefined {
  return sections.find((s) => s.slug === slug);
}

export function getConcept(
  sectionSlug: string,
  conceptSlug: string
): { section: Section; concept: Concept } | undefined {
  const section = getSection(sectionSlug);
  if (!section) return undefined;
  const concept = section.concepts.find((c) => c.slug === conceptSlug);
  if (!concept) return undefined;
  return { section, concept };
}
```

4. Done — the home page and routing auto-update.

## Conventions

- **Slugs**: lowercase, kebab-case, must match directory names
- **Order**: array position = learning progression = display order
- **Lessons are standalone**: each owns its full page, no shared shell
- **Back links**: every lesson includes `← Section Title` linking to parent section
- **Client components**: use `"use client"` for interactive lessons
