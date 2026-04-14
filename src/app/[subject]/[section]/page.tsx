import Link from "next/link";
import { notFound } from "next/navigation";
import { subjects, getSubject } from "@/registry";
import type { Section } from "@/types";

export async function generateStaticParams() {
  const params: { subject: string; section: string }[] = [];
  for (const subject of subjects) {
    try {
      const mod = await import(`@/subjects/${subject.slug}/curriculum`);
      const sections = mod.sections as Section[];
      for (const section of sections) {
        params.push({ subject: subject.slug, section: section.slug });
      }
    } catch {
      // skip subjects with missing curricula
    }
  }
  return params;
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ subject: string; section: string }>;
}) {
  const { subject: subjectSlug, section: sectionSlug } = await params;
  const subject = getSubject(subjectSlug);
  if (!subject) notFound();

  let section: Section | undefined;
  try {
    const mod = await import(`@/subjects/${subjectSlug}/curriculum`);
    section = (mod.getSection as (slug: string) => Section | undefined)(
      sectionSlug
    );
  } catch {
    notFound();
  }
  if (!section) notFound();

  return (
    <main className="max-w-[720px] mx-auto px-6 py-12">
      <Link
        href={`/${subjectSlug}`}
        className="text-sm text-[var(--text3)] hover:text-[var(--accent)] transition-colors"
      >
        &larr; {subject.title}
      </Link>

      <h1 className="font-serif text-3xl mt-4 mb-1 tracking-tight">
        {section.title}
      </h1>
      <p className="text-[var(--text2)] mb-8">{section.description}</p>

      <ol className="space-y-3">
        {section.concepts.map((concept, i) => (
          <li key={concept.slug}>
            <Link
              href={`/${subjectSlug}/${section.slug}/${concept.slug}`}
              className="flex items-baseline gap-4 p-4 rounded-xl bg-[var(--bg2)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
            >
              <span className="font-serif text-lg text-[var(--text3)] w-6 text-right shrink-0">
                {i + 1}
              </span>
              <div>
                <h2 className="font-medium text-[0.95rem]">{concept.title}</h2>
                <p className="text-sm text-[var(--text2)] mt-0.5">
                  {concept.description}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
