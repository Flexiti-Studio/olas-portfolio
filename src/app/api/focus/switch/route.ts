import { NextResponse, NextRequest } from "next/server";
import { switchFocus } from "@/lib/focus/focus";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, force } = body;

    if (!projectId) {
      return NextResponse.json({ success: false, error: { message: "projectId is required" } }, { status: 400 });
    }

    const result = await switchFocus(projectId, { force });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
