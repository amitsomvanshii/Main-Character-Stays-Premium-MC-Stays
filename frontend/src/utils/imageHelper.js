import { API_BASE_URL } from '../config';

/**
 * Utility to resolve image URLs.
 * If the URL is already a full path (e.g. Cloudinary/S3), it returns it as is.
 * If it's a relative path (local uploads), it prepends the API_BASE_URL.
 */
export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  
  // Ensure the path starts with a slash if it's relative
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
