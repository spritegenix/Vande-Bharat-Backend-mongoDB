import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./zodSafeEnv";

export const s3 = new S3Client({
  region: env.STORAGE_AWS_REGION,
  credentials: {
    accessKeyId: env.STORAGE_AWS_ACCESS_KEY_ID!,
    secretAccessKey: env.STORAGE_AWS_SECRET_ACCESS_KEY!,
  },
});