// src/utils/getContentType.ts

export const getFileType = (fileName: string): string | null => {
  const extension = fileName.split('.').pop()?.toLowerCase();

  const imageTypes = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'];
  const videoTypes = ['mp4', 'mov', 'avi', 'webm', 'mkv', 'flv', 'wmv'];

  if (imageTypes.includes(extension || '')) return `image/${extension === 'jpg' ? 'jpeg' : extension}`;
  if (videoTypes.includes(extension || '')) return `video/${extension}`;

  return null;
};
