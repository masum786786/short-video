import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  Share2,
  Lock,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Sparkles,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  RotateCcw,
  Info,
} from 'lucide-react';
import { Video } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { PaywallModal } from './PaywallModal';
import { ShareModal } from './ShareModal';

interface ShortsFeedProps {
  videos: Video[];
  onSelectVideo?: (video: Video) => void;
  onNavigateExplore: () => void;
  onNavigateAdmin: () => void;
  onLikeChange?: (videoId: string, newCount: number) => void;
}

export const ShortsFeed: React.FC<ShortsFeedProps> = ({
  videos,
  onSelectVideo,
  onNavigateExplore,
  onNavigateAdmin,
  onLikeChange,
}) => {
  const { userId, userMobile, userName } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(60);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [previewLocked, setPreviewLocked] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [showPlayPauseIcon, setShowPlayPauseIcon] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartY = useRef<number>(0);
  const lastTapRef = useRef<number>(0);

  const currentVideo = videos[currentIndex] || null;

  // Load video access and like state when current video changes
  useEffect(() => {
    if (!currentVideo) return;

    setCurrentTime(0);
    setPreviewLocked(false);
    setIsPlaying(true);
    setLikesCount(currentVideo.likesCount || 0);

    let mounted = true;
    api.checkAccess(currentVideo._id, userId)
      .then((res) => {
        if (!mounted) return;
        setIsUnlocked(res.hasAccess);
      })
      .catch(() => {
        if (!mounted) return;
        setIsUnlocked(false);
      });

    api.isLiked(currentVideo._id, userId)
      .then((liked) => {
        if (mounted) setIsLiked(liked);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [currentIndex, currentVideo?._id, userId]);

  // Handle video playback time updates for the 5-second preview constraint
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    if (!isUnlocked && time >= 5.0) {
      videoRef.current.pause();
      videoRef.current.currentTime = 5.0;
      setIsPlaying(false);
      setPreviewLocked(true);
      setIsPaywallOpen(true);
    }
  };

  // Keyboard navigation (Arrow Up / Down)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') {
        goToNext();
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        goToPrev();
      } else if (e.key === ' ' || e.key === 'k') {
        togglePlayPause();
      } else if (e.key === 'm') {
        setIsMuted((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, videos.length]);

  const goToNext = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Touch swipe handling for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;

    if (diff > 50) {
      // Swiped UP -> Next video
      goToNext();
    } else if (diff < -50) {
      // Swiped DOWN -> Prev video
      goToPrev();
    }
  };

  // Tap on screen to toggle play/pause or double tap to like
  const handleScreenClick = (e: React.MouseEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap -> Like video!
      handleDoubleTapLike();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current === now) {
          togglePlayPause();
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;

    if (!isUnlocked && currentTime >= 5.0) {
      setPreviewLocked(true);
      setIsPaywallOpen(true);
      return;
    }

    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    setShowPlayPauseIcon(true);
    setTimeout(() => setShowPlayPauseIcon(false), 800);
  };

  const handleDoubleTapLike = () => {
    if (!isLiked && currentVideo) {
      handleLike();
    }
    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 900);
  };

  const handleLike = async () => {
    if (!currentVideo) return;
    const nextLiked = !isLiked;
    const nextCount = nextLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
    setIsLiked(nextLiked);
    setLikesCount(nextCount);
    if (onLikeChange) onLikeChange(currentVideo._id, nextCount);

    try {
      const res = await api.toggleLike(currentVideo._id, userId, userMobile, userName);
      setIsLiked(res.liked);
      setLikesCount(res.likesCount);
      if (onLikeChange) onLikeChange(currentVideo._id, res.likesCount);
    } catch {
      setIsLiked(!nextLiked);
      setLikesCount(likesCount);
    }
  };

  const handleShare = () => {
    if (!currentVideo) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: currentVideo.title,
        text: `Watch this short video: ${currentVideo.title}`,
        url: `${window.location.origin}/?v=${currentVideo._id}`,
      }).then(() => {
        api.registerShare(currentVideo._id);
      }).catch(() => {
        setIsShareOpen(true);
      });
    } else {
      setIsShareOpen(true);
    }
  };

  const handleUnlockedSuccess = () => {
    setIsUnlocked(true);
    setPreviewLocked(false);
    setIsPaywallOpen(false);
    if (videoRef.current) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  if (!videos || videos.length === 0) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 mb-4">
          <Sparkles className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold text-white font-['Outfit']">No Short Videos Uploaded</h3>
        <p className="text-sm text-slate-400 mt-2 max-w-sm">
          No Cloudinary videos are available yet. Log in to the Admin Dashboard to upload high quality short videos.
        </p>
        <button
          onClick={onNavigateAdmin}
          className="mt-5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-600/30 hover:scale-105 transition-all"
        >
          Go to Admin Studio
        </button>
      </div>
    );
  }

  const previewLeftSeconds = Math.max(0, Math.ceil(5.0 - currentTime));

  return (
    <div
      className="relative w-full h-[calc(100dvh-4rem)] sm:h-[calc(100vh-4.5rem)] max-w-md mx-auto overflow-hidden bg-black select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Active Video Player */}
      <video
        ref={videoRef}
        key={currentVideo._id}
        src={currentVideo.cloudinaryUrl}
        poster={currentVideo.thumbnailUrl}
        autoPlay
        playsInline
        muted={isMuted}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration || currentVideo.duration || 60);
          }
        }}
        onEnded={goToNext}
        onClick={handleScreenClick}
        className="h-full w-full object-cover cursor-pointer"
      />

      {/* Top 5-Second Progress Bar */}
      <div className="absolute top-0 inset-x-0 z-30 p-2">
        <div className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden backdrop-blur-md">
          <div
            className={`h-full transition-all duration-100 ${
              isUnlocked ? 'bg-emerald-400' : 'bg-gradient-to-r from-rose-500 to-amber-400'
            }`}
            style={{
              width: isUnlocked
                ? `${Math.min(100, (currentTime / (duration || 60)) * 100)}%`
                : `${Math.min(100, (currentTime / 5.0) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Top Status Badges */}
      <div className="absolute top-4 inset-x-3 z-30 flex items-center justify-between pointer-events-none">
        {/* Left Badge: 5s Preview or Unlocked */}
        {!isUnlocked ? (
          <div className="flex items-center space-x-1.5 rounded-full border border-rose-500/40 bg-rose-950/80 backdrop-blur-md px-3 py-1 text-xs font-bold text-rose-300 shadow-lg pointer-events-auto">
            <Lock className="h-3.5 w-3.5 text-rose-400" />
            <span>5s Preview ({previewLeftSeconds}s left)</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/80 backdrop-blur-md px-3 py-1 text-xs font-bold text-emerald-300 shadow-lg pointer-events-auto">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Full Video Unlocked</span>
          </div>
        )}

        {/* Right Badge: Video Counter */}
        <div className="rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-slate-300 border border-slate-700/50">
          {currentIndex + 1} / {videos.length}
        </div>
      </div>

      {/* Double Tap Heart Animation */}
      {showHeartAnim && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none animate-ping">
          <Heart className="h-28 w-28 fill-rose-500 text-rose-500 drop-shadow-[0_0_25px_rgba(244,63,94,0.8)]" />
        </div>
      )}

      {/* Play / Pause Animated Icon Feedback */}
      {showPlayPauseIcon && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-all">
            {isPlaying ? (
              <Play className="h-8 w-8 fill-white translate-x-0.5" />
            ) : (
              <Pause className="h-8 w-8" />
            )}
          </div>
        </div>
      )}

      {/* 5-Sec Locked Screen Paywall Overlay */}
      {!isUnlocked && previewLocked && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 backdrop-blur-lg p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-600/20 text-rose-500 border border-rose-500/40 mb-3 shadow-xl shadow-rose-600/20">
            <Lock className="h-8 w-8" />
          </div>
          <h3 className="text-2xl font-black text-white font-['Outfit']">
            5-Second Preview Ended
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-xs">
            Continue watching this full video. Pay ₹49 to unlock complete high-definition access.
          </p>

          <button
            id="shorts-pay-49-overlay-btn"
            onClick={() => setIsPaywallOpen(true)}
            className="mt-5 flex w-full max-w-xs items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-rose-600/40 hover:scale-105 active:scale-95 transition-all"
          >
            <Sparkles className="h-4 w-4" />
            <span>PAY ₹49 TO UNLOCK FULL VIDEO</span>
          </button>

          <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
                  setPreviewLocked(false);
                }
              }}
              className="flex items-center gap-1 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Replay 5s</span>
            </button>
            <span>•</span>
            <button onClick={goToNext} className="hover:text-white">
              Next Video →
            </button>
          </div>
        </div>
      )}

      {/* Right Floating Action Toolbar */}
      <div className="absolute right-3 bottom-24 z-30 flex flex-col items-center space-y-4">
        {/* Like Button */}
        <button
          id="shorts-like-btn"
          onClick={handleLike}
          className="flex flex-col items-center group cursor-pointer"
        >
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-md transition-all active:scale-125 ${
              isLiked
                ? 'bg-rose-500/30 text-rose-500 border border-rose-500/50 shadow-lg shadow-rose-500/20'
                : 'bg-black/50 text-white border border-white/20 hover:bg-black/70'
            }`}
          >
            <Heart className={`h-6 w-6 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
          </div>
          <span className="text-[11px] font-bold text-white mt-1 drop-shadow-md">
            {likesCount}
          </span>
        </button>

        {/* Share Button */}
        <button
          id="shorts-share-btn"
          onClick={handleShare}
          className="flex flex-col items-center group cursor-pointer"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white border border-white/20 backdrop-blur-md hover:bg-black/70 transition-all active:scale-125">
            <Share2 className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-bold text-white mt-1 drop-shadow-md">
            Share
          </span>
        </button>

        {/* ₹49 Unlock Pill Button */}
        {!isUnlocked && (
          <button
            id="shorts-unlock-pill-btn"
            onClick={() => setIsPaywallOpen(true)}
            className="flex flex-col items-center cursor-pointer group"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-rose-600 to-amber-500 text-white shadow-lg shadow-rose-600/40 animate-bounce">
              <Lock className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-extrabold text-amber-300 mt-1 drop-shadow-md">
              ₹49
            </span>
          </button>
        )}

        {/* Mute Toggle */}
        <button
          onClick={() => setIsMuted((prev) => !prev)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white border border-white/20 backdrop-blur-md hover:bg-black/70 transition-all cursor-pointer"
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>

      {/* Up / Down Navigation Floaters for Desktop or Tablet */}
      <div className="hidden sm:flex absolute right-3 top-20 z-30 flex-col space-y-2">
        <button
          onClick={goToPrev}
          disabled={currentIndex === 0}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white border border-white/20 backdrop-blur-md hover:bg-black/80 disabled:opacity-30 cursor-pointer"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
        <button
          onClick={goToNext}
          disabled={currentIndex === videos.length - 1}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white border border-white/20 backdrop-blur-md hover:bg-black/80 disabled:opacity-30 cursor-pointer"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>

      {/* Bottom Video Info Overlay */}
      <div className="absolute bottom-3 inset-x-3 z-30 text-white drop-shadow-lg pr-16">
        <h2 className="text-base sm:text-lg font-black font-['Outfit'] tracking-tight line-clamp-1">
          {currentVideo.title}
        </h2>

        {currentVideo.description && (
          <p
            onClick={() => setShowDescription(!showDescription)}
            className={`text-xs text-slate-200 mt-1 cursor-pointer ${
              showDescription ? '' : 'line-clamp-2'
            }`}
          >
            {currentVideo.description}
          </p>
        )}

        {/* 1-Tap Unlock Banner */}
        {!isUnlocked && (
          <button
            onClick={() => setIsPaywallOpen(true)}
            className="mt-2.5 flex items-center space-x-2 rounded-lg bg-gradient-to-r from-rose-600 to-amber-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md active:scale-95 transition-all"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Unlock Full Video for ₹49 (PhonePe / UPI)</span>
          </button>
        )}
      </div>

      {/* Paywall Modal */}
      <PaywallModal
        video={currentVideo}
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        onUnlocked={handleUnlockedSuccess}
      />

      {/* Share Modal */}
      {isShareOpen && (
        <ShareModal
          video={currentVideo}
          onClose={() => setIsShareOpen(false)}
          onShareCompleted={() => {}}
        />
      )}
    </div>
  );
};
