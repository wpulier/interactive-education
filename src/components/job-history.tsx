"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteJob } from "@/lib/api";

interface Job {
  job_id: string;
  status: string;
  progress: { stage?: string; detail?: string; current?: number; total?: number };
  error: string | null;
  created_at: string;
  completed_at: string | null;
  subject_slug?: string | null;
  section_slug?: string | null;
}

export function JobHistory({ initialJobs }: { initialJobs: Job[] }) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (jobId: string) => {
    setDeleting(jobId);
    try {
      await deleteJob(jobId);
      setJobs((prev) => prev.filter((j) => j.job_id !== jobId));
    } catch {
      // Silently fail — job stays in the list
    } finally {
      setDeleting(null);
    }
  };

  if (jobs.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">Job History</h2>
      <div className="space-y-2">
        {jobs.map((job) => {
          const isComplete = job.status === "complete";
          const isFailed = job.status === "failed";
          const href =
            isComplete && job.subject_slug && job.section_slug
              ? `/${job.subject_slug}/${job.section_slug}`
              : null;

          const content = (
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">
                  {job.progress?.detail ||
                    (isComplete ? "Completed" : "Failed")}
                </p>
                <p className="text-xs text-[var(--text3)]">
                  {new Date(job.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                {isComplete && href && (
                  <span className="text-xs" style={{ color: "var(--accent)" }}>
                    Open &rarr;
                  </span>
                )}
                <span
                  className="text-xs px-2 py-0.5 rounded-full text-white"
                  style={{
                    background: isComplete ? "var(--accent)" : "#e74c3c",
                  }}
                >
                  {job.status}
                </span>
                {isFailed && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(job.job_id);
                    }}
                    disabled={deleting === job.job_id}
                    className="text-[var(--text3)] hover:text-[var(--text)] transition-colors text-lg leading-none px-1 cursor-pointer disabled:opacity-50"
                    title="Dismiss"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>
          );

          if (href) {
            return (
              <Link
                key={job.job_id}
                href={href}
                className="block rounded-xl border p-3 hover:border-[var(--accent-med)] transition-colors"
                style={{ borderColor: "var(--border)" }}
              >
                {content}
              </Link>
            );
          }

          return (
            <div
              key={job.job_id}
              className="rounded-xl border p-3"
              style={{ borderColor: "var(--border)" }}
            >
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
