import type { Section, Concept } from "@/types";

export type { Section, Concept };

export const sections: Section[] = [
  {
    slug: "rhythm",
    title: "Rhythm",
    description: "How music is organized in time.",
    type: "concepts",
    concepts: [
      {
        slug: "time-signatures",
        title: "Time Signatures",
        description: "How beats are grouped into measures.",
      },
    ],
  },
  {
    slug: "harmony",
    title: "Harmony",
    description: "How notes combine into chords and progressions.",
    type: "concepts",
    concepts: [],
  },
];

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
