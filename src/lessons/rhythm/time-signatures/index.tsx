import Link from "next/link";

export default function TimeSignaturesLesson() {
  return (
    <div className="max-w-[720px] mx-auto px-6 py-12">
      <Link
        href="/rhythm"
        className="text-sm text-[var(--text3)] hover:text-[var(--accent)] transition-colors"
      >
        &larr; Rhythm
      </Link>
      <h1 className="font-serif text-3xl mt-4 mb-4">Time Signatures</h1>
      <p className="text-[var(--text2)]">Lesson content coming soon.</p>
    </div>
  );
}
