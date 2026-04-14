import { NextResponse } from "next/server";

const API_URL = process.env.GENERATOR_API_URL || "http://localhost:8000";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  const res = await fetch(`${API_URL}/api/jobs/${jobId}`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
