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
        // Add "overview" for each section
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

  // Validate the section exists
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

  // For "overview", validate it exists but don't require it in the concepts array
  // For other slugs, validate the concept exists in curriculum
  if (conceptSlug !== "overview") {
    const concept = section.concepts.find((c) => c.slug === conceptSlug);
    if (!concept) notFound();
  }

  // Dynamic import of the lesson component — same path for overview and regular concepts
  let LessonComponent: React.ComponentType;
  try {
    const mod = await import(
      `@/subjects/${subjectSlug}/lessons/${sectionSlug}/${conceptSlug}`
    );
    LessonComponent = mod.default;
  } catch {
    // If no lesson component exists (e.g., new section with no overview yet),
    // render a placeholder
    return (
      <div className="max-w-[720px] mx-auto px-6 py-10">
        <p className="text-[var(--text2)] text-[0.95rem] leading-relaxed">
          {section.description}
        </p>
        <p className="text-sm text-[var(--text3)] italic mt-6">
          Lesson content coming soon.
        </p>
      </div>
    );
  }

  return <LessonComponent />;
}
