import { notFound } from "next/navigation";
import { subjects } from "@/registry";
import { getLessons } from "@/lib/api";
import DynamicLesson from "@/components/dynamic-lesson";
import type { Section } from "@/types";

export async function generateStaticParams() {
  const params: { subject: string; section: string; concept: string }[] = [];
  for (const subject of subjects) {
    try {
      const mod = await import(`@/subjects/${subject.slug}/curriculum`);
      const sections = mod.sections as Section[];
      for (const section of sections) {
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

export const dynamic = "force-dynamic";

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

  // Try static lesson first
  let section: Section | undefined;
  let isStatic = false;
  try {
    const mod = await import(`@/subjects/${subjectSlug}/curriculum`);
    section = (mod.getSection as (slug: string) => Section | undefined)(
      sectionSlug
    );
  } catch {}

  if (section) {
    if (conceptSlug !== "overview") {
      const concept = section.concepts.find((c) => c.slug === conceptSlug);
      if (!concept) {
        // Not in static curriculum — try dynamic below
      } else {
        isStatic = true;
      }
    } else {
      isStatic = true;
    }

    if (isStatic) {
      try {
        const mod = await import(
          `@/subjects/${subjectSlug}/lessons/${sectionSlug}/${conceptSlug}`
        );
        const LessonComponent = mod.default;
        return <LessonComponent />;
      } catch {
        // Static section exists but no lesson component — try dynamic
      }
    }
  }

  // Fallback: try loading from the API (community/generated lesson)
  try {
    const lessons = await getLessons(subjectSlug, sectionSlug);
    const lesson = lessons.find((l) => l.concept_slug === conceptSlug);
    if (lesson) {
      return (
        <div>
          {lesson.user_name && (
            <div className="max-w-[720px] mx-auto px-6 pt-4">
              <p className="text-xs text-[var(--text3)]">
                Added by <span className="font-medium text-[var(--text2)]">{lesson.user_name}</span>
              </p>
            </div>
          )}
          <DynamicLesson code={lesson.code} />
        </div>
      );
    }
  } catch {
    // API unavailable — fall through to placeholder
  }

  // Nothing found
  if (section) {
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

  notFound();
}
