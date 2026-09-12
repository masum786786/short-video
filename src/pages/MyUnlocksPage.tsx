import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Play,
  Clock,
  AlertCircle,
  Sparkles,
  LockOpen,
  Film,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Video, Payment } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

interface MyUnlocksPageProps {
  onSelectVideo: (video: Video) => void;
  onNavigateExplore: () => void;
  onNavigateFeed: () => void;
}

export const MyUnlocksPage: React.FC<MyUnlocksPageProps> = ({
  onSelectVideo,
  onNavigateExplore,
  onNavigateFeed,
}) => {
  const { userId, userMobile, userName } = useAuth();
  const [unlockedVideos, setUnlockedVideos] = useState<Video[]>([]);
  const [userPayments, setUserPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([
      api.getUserUnlockedVideos(userId),
      api.getUserPayments(userId),
    ])
      .then(([vids, payments]) => {
        if (!mounted) return;
        setUnlockedVideos(vids);
        setUserPayments(payments);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load user unlocks', err);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [userId]);

  return (
    <div className="min-h-[calc(100vh-4rem)] py-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto pb-24 sm:pb-12">
      {/* Header Banner */}
      <div className="relative mb-6 overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 mb-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>₹49 Permanent Access Library</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit']">
              My Unlocked Videos
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Viewer: <strong className="text-slate-200">{userName || 'Viewer'}</strong> {userMobile && `(${userMobile})`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-center">
              <span className="text-xl font-black text-emerald-400 font-mono">
                {unlockedVideos.length}
              </span>
              <p className="text-[10px] font-semibold text-slate-400 uppercase">
                Unlocked
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-center">
              <span className="text-xl font-black text-amber-400 font-mono">
                {userPayments.filter((p) => p.status === 'pending').length}
              </span>
              <p className="text-[10px] font-semibold text-slate-400 uppercase">
                Pending
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 h-24 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Unlocked Videos List */}
      {!loading && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white font-['Outfit'] flex items-center gap-2 mb-3">
              <LockOpen className="h-5 w-5 text-emerald-400" />
              <span>Ready to Watch ({unlockedVideos.length})</span>
            </h2>

            {unlockedVideos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Film className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-white">No Unlocked Videos Yet</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Watch 5-second previews of any video and unlock full streaming for ₹49 via PhonePe / UPI.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                  <button
                    onClick={onNavigateFeed}
                    className="rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 px-4 py-2 text-xs font-bold text-white shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    Explore Shorts Feed
                  </button>
                  <button
                    onClick={onNavigateExplore}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white cursor-pointer"
                  >
                    View All Videos
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {unlockedVideos.map((vid) => (
                  <div
                    key={vid._id}
                    onClick={() => onSelectVideo(vid)}
                    className="group flex gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-emerald-500/50 hover:bg-slate-900 p-3 transition-all cursor-pointer shadow-lg"
                  >
                    <div className="relative aspect-video w-36 shrink-0 overflow-hidden rounded-xl bg-black">
                      <img
                        src={vid.thumbnailUrl}
                        alt={vid.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-black shadow-md">
                          <Play className="h-4 w-4 fill-black translate-x-0.5" />
                        </div>
                      </div>
                      <div className="absolute top-1 left-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        Full Access
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                      <div>
                        <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 line-clamp-1">
                          {vid.title}
                        </h4>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                          {vid.description || 'Full HD streaming unlocked'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-emerald-400 font-semibold pt-1">
                        <span>Play Video</span>
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Submissions Status */}
          {userPayments.length > 0 && (
            <div className="mt-8 border-t border-slate-800/80 pt-6">
              <h2 className="text-lg font-bold text-white font-['Outfit'] flex items-center gap-2 mb-3">
                <Clock className="h-5 w-5 text-amber-400" />
                <span>My ₹49 Payment History</span>
              </h2>

              <div className="space-y-2.5">
                {userPayments.map((p) => (
                  <div
                    key={p._id}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          p.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : p.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {p.status === 'approved' && <ShieldCheck className="h-4 w-4" />}
                        {p.status === 'pending' && <Clock className="h-4 w-4" />}
                        {p.status === 'rejected' && <AlertCircle className="h-4 w-4" />}
                      </div>

                      <div>
                        <strong className="text-slate-200 block text-xs line-clamp-1">
                          {p.videoTitle || 'Short Video'}
                        </strong>
                        <span className="text-[11px] text-slate-400">
                          {new Date(p.submittedAt).toLocaleDateString()} • ₹{p.amount}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          p.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : p.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-400 animate-pulse'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {p.status}
                      </span>
                      {p.rejectReason && (
                        <p className="text-[10px] text-red-400 mt-0.5">{p.rejectReason}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
