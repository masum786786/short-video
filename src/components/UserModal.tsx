import React, { useState } from 'react';
import { X, Phone, User, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface UserModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const UserModal: React.FC<UserModalProps> = ({ onClose, onSuccess }) => {
  const { userMobile, userName, setUserProfile } = useAuth();
  const [mobile, setMobile] = useState(userMobile);
  const [name, setName] = useState(userName);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMobile = mobile.trim();
    if (!cleanMobile || cleanMobile.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setUserProfile(cleanMobile, name.trim() || 'Viewer');
    setSaved(true);
    setTimeout(() => {
      if (onSuccess) onSuccess();
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-[#0f141f] p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 mb-3">
            <User className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold text-white">Your Viewer Profile</h3>
          <p className="text-sm text-slate-400 mt-1">
            Provide your mobile number to link video purchases, track verification status, and unlock access across sessions.
          </p>
        </div>

        {saved ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mb-2 animate-bounce" />
            <p className="text-base font-semibold text-emerald-400">Profile Updated Successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Mobile Number (Required for ₹49 UPI Verification)
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400 text-sm">
                  <Phone className="h-4 w-4" />
                  <span className="font-semibold text-slate-500">+91</span>
                </div>
                <input
                  id="user-modal-mobile-input"
                  type="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 pl-16 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Your Name / Display Name
              </label>
              <input
                id="user-modal-name-input"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                id="user-modal-save-btn"
                type="submit"
                className="rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-600/25 hover:from-rose-500 hover:to-rose-400 transition-all"
              >
                Save Profile
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
