import React, { useState, useEffect } from 'react';
import {
  Shield,
  Film,
  CreditCard,
  Users,
  Settings,
  Upload,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Heart,
  Share2,
  Eye,
  EyeOff,
  ExternalLink,
  Lock,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Search,
  Plus,
  X,
  Play,
  RotateCcw,
  Check,
  Smartphone,
  Copy,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Video, Payment, AdminStats } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import CloudinaryUploader, { UploadResult } from '../components/CloudinaryUploader';

export const AdminDashboard: React.FC = () => {
  const { adminToken, adminEmail, isAdminLoggedIn, loginAdmin, logoutAdmin } = useAuth();

  // Login form state
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'videos' | 'payments' | 'settings'>('overview');

  // Data states
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [configData, setConfigData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Video Upload Form State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [directCloudinaryUrl, setDirectCloudinaryUrl] = useState('');
  const [directCloudinaryId, setDirectCloudinaryId] = useState('');
  const [customThumbnailUrl, setCustomThumbnailUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Upload Success Popup Modal State
  const [uploadedSuccessVideo, setUploadedSuccessVideo] = useState<Video | null>(null);

  // Edit Video State
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editThumbnail, setEditThumbnail] = useState('');

  // Screenshot Lightbox Modal
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  // Reject Reason Modal
  const [rejectingPaymentId, setRejectingPaymentId] = useState<string | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('Invalid or unverified ₹49 transaction receipt');

  // Filter and search
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [videoSearch, setVideoSearch] = useState('');

  // Auto-clear feedback toast
  useEffect(() => {
    if (feedbackMsg) {
      const t = setTimeout(() => setFeedbackMsg(null), 4000);
      return () => clearTimeout(t);
    }
  }, [feedbackMsg]);

  // Load admin data when logged in
  const loadDashboardData = async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const [statsData, videosData, paymentsData, usersData, confData] = await Promise.all([
        api.getAdminStats(adminToken),
        api.getAdminVideos(adminToken),
        api.getAdminPayments(adminToken),
        api.getAdminUsers(adminToken),
        api.getAdminConfig(adminToken),
      ]);
      setStats(statsData);
      setVideos(videosData);
      setPayments(paymentsData);
      setUsers(usersData);
      setConfigData(confData);
    } catch (err: any) {
      console.error('Failed to load dashboard data', err);
      if (err.message?.includes('403') || err.message?.includes('Invalid')) {
        logoutAdmin();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminLoggedIn) {
      loadDashboardData();
    }
  }, [isAdminLoggedIn, adminToken]);

  // Handle Admin Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    const cleanPass = loginPassword.trim();
    if (!cleanPass) {
      setLoginError('Please enter the admin password.');
      setLoginLoading(false);
      return;
    }

    if (cleanPass !== 'mr@786') {
      setLoginError('Access Denied: Incorrect password. Only the authorized admin can access.');
      setLoginLoading(false);
      return;
    }

    try {
      const res = await api.adminLogin(cleanPass);
      loginAdmin(res.token, res.admin.email);
    } catch (err: any) {
      setLoginError(err.message || 'Access Denied: Incorrect admin password.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Helper to completely erase / reset upload form
  const eraseUploadForm = () => {
    setUploadTitle('');
    setUploadDescription('');
    setUploadFile(null);
    setDirectCloudinaryUrl('');
    setDirectCloudinaryId('');
    setCustomThumbnailUrl('');
  };

  // Trigger celebration confetti
  const triggerSuccessConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.5 },
      colors: ['#3b82f6', '#10b981', '#f43f5e', '#fbbf24', '#8b5cf6'],
    });
  };

  // Handler for CloudinaryUploader widget completion
  const handleWidgetUploadComplete = async (result: UploadResult) => {
    setDirectCloudinaryUrl(result.secure_url);
    setDirectCloudinaryId(result.public_id);
    setCustomThumbnailUrl(result.thumbnail_url);

    // If user had already typed a title or upload modal is open, auto-submit or populate
    const titleToUse = uploadTitle.trim() || `Short Video ${Date.now().toString().slice(-4)}`;
    
    if (adminToken) {
      setIsUploading(true);
      try {
        const newVideo = await api.uploadAdminVideo(adminToken, {
          title: titleToUse,
          description: uploadDescription.trim() || 'Uploaded via Cloudinary widget',
          cloudinaryUrl: result.secure_url,
          cloudinaryPublicId: result.public_id,
          thumbnailUrl: result.thumbnail_url,
        });

        // Erase form completely and show success popup modal
        eraseUploadForm();
        setIsUploadModalOpen(false);
        setUploadedSuccessVideo(newVideo);
        triggerSuccessConfetti();
        loadDashboardData();
      } catch (err: any) {
        setFeedbackMsg({ type: 'error', text: err.message || 'Failed to save widget upload' });
      } finally {
        setIsUploading(false);
      }
    } else {
      // Just populate fields if not auto-submitted
      setIsUploadModalOpen(true);
      setFeedbackMsg({
        type: 'success',
        text: 'Video uploaded from Cloudinary widget! Enter title and click save.',
      });
    }
  };

  // Standard Video Upload Handler
  const handleUploadVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    if (!uploadTitle.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Video title is required' });
      return;
    }
    if (!uploadFile && !directCloudinaryUrl) {
      setFeedbackMsg({ type: 'error', text: 'Please select a video file or upload with Cloudinary widget' });
      return;
    }

    setIsUploading(true);
    try {
      let newVideo: Video;

      if (uploadFile) {
        const formData = new FormData();
        formData.append('title', uploadTitle.trim());
        formData.append('description', uploadDescription.trim());
        formData.append('video', uploadFile);
        if (customThumbnailUrl.trim()) {
          formData.append('customThumbnailUrl', customThumbnailUrl.trim());
        }
        newVideo = await api.uploadAdminVideo(adminToken, formData);
      } else {
        newVideo = await api.uploadAdminVideo(adminToken, {
          title: uploadTitle.trim(),
          description: uploadDescription.trim(),
          cloudinaryUrl: directCloudinaryUrl.trim(),
          cloudinaryPublicId: directCloudinaryId.trim() || 'cloud_' + Date.now(),
          thumbnailUrl: customThumbnailUrl.trim() || undefined,
        });
      }

      // ✅ Form Erased & Popup Modal triggered as requested
      eraseUploadForm();
      setIsUploadModalOpen(false);
      setUploadedSuccessVideo(newVideo);
      triggerSuccessConfetti();
      loadDashboardData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to upload video' });
    } finally {
      setIsUploading(false);
    }
  };

  // Video Delete Handler
  const handleDeleteVideo = async (video: Video) => {
    if (!adminToken) return;
    if (!window.confirm(`Are you sure you want to delete "${video.title}"? This will remove it from Cloudinary catalogue.`)) {
      return;
    }

    try {
      await api.deleteAdminVideo(adminToken, video._id);
      setFeedbackMsg({ type: 'success', text: 'Video deleted successfully' });
      loadDashboardData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to delete video' });
    }
  };

  // Video Edit Handler
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !editingVideo) return;

    try {
      await api.updateAdminVideo(adminToken, editingVideo._id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        thumbnailUrl: editThumbnail.trim() || undefined,
      });
      setFeedbackMsg({ type: 'success', text: 'Video updated successfully' });
      setEditingVideo(null);
      loadDashboardData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to update video' });
    }
  };

  // Payment Approve
  const handleApprovePayment = async (paymentId: string) => {
    if (!adminToken) return;
    try {
      await api.approvePayment(adminToken, paymentId);
      setFeedbackMsg({ type: 'success', text: 'Payment approved. Full video access granted!' });
      loadDashboardData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to approve payment' });
    }
  };

  // Payment Reject
  const handleRejectPayment = async () => {
    if (!adminToken || !rejectingPaymentId) return;
    try {
      await api.rejectPayment(adminToken, rejectingPaymentId, rejectReasonInput);
      setFeedbackMsg({ type: 'success', text: 'Payment rejected. Video access remains locked.' });
      setRejectingPaymentId(null);
      loadDashboardData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to reject payment' });
    }
  };

  // Update Config
  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !configData?.config) return;
    try {
      await api.updateAdminConfig(adminToken, configData.config);
      setFeedbackMsg({ type: 'success', text: 'Payment & UPI configuration saved!' });
      loadDashboardData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to save config' });
    }
  };

  // =========================================================================
  // LOGIN SCREEN (Password-Focused & Fast Access)
  // =========================================================================
  if (!isAdminLoggedIn) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#0c101a] p-8 shadow-2xl relative overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 absolute top-0 left-0" />

          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white shadow-lg shadow-rose-600/20">
              <Shield className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-black text-white font-['Outfit']">Admin Portal</h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter administrator password to manage videos, Cloudinary uploads, and ₹49 payments.
            </p>
          </div>

          {loginError && (
            <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Admin Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>

              <div className="relative">
                <input
                  id="admin-login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter admin password..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                  required
                  autoFocus
                />
              </div>
            </div>

            <button
              id="admin-login-submit-btn"
              type="submit"
              disabled={loginLoading}
              className="w-full rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 py-3 text-sm font-bold text-white shadow-lg shadow-rose-600/30 hover:from-rose-500 hover:to-amber-400 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              {loginLoading ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Unlock Admin Studio</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MAIN ADMIN DASHBOARD
  // =========================================================================
  const filteredPayments = payments.filter((p) => {
    if (paymentFilter === 'all') return true;
    return p.status === paymentFilter;
  });

  const filteredVideos = videos.filter((v) =>
    v.title.toLowerCase().includes(videoSearch.toLowerCase()) ||
    v.description.toLowerCase().includes(videoSearch.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 min-h-[calc(100vh-4rem)]">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          className={`fixed top-20 right-6 z-50 flex items-center space-x-2 rounded-xl p-4 text-xs font-semibold shadow-2xl ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-300'
              : 'bg-red-950 border border-red-500/50 text-red-300'
          }`}
        >
          {feedbackMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-red-400" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white shadow-md">
              <Shield className="h-5 w-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white font-['Outfit']">
              Admin Dashboard
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Logged in as <strong className="text-slate-200">{adminEmail}</strong> • Cloudinary Video Management & ₹49 UPI Unlocks
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Cloudinary Widget Uploader Direct Button */}
          <CloudinaryUploader
            onUpload={handleWidgetUploadComplete}
            cloudName={configData?.config?.cloudinaryCloudName || 'dya4mw0bt'}
            buttonText="Cloudinary Upload Widget"
          />

          <button
            onClick={loadDashboardData}
            title="Refresh Data"
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            id="admin-open-upload-modal-btn"
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/25 transition-all cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload Video</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-800/80 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center space-x-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          <DollarSign className="h-4 w-4" />
          <span>Overview</span>
        </button>

        <button
          id="tab-videos-btn"
          onClick={() => setActiveTab('videos')}
          className={`flex items-center space-x-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'videos'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          <Film className="h-4 w-4" />
          <span>Video Management ({videos.length})</span>
        </button>

        <button
          id="tab-payments-btn"
          onClick={() => setActiveTab('payments')}
          className={`flex items-center space-x-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'payments'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Payment Verification ({payments.filter((p) => p.status === 'pending').length} pending)</span>
        </button>

        <button
          id="tab-settings-btn"
          onClick={() => setActiveTab('settings')}
          className={`flex items-center space-x-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          <Settings className="h-4 w-4" />
          <span>UPI & Cloudinary Settings</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: OVERVIEW */}
      {/* ===================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between text-emerald-400">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Revenue</span>
                <DollarSign className="h-5 w-5" />
              </div>
              <p className="text-3xl font-black text-white font-mono mt-2">
                ₹{stats?.totalRevenue || 0}
              </p>
              <span className="text-[11px] text-slate-400">From ₹49 video unlocks</span>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between text-rose-400">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cloudinary Videos</span>
                <Film className="h-5 w-5" />
              </div>
              <p className="text-3xl font-black text-white font-mono mt-2">
                {stats?.totalVideos || 0}
              </p>
              <span className="text-[11px] text-slate-400">Published in streaming feed</span>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between text-blue-400">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Viewers</span>
                <Users className="h-5 w-5" />
              </div>
              <p className="text-3xl font-black text-white font-mono mt-2">
                {stats?.totalUsers || 0}
              </p>
              <span className="text-[11px] text-slate-400">Registered viewer profiles</span>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between text-rose-400">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Likes</span>
                <Heart className="h-5 w-5 fill-rose-500/20" />
              </div>
              <p className="text-3xl font-black text-white font-mono mt-2">
                {stats?.totalLikes || 0}
              </p>
              <span className="text-[11px] text-slate-400">{stats?.totalShares || 0} video shares</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5">
              <div className="flex items-center justify-between text-amber-400 mb-1">
                <span className="text-xs font-bold uppercase">Pending Verification</span>
                <Clock className="h-4 w-4" />
              </div>
              <p className="text-2xl font-extrabold text-amber-300 font-mono">
                {stats?.pendingPayments || 0}
              </p>
              <p className="text-xs text-slate-400 mt-1">Requires admin review</p>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5">
              <div className="flex items-center justify-between text-emerald-400 mb-1">
                <span className="text-xs font-bold uppercase">Approved Unlocks</span>
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <p className="text-2xl font-extrabold text-emerald-300 font-mono">
                {stats?.approvedPayments || 0}
              </p>
              <p className="text-xs text-slate-400 mt-1">Granted full video stream</p>
            </div>

            <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-5">
              <div className="flex items-center justify-between text-red-400 mb-1">
                <span className="text-xs font-bold uppercase">Rejected Requests</span>
                <XCircle className="h-4 w-4" />
              </div>
              <p className="text-2xl font-extrabold text-red-300 font-mono">
                {stats?.rejectedPayments || 0}
              </p>
              <p className="text-xs text-slate-400 mt-1">Denied or invalid screenshot</p>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: VIDEO MANAGEMENT */}
      {/* ===================================================================== */}
      {activeTab === 'videos' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search videos by title..."
                value={videoSearch}
                onChange={(e) => setVideoSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <CloudinaryUploader
                onUpload={handleWidgetUploadComplete}
                cloudName={configData?.config?.cloudinaryCloudName || 'dya4mw0bt'}
                buttonText="Upload with Widget"
              />
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-rose-600/30 hover:from-rose-500 hover:to-rose-400 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Upload Form</span>
              </button>
            </div>
          </div>

          {filteredVideos.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center">
              <Film className="h-10 w-10 text-slate-600 mx-auto mb-2" />
              <h4 className="text-base font-bold text-white">No Videos Found</h4>
              <p className="text-xs text-slate-400 mt-1">Upload a video to populate your Cloudinary catalogue.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-3.5 px-4">Video</th>
                    <th className="py-3.5 px-4">Cloudinary Public ID</th>
                    <th className="py-3.5 px-4">Duration</th>
                    <th className="py-3.5 px-4 text-center">Likes</th>
                    <th className="py-3.5 px-4 text-center">Shares</th>
                    <th className="py-3.5 px-4">Uploaded Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredVideos.map((video) => (
                    <tr key={video._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <img
                            src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&q=80'}
                            alt={video.title}
                            className="h-12 w-20 rounded-lg object-cover bg-black shrink-0"
                          />
                          <div className="max-w-xs">
                            <span className="font-bold text-slate-100 line-clamp-1 block">{video.title}</span>
                            <span className="text-[10px] text-slate-400 line-clamp-1">{video.description || 'No description'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                        {video.cloudinaryPublicId || 'local'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {Math.floor((video.duration || 60) / 60)}:{((video.duration || 60) % 60).toString().padStart(2, '0')}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-rose-400">
                        {video.likesCount || 0}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-blue-400">
                        {video.sharesCount || 0}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {new Date(video.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <a
                            href={video.cloudinaryUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                            title="Open Cloudinary URL"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <button
                            onClick={() => {
                              setEditingVideo(video);
                              setEditTitle(video.title);
                              setEditDescription(video.description || '');
                              setEditThumbnail(video.thumbnailUrl || '');
                            }}
                            className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                            title="Edit info"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteVideo(video)}
                            className="rounded-lg border border-red-500/30 bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                            title="Delete video"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: PAYMENT VERIFICATION */}
      {/* ===================================================================== */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setPaymentFilter(filter)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    paymentFilter === filter
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-400">
              Showing {filteredPayments.length} transactions
            </span>
          </div>

          {filteredPayments.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-slate-600 mx-auto mb-2" />
              <h4 className="text-base font-bold text-white">No Payments in this Category</h4>
              <p className="text-xs text-slate-400 mt-1">When users submit ₹49 screenshots, they appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-3.5 px-4">User</th>
                    <th className="py-3.5 px-4">Video Target</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Screenshot Proof</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Submitted At</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredPayments.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div>
                          <strong className="text-white block">{p.userName || 'Viewer'}</strong>
                          <span className="text-[11px] text-slate-400 font-mono">{p.userMobile}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-200 line-clamp-1 max-w-xs">
                          {p.videoTitle || 'Short Video'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        ₹{p.amount}
                      </td>
                      <td className="py-3.5 px-4">
                        {p.screenshotUrl ? (
                          <button
                            onClick={() => setSelectedScreenshot(p.screenshotUrl)}
                            className="group relative flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-slate-300 hover:border-rose-500 hover:text-white transition-all cursor-pointer"
                          >
                            <img
                              src={p.screenshotUrl}
                              alt="Receipt"
                              className="h-6 w-6 rounded object-cover"
                            />
                            <span className="text-[11px]">View Photo</span>
                          </button>
                        ) : (
                          <span className="text-slate-500 text-[11px]">No receipt</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
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
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {new Date(p.submittedAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {p.status === 'pending' ? (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleApprovePayment(p._id)}
                              className="flex items-center space-x-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Approve ₹49</span>
                            </button>
                            <button
                              onClick={() => setRejectingPaymentId(p._id)}
                              className="flex items-center space-x-1 rounded-xl border border-red-500/40 bg-red-950/40 hover:bg-red-900/60 px-2.5 py-1.5 text-xs font-semibold text-red-300 transition-all cursor-pointer"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: SETTINGS */}
      {/* ===================================================================== */}
      {activeTab === 'settings' && configData && (
        <form onSubmit={handleUpdateConfig} className="max-w-2xl space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <h3 className="text-lg font-bold text-white font-['Outfit'] flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-rose-500" />
              <span>UPI Payment Gateway Configuration</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                UPI ID (Receiver VPA)
              </label>
              <input
                type="text"
                value={configData.config.upiId}
                onChange={(e) =>
                  setConfigData({
                    ...configData,
                    config: { ...configData.config, upiId: e.target.value },
                  })
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Payee Merchant Name
              </label>
              <input
                type="text"
                value={configData.config.upiPayeeName}
                onChange={(e) =>
                  setConfigData({
                    ...configData,
                    config: { ...configData.config, upiPayeeName: e.target.value },
                  })
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Unlock Price (₹)
              </label>
              <input
                type="number"
                value={configData.config.price}
                onChange={(e) =>
                  setConfigData({
                    ...configData,
                    config: { ...configData.config, price: Number(e.target.value) },
                  })
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
                required
              />
            </div>

            <div className="pt-4 border-t border-slate-800">
              <h4 className="text-sm font-bold text-white mb-2">Cloudinary Cloud Configuration</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Cloudinary Cloud Name
                  </label>
                  <input
                    type="text"
                    value={configData.config.cloudinaryCloudName || 'dya4mw0bt'}
                    onChange={(e) =>
                      setConfigData({
                        ...configData,
                        config: { ...configData.config, cloudinaryCloudName: e.target.value },
                      })
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-600/30 hover:scale-105 transition-all cursor-pointer"
            >
              Save Settings
            </button>
          </div>
        </form>
      )}

      {/* ===================================================================== */}
      {/* MODAL: UPLOAD VIDEO */}
      {/* ===================================================================== */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-[#0f141f] p-6 shadow-2xl my-auto">
            <button
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-['Outfit']">Upload Video</h3>
                <p className="text-xs text-slate-400">Stores video file in Cloudinary and saves stream record</p>
              </div>
            </div>

            {/* Cloudinary Widget One-Click Banner */}
            <div className="mb-4 rounded-2xl border border-blue-500/30 bg-blue-950/20 p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-blue-300">Fast Cloudinary Widget Upload</p>
                <p className="text-[10px] text-slate-400">Upload directly from device, camera, or URL</p>
              </div>
              <CloudinaryUploader
                onUpload={handleWidgetUploadComplete}
                cloudName={configData?.config?.cloudinaryCloudName || 'dya4mw0bt'}
                buttonText="Open Widget"
              />
            </div>

            <form onSubmit={handleUploadVideo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Video Title (Required)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Stunning Sunset Timelapse 4K"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Short Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of the video content..."
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                />
              </div>

              {/* Direct Cloudinary URL / Public ID if available */}
              {directCloudinaryUrl && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs">
                  <div className="flex items-center justify-between text-emerald-400 font-bold mb-1">
                    <span>Cloudinary Asset Attached</span>
                    <button
                      type="button"
                      onClick={() => {
                        setDirectCloudinaryUrl('');
                        setDirectCloudinaryId('');
                        setCustomThumbnailUrl('');
                      }}
                      className="text-xs text-rose-400 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-300 font-mono truncate">{directCloudinaryUrl}</p>
                </div>
              )}

              {/* Video File Upload */}
              {!directCloudinaryUrl && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Video File (MP4, MOV, WebM)
                  </label>
                  <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/50 hover:bg-slate-900 hover:border-rose-500/50 p-4 cursor-pointer transition-all">
                    <Film className="h-6 w-6 text-rose-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-200">
                      {uploadFile ? uploadFile.name : 'Select Video File from device'}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      {uploadFile ? `${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB` : 'Up to 500MB video file'}
                    </span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Custom Thumbnail URL */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Custom Thumbnail URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={customThumbnailUrl}
                  onChange={(e) => setCustomThumbnailUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    eraseUploadForm();
                    setIsUploadModalOpen(false);
                  }}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="admin-upload-submit-btn"
                  type="submit"
                  disabled={isUploading}
                  className="rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/25 hover:from-rose-500 hover:to-rose-400 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isUploading ? 'Uploading & Processing...' : 'Save & Publish Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 🎉 SUCCESS POPUP MODAL (FORM ERASED & VIDEO PUBLISHED) */}
      {/* ===================================================================== */}
      {uploadedSuccessVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-emerald-500/40 bg-[#0c131a] p-6 text-center shadow-2xl shadow-emerald-950/50">
            {/* Close button */}
            <button
              onClick={() => setUploadedSuccessVideo(null)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Glowing Icon */}
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="h-8 w-8 animate-bounce" />
            </div>

            <h3 className="text-xl font-extrabold text-white font-['Outfit']">
              Video Uploaded Successfully!
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Your video is now live on the Shorts feed and catalogue.
            </p>

            {/* Video preview summary card */}
            <div className="my-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-3 text-left">
              <div className="flex items-center space-x-3">
                <img
                  src={uploadedSuccessVideo.thumbnailUrl}
                  alt={uploadedSuccessVideo.title}
                  className="h-16 w-24 rounded-xl object-cover bg-black shrink-0 border border-slate-700"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-white line-clamp-1">
                    {uploadedSuccessVideo.title}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                    {uploadedSuccessVideo.description || '5s preview + ₹49 unlock active'}
                  </p>
                  <span className="mt-1 inline-block rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-400 uppercase">
                    Status: Stream Ready
                  </span>
                </div>
              </div>
            </div>

            {/* Form Cleared Notice */}
            <div className="mb-5 flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/40 rounded-xl py-2 px-3 border border-emerald-500/20">
              <Check className="h-4 w-4 shrink-0" />
              <span>Upload form erased & ready for next video!</span>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setUploadedSuccessVideo(null);
                  setIsUploadModalOpen(true);
                }}
                className="flex items-center justify-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-white transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Upload Another</span>
              </button>

              <button
                onClick={() => {
                  setUploadedSuccessVideo(null);
                  setActiveTab('videos');
                }}
                className="flex items-center justify-center space-x-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <Film className="h-4 w-4" />
                <span>View in Catalogue</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: EDIT VIDEO */}
      {/* ===================================================================== */}
      {editingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-[#0f141f] p-6 shadow-2xl">
            <button
              onClick={() => setEditingVideo(null)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-white font-['Outfit'] mb-4">Edit Video Information</h3>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Thumbnail URL
                </label>
                <input
                  type="url"
                  value={editThumbnail}
                  onChange={(e) => setEditThumbnail(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingVideo(null)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: SCREENSHOT LIGHTBOX */}
      {/* ===================================================================== */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="relative max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-800 bg-[#090b10] p-4 text-center">
            <button
              onClick={() => setSelectedScreenshot(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/90 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Submitted ₹49 Payment Screenshot
            </h4>
            <img
              src={selectedScreenshot}
              alt="Payment Screenshot Full Preview"
              className="max-h-[75vh] w-auto mx-auto rounded-lg object-contain"
            />
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: REJECT REASON */}
      {/* ===================================================================== */}
      {rejectingPaymentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-[#0f141f] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white font-['Outfit'] mb-2">
              Reject Payment Request
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter the reason why this ₹49 payment screenshot is rejected. The user will be notified in the video player.
            </p>

            <input
              type="text"
              value={rejectReasonInput}
              onChange={(e) => setRejectReasonInput(e.target.value)}
              placeholder="e.g. Unclear screenshot or invalid transaction ID"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white focus:border-red-500 focus:outline-none mb-4"
            />

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectingPaymentId(null)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectPayment}
                className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-red-600/30 hover:bg-red-500 cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
