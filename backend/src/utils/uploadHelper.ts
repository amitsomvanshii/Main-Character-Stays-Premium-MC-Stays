/**
 * Helper to get the public URL for an uploaded file.
 * Handles both Cloudinary URLs and local disk storage paths.
 */
export const getFileUrl = (file: Express.Multer.File | undefined): string | null => {
  if (!file) return null;

  // Cloudinary storage provides the full URL in 'path'
  if ((file as any).path && (file as any).path.startsWith('http')) {
    return (file as any).path;
  }

  // Fallback to local uploads path
  return `/uploads/${file.filename}`;
};

/**
 * Helper for multiple files
 */
export const getFileUrls = (files: Express.Multer.File[] | undefined): string[] => {
  if (!files) return [];
  return files.map(f => getFileUrl(f)).filter(url => url !== null) as string[];
};
