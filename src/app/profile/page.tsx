import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { LessonList } from "@/components/lesson-list";

const API_URL = process.env.GENERATOR_API_URL || process.env.NEXT_PUBLIC_GENERATOR_API_URL || "http://localhost:8000";

async function fetchUserJobs(userId: string) {
  try {
    const res = await fetch(`${API_URL}/api/users/${userId}/jobs`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function fetchUserCurriculums(userId: string) {
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

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Your Lessons</h2>
            <Link
              href="/generate"
              className="text-sm text-[var(--accent)] hover:underline"
            >
              Generate new &rarr;
            </Link>
          </div>
          <LessonList initialCurriculums={curriculums} initialJobs={jobs} />
        </section>
      </div>
    </div>
  );
}
