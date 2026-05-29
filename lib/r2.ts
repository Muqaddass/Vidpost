import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let cached: S3Client | null = null;

export function getR2Client(): S3Client {
  if (cached) return cached;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 env vars missing");
  }
  cached = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cached;
}

export function getR2Bucket(): string {
  const b = process.env.R2_BUCKET_NAME;
  if (!b) throw new Error("R2_BUCKET_NAME env missing");
  return b;
}

// Publicly served via R2 public URL or a Worker; configure per bucket.
export function getR2PublicBase(): string {
  const url = process.env.R2_PUBLIC_URL;
  if (!url) throw new Error("R2_PUBLIC_URL env missing");
  return url.replace(/\/$/, "");
}

export async function uploadToR2(opts: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}): Promise<{ key: string; publicUrl: string }> {
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: opts.key,
      Body: opts.body,
      ContentType: opts.contentType,
    }),
  );
  return {
    key: opts.key,
    publicUrl: `${getR2PublicBase()}/${opts.key}`,
  };
}

/**
 * Returns a presigned PUT URL the browser can use to upload a file directly to R2,
 * bypassing the Next.js API route. Avoids Vercel's 4.5 MB serverless payload limit.
 */
export async function getR2PresignedPutUrl(opts: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<{ uploadUrl: string; publicUrl: string }> {
  const command = new PutObjectCommand({
    Bucket: getR2Bucket(),
    Key: opts.key,
    ContentType: opts.contentType,
  });
  const uploadUrl = await getSignedUrl(getR2Client(), command, {
    expiresIn: opts.expiresInSeconds ?? 60 * 10, // 10 min default
  });
  return {
    uploadUrl,
    publicUrl: `${getR2PublicBase()}/${opts.key}`,
  };
}
