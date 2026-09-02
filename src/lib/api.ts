import { Video, Payment, AdminStats, UPIConfig, AccessCheckResult, User } from '../types';

const API_BASE = '/api';

export const api = {
  // Public Videos
  async getVideos(search?: string): Promise<Video[]> {
    const query = search ? `?q=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${API_BASE}/videos${query}`);
    if (!res.ok) throw new Error('Failed to load videos');
    const data = await res.json();
    return data.videos || [];
  },

  async getVideo(id: string): Promise<Video> {
    const res = await fetch(`${API_BASE}/videos/${id}`);
    if (!res.ok) throw new Error('Failed to load video');
    const data = await res.json();
    return data.video;
  },

  async checkAccess(videoId: string, userId: string): Promise<AccessCheckResult> {
    const res = await fetch(`${API_BASE}/videos/${videoId}/access?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error('Failed to verify access');
    return res.json();
  },

  async toggleLike(videoId: string, userId: string, userMobile?: string, userName?: string): Promise<{ liked: boolean; likesCount: number }> {
    const res = await fetch(`${API_BASE}/videos/${videoId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userMobile, userName }),
    });
    if (!res.ok) throw new Error('Failed to toggle like');
    return res.json();
  },

  async isLiked(videoId: string, userId: string): Promise<boolean> {
    if (!userId) return false;
    const res = await fetch(`${API_BASE}/videos/${videoId}/liked?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.liked;
  },

  async registerShare(videoId: string): Promise<number> {
    const res = await fetch(`${API_BASE}/videos/${videoId}/share`, {
      method: 'POST',
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.sharesCount || 0;
  },

  // UPI & Payments
  async getUPIDetails(videoId?: string): Promise<UPIConfig & { upiString: string; qrCodeDataUrl: string }> {
    const query = videoId ? `?videoId=${encodeURIComponent(videoId)}` : '';
    const res = await fetch(`${API_BASE}/upi/details${query}`);
    if (!res.ok) throw new Error('Failed to fetch UPI details');
    return res.json();
  },

  async submitPayment(formData: FormData): Promise<{ success: boolean; message: string; payment: Payment }> {
    const res = await fetch(`${API_BASE}/payments/submit`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit payment screenshot');
    return data;
  },

  async checkPaymentStatus(videoId: string, userId: string): Promise<{
    accessStatus: 'locked' | 'pending' | 'unlocked';
    payment: Payment | null;
    isUnlocked: boolean;
    rejectReason?: string;
  }> {
    const res = await fetch(`${API_BASE}/payments/status/${videoId}?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error('Failed to check payment status');
    return res.json();
  },

  async getUserUnlockedVideos(userId: string): Promise<Video[]> {
    if (!userId) return [];
    const res = await fetch(`${API_BASE}/user/unlocked?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.videos || [];
  },

  async getUserPayments(userId: string): Promise<Payment[]> {
    if (!userId) return [];
    const res = await fetch(`${API_BASE}/user/payments?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.payments || [];
  },

  // Admin APIs
  async adminLogin(password: string, email?: string): Promise<{ token: string; admin: any }> {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, email: email || 'admin@shortvideo.com' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid admin password');
    return data;
  },

  async getAdminStats(token: string): Promise<AdminStats> {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch admin stats');
    const data = await res.json();
    return data.stats;
  },

  async getAdminVideos(token: string): Promise<Video[]> {
    const res = await fetch(`${API_BASE}/admin/videos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch videos');
    const data = await res.json();
    return data.videos;
  },

  async uploadAdminVideo(token: string, payload: FormData | { title: string; description?: string; cloudinaryUrl?: string; cloudinaryPublicId?: string; thumbnailUrl?: string; customThumbnailUrl?: string }): Promise<Video> {
    const isFormData = payload instanceof FormData;
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}/admin/videos/upload`, {
      method: 'POST',
      headers,
      body: isFormData ? payload : JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to upload video');
    return data.video;
  },

  async updateAdminVideo(token: string, id: string, payload: { title: string; description: string; thumbnailUrl?: string }): Promise<Video> {
    const res = await fetch(`${API_BASE}/admin/videos/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update video');
    return data.video;
  },

  async deleteAdminVideo(token: string, id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/admin/videos/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete video');
    return data.success;
  },

  async getAdminPayments(token: string): Promise<Payment[]> {
    const res = await fetch(`${API_BASE}/admin/payments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch payments');
    const data = await res.json();
    return data.payments;
  },

  async approvePayment(token: string, paymentId: string): Promise<Payment> {
    const res = await fetch(`${API_BASE}/admin/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to approve payment');
    return data.payment;
  },

  async rejectPayment(token: string, paymentId: string, reason?: string): Promise<Payment> {
    const res = await fetch(`${API_BASE}/admin/payments/${paymentId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reject payment');
    return data.payment;
  },

  async getAdminUsers(token: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch users');
    const data = await res.json();
    return data.users;
  },

  async getAdminConfig(token: string): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/config`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch config');
    return res.json();
  },

  async updateAdminConfig(token: string, config: { upiId?: string; upiName?: string; phonePeMerchantId?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error('Failed to update config');
    return res.json();
  },
};
