import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Ensure environment variables exist
const accountId = process.env.R2_ACCOUNT_ID!;
const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;

// Initialize the S3 client pointed to Cloudflare R2
export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

// Helper to get the bucket name in lowercase since S3/R2 requires lowercase bucket names
export const getBucketName = () => {
  return (process.env.R2_BUCKET_NAME || "").toLowerCase();
};

export const getPublicUrl = (key: string) => {
  return `/api/uploads?key=${encodeURIComponent(key)}`;
};

export { PutObjectCommand, GetObjectCommand, DeleteObjectCommand };
