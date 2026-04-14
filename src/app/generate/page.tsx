"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { startGeneration, startPdfGeneration, getJobStatus, type JobStatus } from "@/lib/api";

type SourceType = "text" | "url" | "pdf";

export default function GeneratePage() {
  const [sourceType, setSourceType] = useState<SourceType>("text");
  const [content, setContent] = useState("");
  const [subjectSlug, setSubjectSlug] = useState("community");
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<JobStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      let result: { job_id: string };

      if (sourceType === "pdf") {
        if (!file) {
          setError("Please select a PDF file");
          setSubmitting(false);
          return;
        }
        result = await startPdfGeneration(file, subjectSlug);
      } else {
        if (!content.trim()) {
          setError("Please enter content");
          setSubmitting(false);
          return;
        }
        result = await startGeneration({
          source_type: sourceType,
          content: content.trim(),
          subject_slug: subjectSlug,
        });
      }

      setJob({ job_id: result.job_id, status: "pending", progress: { stage: "queued" } });

      // Poll for status
      pollRef.current = setInterval(async () => {
        try {
          const status = await getJobStatus(result.job_id);
          setJob(status);
          if (status.status === "complete" || status.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
          }
        } catch {
          // Keep polling on network errors
        }
      }, 2000);
    } catch (e: any) {
      setError(e.message || "Failed to start generation");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setJob(null);
    setContent("");
    setFile(null);
    setError(null);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="max-w-[720px] mx-auto px-6 py-12">
        <Link
          href="/"
          className="text-sm text-[var(--text3)] hover:text-[var(--accent)] transition-colors"
        >
          &larr; Home
        </Link>

        <h1
          className="text-3xl mt-4 mb-1 tracking-tight"
          style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
        >
          Generate Lessons
        </h1>
        <p className="text-[var(--text2)] mb-8">
          Turn any source material into interactive lessons.
        </p>

        {!job ? (
          <>
            {/* Source type selector */}
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
        ) : (
          /* Job status */
          <div className="rounded-2xl p-8" style={{ background: "var(--bg2)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-xl"
                style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
              >
                {job.status === "complete"
                  ? "Lessons Generated"
                  : job.status === "failed"
                  ? "Generation Failed"
                  : "Generating..."}
              </h2>
              <span
                className="text-xs px-3 py-1 rounded-full font-medium"
                style={{
                  background:
                    job.status === "complete"
                      ? "var(--accent)"
                      : job.status === "failed"
                      ? "#e74c3c"
                      : "var(--accent-med)",
                  color: "#fff",
                }}
              >
                {job.status}
              </span>
            </div>

            <p className="text-sm mb-4" style={{ color: "var(--text2)" }}>
              {job.progress?.detail || "Waiting..."}
            </p>

            {/* Progress bar */}
            {job.progress?.total && job.progress?.current && (
              <div
                className="h-2 rounded-full overflow-hidden mb-4"
                style={{ background: "var(--border)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    background: "var(--accent)",
                    width: `${(job.progress.current / job.progress.total) * 100}%`,
                  }}
                />
              </div>
            )}

            {job.error && (
              <pre
                className="text-xs p-3 rounded-lg overflow-x-auto mb-4"
                style={{ background: "var(--bg)", color: "#e74c3c" }}
              >
                {job.error}
              </pre>
            )}

            {job.status === "complete" && (
              <div className="mt-4 flex gap-3">
                <Link
                  href={`/${subjectSlug}`}
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ background: "var(--accent)" }}
                >
                  View Lessons &rarr;
                </Link>
                <button
                  onClick={resetForm}
                  className="px-5 py-2 rounded-lg text-sm font-medium border"
                  style={{ borderColor: "var(--border)", color: "var(--text2)" }}
                >
                  Generate More
                </button>
              </div>
            )}

            {job.status === "failed" && (
              <button
                onClick={resetForm}
                className="mt-2 px-5 py-2 rounded-lg text-sm font-medium border"
                style={{ borderColor: "var(--border)", color: "var(--text2)" }}
              >
                Try Again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
