import type { Section, Concept } from "@/types";

export type { Section, Concept };

export const sections: Section[] = [
  {
    slug: "wealth-of-nations",
    title: "The Wealth of Nations",
    description: "An inquiry into the nature and causes of the wealth of nations.",
    type: "work",
    meta: {
      author: "Adam Smith",
      year: 1776,
    },
    concepts: [],
  },
  {
    slug: "general-theory",
    title: "The General Theory of Employment, Interest, and Money",
    description: "The case for government intervention in aggregate demand.",
    type: "work",
    meta: {
      author: "John Maynard Keynes",
      year: 1936,
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
