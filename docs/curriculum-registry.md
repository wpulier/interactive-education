# Curriculum Registry

The curriculum registry (`src/curriculum.ts`) is the single source of truth for all content in the music education webapp. It defines sections, concepts, their ordering, and metadata.

## Structure

```typescript
type Concept = {
  slug: string;       // URL segment — must match the folder name in src/lessons/
  title: string;      // Display name shown in navigation
  description: string; // One-liner shown in section listing
};

type Section = {
  slug: string;       // URL segment
  title: string;      // Display name
  description: string; // Shown on the home page
  concepts: Concept[]; // Ordered list — array position = learning progression
};
```

## Adding a New Lesson

1. **Register it** — Add a `Concept` entry to the appropriate section's `concepts` array in `src/curriculum.ts`. Position it in the array where it belongs in the learning progression.

2. **Create the component** — Create `src/lessons/[section-slug]/[concept-slug]/index.tsx`. This is a React component that renders the entire lesson page.

3. **Done** — The home page, section page, and routing automatically pick up the new entry.

### Example

To add a "Note Values" lesson to the Rhythm section:

```typescript
// src/curriculum.ts
{
  slug: "rhythm",
  title: "Rhythm",
  description: "How music is organized in time.",
  concepts: [
    { slug: "time-signatures", title: "Time Signatures", description: "How beats are grouped into measures." },
    { slug: "note-values", title: "Note Values", description: "How long each note lasts." },  // <- new
  ],
}
```

Then create `src/lessons/rhythm/note-values/index.tsx` with your lesson component.

## Adding a New Section

Add a new `Section` entry to the `curriculum` array in `src/curriculum.ts`. No new route files are needed — the dynamic routes handle it automatically.

## Conventions

- **Slugs** must be lowercase, kebab-case, and match the folder name in `src/lessons/`.
- **Order matters** — array position determines display order and learning progression.
- **Lessons are standalone** — each lesson component owns its full page. No shared shell is imposed. The only convention is a back link in the top-left.
- **Client components** — lessons that need interactivity (most of them) should use `"use client"` at the top.
