import { s3 } from "@/config/s3";
import { env } from "@/config/zodSafeEnv";
import { ApiError } from "@/utils/ApiError";
import { DeleteObjectCommand, PutObjectCommand, PutObjectCommandInput } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import httpStatus from "http-status";

const ALLOWED_MIME_TYPES = [
    "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
    "video/mp4", "video/quicktime", "video/x-msvideo", "video/webm",
];

// Generate presigned URL
export const generatePresignedUrl = async ({
    fileName,
    fileType,
    folder,
}: {
    fileName: string;
    fileType: string;
    folder: 'posts' | 'avatars' | 'covers';
}) => {
    if (!ALLOWED_MIME_TYPES.includes(fileType)) {
        throw new ApiError(httpStatus.NOT_FOUND, "Unsupported file type.");
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const sanitizedFileName = fileName.replace(/\s+/g, "-").toLowerCase();
    const fileKey = `${folder}/${sanitizedFileName}-${uniqueSuffix}`;

    const params: PutObjectCommandInput = {
        Bucket: env.STORAGE_AWS_S3_BUCKET_NAME,
        Key: fileKey,
        ContentType: fileType,
    };
    const command = new PutObjectCommand(params);
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });
    const fileUrl = `https://${env.STORAGE_AWS_S3_BUCKET_NAME}.s3.${env.STORAGE_AWS_REGION}.amazonaws.com/${fileKey}`;

    return { uploadUrl, fileUrl };
};

// Delete file from S3
export async function deleteFromS3(fileKey: string): Promise<unknown> {
  const command = new DeleteObjectCommand({
    Bucket: env.STORAGE_AWS_S3_BUCKET_NAME,
    Key: fileKey,
  });

  return s3.send(command);
}
