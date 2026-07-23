import { NextResponse, NextRequest } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const r2BucketName = process.env.R2_BUCKET_NAME || "olasportfolio";
const r2PublicBaseUrl = process.env.R2_PUBLIC_BASE_URL || "https://pub-611c6bf0623f4d68be69771944118b95.r2.dev";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: { message: "No file provided in form data" } },
        { status: 400 }
      );
    }

    const filename = file.name;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Auto-detect version number from filename (e.g. olas-todo-widget_1.2.0_x64-setup.exe => 1.2.0)
    const versionMatch = filename.match(/(\d+\.\d+\.\d+)/);
    const detectedVersion = versionMatch ? versionMatch[1] : null;

    let finalPublicUrl = "";
    let uploadSource = "R2_S3";

    // Attempt upload to Cloudflare R2 / S3 bucket if credentials configured
    if (r2AccountId && r2AccessKeyId && r2SecretAccessKey) {
      try {
        const s3Client = new S3Client({
          region: "auto",
          endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: r2AccessKeyId,
            secretAccessKey: r2SecretAccessKey,
          },
        });

        const objectKey = `downloads/${filename}`;
        
        await s3Client.send(
          new PutObjectCommand({
            Bucket: r2BucketName,
            Key: objectKey,
            Body: buffer,
            ContentType: file.type || "application/octet-stream",
          })
        );

        finalPublicUrl = `${r2PublicBaseUrl.replace(/\/$/, "")}/${objectKey}`;
      } catch (s3Error) {
        console.warn("R2 S3 Upload failed, falling back to local storage:", s3Error);
        uploadSource = "LOCAL_FALLBACK";
      }
    } else {
      uploadSource = "LOCAL_STATIC";
    }

    // Fallback to static public downloads directory if R2 is unconfigured or failed
    if (!finalPublicUrl) {
      const publicDownloadsDir = path.join(process.cwd(), "public", "downloads");
      if (!fs.existsSync(publicDownloadsDir)) {
        fs.mkdirSync(publicDownloadsDir, { recursive: true });
      }

      const filePath = path.join(publicDownloadsDir, filename);
      fs.writeFileSync(filePath, buffer);

      const domain = req.headers.get("host") || "ola.flexitistudio.com";
      const protocol = req.headers.get("x-forwarded-proto") || "https";
      finalPublicUrl = `${protocol}://${domain}/downloads/${filename}`;
    }

    return NextResponse.json({
      success: true,
      data: {
        filename,
        downloadUrl: finalPublicUrl,
        detectedVersion,
        uploadSource,
        sizeBytes: buffer.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || "File upload failed" } },
      { status: 500 }
    );
  }
}
