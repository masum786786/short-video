export interface Video {
  _id: string;
  title: string;
  description: string;
  cloudinaryPublicId: string;
  cloudinaryUrl: string;
  thumbnailUrl: string;
  duration: number; // in seconds
  likesCount: number;
  sharesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  name: string;
  mobile: string;
  email?: string;
  createdAt: string;
}

export interface Like {
  _id?: string;
  userId: string;
  videoId: string;
  createdAt: string;
}

export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export interface Payment {
  _id: string;
  userId: string;
  userName: string;
  userMobile: string;
  videoId: string;
  videoTitle: string;
  amount: number;
  paymentScreenshot: string; // URL or base64 storage
  status: PaymentStatus;
  submittedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectReason?: string;
}

export interface VideoAccess {
  _id?: string;
  userId: string;
  videoId: string;
  paymentId?: string;
  accessStatus: 'locked' | 'pending' | 'unlocked';
  unlockedAt?: string;
}

export interface AdminStats {
  totalVideos: number;
  totalUsers: number;
  totalLikes: number;
  totalShares: number;
  totalPayments: number;
  approvedPayments: number;
  pendingPayments: number;
  rejectedPayments: number;
  totalRevenue: number;
}

export interface UPIConfig {
  upiId: string;
  upiName: string;
  amount: number;
  phonePeMerchantId?: string;
  upiString?: string;
  phonePeDeepLink?: string;
  gPayDeepLink?: string;
  paytmDeepLink?: string;
  bhimDeepLink?: string;
  credDeepLink?: string;
  qrCodeDataUrl?: string;
}

export interface AccessCheckResult {
  hasAccess: boolean;
  accessStatus: 'locked' | 'pending' | 'unlocked';
  paymentId?: string;
  previewDuration: number;
  videoUrl: string;
  message?: string;
}
