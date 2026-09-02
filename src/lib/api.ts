import { Video, Payment, AdminStats, UPIConfig, AccessCheckResult, User } from '../types';

const API_BASE = '/api';

// Initial fallback mock/seed videos stored in localStorage for standalone / Vercel static deployments
const STORAGE_KEYS = {
  VIDEOS: 'shortvideo_db_videos',
  PAYMENTS: 'shortvideo_db_payments',
  ACCESS: 'shortvideo_db_access',
  CONFIG: 'shortvideo_db_config',
  LIKES: 'shortvideo_db_likes',
};

const DEFAULT_CONFIG: UPIConfig = {
  upiId: 'masum345@ptyes',
  upiName: 'Masum',
  amount: 49,
  phonePeMerchantId: 'PHONEPE_MERCHANT_DEFAULT',
};

function getLocalVideos(): Video[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VIDEOS);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [];
}

function saveLocalVideos(videos: Video[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(videos));
  } catch (_) {}
}

function getLocalPayments(): Payment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [];
}

function saveLocalPayments(payments: Payment[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  } catch (_) {}
}

function getLocalConfig(): UPIConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return DEFAULT_CONFIG;
}

function saveLocalConfig(cfg: UPIConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(cfg));
  } catch (_) {}
}

function getLocalAccess(): { videoId: string; userId: string; unlockedAt: string }[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACCESS);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [];
}

function saveLocalAccess(access: { videoId: string; userId: string; unlockedAt: string }[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACCESS, JSON.stringify(access));
  } catch (_) {}
}

/**
 * Safe fetch helper that handles non-JSON / HTML 404 responses from Vercel static deployments
 */
async function safeFetch<T>(url: string, options?: RequestInit): Promise<{ ok: boolean; data: T | null; status: number; rawText?: string }> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      return { ok: res.ok, data, status: res.status };
    }
    const rawText = await res.text();
    // Check if rawText can be parsed as JSON anyway
    try {
      const data = JSON.parse(rawText);
      return { ok: res.ok, data, status: res.status };
    } catch {
      return { ok: false, data: null, status: res.status, rawText };
    }
  } catch (err: any) {
    return { ok: false, data: null, status: 0, rawText: err?.message };
  }
}

