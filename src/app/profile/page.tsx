import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { ActiveJobs } from "@/components/active-jobs";

const API_URL = process.env.GENERATOR_API_URL || process.env.NEXT_PUBLIC_GENERATOR_API_URL || "http://localhost:8000";

interface UserJob {
  job_id: string;
  status: string;
  progress: { stage?: string; detail?: string; current?: number; total?: number };
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

interface UserLesson {
  id: string;
  subject_slug: string;
  section_slug: string;
  concept_slug: string;
  title: string;
  description: string | null;
  version: number;
}

async function fetchUserJobs(userId: string): Promise<UserJob[]> {
  try {
    const res = await fetch(`${API_URL}/api/users/${userId}/jobs`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function fetchUserLessons(userId: string): Promise<UserLesson[]> {
  try {
    const res = await fetch(`${API_URL}/api/users/${userId}/lessons`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const [jobs, lessons] = await Promise.all([
    fetchUserJobs(session.user.id!),
    fetchUserLessons(session.user.id!),
  ]);

  const activeJobs = jobs.filter((j) => j.status === "pending" || j.status === "processing");
  const completedJobs = jobs.filter((j) => j.status === "complete");
  const failedJobs = jobs.filter((j) => j.status === "failed");

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="max-w-[720px] mx-auto px-6 py-12">
        <Link
          href="/"
          className="text-sm text-[var(--text3)] hover:text-[var(--accent)] transition-colors"
        >
          &larr; Home
        </Link>

        <div className="flex items-center gap-4 mt-4 mb-8">
          {session.user.image && (
            <img
              src={session.user.image}
              alt=""
              className="w-12 h-12 rounded-full"
              referrerPolicy="no-referrer"
            />
          )}
          <div>
            <h1
              className="text-2xl tracking-tight"
              style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
            >
              {session.user.name}
            </h1>
            <p className="text-sm text-[var(--text3)]">{session.user.email}</p>
          </div>
        </div>

        {/* Active Jobs — client component with live polling */}
        <ActiveJobs initialJobs={jobs.filter((j) => j.status === "pending" || j.status === "processing")} />

        {/* Your Lessons */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Your Lessons</h2>
            <Link
              href="/generate"
              className="text-sm text-[var(--accent)] hover:underline"
            >
              Generate new &rarr;
            </Link>
          </div>
          {lessons.length === 0 ? (
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
          ) : (
            <div className="space-y-2">
              {lessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/${lesson.subject_slug}/${lesson.section_slug}/${lesson.concept_slug}`}
                  className="block rounded-xl border p-4 hover:border-[var(--accent-med)] transition-colors"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{lesson.title}</p>
                      {lesson.description && (
                        <p className="text-sm text-[var(--text2)] mt-0.5 line-clamp-1">
                          {lesson.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-[var(--text3)] shrink-0 ml-4">
                      v{lesson.version}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text3)] mt-1">
                    {lesson.subject_slug} / {lesson.section_slug}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Job History */}
        {(completedJobs.length > 0 || failedJobs.length > 0) && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Job History</h2>
            <div className="space-y-2">
              {[...completedJobs, ...failedJobs].map((job) => (
                <div
                  key={job.job_id}
                  className="rounded-xl border p-3 flex items-center justify-between"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div>
                    <p className="text-sm">
                      {job.progress?.detail || (job.status === "complete" ? "Completed" : "Failed")}
                    </p>
                    <p className="text-xs text-[var(--text3)]">
                      {new Date(job.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full text-white"
                    style={{
                      background: job.status === "complete" ? "var(--accent)" : "#e74c3c",
                    }}
                  >
                    {job.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
