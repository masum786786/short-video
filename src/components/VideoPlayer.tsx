import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Lock,
  Sparkles,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { Video } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { PaywallModal } from './PaywallModal';

interface VideoPlayerProps {
  video: Video;
  onUnlockedChange?: (isUnlocked: boolean) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, onUnlockedChange }) => {
  const { userId } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 60);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Access control states
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [previewLocked, setPreviewLocked] = useState(false);

  // Check access status from backend
  useEffect(() => {
    let mounted = true;
    api.checkAccess(video._id, userId)
      .then((res) => {
        if (!mounted) return;
        setIsUnlocked(res.hasAccess);
        setAccessChecked(true);
        if (onUnlockedChange) onUnlockedChange(res.hasAccess);
      })
      .catch((err) => {
        if (!mounted) return;
        setIsUnlocked(false);
        setAccessChecked(true);
      });

    return () => {
      mounted = false;
    };
  }, [video._id, userId]);

  // Monitor playback time to enforce 5-second preview constraint
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    // If NOT unlocked, lock playback immediately at 5.0 seconds
    if (!isUnlocked && time >= 5.0) {
      videoRef.current.pause();
      videoRef.current.currentTime = 5.0;
      setIsPlaying(false);
      setPreviewLocked(true);
      setIsPaywallOpen(true);
    }
  };

  const handlePlayPause = () => {
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
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTo = parseFloat(e.target.value);
    if (!videoRef.current) return;

    // Strict non-bypass: if not unlocked, do not allow seeking past 5 seconds
    if (!isUnlocked && seekTo > 5.0) {
      videoRef.current.currentTime = 5.0;
      setCurrentTime(5.0);
      videoRef.current.pause();
      setIsPlaying(false);
      setPreviewLocked(true);
      setIsPaywallOpen(true);
      return;
    }

    videoRef.current.currentTime = seekTo;
    setCurrentTime(seekTo);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleUnlockedSuccess = () => {
    setIsUnlocked(true);
    setPreviewLocked(false);
    setIsPaywallOpen(false);
    if (onUnlockedChange) onUnlockedChange(true);
    if (videoRef.current) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const formatTime = (timeInSec: number) => {
    const mins = Math.floor(timeInSec / 60);
    const secs = Math.floor(timeInSec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <>
      <div
        ref={containerRef}
        className="group relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-slate-800"
      >
        {/* HTML5 Video Element */}
        <video
          ref={videoRef}
          src={video.cloudinaryUrl}
          poster={video.thumbnailUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration || video.duration || 60);
            }
          }}
          onEnded={() => setIsPlaying(false)}
          onClick={handlePlayPause}
          playsInline
          className="h-full w-full object-contain cursor-pointer"
        />

        {/* 5-Sec Preview Indicator Badge */}
        {!isUnlocked && (
          <div className="absolute top-4 left-4 z-20 flex items-center space-x-2 rounded-full border border-rose-500/40 bg-rose-950/80 backdrop-blur-md px-3 py-1 text-xs font-bold text-rose-300 shadow-lg">
            <Lock className="h-3.5 w-3.5 text-rose-400" />
            <span>5-Second Preview {currentTime > 0 && `(${Math.min(5, Math.ceil(5 - currentTime))}s left)`}</span>
          </div>
        )}

        {/* Unlocked Full Access Badge */}
        {isUnlocked && (
          <div className="absolute top-4 left-4 z-20 flex items-center space-x-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/80 backdrop-blur-md px-3 py-1 text-xs font-bold text-emerald-300 shadow-lg">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Full Video Access Unlocked</span>
          </div>
        )}

        {/* Locked Screen Paywall Overlay at 5s */}
        {!isUnlocked && previewLocked && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-600/20 text-rose-500 border border-rose-500/40 mb-3 shadow-lg shadow-rose-600/20">
              <Lock className="h-8 w-8" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">
              5-Second Preview Ended
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md">
              Continue watching this video – Pay ₹49 to unlock full access.
            </p>
            <button
              id="locked-overlay-pay-btn"
              onClick={() => setIsPaywallOpen(true)}
              className="mt-4 flex items-center space-x-2 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 px-6 py-3 text-sm font-extrabold text-white shadow-xl shadow-rose-600/40 hover:scale-105 active:scale-95 transition-all"
            >
              <Sparkles className="h-4 w-4" />
              <span>PAY ₹49 TO UNLOCK FULL ACCESS</span>
            </button>
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
                  setPreviewLocked(false);
                }
              }}
              className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Replay 5s preview</span>
            </button>
          </div>
        )}

        {/* Video Player Controls Bar */}
        <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 opacity-90 group-hover:opacity-100 transition-opacity">
          {/* Progress Bar Slider */}
          <div className="relative mb-2.5 flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-slate-700/80 rounded-lg appearance-none cursor-pointer accent-rose-500 focus:outline-none"
            />
            {/* Visual marker for 5s preview cutoff */}
            {!isUnlocked && duration > 5 && (
              <div
                className="absolute top-1/2 -translate-y-1/2 h-3 w-1 bg-amber-400 rounded-full pointer-events-none"
                style={{ left: `${Math.min(100, (5 / duration) * 100)}%` }}
                title="Preview End (5s)"
              />
            )}
          </div>

          <div className="flex items-center justify-between text-white text-xs">
            <div className="flex items-center space-x-3">
              {/* Play / Pause */}
              <button
                id="video-play-pause-btn"
                onClick={handlePlayPause}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600/90 text-white hover:bg-rose-500 transition-colors"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-white translate-x-0.5" />}
              </button>

              {/* Volume & Mute */}
              <div className="flex items-center space-x-1.5">
                <button onClick={toggleMute} className="text-slate-300 hover:text-white">
                  {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>

              {/* Time Display */}
              <div className="font-mono text-slate-300 text-[11px]">
                <span>{formatTime(currentTime)}</span> / <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {!isUnlocked && (
                <button
                  onClick={() => setIsPaywallOpen(true)}
                  className="rounded-lg bg-rose-600/80 hover:bg-rose-600 px-3 py-1 text-[11px] font-bold text-white shadow transition-colors flex items-center gap-1"
                >
                  <Lock className="h-3 w-3" />
                  <span>Unlock ₹49</span>
                </button>
              )}

              {/* Fullscreen */}
              <button onClick={toggleFullscreen} className="text-slate-300 hover:text-white">
                <Maximize className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Paywall & ₹49 Verification Modal */}
      <PaywallModal
        video={video}
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        onUnlocked={handleUnlockedSuccess}
      />
    </>
  );
};