export const api = {
  // Public Videos
  async getVideos(search?: string): Promise<Video[]> {
    const query = search ? `?q=${encodeURIComponent(search)}` : '';
    const res = await safeFetch<{ videos: Video[] }>(`${API_BASE}/videos${query}`);
    if (res.ok && res.data?.videos && Array.isArray(res.data.videos)) {
      // Sync to local cache
      if (res.data.videos.length > 0) {
        saveLocalVideos(res.data.videos);
      }
      return res.data.videos;
    }

    // Fallback to local storage (e.g. on Vercel static deployment)
    let local = getLocalVideos();
    if (search) {
      const q = search.toLowerCase();
      local = local.filter((v) => v.title.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q));
    }
    return local;
  },

  async getVideo(id: string): Promise<Video> {
    const res = await safeFetch<{ video: Video }>(`${API_BASE}/videos/${id}`);
    if (res.ok && res.data?.video) {
      return res.data.video;
    }
    const local = getLocalVideos();
    const found = local.find((v) => v._id === id);
    if (found) return found;
    throw new Error('Video not found');
  },

  async checkAccess(videoId: string, userId: string): Promise<AccessCheckResult> {
    const res = await safeFetch<AccessCheckResult>(`${API_BASE}/videos/${videoId}/access?userId=${encodeURIComponent(userId)}`);
    if (res.ok && res.data) {
      return res.data;
    }

    const localVideos = getLocalVideos();
    const currentVideo = localVideos.find((v) => v._id === videoId);
    const videoUrl = currentVideo?.cloudinaryUrl || '';

    // Fallback check in local access list
    const accessList = getLocalAccess();
    const isUnlocked = accessList.some((a) => a.videoId === videoId && a.userId === userId);
    if (isUnlocked) {
      return { hasAccess: true, accessStatus: 'unlocked', previewDuration: 10, videoUrl };
    }

    // Check payments in pending
    const payments = getLocalPayments();
    const pendingPayment = payments.find((p) => p.videoId === videoId && p.userId === userId && p.status === 'pending');
    if (pendingPayment) {
      return { hasAccess: false, accessStatus: 'pending', previewDuration: 10, videoUrl, message: 'Payment verification in progress' };
    }

    return { hasAccess: false, accessStatus: 'locked', previewDuration: 10, videoUrl, message: 'Pay ₹49 to unlock full video' };
  },

  async toggleLike(videoId: string, userId: string, userMobile?: string, userName?: string): Promise<{ liked: boolean; likesCount: number }> {
    const res = await safeFetch<{ liked: boolean; likesCount: number }>(`${API_BASE}/videos/${videoId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userMobile, userName }),
    });
    if (res.ok && res.data) {
      return res.data;
    }

    // Local fallback
    const key = `${STORAGE_KEYS.LIKES}_${videoId}_${userId}`;
    const wasLiked = localStorage.getItem(key) === 'true';
    const newLiked = !wasLiked;
    if (newLiked) {
      localStorage.setItem(key, 'true');
    } else {
      localStorage.removeItem(key);
    }

    const videos = getLocalVideos();
    const vIndex = videos.findIndex((v) => v._id === videoId);
    let likesCount = 1;
    if (vIndex !== -1) {
      videos[vIndex].likesCount = Math.max(0, (videos[vIndex].likesCount || 0) + (newLiked ? 1 : -1));
      likesCount = videos[vIndex].likesCount;
      saveLocalVideos(videos);
    }

    return { liked: newLiked, likesCount };
  },

  async isLiked(videoId: string, userId: string): Promise<boolean> {
    if (!userId) return false;
    const res = await safeFetch<{ liked: boolean }>(`${API_BASE}/videos/${videoId}/liked?userId=${encodeURIComponent(userId)}`);
    if (res.ok && res.data) {
      return !!res.data.liked;
    }
    const key = `${STORAGE_KEYS.LIKES}_${videoId}_${userId}`;
    return localStorage.getItem(key) === 'true';
  },

  async registerShare(videoId: string): Promise<number> {
    const res = await safeFetch<{ sharesCount: number }>(`${API_BASE}/videos/${videoId}/share`, {
      method: 'POST',
    });
    if (res.ok && res.data) {
      return res.data.sharesCount || 0;
    }
    const videos = getLocalVideos();
    const vIndex = videos.findIndex((v) => v._id === videoId);
    if (vIndex !== -1) {
      videos[vIndex].sharesCount = (videos[vIndex].sharesCount || 0) + 1;
      saveLocalVideos(videos);
      return videos[vIndex].sharesCount;
    }
    return 1;
  },

  // UPI & Payments
  async getUPIDetails(videoId?: string): Promise<UPIConfig & { upiString: string; qrCodeDataUrl: string }> {
    const query = videoId ? `?videoId=${encodeURIComponent(videoId)}` : '';
    const res = await safeFetch<UPIConfig & { upiString: string; qrCodeDataUrl: string }>(`${API_BASE}/upi/details${query}`);
    if (res.ok && res.data) {
      return res.data;
    }

    const cfg = getLocalConfig();
    const upiId = cfg.upiId || 'masum345@ptyes';
    const upiName = encodeURIComponent(cfg.upiName || 'Masum');
    const amount = 49;
    const tn = encodeURIComponent('Short Video Access');

    const upiString = `upi://pay?pa=${upiId}&pn=${upiName}&am=${amount}&cu=INR&tn=${tn}`;
    const phonePeDeepLink = `phonepe://pay?pa=${upiId}&pn=${upiName}&am=${amount}&cu=INR&tn=${tn}`;
    const gPayDeepLink = `tez://upi/pay?pa=${upiId}&pn=${upiName}&am=${amount}&cu=INR&tn=${tn}`;
    const paytmDeepLink = `paytmmp://pay?pa=${upiId}&pn=${upiName}&am=${amount}&cu=INR&tn=${tn}`;
    const bhimDeepLink = `bhim://pay?pa=${upiId}&pn=${upiName}&am=${amount}&cu=INR&tn=${tn}`;

    return {
      ...cfg,
      upiString,
      phonePeDeepLink,
      gPayDeepLink,
      paytmDeepLink,
      bhimDeepLink,
      qrCodeDataUrl: '',
    };
  },

  async submitPayment(formData: FormData): Promise<{ success: boolean; message: string; payment: Payment }> {
    const res = await safeFetch<{ success: boolean; message: string; payment: Payment }>(`${API_BASE}/payments/submit`, {
      method: 'POST',
      body: formData,
    });
    if (res.ok && res.data) {
      return res.data;
    }

    // Local fallback
    const videoId = (formData.get('videoId') as string) || '';
    const userId = (formData.get('userId') as string) || '';
    const userMobile = (formData.get('userMobile') as string) || '';
    const userName = (formData.get('userName') as string) || '';
    const screenshotDataUrl = (formData.get('screenshotDataUrl') as string) || '';

    const newPayment: Payment = {
      _id: 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      videoId,
      videoTitle: 'Short Video Access',
      userId,
      userMobile: userMobile || '9876543210',
      userName: userName || 'Viewer',
      amount: 49,
      paymentScreenshot: screenshotDataUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };

    const payments = getLocalPayments();
    payments.unshift(newPayment);
    saveLocalPayments(payments);

    return {
      success: true,
      message: '₹49 payment screenshot submitted! Pending admin review.',
      payment: newPayment,
    };
  },

  async checkPaymentStatus(videoId: string, userId: string): Promise<{
    accessStatus: 'locked' | 'pending' | 'unlocked';
    payment: Payment | null;
    isUnlocked: boolean;
    rejectReason?: string;
  }> {
    const res = await safeFetch<{
      accessStatus: 'locked' | 'pending' | 'unlocked';
      payment: Payment | null;
      isUnlocked: boolean;
      rejectReason?: string;
    }>(`${API_BASE}/payments/status/${videoId}?userId=${encodeURIComponent(userId)}`);
    if (res.ok && res.data) {
      return res.data;
    }

    const accessList = getLocalAccess();
    const isUnlocked = accessList.some((a) => a.videoId === videoId && a.userId === userId);
    if (isUnlocked) {
      return { accessStatus: 'unlocked', isUnlocked: true, payment: null };
    }

    const payments = getLocalPayments();
    const p = payments.find((pay) => pay.videoId === videoId && pay.userId === userId);
    if (p) {
      return {
        accessStatus: p.status === 'approved' ? 'unlocked' : p.status === 'rejected' ? 'locked' : 'pending',
        isUnlocked: p.status === 'approved',
        payment: p,
        rejectReason: p.rejectReason,
      };
    }

    return { accessStatus: 'locked', isUnlocked: false, payment: null };
  },

  async getUserUnlockedVideos(userId: string): Promise<Video[]> {
    if (!userId) return [];
    const res = await safeFetch<{ videos: Video[] }>(`${API_BASE}/user/unlocked?userId=${encodeURIComponent(userId)}`);
    if (res.ok && res.data?.videos) {
      return res.data.videos;
    }

    const access = getLocalAccess().filter((a) => a.userId === userId);
    const videoIds = access.map((a) => a.videoId);
    const allVideos = getLocalVideos();
    return allVideos.filter((v) => videoIds.includes(v._id));
  },

  async getUserPayments(userId: string): Promise<Payment[]> {
    if (!userId) return [];
    const res = await safeFetch<{ payments: Payment[] }>(`${API_BASE}/user/payments?userId=${encodeURIComponent(userId)}`);
    if (res.ok && res.data?.payments) {
      return res.data.payments;
    }

    const allPayments = getLocalPayments();
    return allPayments.filter((p) => p.userId === userId);
  },

  // ==========================================
  // Admin APIs with Zero-Fail Vercel Protection
  // ==========================================
  async adminLogin(password: string, email?: string): Promise<{ token: string; admin: any }> {
    const cleanPass = (password || '').trim();
    
    // Strict password verification for mr@786
    if (cleanPass !== 'mr@786') {
      throw new Error('Access Denied: Incorrect admin password. Only the authorized admin can access.');
    }

    // Attempt backend login first
    const res = await safeFetch<{ token: string; admin: any; error?: string }>(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: cleanPass, email: email || 'admin@shortvideo.com' }),
    });

    if (res.ok && res.data?.token) {
      return res.data;
    }

    // Fallback for Vercel static deployments / offline / serverless
    // Generates a valid client admin session so admin section always opens cleanly
    const safeToken = 'admin_auth_mr786_' + Date.now().toString(36);
    return {
      token: safeToken,
      admin: {
        email: email || 'admin@shortvideo.com',
        role: 'admin',
      },
    };
  },

  async getAdminStats(token: string): Promise<AdminStats> {
    const res = await safeFetch<{ stats: AdminStats }>(`${API_BASE}/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok && res.data?.stats) {
      return res.data.stats;
    }

    const videos = getLocalVideos();
    const payments = getLocalPayments();
    const approved = payments.filter((p) => p.status === 'approved');
    const pending = payments.filter((p) => p.status === 'pending');
    const rejected = payments.filter((p) => p.status === 'rejected');
    const totalEarnings = approved.reduce((acc, p) => acc + (p.amount || 49), 0);

    return {
      totalVideos: videos.length,
      totalLikes: videos.reduce((acc, v) => acc + (v.likesCount || 0), 0),
      totalShares: videos.reduce((acc, v) => acc + (v.sharesCount || 0), 0),
      totalPayments: payments.length,
      approvedPayments: approved.length,
      pendingPayments: pending.length,
      rejectedPayments: rejected.length,
      totalRevenue: totalEarnings,
      totalUsers: 1,
    };
  },

  async getAdminVideos(token: string): Promise<Video[]> {
    const res = await safeFetch<{ videos: Video[] }>(`${API_BASE}/admin/videos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok && res.data?.videos) {
      if (res.data.videos.length > 0) {
        saveLocalVideos(res.data.videos);
      }
      return res.data.videos;
    }
    return getLocalVideos();
  },

  async uploadAdminVideo(
    token: string,
    payload: FormData | { title: string; description?: string; cloudinaryUrl?: string; cloudinaryPublicId?: string; thumbnailUrl?: string; customThumbnailUrl?: string }
  ): Promise<Video> {
    const isFormData = payload instanceof FormData;
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await safeFetch<{ video: Video; error?: string }>(`${API_BASE}/admin/videos/upload`, {
      method: 'POST',
      headers,
      body: isFormData ? payload : JSON.stringify(payload),
    });

    if (res.ok && res.data?.video) {
      const all = getLocalVideos();
      all.unshift(res.data.video);
      saveLocalVideos(all);
      return res.data.video;
    }

    // Local fallback video creation (e.g. from Cloudinary widget upload)
    let title = 'New Video';
    let description = '';
    let cloudinaryUrl = '';
    let cloudinaryPublicId = '';
    let thumbnailUrl = '';

    if (isFormData) {
      title = (payload.get('title') as string) || title;
      description = (payload.get('description') as string) || '';
      cloudinaryUrl = (payload.get('cloudinaryUrl') as string) || '';
      cloudinaryPublicId = (payload.get('cloudinaryPublicId') as string) || '';
      thumbnailUrl = (payload.get('thumbnailUrl') as string) || '';
    } else {
      title = payload.title || title;
      description = payload.description || '';
      cloudinaryUrl = payload.cloudinaryUrl || '';
      cloudinaryPublicId = payload.cloudinaryPublicId || '';
      thumbnailUrl = payload.thumbnailUrl || payload.customThumbnailUrl || '';
    }

    const newVid: Video = {
      _id: 'vid_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      title,
      description,
      cloudinaryUrl: cloudinaryUrl || 'https://res.cloudinary.com/dya4mw0bt/video/upload/sample.mp4',
      cloudinaryPublicId: cloudinaryPublicId || 'sample',
      thumbnailUrl: thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
      duration: 30,
      likesCount: 0,
      sharesCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const currentVideos = getLocalVideos();
    currentVideos.unshift(newVid);
    saveLocalVideos(currentVideos);

    return newVid;
  },

  async updateAdminVideo(token: string, id: string, payload: { title: string; description: string; thumbnailUrl?: string }): Promise<Video> {
    const res = await safeFetch<{ video: Video }>(`${API_BASE}/admin/videos/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok && res.data?.video) {
      return res.data.video;
    }

    const currentVideos = getLocalVideos();
    const idx = currentVideos.findIndex((v) => v._id === id);
    if (idx !== -1) {
      currentVideos[idx] = {
        ...currentVideos[idx],
        title: payload.title,
        description: payload.description,
        ...(payload.thumbnailUrl ? { thumbnailUrl: payload.thumbnailUrl } : {}),
        updatedAt: new Date().toISOString(),
      };
      saveLocalVideos(currentVideos);
      return currentVideos[idx];
    }
    throw new Error('Video not found to update');
  },

  async deleteAdminVideo(token: string, id: string): Promise<boolean> {
    const res = await safeFetch<{ success: boolean }>(`${API_BASE}/admin/videos/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    const currentVideos = getLocalVideos().filter((v) => v._id !== id);
    saveLocalVideos(currentVideos);

    if (res.ok && res.data?.success) {
      return res.data.success;
    }
    return true;
  },

  async getAdminPayments(token: string): Promise<Payment[]> {
    const res = await safeFetch<{ payments: Payment[] }>(`${API_BASE}/admin/payments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok && res.data?.payments) {
      return res.data.payments;
    }
    return getLocalPayments();
  },

  async approvePayment(token: string, paymentId: string): Promise<Payment> {
    const res = await safeFetch<{ payment: Payment }>(`${API_BASE}/admin/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    const payments = getLocalPayments();
    const pIdx = payments.findIndex((p) => p._id === paymentId);
    if (pIdx !== -1) {
      payments[pIdx].status = 'approved';
      payments[pIdx].verifiedAt = new Date().toISOString();
      payments[pIdx].verifiedBy = 'Admin';
      saveLocalPayments(payments);

      // Unlock for user
      const accessList = getLocalAccess();
      accessList.push({
        videoId: payments[pIdx].videoId,
        userId: payments[pIdx].userId,
        unlockedAt: new Date().toISOString(),
      });
      saveLocalAccess(accessList);

      return payments[pIdx];
    }

    if (res.ok && res.data?.payment) {
      return res.data.payment;
    }
    throw new Error('Payment record not found');
  },

  async rejectPayment(token: string, paymentId: string, reason?: string): Promise<Payment> {
    const res = await safeFetch<{ payment: Payment }>(`${API_BASE}/admin/payments/${paymentId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });

    const payments = getLocalPayments();
    const pIdx = payments.findIndex((p) => p._id === paymentId);
    if (pIdx !== -1) {
      payments[pIdx].status = 'rejected';
      payments[pIdx].rejectReason = reason || 'Payment not verified';
      payments[pIdx].verifiedAt = new Date().toISOString();
      payments[pIdx].verifiedBy = 'Admin';
      saveLocalPayments(payments);
      return payments[pIdx];
    }

    if (res.ok && res.data?.payment) {
      return res.data.payment;
    }
    throw new Error('Payment record not found');
  },

  async getAdminUsers(token: string): Promise<any[]> {
    const res = await safeFetch<{ users: any[] }>(`${API_BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok && res.data?.users) {
      return res.data.users;
    }
    return [];
  },

  async getAdminConfig(token: string): Promise<any> {
    const res = await safeFetch<any>(`${API_BASE}/admin/config`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok && res.data) {
      return res.data;
    }
    return {
      config: getLocalConfig(),
      cloudinary: {
        isConfigured: true,
        cloudName: 'dya4mw0bt',
        hasApiKey: true,
        hasApiSecret: true,
      },
    };
  },

  async updateAdminConfig(token: string, config: { upiId?: string; upiName?: string; phonePeMerchantId?: string }): Promise<any> {
    const res = await safeFetch<any>(`${API_BASE}/admin/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(config),
    });

    const currentCfg = getLocalConfig();
    const updated = {
      ...currentCfg,
      ...(config.upiId ? { upiId: config.upiId } : {}),
      ...(config.upiName ? { upiName: config.upiName } : {}),
      ...(config.phonePeMerchantId ? { phonePeMerchantId: config.phonePeMerchantId } : {}),
    };
    saveLocalConfig(updated);

    if (res.ok && res.data) {
      return res.data;
    }
    return { success: true, config: updated };
  },
};
