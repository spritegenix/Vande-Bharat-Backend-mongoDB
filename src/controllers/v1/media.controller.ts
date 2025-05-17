import { generatePresignedUrl } from '@/services/v1/s3.service';
import { ApiError } from '@/utils/ApiError';
import { asyncHandler } from '@/utils/asyncHandler';
import { Request, Response } from 'express';
import httpStatus from 'http-status';

export const getPresignedUploadUrl = asyncHandler(async (req: Request, res: Response) => {
  const { fileName, fileType, folder } = req.body;

  const result = await generatePresignedUrl({ fileName, fileType, folder });

  if (!result) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to generate upload URL');
  }

  res.status(httpStatus.OK).json({ success: true, data: result });
});