import { v2 as cloudinary } from 'cloudinary';

// 60-second route segment revalidation cache to prevent hitting Cloudinary Search API rate limits
export const revalidate = 60;

export async function GET(request: Request) {
  try {
    let cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    let apiKey = process.env.CLOUDINARY_API_KEY;
    let apiSecret = process.env.CLOUDINARY_API_SECRET;

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

    if (!cloudName || cloudName === 'streambuzz') {
      cloudName = 'dya4mw0bt';
    }
    if (!apiKey) {
      apiKey = '973222111773271';
    }
    if (!apiSecret) {
      apiSecret = 'a_WRw9fBnNU3HpBx4pn8MrPbqHc';
    }

    // Server-side Cloudinary configuration using CLOUDINARY_API_SECRET
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    // Cloudinary Admin/Search API: fetch all video resources with tag/folder/path = "my_videos"
    const searchResult = await cloudinary.search
      .expression('resource_type:video AND (folder:my_videos* OR tags:my_videos OR public_id:my_videos/*)')
      .sort_by('created_at', 'desc')
      .max_results(100)
      .execute();

    let resources = searchResult.resources || [];

    // Fallback: If no videos found with "my_videos" tag/folder yet, retrieve recent videos
    if (resources.length === 0) {
      try {
        const fallbackSearch = await cloudinary.search
          .expression('resource_type:video')
          .sort_by('created_at', 'desc')
          .max_results(50)
          .execute();
        if (fallbackSearch.resources && fallbackSearch.resources.length > 0) {
          resources = fallbackSearch.resources;
        }
      } catch (_) {}
    }

    const videos = resources.map((resource: any) => {
      const public_id = resource.public_id;
      const secure_url = resource.secure_url;
      const format = resource.format || 'mp4';
      const duration = Math.round(resource.duration || 60);
      const created_at = resource.created_at;

      // Generate video thumbnail using requested transformation: so_2,f_jpg,w_400,h_250,c_fill
      let thumbnail = '';
      if (secure_url && secure_url.includes('/upload/')) {
        thumbnail = secure_url
          .replace('/upload/', '/upload/so_2,f_jpg,w_400,h_250,c_fill/')
          .replace(/\.[^/.]+$/, '.jpg');
      } else {
        thumbnail = cloudinary.url(public_id, {
          resource_type: 'video',
          format: 'jpg',
          transformation: [
            { start_offset: '2', width: 400, height: 250, crop: 'fill' }
          ],
        });
      }

      const filename = public_id.split('/').pop() || 'Video';
      const cleanTitle = filename.replace(/[_-]/g, ' ').replace(/\.[^/.]+$/, '');
      const title = resource.context?.custom?.caption || resource.context?.custom?.title || cleanTitle;

      return {
        public_id,
        secure_url,
        format,
        duration,
        created_at,
        thumbnail,
        // UI & state compatibility fields
        _id: public_id,
        title,
        description: resource.context?.custom?.description || `Format: ${format.toUpperCase()}`,
        cloudinaryPublicId: public_id,
        cloudinaryUrl: secure_url,
        thumbnailUrl: thumbnail,
        likesCount: 0,
        sharesCount: 0,
        createdAt: created_at,
        updatedAt: created_at,
      };
    });

    return Response.json(
      { videos },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        },
      }
    );
  } catch (err: any) {
    console.error('Error fetching videos from Cloudinary Search API:', err);
    return Response.json(
      { error: err.message || 'Failed to fetch videos from Cloudinary' },
      { status: 500 }
    );
  }
}
