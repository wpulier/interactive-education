import Link from "next/link";
import { subjects } from "@/registry";
import type { Section } from "@/types";

async function getSubjectSections(slug: string): Promise<Section[]> {
  try {
    const mod = await import(`@/subjects/${slug}/curriculum`);
    return mod.sections as Section[];
  } catch {
    return [];
  }
}

export default async function Home() {
  const subjectsWithCounts = await Promise.all(
    subjects.map(async (subject) => {
      const sections = await getSubjectSections(subject.slug);
      const sectionCount = sections.length;
      return { ...subject, sectionCount };
    })
  );

  return (
    <main className="max-w-[720px] mx-auto px-6 py-12">
      <h1 className="font-serif text-4xl mb-1 tracking-tight">
        Interactive Education
      </h1>
      <p className="text-[var(--text2)] mb-10">Learn by doing.</p>

      <div className="space-y-4">
        {subjectsWithCounts.map((subject) => (
          <Link
            key={subject.slug}
            href={`/${subject.slug}`}
            className="block p-5 rounded-2xl bg-[var(--bg2)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-xl">{subject.title}</h2>
              <span className="text-xs text-[var(--text3)]">
                {subject.sectionCount}{" "}
                {subject.sectionCount === 1 ? "section" : "sections"}
              </span>
            </div>
            <p className="text-sm text-[var(--text2)] mt-1">
              {subject.description}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
