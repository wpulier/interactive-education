import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubject } from "@/registry";
import { getLessons, getCurriculums } from "@/lib/api";
import type { Section } from "@/types";
import SectionTabs from "./section-tabs";
import SectionNav from "./section-nav";

export const dynamic = "force-dynamic";

export default async function SectionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ subject: string; section: string }>;
}) {
  const { subject: subjectSlug, section: sectionSlug } = await params;

  // Try static curriculum first
  const subject = getSubject(subjectSlug);
  let section: Section | undefined;
  let sectionTitle = "";
  let subjectTitle = subject?.title || subjectSlug;
  let tabs: { slug: string; title: string }[] = [];

  if (subject) {
    try {
      const mod = await import(`@/subjects/${subjectSlug}/curriculum`);
      section = (mod.getSection as (slug: string) => Section | undefined)(sectionSlug);
    } catch {}
  }

  if (section) {
    // Static section — use curriculum data for tabs
    sectionTitle = section.title;
    tabs = [
      { slug: "overview", title: "Overview" },
      ...section.concepts.map((c) => ({ slug: c.slug, title: c.title })),
    ];
  } else {
    // Dynamic section — fetch from API
    try {
      const [curriculums, lessons] = await Promise.all([
        getCurriculums(subjectSlug),
        getLessons(subjectSlug, sectionSlug),
      ]);

      if (lessons.length === 0) notFound();

      // Find the curriculum that matches this section
      const curriculum = curriculums.find((c) => c.structure?.slug === sectionSlug);
      sectionTitle = curriculum?.structure?.title || sectionSlug.replace(/-/g, " ");

      // Build tabs from lessons
      const overviewLesson = lessons.find((l) => l.concept_slug === "overview");
      const conceptLessons = lessons.filter((l) => l.concept_slug !== "overview");

      tabs = [];
      if (overviewLesson) {
        tabs.push({ slug: "overview", title: "Overview" });
      }
      tabs.push(...conceptLessons.map((l) => ({ slug: l.concept_slug, title: l.title })));
    } catch {
      notFound();
    }
  }

  const basePath = `/${subjectSlug}/${sectionSlug}`;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      {/* Header */}
      <div className="max-w-[720px] mx-auto w-full px-6 pt-6">
        <Link
          href={subject ? `/${subjectSlug}` : "/profile"}
          className="text-sm text-[var(--text3)] hover:text-[var(--accent)] transition-colors"
        >
          &larr; {subjectTitle}
        </Link>
        <h1
          className="text-2xl mt-3 mb-0 tracking-tight"
          style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
        >
          {sectionTitle}
        </h1>
        {section?.type === "work" && section.meta && (
          <p className="text-sm text-[var(--text3)] mt-0.5">
            {section.meta.author}
            {section.meta.year && `, ${section.meta.year}`}
          </p>
        )}
      </div>

      {/* Tab bar + progress */}
      <SectionTabs tabs={tabs} basePath={basePath} />

      {/* Lesson content */}
      <div className="flex-1">{children}</div>

      {/* Prev/Next navigation */}
      <SectionNav tabs={tabs} basePath={basePath} />
    </div>
  );
}
