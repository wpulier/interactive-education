# Adding Content

## Adding a New Lesson (Concept-based)

1. Add a `Concept` entry to the section's `concepts` array in `src/subjects/[subject]/curriculum.ts`
2. Create `src/subjects/[subject]/lessons/[section]/[concept]/index.tsx`
3. Done — routing and navigation auto-update

### Example: Add "Note Values" to Music Theory > Rhythm

```typescript
// src/subjects/music-theory/curriculum.ts
{
  slug: "rhythm",
  title: "Rhythm",
  description: "How music is organized in time.",
  type: "concepts",
  concepts: [
    { slug: "time-signatures", title: "Time Signatures", description: "How beats are grouped into measures." },
    { slug: "note-values", title: "Note Values", description: "How long each note lasts." },  // <- new
  ],
},
```

Then create `src/subjects/music-theory/lessons/rhythm/note-values/index.tsx`.

## Adding a Chapter to a Work

Same process as adding a lesson, but the section has `type: "work"`.

### Example: Add a chapter to "On the Origin of Species"

```typescript
// src/subjects/biology/curriculum.ts
{
  slug: "origin-of-species",
  title: "On the Origin of Species",
  description: "The foundational argument for evolution by natural selection.",
  type: "work",
  meta: { author: "Charles Darwin", year: 1859 },
  concepts: [
    { slug: "variation-under-domestication", title: "Variation Under Domestication", description: "Chapter I" },  // <- new
  ],
},
```

Then create `src/subjects/biology/lessons/origin-of-species/variation-under-domestication/index.tsx`.

## Adding a New Concept Section

Add a `Section` entry with `type: "concepts"` to the subject's `sections` array.

### Example: Add "Melody" section to Music Theory

```typescript
{
  slug: "melody",
  title: "Melody",
  description: "How notes combine into musical lines.",
  type: "concepts",
  concepts: [],  // add concepts as you build lessons
},
```

## Adding a New Work

Add a `Section` entry with `type: "work"` and `meta` to the subject's `sections` array.

### Example: Add "The Selfish Gene" to Biology

```typescript
{
  slug: "selfish-gene",
  title: "The Selfish Gene",
  description: "A gene-centered view of evolution.",
  type: "work",
  meta: { author: "Richard Dawkins", year: 1976 },
  concepts: [],  // add chapters as you build lessons
},
```

## Adding a New Subject

1. Add entry to `src/registry.ts`:

```typescript
{ slug: "chemistry", title: "Chemistry", description: "The science of matter and its transformations." },
```

2. Create the subject directory and curriculum:

```
src/subjects/chemistry/
  curriculum.ts       # exports sections: Section[], getSection, getConcept
  lessons/            # lesson components go here
```

3. The curriculum file must export `sections`, `getSection`, and `getConcept`:

```typescript
// src/subjects/chemistry/curriculum.ts
import type { Section, Concept } from "@/types";

export type { Section, Concept };

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
- **Section type**: always specify `type: "concepts"` or `type: "work"`
- **Work metadata**: work sections should include `meta` with `author` and `year`
- **Lessons are standalone**: each owns its full page, no shared shell
- **Back links**: every lesson includes `← Section Title` linking to parent section
- **Client components**: use `"use client"` for interactive lessons
