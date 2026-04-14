"use client";

import { useState, useEffect, useRef } from "react";
import { getJobStatus } from "@/lib/api";

interface Job {
  job_id: string;
  status: string;
  progress: { stage?: string; detail?: string; current?: number; total?: number };
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export function ActiveJobs({ initialJobs }: { initialJobs: Job[] }) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const errorCount = useRef(0);

  const activeJobs = jobs.filter((j) => j.status === "pending" || j.status === "processing");

  useEffect(() => {
    if (activeJobs.length === 0) return;

    errorCount.current = 0;

    pollRef.current = setInterval(async () => {
      // Stop polling after 5 consecutive errors
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
                const status = await getJobStatus(j.job_id);
                return { ...j, status: status.status, progress: status.progress, error: status.error || null };
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

        // Stop polling when all done
        const stillActive = updated.some((j) => j.status === "pending" || j.status === "processing");
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
  }, [initialJobs.length]);

  if (activeJobs.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold mb-3">Active Jobs</h2>
      <div className="space-y-3">
        {activeJobs.map((job) => (
          <div
            key={job.job_id}
            className="rounded-xl border p-4"
            style={{ borderColor: "var(--border)", background: "var(--bg2)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {job.progress?.detail || "Processing..."}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full text-white"
                style={{ background: "var(--accent-med)" }}
              >
                {job.status}
              </span>
            </div>
            {job.progress?.total && job.progress?.current && (
              <div
                className="h-1.5 rounded-full overflow-hidden"
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
              <p className="text-xs mt-2" style={{ color: "#e74c3c" }}>
                {job.error}
              </p>
            )}
            <p className="text-xs text-[var(--text3)] mt-2">
              Started {new Date(job.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
