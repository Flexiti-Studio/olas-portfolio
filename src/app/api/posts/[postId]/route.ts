import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: any }) {
  try {
    const resolvedParams = await params;
    const { postId } = resolvedParams;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        versions: true,
        creator: true,
      }
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error: any) {
    console.error("Error fetching post:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
