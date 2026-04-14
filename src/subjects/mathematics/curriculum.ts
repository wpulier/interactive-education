import type { Section, Concept } from "@/types";

export type { Section, Concept };

export const sections: Section[] = [
  {
    slug: "principia-mathematica",
    title: "Principia Mathematica",
    description: "The foundations of mathematics through symbolic logic.",
    type: "work",
    meta: {
      author: "Alfred North Whitehead & Bertrand Russell",
      year: 1910,
    },
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
