"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { startGeneration, startPdfGeneration } from "@/lib/api";

type SourceType = "text" | "url" | "pdf";

export default function GeneratePage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [sourceType, setSourceType] = useState<SourceType>("text");
  const [content, setContent] = useState("");
  const [subjectSlug, setSubjectSlug] = useState("community");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAttribution, setShowAttribution] = useState(false);
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceAuthor, setSourceAuthor] = useState("");
  const [sourcePublication, setSourcePublication] = useState("");

  if (authStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--text3)]">Loading...</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1
            className="text-2xl mb-2"
            style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
          >
            Sign in to generate lessons
          </h1>
          <p className="text-[var(--text2)] mb-6">
            You need an account to create and track lesson generations.
          </p>
          <button
            onClick={() => signIn("google")}
            className="px-6 py-3 rounded-lg text-sm font-semibold text-white"
            style={{ background: "var(--accent)" }}
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      if (sourceType === "pdf") {
        if (!file) {
          setError("Please select a PDF file");
          setSubmitting(false);
          return;
        }
        await startPdfGeneration(file, subjectSlug);
      } else {
        if (!content.trim()) {
          setError("Please enter content");
          setSubmitting(false);
          return;
        }
        await startGeneration({
          source_type: sourceType,
          content: content.trim(),
          subject_slug: subjectSlug,
          ...(sourceTitle && { source_title: sourceTitle }),
          ...(sourceAuthor && { source_author: sourceAuthor }),
          ...(sourcePublication && { source_publication: sourcePublication }),
        });
      }

      // Redirect to profile to track progress
      router.push("/profile");
    } catch (e: any) {
      setError(e.message || "Failed to start generation");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="max-w-[720px] mx-auto px-6 py-8">
        <h1
          className="text-3xl mb-1 tracking-tight"
          style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
        >
          Generate Lessons
        </h1>
        <p className="text-[var(--text2)] mb-8">
          Turn any source material into interactive lessons.
        </p>

        {/* Source type selector */}
          <>
            <div className="flex gap-2 mb-6">
              {(["text", "url", "pdf"] as SourceType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setSourceType(type)}
                  className="px-4 py-2 rounded-lg text-sm font-medium border transition-all cursor-pointer"
                  style={{
                    background: sourceType === type ? "var(--accent)" : "var(--bg)",
                    color: sourceType === type ? "#fff" : "var(--text)",
                    borderColor: sourceType === type ? "var(--accent)" : "var(--border)",
                  }}
                >
                  {type === "text" ? "Text" : type === "url" ? "URL" : "PDF"}
                </button>
              ))}
            </div>

            {/* Input area */}
            {sourceType === "text" && (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste your source material here — an article, chapter, notes, anything you want turned into interactive lessons..."
                className="w-full h-48 p-4 rounded-xl border text-sm resize-y"
                style={{
                  background: "var(--bg2)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              />
            )}

            {sourceType === "url" && (
              <input
                type="url"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="https://en.wikipedia.org/wiki/..."
                className="w-full p-4 rounded-xl border text-sm"
                style={{
                  background: "var(--bg2)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              />
            )}

            {sourceType === "pdf" && (
              <div
                className="w-full p-8 rounded-xl border-2 border-dashed text-center cursor-pointer"
                style={{ borderColor: "var(--border)" }}
                onClick={() => document.getElementById("pdf-input")?.click()}
              >
                <input
                  id="pdf-input"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <p className="text-sm" style={{ color: "var(--text2)" }}>
                  {file ? file.name : "Click to upload a PDF"}
                </p>
              </div>
            )}

            {/* Subject slug */}
            <div className="mt-4">
              <label className="text-xs block mb-1" style={{ color: "var(--text3)" }}>
                Subject (slug)
              </label>
              <input
                type="text"
                value={subjectSlug}
                onChange={(e) => setSubjectSlug(e.target.value)}
                className="w-full p-3 rounded-lg border text-sm"
                style={{
                  background: "var(--bg2)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              />
            </div>

            {/* Source attribution (optional) */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowAttribution(!showAttribution)}
                className="flex items-center gap-2 text-sm cursor-pointer bg-transparent border-none p-0"
                style={{ color: "var(--text2)" }}
              >
                <svg
                  width="12" height="12" viewBox="0 0 12 12"
                  style={{
                    transform: showAttribution ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 0.15s",
                  }}
                >
                  <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                Source attribution (optional)
              </button>

              {showAttribution && (
                <div className="mt-3 space-y-3">
                  {sourceType === "url" && (
                    <p className="text-xs" style={{ color: "var(--text3)" }}>
                      We&apos;ll auto-detect the page title if you leave it blank.
                    </p>
                  )}
                  <div>
                    <label className="text-xs block mb-1" style={{ color: "var(--text3)" }}>
                      Title
                    </label>
                    <input
                      type="text"
                      value={sourceTitle}
                      onChange={(e) => setSourceTitle(e.target.value)}
                      placeholder="Title of the article, book, or document"
                      className="w-full p-3 rounded-lg border text-sm"
                      style={{
                        background: "var(--bg2)",
                        borderColor: "var(--border)",
                        color: "var(--text)",
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: "var(--text3)" }}>
                      Author
                    </label>
                    <input
                      type="text"
                      value={sourceAuthor}
                      onChange={(e) => setSourceAuthor(e.target.value)}
                      placeholder="Author name"
                      className="w-full p-3 rounded-lg border text-sm"
                      style={{
                        background: "var(--bg2)",
                        borderColor: "var(--border)",
                        color: "var(--text)",
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: "var(--text3)" }}>
                      Publication
                    </label>
                    <input
                      type="text"
                      value={sourcePublication}
                      onChange={(e) => setSourcePublication(e.target.value)}
                      placeholder="Website, journal, or publisher"
                      className="w-full p-3 rounded-lg border text-sm"
                      style={{
                        background: "var(--bg2)",
                        borderColor: "var(--border)",
                        color: "var(--text)",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm mt-4" style={{ color: "#e74c3c" }}>
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="mt-6 px-6 py-3 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--accent)" }}
            >
              {submitting ? "Starting..." : "Generate Lessons"}
            </button>
          </>
      </div>
    </div>
  );
}
