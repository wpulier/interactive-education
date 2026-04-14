import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubject } from "@/registry";
import type { Section } from "@/types";
import SectionTabs from "./section-tabs";
import SectionNav from "./section-nav";

export default async function SectionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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

  const tabs: { slug: string; title: string }[] = [
    { slug: "overview", title: "Overview" },
    ...section.concepts.map((c) => ({ slug: c.slug, title: c.title })),
  ];

  const basePath = `/${subjectSlug}/${sectionSlug}`;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      {/* Header */}
      <div className="max-w-[720px] mx-auto w-full px-6 pt-8">
        <Link
          href={`/${subjectSlug}`}
          className="text-sm text-[var(--text3)] hover:text-[var(--accent)] transition-colors"
        >
          &larr; {subject.title}
        </Link>
        <h1
          className="text-2xl mt-3 mb-0 tracking-tight"
          style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
        >
          {section.title}
        </h1>
        {section.type === "work" && section.meta && (
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
