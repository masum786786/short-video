import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Lock,
  QrCode,
  Smartphone,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Copy,
  Check,
  Camera,
  Sparkles,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Video, Payment, UPIConfig } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { PaytmQRCard } from './PaytmQRCard';

interface PaywallModalProps {
  video: Video;
  isOpen: boolean;
  onClose: () => void;
  onUnlocked: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  video,
  isOpen,
  onClose,
  onUnlocked,
}) => {
  const { userId, userMobile, userName, setUserProfile } = useAuth();

  // Multi-step flow: 'payment' -> 'upload' -> 'verifying' -> 'unlocked' | 'rejected'
  const [step, setStep] = useState<'payment' | 'upload' | 'verifying' | 'unlocked' | 'rejected'>('payment');
  const [mobile, setMobile] = useState(userMobile);
  const [name, setName] = useState(userName);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [showQrCode, setShowQrCode] = useState(false);

  // UPI data
  const [upiDetails, setUpiDetails] = useState<UPIConfig | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [activePayment, setActivePayment] = useState<Payment | null>(null);

  const pollTimerRef = useRef<any>(null);

  // Fetch UPI details and check existing access on mount
  useEffect(() => {
    if (!isOpen) return;

    api.getUPIDetails(video._id)
      .then((data) => setUpiDetails(data))
      .catch((err) => console.error('Failed to load UPI details', err));

    api.checkPaymentStatus(video._id, userId)
      .then((res) => {
        if (res.isUnlocked) {
          setStep('unlocked');
          triggerConfetti();
          setTimeout(() => onUnlocked(), 1500);
        } else if (res.accessStatus === 'pending') {
          setStep('verifying');
          setActivePayment(res.payment);
        } else if (res.rejectReason) {
          setStep('rejected');
          setRejectReason(res.rejectReason);
        }
      })
      .catch(() => {});

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen, video._id, userId]);

  // Polling mechanism when in 'verifying' step
  useEffect(() => {
    if (step !== 'verifying') {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await api.checkPaymentStatus(video._id, userId);
        if (res.isUnlocked) {
          clearInterval(pollTimerRef.current);
          setStep('unlocked');
          triggerConfetti();
          setTimeout(() => {
            onUnlocked();
          }, 1800);
        } else if (res.accessStatus === 'locked' && res.rejectReason) {
          clearInterval(pollTimerRef.current);
          setStep('rejected');
          setRejectReason(res.rejectReason);
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 2500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [step, video._id, userId, onUnlocked]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 110,
      spread: 75,
      origin: { y: 0.6 },
      colors: ['#f43f5e', '#fbbf24', '#38bdf8', '#4ade80', '#ec4899'],
    });
  };

  const handleCopyUPI = async () => {
    if (!upiDetails?.upiId) return;
    try {
      await navigator.clipboard.writeText(upiDetails.upiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    } catch (_) {}
  };

  const handleOpenUPI = (url?: string) => {
    const targetUrl = url || upiDetails?.upiString;
    if (!targetUrl) return;
    window.location.href = targetUrl;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScreenshotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanMobile = mobile.trim();
    if (!cleanMobile || cleanMobile.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number');
      return;
    }

    if (!screenshotFile && !screenshotPreview) {
      setErrorMessage('Please attach or take a photo of your ₹49 payment screenshot');
      return;
    }

    setSubmitting(true);
    try {
      setUserProfile(cleanMobile, name.trim() || 'Viewer');

      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('userMobile', cleanMobile);
      formData.append('userName', name.trim() || 'Viewer');
      formData.append('videoId', video._id);
      formData.append('amount', '49');

      if (screenshotFile) {
        formData.append('screenshot', screenshotFile);
      } else if (screenshotPreview) {
        formData.append('screenshotBase64', screenshotPreview);
      }

      const res = await api.submitPayment(formData);
      setActivePayment(res.payment);
      setStep('verifying');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit screenshot');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-t-3xl sm:rounded-3xl border-t sm:border border-rose-500/30 bg-[#0c101a] shadow-2xl shadow-rose-950/50 max-h-[92vh] flex flex-col">
        {/* Mobile Pull Handle */}
        <div className="sm:hidden mx-auto mt-2.5 h-1 w-12 rounded-full bg-slate-700/80" />

        {/* Glow Header Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 animate-pulse" />

        {/* Close button */}
        <button
          id="paywall-close-btn"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-5 sm:p-7 overflow-y-auto">
          {/* ================= STEP 1: PAYMENT & 1-TAP UPI ================= */}
          {step === 'payment' && (
            <div>
              {/* Header */}
              <div className="text-center mb-5">
                <div className="mx-auto mb-2.5 flex h-13 w-13 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-lg shadow-rose-500/10">
                  <Lock className="h-6 w-6" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white font-['Outfit'] tracking-tight">
                  Unlock Full Video
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  5-second preview ended. Pay once for permanent access.
                </p>
                <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1 text-xs font-bold text-rose-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Amount: ₹49 Only</span>
                </div>
              </div>

              {/* Paytm QR Card & 1-Tap UPI Section */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 mb-4 flex flex-col items-center">
                {/* Embedded Paytm QR Card */}
                <PaytmQRCard
                  upiId={upiDetails?.upiId || 'masum345@ptyes'}
                  payeeName={upiDetails?.upiName || 'Masum'}
                  amount={49}
                  className="mb-4 w-full"
                />

                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 text-center">
                  ⚡ Or 1-Tap Pay with UPI App (Mobile)
                </p>

                <div className="grid grid-cols-2 gap-2 w-full max-w-[300px]">
                  {/* PhonePe Button */}
                  <button
                    id="phonepe-pay-btn"
                    onClick={() => handleOpenUPI(upiDetails?.phonePeDeepLink)}
                    className="flex items-center justify-center space-x-2 rounded-xl bg-[#5f259f] hover:bg-[#6f2fb8] active:scale-95 p-2.5 text-xs font-extrabold text-white shadow-md shadow-purple-900/30 transition-all cursor-pointer"
                  >
                    <div className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white text-[#5f259f] font-black text-[9px]">
                      Pe
                    </div>
                    <span>PhonePe</span>
                  </button>

                  {/* Google Pay Button */}
                  <button
                    id="gpay-pay-btn"
                    onClick={() => handleOpenUPI(upiDetails?.gPayDeepLink)}
                    className="flex items-center justify-center space-x-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 active:scale-95 p-2.5 text-xs font-bold text-white transition-all cursor-pointer"
                  >
                    <span className="text-[#4285F4] font-black">G</span>
                    <span className="text-white">Pay</span>
                  </button>

                  {/* Paytm Button */}
                  <button
                    id="paytm-pay-btn"
                    onClick={() => handleOpenUPI(upiDetails?.paytmDeepLink)}
                    className="flex items-center justify-center space-x-2 rounded-xl bg-[#002e6e] hover:bg-[#003d94] active:scale-95 p-2.5 text-xs font-extrabold text-white shadow-md shadow-blue-900/30 transition-all cursor-pointer"
                  >
                    <span className="text-[#00b9f5] font-black">Pay</span>
                    <span>tm</span>
                  </button>

                  {/* Any UPI / BHIM */}
                  <button
                    id="any-upi-pay-btn"
                    onClick={() => handleOpenUPI(upiDetails?.upiString)}
                    className="flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 active:scale-95 p-2.5 text-xs font-extrabold text-white shadow-md shadow-rose-900/30 transition-all cursor-pointer"
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    <span>Any UPI</span>
                  </button>
                </div>
              </div>

              {/* Next Step: Submit Screenshot */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3.5 text-center">
                <p className="text-xs font-semibold text-slate-300">
                  Step 2: Upload your ₹49 payment screenshot to unlock
                </p>
                <button
                  id="proceed-to-screenshot-btn"
                  onClick={() => setStep('upload')}
                  className="mt-2.5 flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 py-3 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload ₹49 Payment Screenshot</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 2: UPLOAD SCREENSHOT ================= */}
          {step === 'upload' && (
            <form onSubmit={handleScreenshotSubmit}>
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setStep('payment')}
                  className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 mb-2"
                >
                  ← Back to UPI QR code
                </button>
                <h3 className="text-lg sm:text-xl font-bold text-white font-['Outfit']">
                  Upload ₹49 Payment Screenshot
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Attach your ₹49 transaction receipt. Video unlocks after instant admin review.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-3 rounded-xl bg-red-500/10 border border-red-500/30 p-2.5 text-xs text-red-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-3 mb-4">
                {/* Screenshot Picker */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    ₹49 Payment Screenshot / Receipt (Required)
                  </label>

                  {screenshotPreview ? (
                    <div className="relative rounded-xl border border-rose-500/30 bg-slate-900/90 p-2 text-center">
                      <img
                        src={screenshotPreview}
                        alt="Payment Screenshot Preview"
                        className="max-h-48 w-auto mx-auto rounded-lg object-contain shadow-md"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setScreenshotFile(null);
                          setScreenshotPreview(null);
                        }}
                        className="mt-2 text-xs font-semibold text-rose-400 hover:text-rose-300"
                      >
                        Change screenshot
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/50 hover:bg-slate-900 hover:border-rose-500/50 p-6 cursor-pointer transition-all">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-rose-400 mb-2">
                        <Camera className="h-6 w-6" />
                      </div>
                      <span className="text-sm font-bold text-slate-100">
                        Take photo or upload screenshot
                      </span>
                      <span className="text-xs text-slate-400 mt-0.5">
                        PNG, JPG from gallery or camera
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Your Mobile Number or Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter phone or name for identification"
                    value={mobile || name}
                    onChange={(e) => {
                      setMobile(e.target.value);
                      setName(e.target.value);
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="submit-payment-screenshot-btn"
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 py-3 text-sm font-bold text-white shadow-lg shadow-rose-600/30 hover:from-rose-500 hover:to-amber-400 disabled:opacity-50 transition-all cursor-pointer"
              >
                {submitting ? (
                  <span>Submitting Screenshot...</span>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Submit for Instant Verification</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ================= STEP 3: VERIFYING IN PROGRESS ================= */}
          {step === 'verifying' && (
            <div className="py-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 relative">
                <Clock className="h-7 w-7 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white font-['Outfit']">
                Your payment is being verified
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-sm mx-auto">
                You will get full access after approval. Admin is reviewing your ₹49 screenshot.
              </p>

              <div className="my-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 text-xs text-slate-400 text-left space-y-1.5">
                <div className="flex justify-between">
                  <span>Video:</span>
                  <strong className="text-slate-200 line-clamp-1">{video.title}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <strong className="text-emerald-400 font-mono">₹49</strong>
                </div>
                <div className="flex justify-between">
                  <span>Mobile:</span>
                  <strong className="text-slate-200">{mobile || userMobile}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-bold text-amber-400 uppercase tracking-wide">Pending Review</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 animate-pulse">
                Auto-checking status... Video will unlock instantly once approved.
              </p>
            </div>
          )}

          {/* ================= STEP 4: UNLOCKED SUCCESS ================= */}
          {step === 'unlocked' && (
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="h-9 w-9 animate-bounce" />
              </div>
              <h3 className="text-2xl font-extrabold text-white font-['Outfit']">
                Payment Verified!
              </h3>
              <p className="text-sm font-semibold text-emerald-400 mt-1">
                Full video playback is unlocked.
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Enjoy high-definition streaming without limits!
              </p>
            </div>
          )}

          {/* ================= STEP 5: REJECTED NOTICE ================= */}
          {step === 'rejected' && (
            <div className="py-6 text-center">
              <div className="mx-auto mb-3 flex h-13 w-13 items-center justify-center rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white font-['Outfit']">
                Verification Unsuccessful
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                {rejectReason || 'Your screenshot could not be verified for ₹49.'}
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <button
                  onClick={() => setStep('payment')}
                  className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  Pay Again
                </button>
                <button
                  onClick={() => setStep('upload')}
                  className="rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/30 cursor-pointer"
                >
                  Re-upload Screenshot
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
