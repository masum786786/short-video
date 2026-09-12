import fs from 'fs';
import path from 'path';
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVideo {
  _id: string;
  title: string;
  description: string;
  cloudinaryPublicId: string;
  cloudinaryUrl: string;
  thumbnailUrl: string;
  duration: number;
  likesCount: number;
  sharesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface IUser {
  _id: string;
  name: string;
  mobile: string;
  email?: string;
  createdAt: string;
}

export interface ILike {
  _id: string;
  userId: string;
  videoId: string;
  createdAt: string;
}

export interface IPayment {
  _id: string;
  userId: string;
  userName: string;
  userMobile: string;
  videoId: string;
  videoTitle: string;
  amount: number;
  paymentScreenshot: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectReason?: string;
}

export interface IVideoAccess {
  _id: string;
  userId: string;
  videoId: string;
  paymentId?: string;
  accessStatus: 'locked' | 'pending' | 'unlocked';
  unlockedAt?: string;
}

export interface IAppConfig {
  upiId: string;
  upiName: string;
  phonePeMerchantId: string;
}

// ----------------------------------------------------
// Persistent JSON / In-Memory High-Speed Storage Engine
// ----------------------------------------------------
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

interface DatabaseStore {
  videos: IVideo[];
  users: IUser[];
  likes: ILike[];
  payments: IPayment[];
  access: IVideoAccess[];
  config: IAppConfig;
}

const defaultDatabaseStore: DatabaseStore = {
  videos: [],
  users: [],
  likes: [],
  payments: [],
  access: [],
  config: {
    upiId: process.env.UPI_ID || 'masum345@ptyes',
    upiName: process.env.UPI_NAME || 'Masum',
    phonePeMerchantId: process.env.PHONEPE_MERCHANT_ID || 'PHONEPE_MERCHANT_DEFAULT',
  },
};

class StorageEngine {
  private store: DatabaseStore = defaultDatabaseStore;
  private isMongoConnected = false;

  constructor() {
    this.initLocalStore();
    this.initMongo();
  }

  private initLocalStore() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.store = JSON.parse(raw);
        // Ensure config is populated
        if (!this.store.config) {
          this.store.config = defaultDatabaseStore.config;
        }
      } else {
        this.saveLocalStore();
      }
    } catch (err) {
      console.warn('StorageEngine: Using in-memory store', err);
    }
  }

  private saveLocalStore() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.store, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save to database.json:', err);
    }
  }

  private async initMongo() {
    const uri = process.env.MONGODB_URI;
    if (uri && uri.trim() !== '') {
      try {
        await mongoose.connect(uri);
        this.isMongoConnected = true;
        console.log('Successfully connected to MongoDB Atlas / Instance');
      } catch (err) {
        console.warn('MongoDB connection failed. Continuing with local persistent storage:', (err as Error).message);
      }
    }
  }

  // --- Videos ---
  async getVideos(): Promise<IVideo[]> {
    return [...this.store.videos].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getVideoById(id: string): Promise<IVideo | null> {
    return this.store.videos.find((v) => v._id === id) || null;
  }

  async createVideo(videoData: Omit<IVideo, '_id' | 'createdAt' | 'updatedAt' | 'likesCount' | 'sharesCount'>): Promise<IVideo> {
    const id = 'vid_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const now = new Date().toISOString();
    const newVideo: IVideo = {
      ...videoData,
      _id: id,
      likesCount: 0,
      sharesCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.store.videos.push(newVideo);
    this.saveLocalStore();
    return newVideo;
  }

  async updateVideo(id: string, updates: Partial<Pick<IVideo, 'title' | 'description' | 'thumbnailUrl'>>): Promise<IVideo | null> {
    const video = this.store.videos.find((v) => v._id === id);
    if (!video) return null;
    if (updates.title !== undefined) video.title = updates.title;
    if (updates.description !== undefined) video.description = updates.description;
    if (updates.thumbnailUrl !== undefined) video.thumbnailUrl = updates.thumbnailUrl;
    video.updatedAt = new Date().toISOString();
    this.saveLocalStore();
    return video;
  }

  async deleteVideo(id: string): Promise<boolean> {
    const index = this.store.videos.findIndex((v) => v._id === id);
    if (index === -1) return false;
    this.store.videos.splice(index, 1);
    // Also remove likes for this video
    this.store.likes = this.store.likes.filter((l) => l.videoId !== id);
    this.saveLocalStore();
    return true;
  }

  async incrementShares(id: string): Promise<number> {
    const video = this.store.videos.find((v) => v._id === id);
    if (!video) return 0;
    video.sharesCount = (video.sharesCount || 0) + 1;
    this.saveLocalStore();
    return video.sharesCount;
  }

  // --- Users ---
  async getOrCreateUser(mobile: string, name: string, email?: string): Promise<IUser> {
    let user = this.store.users.find((u) => u.mobile === mobile);
    if (!user) {
      user = {
        _id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        name: name || 'User ' + mobile.slice(-4),
        mobile,
        email,
        createdAt: new Date().toISOString(),
      };
      this.store.users.push(user);
      this.saveLocalStore();
    } else {
      if (name && name !== user.name) {
        user.name = name;
        this.saveLocalStore();
      }
    }
    return user;
  }

  async getUsers(): Promise<IUser[]> {
    return [...this.store.users];
  }

  async getUserById(id: string): Promise<IUser | null> {
    return this.store.users.find((u) => u._id === id) || null;
  }

  // --- Likes ---
  async toggleLike(userId: string, videoId: string): Promise<{ liked: boolean; likesCount: number }> {
    const video = this.store.videos.find((v) => v._id === videoId);
    if (!video) throw new Error('Video not found');

    const existingIndex = this.store.likes.findIndex(
      (l) => l.userId === userId && l.videoId === videoId
    );

    let liked = false;
    if (existingIndex >= 0) {
      // Unlike
      this.store.likes.splice(existingIndex, 1);
      video.likesCount = Math.max(0, (video.likesCount || 0) - 1);
      liked = false;
    } else {
      // Like
      this.store.likes.push({
        _id: 'lk_' + Date.now(),
        userId,
        videoId,
        createdAt: new Date().toISOString(),
      });
      video.likesCount = (video.likesCount || 0) + 1;
      liked = true;
    }
    this.saveLocalStore();
    return { liked, likesCount: video.likesCount };
  }

  async isLiked(userId: string, videoId: string): Promise<boolean> {
    return this.store.likes.some((l) => l.userId === userId && l.videoId === videoId);
  }

  // --- Payments & Access ---
  async createPayment(data: {
    userId: string;
    userName: string;
    userMobile: string;
    videoId: string;
    videoTitle: string;
    amount: number;
    paymentScreenshot: string;
  }): Promise<IPayment> {
    const paymentId = 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const payment: IPayment = {
      _id: paymentId,
      ...data,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };
    this.store.payments.unshift(payment);

    // Update or create VideoAccess record
    let access = this.store.access.find(
      (a) => a.userId === data.userId && a.videoId === data.videoId
    );
    if (!access) {
      access = {
        _id: 'acc_' + Date.now(),
        userId: data.userId,
        videoId: data.videoId,
        paymentId: paymentId,
        accessStatus: 'pending',
      };
      this.store.access.push(access);
    } else {
      access.paymentId = paymentId;
      access.accessStatus = 'pending';
    }

    this.saveLocalStore();
    return payment;
  }

  async getPayments(): Promise<IPayment[]> {
    return [...this.store.payments].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  }

  async getPaymentById(id: string): Promise<IPayment | null> {
    return this.store.payments.find((p) => p._id === id) || null;
  }

  async verifyPayment(paymentId: string, status: 'approved' | 'rejected', verifiedBy = 'Admin', rejectReason?: string): Promise<IPayment | null> {
    const payment = this.store.payments.find((p) => p._id === paymentId);
    if (!payment) return null;

    payment.status = status;
    payment.verifiedAt = new Date().toISOString();
    payment.verifiedBy = verifiedBy;
    if (status === 'rejected') {
      payment.rejectReason = rejectReason || 'Payment verification failed or invalid screenshot';
    } else {
      payment.rejectReason = undefined;
    }

    // Update user's access for that video
    let access = this.store.access.find(
      (a) => a.userId === payment.userId && a.videoId === payment.videoId
    );
    if (!access) {
      access = {
        _id: 'acc_' + Date.now(),
        userId: payment.userId,
        videoId: payment.videoId,
        paymentId: payment._id,
        accessStatus: status === 'approved' ? 'unlocked' : 'locked',
        unlockedAt: status === 'approved' ? new Date().toISOString() : undefined,
      };
      this.store.access.push(access);
    } else {
      access.paymentId = payment._id;
      access.accessStatus = status === 'approved' ? 'unlocked' : 'locked';
      if (status === 'approved') {
        access.unlockedAt = new Date().toISOString();
      }
    }

    this.saveLocalStore();
    return payment;
  }

  async checkUserVideoAccess(userId: string, videoId: string): Promise<{ accessStatus: 'locked' | 'pending' | 'unlocked'; paymentId?: string; rejectReason?: string }> {
    const access = this.store.access.find((a) => a.userId === userId && a.videoId === videoId);
    if (!access) {
      return { accessStatus: 'locked' };
    }

    let rejectReason: string | undefined;
    if (access.paymentId) {
      const payment = this.store.payments.find((p) => p._id === access.paymentId);
      if (payment && payment.status === 'rejected') {
        rejectReason = payment.rejectReason;
      }
    }

    return {
      accessStatus: access.accessStatus,
      paymentId: access.paymentId,
      rejectReason,
    };
  }

  async getUserUnlockedVideos(userId: string): Promise<IVideo[]> {
    const unlockedAccess = this.store.access.filter(
      (a) => a.userId === userId && a.accessStatus === 'unlocked'
    );
    const videoIds = new Set(unlockedAccess.map((a) => a.videoId));
    return this.store.videos.filter((v) => videoIds.has(v._id));
  }

  async getUserPayments(userId: string): Promise<IPayment[]> {
    return this.store.payments
      .filter((p) => p.userId === userId)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }

  // --- App Config (UPI, PhonePe) ---
  getConfig(): IAppConfig {
    return this.store.config;
  }

  updateConfig(config: Partial<IAppConfig>): IAppConfig {
    this.store.config = { ...this.store.config, ...config };
    this.saveLocalStore();
    return this.store.config;
  }

  // --- Statistics ---
  getStats() {
    const totalVideos = this.store.videos.length;
    const totalUsers = this.store.users.length;
    const totalLikes = this.store.likes.length;
    const totalShares = this.store.videos.reduce((sum, v) => sum + (v.sharesCount || 0), 0);
    const totalPayments = this.store.payments.length;
    const approvedPayments = this.store.payments.filter((p) => p.status === 'approved').length;
    const pendingPayments = this.store.payments.filter((p) => p.status === 'pending').length;
    const rejectedPayments = this.store.payments.filter((p) => p.status === 'rejected').length;
    const totalRevenue = approvedPayments * 49;

    return {
      totalVideos,
      totalUsers,
      totalLikes,
      totalShares,
      totalPayments,
      approvedPayments,
      pendingPayments,
      rejectedPayments,
      totalRevenue,
    };
  }
}

export const db = new StorageEngine();
