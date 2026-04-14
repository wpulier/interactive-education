/**
 * API client for the Lesson Generation Service.
 */

const API_BASE = process.env.NEXT_PUBLIC_GENERATOR_API_URL || "http://localhost:8000";

export interface GenerateRequest {
  source_type: "text" | "url";
  content: string;
  subject_slug: string;
}

export interface JobStatus {
  job_id: string;
  status: "pending" | "processing" | "complete" | "failed";
  progress: {
    stage?: string;
    detail?: string;
    current?: number;
    total?: number;
  };
  error?: string;
}

export interface LessonData {
  id: string;
  subject_slug: string;
  section_slug: string;
  concept_slug: string;
  title: string;
  description: string | null;
  code: string;
  version: number;
  source_excerpt: string | null;
}

export interface CurriculumData {
  id: string;
  subject_slug: string;
  structure: {
    title: string;
    slug: string;
    description: string;
    type: "concepts" | "work";
    meta?: { author?: string; year?: number };
    concepts: { slug: string; title: string; description: string }[];
  };
}

export async function startGeneration(request: GenerateRequest): Promise<{ job_id: string }> {
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`Generation failed: ${res.statusText}`);
  return res.json();
}

export async function startPdfGeneration(file: File, subjectSlug: string): Promise<{ job_id: string }> {
  const form = new FormData();
  form.append("file", file);
  form.append("subject_slug", subjectSlug);

  const res = await fetch(`${API_BASE}/api/generate/pdf`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`PDF generation failed: ${res.statusText}`);
  return res.json();
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}`);
  if (!res.ok) throw new Error(`Job fetch failed: ${res.statusText}`);
  return res.json();
}

export async function getLessons(subject?: string, section?: string): Promise<LessonData[]> {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (section) params.set("section", section);

  const res = await fetch(`${API_BASE}/api/lessons?${params}`);
  if (!res.ok) throw new Error(`Lessons fetch failed: ${res.statusText}`);
  return res.json();
}

export async function getCurriculums(subject?: string): Promise<CurriculumData[]> {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);

  const res = await fetch(`${API_BASE}/api/curriculums?${params}`);
  if (!res.ok) throw new Error(`Curriculums fetch failed: ${res.statusText}`);
  return res.json();
}
