import { NextResponse } from "next/server";
import { sendDigest } from "@/lib/email/sendDigest";

export async function GET() {
  // Removed NODE_ENV check to prevent unexpected 404s in some dev setups

  const result = await sendDigest();

  if (!result.success) {
    return NextResponse.json(
      { error: "Failed to send digest", details: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, result });
}
