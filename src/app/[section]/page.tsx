import Link from "next/link";
import { notFound } from "next/navigation";
import { curriculum, getSection } from "@/curriculum";

export function generateStaticParams() {
  return curriculum.map((s) => ({ section: s.slug }));
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: sectionSlug } = await params;
  const section = getSection(sectionSlug);
  if (!section) notFound();

  return (
    <main className="max-w-[720px] mx-auto px-6 py-12">
      <Link
        href="/"
        className="text-sm text-[var(--text3)] hover:text-[var(--accent)] transition-colors"
      >
        &larr; Home
      </Link>

      <h1 className="font-serif text-3xl mt-4 mb-1 tracking-tight">
        {section.title}
      </h1>
      <p className="text-[var(--text2)] mb-8">{section.description}</p>

      <ol className="space-y-3">
        {section.concepts.map((concept, i) => (
          <li key={concept.slug}>
            <Link
              href={`/${section.slug}/${concept.slug}`}
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
