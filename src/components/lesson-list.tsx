"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getJobStatus, deleteJob } from "@/lib/api";

interface Curriculum {
  id: string;
  subject_slug: string;
  structure: {
    title: string;
    slug: string;
    description: string;
    concepts: { slug: string; title: string; description: string }[];
  };
  created_at: string | null;
  lesson_count: number | null;
}

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

// Unified item: either a completed curriculum or an in-flight/failed job
type LessonItem =
  | { kind: "completed"; curriculum: Curriculum }
  | { kind: "processing"; job: Job }
  | { kind: "failed"; job: Job };

export function LessonList({
  initialCurriculums,
  initialJobs,
}: {
  initialCurriculums: Curriculum[];
  initialJobs: Job[];
}) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [deleting, setDeleting] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const errorCount = useRef(0);

  const activeJobs = jobs.filter(
    (j) => j.status === "pending" || j.status === "processing"
  );
  const failedJobs = jobs.filter((j) => j.status === "failed");

  // Poll active jobs
  useEffect(() => {
    if (activeJobs.length === 0) return;
    errorCount.current = 0;

    pollRef.current = setInterval(async () => {
      if (errorCount.current >= 5) {
        if (pollRef.current) clearInterval(pollRef.current);
        return;
      }
      try {
        const updated = await Promise.all(
          jobs
            .filter((j) => j.status === "pending" || j.status === "processing")
            .map(async (j) => {
              try {
                const s = await getJobStatus(j.job_id);
                return { ...j, status: s.status, progress: s.progress, error: s.error || null };
              } catch {
                return j;
              }
            })
        );
        errorCount.current = 0;
        setJobs((prev) =>
          prev.map((j) => {
            const u = updated.find((u) => u.job_id === j.job_id);
            return u || j;
          })
        );
        const stillActive = updated.some(
          (j) => j.status === "pending" || j.status === "processing"
        );
        if (!stillActive && pollRef.current) {
          clearInterval(pollRef.current);
          window.location.reload();
        }
      } catch {
        errorCount.current++;
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeJobs.length]);

  const handleDismiss = async (jobId: string) => {
    setDeleting(jobId);
    try {
      await deleteJob(jobId);
      setJobs((prev) => prev.filter((j) => j.job_id !== jobId));
    } catch {
      // keep it in the list
    } finally {
      setDeleting(null);
    }
  };

  // Build unified list sorted by date (newest first)
  const items: LessonItem[] = [];

  // Processing jobs
  for (const job of activeJobs) {
    items.push({ kind: "processing", job });
  }
  // Completed curriculums
  for (const c of initialCurriculums) {
    items.push({ kind: "completed", curriculum: c });
  }
  // Failed jobs
  for (const job of failedJobs) {
    items.push({ kind: "failed", job });
  }

  if (items.length === 0) {
    return (
      <div
        className="rounded-xl border border-dashed p-8 text-center"
        style={{ borderColor: "var(--border)" }}
      >
        <p className="text-[var(--text2)] mb-1">No lessons yet</p>
        <p className="text-sm text-[var(--text3)]">
          <Link href="/generate" className="text-[var(--accent)] hover:underline">
            Generate your first lessons
          </Link>{" "}
          from any source material.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        if (item.kind === "processing") {
          return <ProcessingCard key={item.job.job_id} job={item.job} />;
        }
        if (item.kind === "completed") {
          return <CompletedCard key={item.curriculum.id} curriculum={item.curriculum} />;
        }
        return (
          <FailedCard
            key={item.job.job_id}
            job={item.job}
            deleting={deleting === item.job.job_id}
            onDismiss={() => handleDismiss(item.job.job_id)}
          />
        );
      })}
    </div>
  );
}

function CompletedCard({ curriculum }: { curriculum: Curriculum }) {
  const lessonCount =
    curriculum.lesson_count || curriculum.structure.concepts?.length || 0;

  return (
    <Link
      href={`/${curriculum.subject_slug}/${curriculum.structure.slug}`}
      className="block rounded-xl border p-5 hover:border-[var(--accent-med)] transition-colors"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-base">
            {curriculum.structure.title}
          </p>
          {curriculum.structure.description && (
            <p className="text-sm text-[var(--text2)] mt-1 line-clamp-2">
              {curriculum.structure.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-[var(--text3)]">
              {lessonCount} lesson{lessonCount !== 1 ? "s" : ""}
            </span>
            {curriculum.created_at && (
              <span className="text-xs text-[var(--text3)]">
                {new Date(curriculum.created_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <span className="text-xs shrink-0 mt-1" style={{ color: "var(--accent)" }}>
          Open &rarr;
        </span>
      </div>
    </Link>
  );
}

function ProcessingCard({ job }: { job: Job }) {
  const pct =
    job.progress?.total && job.progress?.current
      ? Math.round((job.progress.current / job.progress.total) * 100)
      : null;

  return (
    <div
      className="rounded-xl border p-5"
      style={{ borderColor: "var(--accent-med)", background: "var(--bg2)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">
          {job.progress?.detail || "Generating..."}
        </p>
        <span
          className="text-xs px-2 py-0.5 rounded-full text-white"
          style={{ background: "var(--accent-med)" }}
        >
          generating
        </span>
      </div>
      {pct !== null && (
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ background: "var(--accent)", width: `${pct}%` }}
          />
        </div>
      )}
      <p className="text-xs text-[var(--text3)] mt-2">
        Started {new Date(job.created_at).toLocaleString()}
      </p>
    </div>
  );
}

function FailedCard({
  job,
  deleting,
  onDismiss,
}: {
  job: Job;
  deleting: boolean;
  onDismiss: () => void;
}) {
  return (
    <div
      className="rounded-xl border p-4 flex items-start justify-between gap-3"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: "#e74c3c" }}>
          Generation failed
        </p>
        <p className="text-xs text-[var(--text3)] mt-1 line-clamp-1">
          {job.error || "Unknown error"}
        </p>
        <p className="text-xs text-[var(--text3)] mt-1">
          {new Date(job.created_at).toLocaleDateString()}
        </p>
      </div>
      <button
        onClick={onDismiss}
        disabled={deleting}
        className="text-[var(--text3)] hover:text-[var(--text)] transition-colors text-lg leading-none px-1 shrink-0 cursor-pointer disabled:opacity-50"
        title="Dismiss"
      >
        &times;
      </button>
    </div>
  );
}
