import Link from "next/link";
import { notFound } from "next/navigation";
import { subjects, getSubject } from "@/registry";
import type { Section } from "@/types";

export function generateStaticParams() {
  return subjects.map((s) => ({ subject: s.slug }));
}

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject: subjectSlug } = await params;
  const subject = getSubject(subjectSlug);
  if (!subject) notFound();

  let sections: Section[] = [];
  try {
    const mod = await import(`@/subjects/${subjectSlug}/curriculum`);
    sections = mod.sections as Section[];
  } catch {
    notFound();
  }

  const conceptSections = sections.filter((s) => s.type === "concepts");
  const workSections = sections.filter((s) => s.type === "work");

  return (
    <main className="max-w-[720px] mx-auto px-6 py-12">
      <Link
        href="/"
        className="text-sm text-[var(--text3)] hover:text-[var(--accent)] transition-colors"
      >
        &larr; Home
      </Link>

      <h1 className="font-serif text-3xl mt-4 mb-1 tracking-tight">
        {subject.title}
      </h1>
      <p className="text-[var(--text2)] mb-8">{subject.description}</p>

      {conceptSections.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-medium uppercase tracking-widest text-[var(--text3)] mb-3">
            Concepts
          </h2>
          <div className="space-y-3">
            {conceptSections.map((section) => (
              <Link
                key={section.slug}
                href={`/${subjectSlug}/${section.slug}`}
                className="block p-5 rounded-2xl bg-[var(--bg2)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="font-serif text-xl">{section.title}</h3>
                  <span className="text-xs text-[var(--text3)]">
                    {section.concepts.length}{" "}
                    {section.concepts.length === 1 ? "lesson" : "lessons"}
                  </span>
                </div>
                <p className="text-sm text-[var(--text2)] mt-1">
                  {section.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {workSections.length > 0 && (
        <div>
          <h2 className="text-xs font-medium uppercase tracking-widest text-[var(--text3)] mb-3">
            Works
          </h2>
          <div className="space-y-3">
            {workSections.map((section) => (
              <Link
                key={section.slug}
                href={`/${subjectSlug}/${section.slug}`}
                className="block p-5 rounded-2xl bg-[var(--bg2)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="font-serif text-xl">{section.title}</h3>
                  <span className="text-xs text-[var(--text3)]">
                    {section.concepts.length}{" "}
                    {section.concepts.length === 1 ? "chapter" : "chapters"}
                  </span>
                </div>
                {section.meta && (
                  <p className="text-xs text-[var(--text3)] mt-1">
                    {section.meta.author}
                    {section.meta.year && `, ${section.meta.year}`}
                  </p>
                )}
                <p className="text-sm text-[var(--text2)] mt-1">
                  {section.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
