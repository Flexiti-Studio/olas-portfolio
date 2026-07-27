import { NextResponse, NextRequest } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const dynamic = "force-dynamic";

const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const r2BucketName = process.env.R2_BUCKET_NAME || "olasportfolio";
const r2PublicBaseUrl = process.env.R2_PUBLIC_BASE_URL || "https://pub-611c6bf0623f4d68be69771944118b95.r2.dev";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filename, contentType } = body;

    if (!filename) {
      return NextResponse.json(
        { success: false, error: { message: "No filename provided" } },
        { status: 400 }
      );
    }

    if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
      return NextResponse.json(
        { success: false, error: { message: "R2 S3 credentials not configured" } },
        { status: 500 }
      );
    }

    // Auto-detect version number from filename (e.g. olas-todo-widget_1.2.0_x64-setup.exe => 1.2.0)
    const versionMatch = filename.match(/(\d+\.\d+\.\d+)/);
    const detectedVersion = versionMatch ? versionMatch[1] : null;

    const s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
      },
    });

    const objectKey = `downloads/${filename}`;
    
    const command = new PutObjectCommand({
      Bucket: r2BucketName,
      Key: objectKey,
      ContentType: contentType || "application/octet-stream",
    });

    // Generate a pre-signed URL that expires in 1 hour
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    const encodedObjectKey = `downloads/${encodeURIComponent(filename)}`;
    const finalPublicUrl = `${r2PublicBaseUrl.replace(/\/$/, "")}/${encodedObjectKey}`;

    return NextResponse.json({
      success: true,
      data: {
        presignedUrl,
        downloadUrl: finalPublicUrl,
        detectedVersion,
        uploadSource: "R2_S3_PRESIGNED",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "Failed to generate presigned URL" } },
      { status: 500 }
    );
  }
}
