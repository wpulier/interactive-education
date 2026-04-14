import { NextResponse } from "next/server";
import { auth } from "@/auth";

const API_URL = process.env.GENERATOR_API_URL || "http://localhost:8000";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  try {
    const res = await fetch(`${API_URL}/api/jobs/${jobId}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { job_id: jobId, status: "unknown", progress: {}, error: `Upstream ${res.status}` },
        { status: 200 }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { job_id: jobId, status: "unknown", progress: {}, error: "API unavailable" },
      { status: 200 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;

  try {
    const res = await fetch(`${API_URL}/api/jobs/${jobId}`, {
      method: "DELETE",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: data.detail || `Failed: ${res.status}` },
        { status: res.status }
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "API unavailable" }, { status: 503 });
  }
}
