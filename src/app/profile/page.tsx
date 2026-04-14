import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { ActiveJobs } from "@/components/active-jobs";
import { JobHistory } from "@/components/job-history";

const API_URL = process.env.GENERATOR_API_URL || process.env.NEXT_PUBLIC_GENERATOR_API_URL || "http://localhost:8000";

interface UserJob {
  job_id: string;
  status: string;
  progress: { stage?: string; detail?: string; current?: number; total?: number };
  error: string | null;
  created_at: string;
  completed_at: string | null;
  subject_slug?: string | null;
  section_slug?: string | null;
}

interface UserCurriculum {
  id: string;
  subject_slug: string;
  structure: {
    title: string;
    slug: string;
    description: string;
    concepts: { slug: string; title: string; description: string }[];
  };
  user_name: string | null;
  created_at: string | null;
  lesson_count: number | null;
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

async function fetchUserCurriculums(userId: string): Promise<UserCurriculum[]> {
  try {
    const res = await fetch(`${API_URL}/api/users/${userId}/curriculums`, { cache: "no-store" });
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

  const [jobs, curriculums] = await Promise.all([
    fetchUserJobs(session.user.id!),
    fetchUserCurriculums(session.user.id!),
  ]);

  const completedJobs = jobs.filter((j) => j.status === "complete");
  const failedJobs = jobs.filter((j) => j.status === "failed");

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="max-w-[720px] mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
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

        {/* Your Curriculums */}
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
          {curriculums.length === 0 ? (
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
            <div className="space-y-3">
              {curriculums.map((curriculum) => (
                <Link
                  key={curriculum.id}
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
                          {curriculum.lesson_count || curriculum.structure.concepts?.length || 0} lessons
                        </span>
                        <span className="text-xs text-[var(--text3)]">
                          {curriculum.subject_slug}
                        </span>
                        {curriculum.created_at && (
                          <span className="text-xs text-[var(--text3)]">
                            {new Date(curriculum.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className="text-xs shrink-0 mt-1"
                      style={{ color: "var(--accent)" }}
                    >
                      Open &rarr;
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Job History — client component with dismiss + clickable links */}
        <JobHistory initialJobs={[...completedJobs, ...failedJobs]} />
      </div>
    </div>
  );
}
