"use client";
import React, { useEffect, useState } from 'react';
import { Upload, Sparkles, Film } from 'lucide-react';

declare global {
  interface Window {
    cloudinary?: any;
  }
}

export interface UploadResult {
  public_id: string;
  secure_url: string;
  thumbnail_url: string;
}

interface CloudinaryUploaderProps {
  onUpload: (result: UploadResult) => void;
  cloudName?: string;
  uploadPreset?: string;
  buttonText?: string;
  className?: string;
}

export default function CloudinaryUploader({
  onUpload,
  cloudName = 'dya4mw0bt',
  uploadPreset = 'unsigned_videos',
  buttonText = 'Upload Video Widget',
  className,
}: CloudinaryUploaderProps) {
  const [widgetLoaded, setWidgetLoaded] = useState(false);

  useEffect(() => {
    if (!window.cloudinary) {
      const script = document.createElement('script');
      script.src = 'https://widget.cloudinary.com/v2.0/global/all.js';
      script.async = true;
      script.onload = () => setWidgetLoaded(true);
      document.body.appendChild(script);
    } else {
      setWidgetLoaded(true);
    }
  }, []);

  const openWidget = () => {
    if (!window.cloudinary) {
      alert('Cloudinary widget is still loading. Please try again in a moment.');
      return;
    }

    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: cloudName || 'dya4mw0bt',
        uploadPreset: uploadPreset || 'unsigned_videos',
        sources: ['local', 'url', 'camera'],
        multiple: false,
        resourceType: 'video',
        folder: 'my_videos',
        clientAllowedFormats: ['mp4', 'webm', 'mov'],
        maxFileSize: 500000000, // 500MB
        tags: ['my_videos'],
      },
      (error: any, result: any) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return;
        }

        if (result && result.event === 'success') {
          // ✅ Define video URL correctly
          const videoUrl = result.info.secure_url.replace(
            '/upload/',
            '/upload/f_auto/'
          );

          // ✅ Generate thumbnail using Cloudinary transformations
          const thumbnailUrl = result.info.secure_url.replace(
            '/upload/',
            '/upload/so_2,f_jpg,w_400,h_250,c_fill/'
          );

          // ✅ Send both back to parent
          onUpload({
            public_id: result.info.public_id,
            secure_url: videoUrl,
            thumbnail_url: thumbnailUrl,
          });

          console.log('✅ Video uploaded:', videoUrl);
        }
      }
    );

    widget.open();
  };

  return (
    <button
      type="button"
      id="cloudinary-widget-upload-btn"
      onClick={openWidget}
      className={
        className ||
        'flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-blue-600/30 hover:from-blue-500 hover:to-indigo-500 active:scale-95 transition-all cursor-pointer'
      }
    >
      <Upload className="h-4 w-4 shrink-0" />
      <span>{buttonText}</span>
    </button>
  );
}
