import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Heart,
  Share2,
  Calendar,
  Eye,
  Lock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Video } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { VideoPlayer } from '../components/VideoPlayer';
import { ShareModal } from '../components/ShareModal';
import { VideoCard } from '../components/VideoCard';

interface WatchPageProps {
  videoId: string;
  allVideos: Video[];
  onBack: () => void;
  onSelectVideo: (video: Video) => void;
}

export const WatchPage: React.FC<WatchPageProps> = ({
  videoId,
  allVideos,
  onBack,
  onSelectVideo,
}) => {
  const { userId, userMobile, userName } = useAuth();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [sharesCount, setSharesCount] = useState(0);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    api.getVideo(videoId)
      .then((v) => {
        if (!mounted) return;
        setVideo(v);
        setLikesCount(v.likesCount || 0);
        setSharesCount(v.sharesCount || 0);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setLoading(false);
      });

    api.isLiked(videoId, userId).then((liked) => {
      if (mounted) setIsLiked(liked);
    }).catch(() => {});

    return () => {
      mounted = false;
    };
  }, [videoId, userId]);

  const handleLike = async () => {
    if (!video) return;
    const nextLiked = !isLiked;
    const nextCount = nextLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
    setIsLiked(nextLiked);
    setLikesCount(nextCount);

    try {
      const res = await api.toggleLike(video._id, userId, userMobile, userName);
      setIsLiked(res.liked);
      setLikesCount(res.likesCount);
    } catch (err) {
      setIsLiked(!nextLiked);
      setLikesCount(likesCount);
    }
  };

  const handleShare = () => {
    if (!video) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: `Check out this video: ${video.title}`,
        text: `Check out this video: ${video.title}`,
        url: window.location.href,
      }).then(() => {
        api.registerShare(video._id);
        setSharesCount((prev) => prev + 1);
      }).catch(() => {
        setIsShareOpen(true);
      });
    } else {
      setIsShareOpen(true);
    }
  };

  const relatedVideos = allVideos.filter((v) => v._id !== videoId);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-400">Loading video streaming...</p>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="mx-auto max-w-lg py-20 px-4 text-center">
        <h2 className="text-2xl font-bold text-white">Video Not Found</h2>
        <p className="mt-2 text-sm text-slate-400">
          This video may have been deleted by the admin or does not exist.
        </p>
        <button
          onClick={onBack}
          className="mt-5 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-500"
        >
          Back to Catalogue
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      {/* Back button */}
      <button
        id="watch-back-to-catalogue-btn"
        onClick={onBack}
        className="mb-4 inline-flex items-center space-x-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to All Videos</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Video Section */}
        <div className="lg:col-span-2 space-y-5">
          {/* Video Player */}
          <VideoPlayer video={video} onUnlockedChange={setIsUnlocked} />

          {/* Video Details Card */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-xs">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1 min-w-[240px]">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white font-['Outfit']">
                  {video.title}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    <span>{new Date(video.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1 font-medium text-amber-400">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>₹49 Paywall Stream</span>
                  </div>
                </div>
              </div>

              {/* Interaction Buttons: Like & Share */}
              <div className="flex items-center gap-2.5">
                {/* Like Button */}
                <button
                  id="watch-like-btn"
                  onClick={handleLike}
                  className={`flex items-center space-x-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all cursor-pointer ${
                    isLiked
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-lg shadow-rose-500/10'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-rose-400'
                  }`}
                >
                  <Heart
                    className={`h-4 w-4 transition-transform active:scale-125 ${
                      isLiked ? 'fill-rose-500 text-rose-500' : ''
                    }`}
                  />
                  <span>{likesCount}</span>
                </button>

                {/* Share Button */}
                <button
                  id="watch-share-btn"
                  onClick={handleShare}
                  className="flex items-center space-x-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-sm font-bold text-slate-200 hover:text-white transition-colors cursor-pointer"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Description Box */}
            <div className="mt-5 border-t border-slate-800/80 pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Description
              </h4>
              <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                {video.description || 'No description provided for this video.'}
              </p>
            </div>

            {/* Access status banner */}
            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {isUnlocked ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <Lock className="h-4 w-4" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-white">
                    {isUnlocked ? 'Full Video Access Granted' : '5-Second Preview Active'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {isUnlocked
                      ? 'You have unlocked the full high-definition video.'
                      : 'Video pauses at 5 seconds. Pay ₹49 to unlock complete playback.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Related Videos */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white font-['Outfit']">
            More Short Videos ({relatedVideos.length})
          </h3>

          {relatedVideos.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-center text-xs text-slate-400">
              No other videos available. Admin uploads will appear here.
            </div>
          ) : (
            <div className="space-y-3">
              {relatedVideos.map((rVideo) => (
                <div
                  key={rVideo._id}
                  onClick={() => onSelectVideo(rVideo)}
                  className="group flex gap-3 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-rose-500/40 hover:bg-slate-900 p-2.5 cursor-pointer transition-all"
                >
                  <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-black">
                    <img
                      src={rVideo.thumbnailUrl || 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&q=80'}
                      alt={rVideo.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute top-1 left-1 rounded bg-rose-600/90 px-1 py-0.2 text-[8px] font-bold text-white">
                      5s
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 group-hover:text-rose-400 line-clamp-1">
                        {rVideo.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {rVideo.description || 'Watch now'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="flex items-center gap-0.5 text-rose-400">
                        <Heart className="h-2.5 w-2.5 fill-rose-500" />
                        {rVideo.likesCount}
                      </span>
                      <span>•</span>
                      <span>₹49 Unlock</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {isShareOpen && video && (
        <ShareModal
          video={video}
          onClose={() => setIsShareOpen(false)}
          onShareCompleted={() => setSharesCount((s) => s + 1)}
        />
      )}
    </div>
  );
};
