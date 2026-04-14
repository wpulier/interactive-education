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
];

export function getSubject(slug: string): Subject | undefined {
  return subjects.find((s) => s.slug === slug);
}
