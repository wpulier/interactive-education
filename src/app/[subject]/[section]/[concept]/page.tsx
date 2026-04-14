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
        for (const concept of section.concepts) {
          params.push({
            subject: subject.slug,
            section: section.slug,
            concept: concept.slug,
          });
        }
      }
    } catch {
      // skip subjects with missing curricula
    }
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

  // Validate the concept exists in the curriculum
  let found: { section: Section; concept: Concept } | undefined;
  try {
    const mod = await import(`@/subjects/${subjectSlug}/curriculum`);
    found = (
      mod.getConcept as (
        s: string,
        c: string
      ) => { section: Section; concept: Concept } | undefined
    )(sectionSlug, conceptSlug);
  } catch {
    notFound();
  }
  if (!found) notFound();

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
