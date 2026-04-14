import Link from "next/link";
import { subjects } from "@/registry";

import { sections as musicTheorySections } from "@/subjects/music-theory/curriculum";
import { sections as mathematicsSections } from "@/subjects/mathematics/curriculum";
import { sections as physicsSections } from "@/subjects/physics/curriculum";
import { sections as economicsSections } from "@/subjects/economics/curriculum";
import { sections as biologySections } from "@/subjects/biology/curriculum";

const sectionsBySubject: Record<string, { length: number }> = {
  "music-theory": musicTheorySections,
  mathematics: mathematicsSections,
  physics: physicsSections,
  economics: economicsSections,
  biology: biologySections,
};

export default function Home() {
  return (
    <main className="max-w-[720px] mx-auto px-6 py-12">
      <h1 className="font-serif text-4xl mb-1 tracking-tight">
        Interactive Education
      </h1>
      <p className="text-[var(--text2)] mb-10">Learn by doing.</p>

      <div className="space-y-4">
        {subjects.map((subject) => {
          const sectionCount = sectionsBySubject[subject.slug]?.length ?? 0;
          return (
            <Link
              key={subject.slug}
              href={`/${subject.slug}`}
              className="block p-5 rounded-2xl bg-[var(--bg2)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
            >
              <div className="flex items-baseline justify-between">
                <h2 className="font-serif text-xl">{subject.title}</h2>
                <span className="text-xs text-[var(--text3)]">
                  {sectionCount}{" "}
                  {sectionCount === 1 ? "section" : "sections"}
                </span>
              </div>
              <p className="text-sm text-[var(--text2)] mt-1">
                {subject.description}
              </p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
