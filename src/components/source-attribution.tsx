"use client";

import { useState } from "react";
import type { LessonData } from "@/lib/api";

const TYPE_LABELS: Record<string, string> = {
  url: "URL",
  text: "Text",
  pdf: "PDF",
};

export default function SourceAttribution({ lesson }: { lesson: LessonData }) {
  const [expanded, setExpanded] = useState(false);
  const [excerptExpanded, setExcerptExpanded] = useState(false);

  const info = lesson.source_info;
  const hasSourceInfo = info || lesson.source_excerpt;

  if (!hasSourceInfo) return null;

  const typeLabel = info ? TYPE_LABELS[info.source_type] || info.source_type : null;
  const title = info?.source_title;
  const author = info?.source_author;
  const publication = info?.source_publication;
  const url = info?.source_url;
  const excerpt = lesson.source_excerpt;

  // Collapsed summary line
  const summaryParts: string[] = [];
  if (typeLabel) summaryParts.push(typeLabel);
  if (title) summaryParts.push(title);
  const summary = summaryParts.length > 0
    ? summaryParts.join(": ")
    : "Source Material";

  return (
    <div className="max-w-[720px] mx-auto px-6 pb-10">
      <div
        className="mt-8 pt-6"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        {/* Toggle header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 w-full text-left bg-transparent border-none cursor-pointer p-0"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            style={{
              color: "var(--text3)",
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.15s",
              flexShrink: 0,
            }}
          >
            <path
              d="M4 2l4 4-4 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
          <span
            className="text-sm"
            style={{ color: "var(--text3)" }}
          >
            {summary}
          </span>
        </button>

        {/* Expanded content */}
        {expanded && (
          <div
            className="mt-4 rounded-lg p-5"
            style={{ background: "var(--bg2)" }}
          >
            {/* Metadata row */}
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-3">
              {typeLabel && (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded"
                  style={{
                    background: "var(--accent-light)",
                    color: "var(--accent)",
                  }}
                >
                  {typeLabel}
                </span>
              )}
              {title && (
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text)" }}
                >
                  {title}
                </span>
              )}
            </div>

            {/* Author / publication */}
            {(author || publication) && (
              <p className="text-sm mb-3" style={{ color: "var(--text2)" }}>
                {author && <span>{author}</span>}
                {author && publication && <span> — </span>}
                {publication && <span>{publication}</span>}
              </p>
            )}

            {/* Original URL */}
            {url && (
              <p className="text-sm mb-3">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline break-all"
                  style={{ color: "var(--accent)" }}
                >
                  {url}
                </a>
              </p>
            )}

            {/* Source excerpt */}
            {excerpt && (
              <div className="mt-4">
                <p
                  className="text-xs font-medium mb-2"
                  style={{ color: "var(--text3)" }}
                >
                  Source excerpt used for this lesson
                </p>
                <div
                  className="text-sm leading-relaxed rounded p-3"
                  style={{
                    color: "var(--text2)",
                    background: "var(--bg)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {excerptExpanded
                    ? excerpt
                    : excerpt.slice(0, 500) + (excerpt.length > 500 ? "..." : "")}
                </div>
                {excerpt.length > 500 && (
                  <button
                    onClick={() => setExcerptExpanded(!excerptExpanded)}
                    className="text-xs mt-2 bg-transparent border-none cursor-pointer p-0"
                    style={{ color: "var(--accent)" }}
                  >
                    {excerptExpanded ? "Show less" : "Show full excerpt"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
