import React, { useState } from 'react';
import { X, Copy, Check, Share2, MessageCircle, Send } from 'lucide-react';
import { Video } from '../types';
import { api } from '../lib/api';

interface ShareModalProps {
  video: Video;
  onClose: () => void;
  onShareCompleted?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ video, onClose, onShareCompleted }) => {
  const [copied, setCopied] = useState(false);

  // Generate shareable link
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/?v=${video._id}` : `https://shortvideo.app/?v=${video._id}`;
  const shareTitle = `Check out this video: ${video.title}`;
  const fullShareText = `${shareTitle}\nWatch here: ${shareUrl}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      api.registerShare(video._id);
      if (onShareCompleted) onShareCompleted();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: `Check out this video: ${video.title}`,
          url: shareUrl,
        });
        api.registerShare(video._id);
        if (onShareCompleted) onShareCompleted();
        onClose();
      } catch (err) {
        // User cancelled share or failed
      }
    }
  };

  const handleWhatsAppShare = () => {
    api.registerShare(video._id);
    if (onShareCompleted) onShareCompleted();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullShareText)}`;
    window.open(url, '_blank');
  };

  const handleTelegramShare = () => {
    api.registerShare(video._id);
    if (onShareCompleted) onShareCompleted();
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Check out this video: ${video.title}`)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-[#0f141f] p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
            <Share2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Share Video</h3>
            <p className="text-xs text-slate-400 line-clamp-1">{video.title}</p>
          </div>
        </div>

        {/* Web Share API Trigger Button if supported */}
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            id="native-share-trigger-btn"
            onClick={handleNativeShare}
            className="mb-4 flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 py-3 text-sm font-bold text-white shadow-lg shadow-rose-600/20 hover:from-rose-500 hover:to-amber-400 transition-all"
          >
            <Share2 className="h-4 w-4" />
            <span>Open Native Share Menu</span>
          </button>
        )}

        {/* Social Share Shortcuts */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            id="share-whatsapp-btn"
            onClick={handleWhatsAppShare}
            className="flex items-center justify-center space-x-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all"
          >
            <MessageCircle className="h-4 w-4" />
            <span>WhatsApp</span>
          </button>
          <button
            id="share-telegram-btn"
            onClick={handleTelegramShare}
            className="flex items-center justify-center space-x-2 rounded-xl border border-sky-500/30 bg-sky-500/10 py-2.5 text-xs font-semibold text-sky-400 hover:bg-sky-500/20 transition-all"
          >
            <Send className="h-4 w-4" />
            <span>Telegram</span>
          </button>
        </div>

        {/* Copy Link Input */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Copy Video Link
          </label>
          <div className="flex items-center rounded-xl border border-slate-700 bg-slate-900/90 p-1.5">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 bg-transparent px-3 text-xs text-slate-300 focus:outline-none select-all"
            />
            <button
              id="copy-share-link-btn"
              onClick={handleCopyLink}
              className={`flex items-center space-x-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-200 hover:bg-rose-600 hover:text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 mt-4 text-center">
          Note: Sharing does not grant free access. The 5-second preview / ₹49 unlock applies to all viewers.
        </p>
      </div>
    </div>
  );
};
