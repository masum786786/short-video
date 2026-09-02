import React from 'react';
import { Play, Sparkles, Shield, UploadCloud, Film } from 'lucide-react';
import { Video } from '../types';
import { VideoCard } from '../components/VideoCard';

interface HomePageProps {
  videos: Video[];
  loading: boolean;
  onSelectVideo: (video: Video) => void;
  onNavigateAdmin: () => void;
  onLikeChange?: (videoId: string, newCount: number) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  videos,
  loading,
  onSelectVideo,
  onNavigateAdmin,
  onLikeChange,
}) => {
  return (
    <div className="min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Featured Platform Banner */}
      <div className="relative mb-10 overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900 via-[#0b0e17] to-[#120814] p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1 text-xs font-bold text-rose-400 mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>5-Second Preview • ₹49 Instant UPI Access</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white font-['Outfit'] leading-tight">
            Premium Short Videos, <br />
            <span className="bg-gradient-to-r from-rose-500 via-rose-400 to-amber-400 bg-clip-text text-transparent">
              Streamed in High Definition
            </span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            Watch free 5-second previews of any video. Unlock complete, uninterrupted access for just ₹49 with instant PhonePe/UPI payment verification.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {videos.length > 0 && (
              <button
                id="hero-watch-first-btn"
                onClick={() => onSelectVideo(videos[0])}
                className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-rose-600/30 hover:from-rose-500 hover:to-rose-400 transition-all cursor-pointer"
              >
                <Play className="h-4 w-4 fill-white translate-x-0.5" />
                <span>Start Watching Now</span>
              </button>
            )}
            <button
              id="hero-admin-portal-btn"
              onClick={onNavigateAdmin}
              className="flex items-center space-x-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <Shield className="h-4 w-4 text-amber-400" />
              <span>Admin Studio</span>
            </button>
          </div>
        </div>
      </div>

      {/* Video Catalogue Section Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-white font-['Outfit'] flex items-center gap-2">
            <Film className="h-6 w-6 text-rose-500" />
            <span>Latest Short Videos</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cloudinary-powered video catalogue ({videos.length} {videos.length === 1 ? 'video' : 'videos'})
          </p>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-4 animate-pulse"
            >
              <div className="aspect-video w-full rounded-xl bg-slate-800" />
              <div className="h-4 w-3/4 rounded bg-slate-800" />
              <div className="h-3 w-1/2 rounded bg-slate-800" />
            </div>
          ))}
        </div>
      )}

      {/* Video Cards Grid */}
      {!loading && videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <VideoCard
              key={video._id}
              video={video}
              onSelect={onSelectVideo}
              onLikeChange={onLikeChange}
            />
          ))}
        </div>
      )}

      {/* Empty State when NO videos are uploaded yet */}
      {!loading && videos.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 py-16 px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 mb-4 border border-rose-500/20">
            <UploadCloud className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-white font-['Outfit']">
            No Videos in Catalogue Yet
          </h3>
          <p className="text-sm text-slate-400 mt-2 max-w-md">
            This platform displays only videos uploaded by the admin to Cloudinary. Login to the admin dashboard to upload the first short video!
          </p>
          <button
            id="empty-state-upload-btn"
            onClick={onNavigateAdmin}
            className="mt-6 flex items-center space-x-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-rose-600/30 hover:from-rose-500 hover:to-amber-400 transition-all cursor-pointer"
          >
            <Shield className="h-4 w-4" />
            <span>Go to Admin Dashboard to Upload Video</span>
          </button>
        </div>
      )}
    </div>
  );
};
