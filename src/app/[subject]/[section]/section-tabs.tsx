"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SectionTabs({
  tabs,
  basePath,
}: {
  tabs: { slug: string; title: string }[];
  basePath: string;
}) {
  const pathname = usePathname();
  const currentSlug = pathname.split("/").pop() || "overview";
  const currentIndex = tabs.findIndex((t) => t.slug === currentSlug);
  const progress =
    tabs.length > 1 ? ((currentIndex >= 0 ? currentIndex : 0) + 1) / tabs.length : 0;

  return (
    <div className="sticky top-0 z-10" style={{ background: "var(--bg)" }}>
      <div className="max-w-[720px] mx-auto px-6">
        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pt-4 pb-0 -mx-1 scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = tab.slug === currentSlug;
            return (
              <Link
                key={tab.slug}
                href={`${basePath}/${tab.slug}`}
                className={`px-3 py-2 text-sm whitespace-nowrap rounded-t-lg transition-colors shrink-0 ${
                  isActive
                    ? "font-medium"
                    : "hover:bg-[var(--bg2)]"
                }`}
                style={{
                  color: isActive ? "var(--accent)" : "var(--text3)",
                  borderBottom: isActive
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                }}
              >
                {tab.title}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-[3px] w-full" style={{ background: "var(--border)" }}>
        <div
          className="h-full transition-all duration-300"
          style={{
            background: "var(--accent)",
            width: `${progress * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
