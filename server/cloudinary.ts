import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Cloudinary initialization with user-configured credentials
export function getCloudinaryClient() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'streambuzz';
  const apiKey = process.env.CLOUDINARY_API_KEY || '973222111773271';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || 'a_WRw9fBnNU3HpBx4pn8MrPbqHc';

  if (!cloudName || !apiKey || !apiSecret) {
    return {
      isConfigured: false,
      client: null,
      cloudName: '',
      error: 'Cloudinary environment variables are missing',
    };
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
      folder: 'streambuzz_videos',
      chunk_size: 6000000, // 6MB chunks for resilient mobile uploads
      eager: [
        { format: 'jpg', transformation: [{ width: 720, height: 1280, crop: 'fill', gravity: 'auto' }] },
      ],
      eager_async: false,
    });

    const publicId = result.public_id;
    // Deliver optimized streaming URL for mobile performance
    const secureUrl = result.secure_url;
    const duration = Math.round(result.duration || 0);

    // Auto-generate high quality video thumbnail URL
    const thumbnailUrl =
      result.eager?.[0]?.secure_url ||
      client.url(publicId, {
        resource_type: 'video',
        format: 'jpg',
        transformation: [{ width: 720, height: 1280, crop: 'fill', gravity: 'auto' }],
      });

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
      folder: 'streambuzz_screenshots',
      resource_type: 'image',
    });
    return result.secure_url;
  } catch (err) {
    console.warn('Cloudinary image upload failed, keeping original:', err);
    return filePathOrBase64;
  }
}
