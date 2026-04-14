export type Subject = {
  slug: string;
  title: string;
  description: string;
};

export const subjects: Subject[] = [
  {
    slug: "music-theory",
    title: "Music Theory",
    description: "Interactive lessons in how music works.",
  },
  {
    slug: "mathematics",
    title: "Mathematics",
    description: "The language of patterns and structure.",
  },
  {
    slug: "physics",
    title: "Physics",
    description: "The fundamental laws governing the universe.",
  },
  {
    slug: "economics",
    title: "Economics",
    description: "How societies allocate scarce resources.",
  },
  {
    slug: "biology",
    title: "Biology & Natural History",
    description: "The science of life and its evolution.",
  },
];

export function getSubject(slug: string): Subject | undefined {
  return subjects.find((s) => s.slug === slug);
}
