import { NextResponse } from "next/server";
import {
  r2Client,
  getBucketName,
  PutObjectCommand,
  GetObjectCommand,
  getPublicUrl,
} from "@/lib/r2";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
    }

    const rangeHeader = request.headers.get("range");

    const command = new GetObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      ...(rangeHeader && { Range: rangeHeader }),
    });

    const response = await r2Client.send(command);

    if (!response.Body) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const byteArray = await response.Body.transformToByteArray();
    const contentType = response.ContentType || "application/pdf";

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Disposition": "inline",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
    };

    if (response.ContentRange) {
      headers["Content-Range"] = response.ContentRange;
    }
    if (response.ContentLength !== undefined) {
      headers["Content-Length"] = response.ContentLength.toString();
    }

    return new Response(Buffer.from(byteArray), {
      status: rangeHeader ? 206 : 200,
      headers,
    });
  } catch (err: any) {
    console.error("Error serving uploaded file:", err);
    return NextResponse.json(
      { error: "Failed to retrieve file", details: err?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file") as any;
    if (!file)
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );

    const filename = file.name || `upload-${Date.now()}`;
    const key = `uploads/${Date.now()}-${filename}`;

    const arr = await file.arrayBuffer();
    const body = Buffer.from(arr);

    await r2Client.send(
      new PutObjectCommand({
        Bucket: getBucketName(),
        Key: key,
        Body: body,
        ContentType: file.type || "application/pdf",
      })
    );

    const url = getPublicUrl(key);
    return NextResponse.json({ success: true, key, url });
  } catch (err: any) {
    console.error("Upload failed", err);
    return NextResponse.json(
      { success: false, error: "Upload failed: " + err?.message },
      { status: 500 }
    );
  }
}
