import Link from "next/link";
import { notFound } from "next/navigation";
import { subjects } from "@/registry";
import type { Section, Concept } from "@/types";

export async function generateStaticParams() {
  const params: { subject: string; section: string; concept: string }[] = [];
  for (const subject of subjects) {
    try {
      const mod = await import(`@/subjects/${subject.slug}/curriculum`);
      const sections = mod.sections as Section[];
      for (const section of sections) {
        // Add "overview" as a virtual concept for each section
        params.push({
          subject: subject.slug,
          section: section.slug,
          concept: "overview",
        });
        for (const concept of section.concepts) {
          params.push({
            subject: subject.slug,
            section: section.slug,
            concept: concept.slug,
          });
        }
      }
    } catch {}
  }
  return params;
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ subject: string; section: string; concept: string }>;
}) {
  const {
    subject: subjectSlug,
    section: sectionSlug,
    concept: conceptSlug,
  } = await params;

  // Load the section data
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

  // Handle "overview" — render section intro
  if (conceptSlug === "overview") {
    const firstConcept = section.concepts[0];
    return (
      <div className="max-w-[720px] mx-auto px-6 py-10">
        <p className="text-[var(--text2)] text-[0.95rem] leading-relaxed mb-8">
          {section.description}
        </p>

        {section.concepts.length > 0 && (
          <div>
            <h2
              className="text-lg mb-4"
              style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
            >
              In this {section.type === "work" ? "work" : "section"}
            </h2>
            <ol className="space-y-3">
              {section.concepts.map((concept, i) => (
                <li key={concept.slug}>
                  <Link
                    href={`/${subjectSlug}/${sectionSlug}/${concept.slug}`}
                    className="flex items-baseline gap-4 p-4 rounded-xl bg-[var(--bg2)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
                  >
                    <span className="font-serif text-lg text-[var(--text3)] w-6 text-right shrink-0">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="font-medium text-[0.95rem]">
                        {concept.title}
                      </h3>
                      <p className="text-sm text-[var(--text2)] mt-0.5">
                        {concept.description}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>

            {firstConcept && (
              <Link
                href={`/${subjectSlug}/${sectionSlug}/${firstConcept.slug}`}
                className="inline-block mt-8 px-6 py-3 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: "var(--accent)" }}
              >
                Start: {firstConcept.title} &rarr;
              </Link>
            )}
          </div>
        )}

        {section.concepts.length === 0 && (
          <p className="text-sm text-[var(--text3)] italic">
            No {section.type === "work" ? "chapters" : "lessons"} yet.
          </p>
        )}
      </div>
    );
  }

  // Validate the concept exists
  const concept = section.concepts.find((c) => c.slug === conceptSlug);
  if (!concept) notFound();

  // Dynamic import of the lesson component
  let LessonComponent: React.ComponentType;
  try {
    const mod = await import(
      `@/subjects/${subjectSlug}/lessons/${sectionSlug}/${conceptSlug}`
    );
    LessonComponent = mod.default;
  } catch {
    notFound();
  }

  return <LessonComponent />;
}
