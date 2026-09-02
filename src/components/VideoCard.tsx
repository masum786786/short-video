import React, { useState } from 'react';
import { Play, Heart, Share2, Clock, Lock } from 'lucide-react';
import { Video } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { ShareModal } from './ShareModal';

interface VideoCardProps {
  video: Video;
  onSelect: (video: Video) => void;
  onLikeChange?: (videoId: string, newCount: number) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  onSelect,
  onLikeChange,
}) => {
  const { userId, userMobile, userName } = useAuth();
  const [likesCount, setLikesCount] = useState(video.likesCount || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  // Initial like check
  React.useEffect(() => {
    let mounted = true;
    api.isLiked(video._id, userId).then((liked) => {
      if (mounted) setIsLiked(liked);
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, [video._id, userId]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiking) return;
    setIsLiking(true);

    // Optimistic UI update
    const nextLiked = !isLiked;
    const nextCount = nextLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
    setIsLiked(nextLiked);
    setLikesCount(nextCount);

    try {
      const res = await api.toggleLike(video._id, userId, userMobile, userName);
      setIsLiked(res.liked);
      setLikesCount(res.likesCount);
      if (onLikeChange) onLikeChange(video._id, res.likesCount);
    } catch (err) {
      // Revert on error
      setIsLiked(!nextLiked);
      setLikesCount(likesCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Try native share directly if available on mobile
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: `Check out this video: ${video.title}`,
        text: `Check out this video: ${video.title}`,
        url: `${window.location.origin}/?v=${video._id}`,
      }).then(() => {
        api.registerShare(video._id);
      }).catch(() => {
        setIsShareOpen(true);
      });
    } else {
      setIsShareOpen(true);
    }
  };

  // Format duration in mm:ss
  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0:45';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <>
      <div
        id={`video-card-${video._id}`}
        onClick={() => onSelect(video)}
        className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 hover:border-rose-500/40 hover:bg-slate-900 hover:shadow-xl hover:shadow-rose-950/20 transition-all duration-300 cursor-pointer"
      >
        {/* Video Thumbnail with Hover Overlay */}
        <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
          <img
            src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&q=80'}
            alt={video.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              // Fallback placeholder if custom thumbnail fails
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&q=80';
            }}
          />

          {/* Duration Badge */}
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-md bg-black/80 backdrop-blur-xs px-2 py-0.5 text-[11px] font-semibold text-white">
            <Clock className="h-3 w-3 text-slate-300" />
            <span>{formatDuration(video.duration)}</span>
          </div>

          {/* 5-sec preview badge */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-md bg-rose-600/90 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase text-white shadow-md">
            <Lock className="h-2.5 w-2.5" />
            <span>5s Preview</span>
          </div>

          {/* Hover Play Button */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-600/90 text-white shadow-xl shadow-rose-600/40 group-hover:scale-110 transition-transform">
              <Play className="h-6 w-6 fill-white translate-x-0.5" />
            </div>
          </div>
        </div>

        {/* Video Info Content */}
        <div className="flex flex-1 flex-col justify-between p-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 group-hover:text-rose-400 line-clamp-1 transition-colors">
              {video.title}
            </h3>
            <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {video.description || 'Watch full streaming content with ₹49 instant UPI unlock.'}
            </p>
          </div>

          {/* Footer Actions: Likes & Share */}
          <div className="mt-4 flex items-center justify-between border-t border-slate-800/60 pt-3">
            {/* Like Button */}
            <button
              id={`like-btn-${video._id}`}
              onClick={handleLike}
              className={`flex items-center space-x-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                isLiked
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-rose-400'
              }`}
            >
              <Heart
                className={`h-3.5 w-3.5 transition-transform active:scale-125 ${
                  isLiked ? 'fill-rose-500 text-rose-500' : ''
                }`}
              />
              <span>{likesCount}</span>
            </button>

            {/* Share Button */}
            <button
              id={`share-btn-${video._id}`}
              onClick={handleShareClick}
              className="flex items-center space-x-1.5 rounded-full bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              <Share2 className="h-3.5 w-3.5 text-slate-400" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* Share Modal Dialog */}
      {isShareOpen && (
        <ShareModal video={video} onClose={() => setIsShareOpen(false)} />
      )}
    </>
  );
};
