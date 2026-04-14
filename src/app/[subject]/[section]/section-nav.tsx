"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SectionNav({
  tabs,
  basePath,
}: {
  tabs: { slug: string; title: string }[];
  basePath: string;
}) {
  const pathname = usePathname();
  const currentSlug = pathname.split("/").pop() || "overview";
  const currentIndex = tabs.findIndex((t) => t.slug === currentSlug);

  const prev = currentIndex > 0 ? tabs[currentIndex - 1] : null;
  const next = currentIndex < tabs.length - 1 ? tabs[currentIndex + 1] : null;

  if (!prev && !next) return null;

  return (
    <div
      className="border-t mt-12"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="max-w-[720px] mx-auto px-6 py-6 flex justify-between items-center">
        {prev ? (
          <Link
            href={`${basePath}/${prev.slug}`}
            className="flex items-center gap-2 text-sm hover:text-[var(--accent)] transition-colors"
            style={{ color: "var(--text2)" }}
          >
            <span>&larr;</span>
            <div className="text-left">
              <span className="text-xs block" style={{ color: "var(--text3)" }}>
                Previous
              </span>
              <span className="font-medium">{prev.title}</span>
            </div>
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link
            href={`${basePath}/${next.slug}`}
            className="flex items-center gap-2 text-sm hover:text-[var(--accent)] transition-colors text-right"
            style={{ color: "var(--text2)" }}
          >
            <div>
              <span className="text-xs block" style={{ color: "var(--text3)" }}>
                Next
              </span>
              <span className="font-medium">{next.title}</span>
            </div>
            <span>&rarr;</span>
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
