import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Qualquer storage S3-compatível funciona aqui (Backblaze B2 por padrão,
// mas também Cloudflare R2 ou outro) — só troca o endpoint/região/credenciais.
const bucket = process.env.STORAGE_BUCKET!;

export const storage = new S3Client({
  region: process.env.STORAGE_REGION || "auto",
  endpoint: process.env.STORAGE_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
  },
});

export function uploadKeyFor(jobId: string, filename: string) {
  return `uploads/${jobId}/${filename}`;
}

export async function presignUpload(key: string, contentType: string) {
  const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  return getSignedUrl(storage, cmd, { expiresIn: 3600 });
}

export async function presignDownload(key: string) {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(storage, cmd, { expiresIn: 3600 });
}
