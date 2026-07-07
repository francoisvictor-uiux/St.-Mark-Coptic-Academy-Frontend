import { NextResponse } from "next/server";

type ApplyPayload = {
  fullName?: string;
  email?: string;
  phone?: string;
  program?: string;
  qualification?: string;
  message?: string;
  website?: string; // honeypot
};

/**
 * Admission application endpoint (stub).
 * CMS-ready: swap the console.log for a database insert / email service
 * without touching the frontend contract.
 */
export async function POST(request: Request) {
  let payload: ApplyPayload;
  try {
    payload = (await request.json()) as ApplyPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  // Honeypot filled → silently accept (bot).
  if (payload.website) {
    return NextResponse.json({ ok: true });
  }

  if (!payload.fullName || !payload.email || !payload.phone || !payload.program) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 422 });
  }

  console.log("[apply] new admission application:", {
    fullName: payload.fullName,
    email: payload.email,
    phone: payload.phone,
    program: payload.program,
    qualification: payload.qualification,
    receivedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
