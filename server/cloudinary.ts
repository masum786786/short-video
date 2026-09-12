import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Cloudinary initialization with user-configured credentials
export function getCloudinaryClient() {
  let cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  let apiKey = process.env.CLOUDINARY_API_KEY;
  let apiSecret = process.env.CLOUDINARY_API_SECRET;

  // Support CLOUDINARY_URL if present
  if (process.env.CLOUDINARY_URL) {
    try {
      const url = new URL(process.env.CLOUDINARY_URL);
      cloudName = cloudName || url.hostname;
      apiKey = apiKey || url.username;
      apiSecret = apiSecret || url.password;
    } catch (_) {}
  }

  cloudName = cloudName?.trim().replace(/^['"]|['"]$/g, '');
  apiKey = apiKey?.trim().replace(/^['"]|['"]$/g, '');
  apiSecret = apiSecret?.trim().replace(/^['"]|['"]$/g, '');

  // If cloudName is missing or old placeholder "streambuzz", use the active working cloudName 'dya4mw0bt'
  if (!cloudName || cloudName === 'streambuzz') {
    cloudName = 'dya4mw0bt';
  }

  if (!apiKey) {
    apiKey = '973222111773271';
  }

  if (!apiSecret) {
    apiSecret = 'a_WRw9fBnNU3HpBx4pn8MrPbqHc';
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return {
    isConfigured: true,
    client: cloudinary,
    cloudName,
    apiKey,
    apiSecret,
    error: null,
  };
}

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  thumbnailUrl: string;
  duration: number;
  width?: number;
  height?: number;
  format?: string;
}

export async function uploadVideoToCloudinary(filePath: string): Promise<CloudinaryUploadResult> {
  const { isConfigured, client, cloudName, error } = getCloudinaryClient();
  if (!isConfigured || !client) {
    throw new Error(error || 'Cloudinary is not configured');
  }

  try {
    const result = await client.uploader.upload(filePath, {
      resource_type: 'video',
      folder: 'my_videos',
      tags: ['my_videos'],
      chunk_size: 6000000, // 6MB chunks for resilient mobile uploads
      eager: [
        { format: 'jpg', transformation: [{ width: 720, height: 1280, crop: 'fill', gravity: 'auto' }] },
      ],
      eager_async: false,
    });

    const publicId = result.public_id;
    // Deliver optimized streaming URL for mobile performance
    const secureUrl = result.secure_url;
    const duration = Math.round(result.duration || 60);

    // Auto-generate high quality video thumbnail URL using so_2,f_jpg,w_400,h_250,c_fill
    let thumbnailUrl = '';
    if (secureUrl && secureUrl.includes('/upload/')) {
      thumbnailUrl = secureUrl
        .replace('/upload/', '/upload/so_2,f_jpg,w_400,h_250,c_fill/')
        .replace(/\.[^/.]+$/, '.jpg');
    } else {
      thumbnailUrl = client.url(publicId, {
        resource_type: 'video',
        format: 'jpg',
        transformation: [{ start_offset: '2', width: 400, height: 250, crop: 'fill' }],
      });
    }

    // Invalidate 60s cache on new upload
    invalidateVideosCache();

    return {
      publicId,
      secureUrl,
      thumbnailUrl,
      duration,
      width: result.width,
      height: result.height,
      format: result.format,
    };
  } catch (err: any) {
    console.error('Cloudinary video upload failed:', err);
    throw new Error(err?.message || 'Failed to upload video to Cloudinary');
  }
}

// --------------------------------------------------------------------------
// Cloudinary Search API (tag/folder = "my_videos") with 60-Second Cache
// --------------------------------------------------------------------------

export interface CloudinaryVideoResource {
  public_id: string;
  secure_url: string;
  format: string;
  duration: number;
  created_at: string;
  thumbnail: string;
  // UI compatibility fields:
  _id: string;
  title: string;
  description: string;
  cloudinaryPublicId: string;
  cloudinaryUrl: string;
  thumbnailUrl: string;
  likesCount: number;
  sharesCount: number;
  createdAt: string;
  updatedAt: string;
}

let cachedVideos: CloudinaryVideoResource[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds rate limit cache

export function invalidateVideosCache(): void {
  cachedVideos = null;
  lastCacheTime = 0;
}

export async function searchCloudinaryVideos(): Promise<CloudinaryVideoResource[]> {
  const { isConfigured, client, error } = getCloudinaryClient();
  if (!isConfigured || !client) {
    throw new Error(error || 'Cloudinary credentials are not configured');
  }

  try {
    // Search Cloudinary for videos tagged with "my_videos", in folder "my_videos", or with public_id starting with my_videos/
    const searchResult = await client.search
      .expression('resource_type:video AND (folder:my_videos* OR tags:my_videos OR public_id:my_videos/*)')
      .sort_by('created_at', 'desc')
      .max_results(100)
      .execute();

    let resources = searchResult.resources || [];

    // Fallback: If no assets specifically tagged "my_videos" yet, fallback to all video resources
    if (resources.length === 0) {
      try {
        const fallbackResult = await client.search
          .expression('resource_type:video')
          .sort_by('created_at', 'desc')
          .max_results(50)
          .execute();
        if (fallbackResult.resources && fallbackResult.resources.length > 0) {
          resources = fallbackResult.resources;
        }
      } catch (_) {}
    }

    return resources.map((r: any) => {
      const public_id = r.public_id;
      const secure_url = r.secure_url;
      const format = r.format || 'mp4';
      const duration = Math.round(r.duration || 60);
      const created_at = r.created_at;

      // Generate thumbnail with requested transformation: so_2,f_jpg,w_400,h_250,c_fill
      let thumbnail = '';
      if (secure_url && secure_url.includes('/upload/')) {
        thumbnail = secure_url
          .replace('/upload/', '/upload/so_2,f_jpg,w_400,h_250,c_fill/')
          .replace(/\.[^/.]+$/, '.jpg');
      } else {
        thumbnail = client.url(public_id, {
          resource_type: 'video',
          format: 'jpg',
          transformation: [{ start_offset: '2', width: 400, height: 250, crop: 'fill' }],
        });
      }

      // Title and description from custom context metadata, or cleaned public_id
      const filename = public_id.split('/').pop() || 'Video';
      const cleanTitle = filename.replace(/[_-]/g, ' ').replace(/\.[^/.]+$/, '');
      const title = r.context?.custom?.caption || r.context?.custom?.title || cleanTitle;
      const description = r.context?.custom?.description || `High quality stream (${format.toUpperCase()})`;

      return {
        public_id,
        secure_url,
        format,
        duration,
        created_at,
        thumbnail,

        // Frontend compatibility properties
        _id: public_id,
        title,
        description,
        cloudinaryPublicId: public_id,
        cloudinaryUrl: secure_url,
        thumbnailUrl: thumbnail,
        likesCount: 0,
        sharesCount: 0,
        createdAt: created_at,
        updatedAt: created_at,
      };
    });
  } catch (err: any) {
    console.error('Cloudinary search failed:', err);
    throw new Error(err?.message || 'Failed to search Cloudinary videos');
  }
}

export async function getCachedCloudinaryVideos(forceRefresh = false): Promise<CloudinaryVideoResource[]> {
  const now = Date.now();
  if (!forceRefresh && cachedVideos && (now - lastCacheTime < CACHE_TTL_MS)) {
    return cachedVideos;
  }

  const videos = await searchCloudinaryVideos();
  cachedVideos = videos;
  lastCacheTime = now;
  return videos;
}

export async function deleteVideoFromCloudinary(publicId: string): Promise<boolean> {
  const { isConfigured, client } = getCloudinaryClient();
  if (!isConfigured || !client) {
    return false;
  }

  try {
    const res = await client.uploader.destroy(publicId, { resource_type: 'video' });
    return res.result === 'ok' || res.result === 'not found';
  } catch (err) {
    console.error('Cloudinary video delete error:', err);
    return false;
  }
}

export async function uploadImageToCloudinary(filePathOrBase64: string): Promise<string> {
  const { isConfigured, client } = getCloudinaryClient();
  if (!isConfigured || !client) {
    return filePathOrBase64;
  }

  try {
    const result = await client.uploader.upload(filePathOrBase64, {
      folder: 'my_screenshots',
      resource_type: 'image',
    });
    return result.secure_url;
  } catch (err) {
    console.warn('Cloudinary image upload failed, keeping original:', err);
    return filePathOrBase64;
  }
}
