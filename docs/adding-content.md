# Adding Content

## Adding a New Lesson (Concept-based)

1. Add a `Concept` entry to the section's `concepts` array in `src/subjects/[subject]/curriculum.ts`
2. Create `src/subjects/[subject]/lessons/[section]/[concept]/index.tsx`
3. Done — routing, tabs, and navigation auto-update

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

The new lesson automatically appears as a tab in the lesson viewer, gets a progress bar position, and prev/next navigation links.

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

1. Add a `Section` entry with `type: "concepts"` to the subject's `sections` array
2. Create the overview lesson at `src/subjects/[subject]/lessons/[section]/overview/index.tsx`

The overview is a micro-lesson that introduces the section topic. Every section must have one.

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

Then create `src/subjects/music-theory/lessons/melody/overview/index.tsx` with a lesson that introduces melody.

## Adding a New Work

1. Add a `Section` entry with `type: "work"` and `meta` to the subject's `sections` array
2. Create the overview lesson at `src/subjects/[subject]/lessons/[section]/overview/index.tsx`

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

Then create `src/subjects/biology/lessons/selfish-gene/overview/index.tsx`.

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

## Lesson component conventions

- Lessons are `"use client"` components when they need interactivity (most do)
- Lessons do NOT include back links or navigation — the section layout handles this
- Lessons own their content area but are wrapped by the lesson viewer (tabs, progress, prev/next)
- The slug `overview` is reserved — never use it as a concept slug in the curriculum
- Use the same CSS variables as the rest of the app for theming (--bg, --text, --accent, etc.)

## Conventions

- **Slugs**: lowercase, kebab-case, must match directory names
- **Order**: array position = learning progression = display order
- **Section type**: always specify `type: "concepts"` or `type: "work"`
- **Work metadata**: work sections should include `meta` with `author` and `year`
- **Overview required**: every section needs an overview lesson component
- **Client components**: use `"use client"` for interactive lessons
