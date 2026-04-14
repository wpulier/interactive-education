import { NextResponse } from "next/server";

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
