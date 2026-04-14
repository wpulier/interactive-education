import { auth } from "@/auth";
import { NextResponse } from "next/server";

const API_URL = process.env.GENERATOR_API_URL || "http://localhost:8000";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();

  const res = await fetch(`${API_URL}/api/generate/pdf`, {
    method: "POST",
    headers: {
      "X-User-Id": session.user.id || "",
      "X-User-Name": session.user.name || "",
    },
    body: formData,
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
