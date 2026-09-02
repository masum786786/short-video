import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import QRCode from 'qrcode';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';
import {
  getCloudinaryClient,
  uploadVideoToCloudinary,
  deleteVideoFromCloudinary,
  uploadImageToCloudinary,
} from './server/cloudinary.js';
import {
  generateAdminToken,
  verifyAdminCredentials,
  adminAuthMiddleware,
} from './server/auth.js';

// Setup uploads temp directory
const UPLOADS_DIR = path.join(process.cwd(), 'uploads_temp');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 300 * 1024 * 1024, // 300MB max for video
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Standard JSON and URL-encoded body parsing
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // --------------------------------------------------------------------------
  // API Routes
  // --------------------------------------------------------------------------

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // ----------------------
  // Public Video Routes
  // ----------------------

  // GET /api/videos - Return only uploaded videos from Cloudinary/DB
  app.get('/api/videos', async (req, res) => {
    try {
      const search = (req.query.q as string || '').toLowerCase().trim();
      let videos = await db.getVideos();

      if (search) {
        videos = videos.filter(
          (v) =>
            v.title.toLowerCase().includes(search) ||
            v.description.toLowerCase().includes(search)
        );
      }

      res.json({ videos });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch videos' });
    }
  });

  // GET /api/videos/:id - Single video info
  app.get('/api/videos/:id', async (req, res) => {
    try {
      const video = await db.getVideoById(req.params.id);
      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }
      res.json({ video });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch video' });
    }
  });

  // GET /api/videos/:id/access - Check user's access status
  app.get('/api/videos/:id/access', async (req, res) => {
    try {
      const videoId = req.params.id;
      const userId = (req.query.userId as string) || '';

      const video = await db.getVideoById(videoId);
      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }

      if (!userId) {
        res.json({
          hasAccess: false,
          accessStatus: 'locked',
          previewDuration: 5,
          videoUrl: video.cloudinaryUrl,
        });
        return;
      }

      const accessInfo = await db.checkUserVideoAccess(userId, videoId);
      const isUnlocked = accessInfo.accessStatus === 'unlocked';

      res.json({
        hasAccess: isUnlocked,
        accessStatus: accessInfo.accessStatus,
        paymentId: accessInfo.paymentId,
        rejectReason: accessInfo.rejectReason,
        previewDuration: 5,
        videoUrl: video.cloudinaryUrl,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to verify access' });
    }
  });

  // POST /api/videos/:id/like - Toggle like/unlike
  app.post('/api/videos/:id/like', async (req, res) => {
    try {
      const videoId = req.params.id;
      const { userId, userMobile, userName } = req.body;

      if (!userId) {
        res.status(400).json({ error: 'User identifier required' });
        return;
      }

      // If user info is provided, ensure user is recorded
      if (userMobile) {
        await db.getOrCreateUser(userMobile, userName || 'Viewer');
      }

      const result = await db.toggleLike(userId, videoId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to toggle like' });
    }
  });

  // GET /api/videos/:id/liked - Check if current user liked video
  app.get('/api/videos/:id/liked', async (req, res) => {
    try {
      const videoId = req.params.id;
      const userId = (req.query.userId as string) || '';
      if (!userId) {
        res.json({ liked: false });
        return;
      }
      const liked = await db.isLiked(userId, videoId);
      res.json({ liked });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/videos/:id/share - Increment share count
  app.post('/api/videos/:id/share', async (req, res) => {
    try {
      const videoId = req.params.id;
      const newShares = await db.incrementShares(videoId);
      res.json({ sharesCount: newShares });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to register share' });
    }
  });

  // ----------------------
  // UPI & Payment Flow
  // ----------------------

  // GET /api/upi/details - Generate ₹49 UPI URI and QR code
  app.get('/api/upi/details', async (req, res) => {
    try {
      const videoId = (req.query.videoId as string) || '';
      const config = db.getConfig();
      const amount = 49;
      const upiId = config.upiId || 'shortvideo@upi';
      const upiName = encodeURIComponent(config.upiName || 'Short Video');
      const transactionNote = encodeURIComponent(`ShortVideo ${videoId.slice(0, 8)} Access`);

      // Standard Indian UPI Intent URL
      const upiString = `upi://pay?pa=${upiId}&pn=${upiName}&am=${amount}&cu=INR&tn=${transactionNote}`;

      // Direct app-specific UPI deep links for mobile devices
      const phonePeDeepLink = `phonepe://pay?pa=${upiId}&pn=${upiName}&am=${amount}&cu=INR&tn=${transactionNote}`;
      const gPayDeepLink = `tez://upi/pay?pa=${upiId}&pn=${upiName}&am=${amount}&cu=INR&tn=${transactionNote}`;
      const paytmDeepLink = `paytmmp://pay?pa=${upiId}&pn=${upiName}&am=${amount}&cu=INR&tn=${transactionNote}`;
      const bhimDeepLink = `bhim://pay?pa=${upiId}&pn=${upiName}&am=${amount}&cu=INR&tn=${transactionNote}`;
      const credDeepLink = `cred://upi/pay?pa=${upiId}&pn=${upiName}&am=${amount}&cu=INR&tn=${transactionNote}`;

      // Generate base64 QR Code
      const qrCodeDataUrl = await QRCode.toDataURL(upiString, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });

      res.json({
        upiId: config.upiId,
        upiName: config.upiName,
        amount,
        upiString,
        phonePeDeepLink,
        gPayDeepLink,
        paytmDeepLink,
        bhimDeepLink,
        credDeepLink,
        qrCodeDataUrl,
        phonePeMerchantId: config.phonePeMerchantId,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to generate UPI details' });
    }
  });

  // POST /api/payments/submit - Submit screenshot for verification
  app.post('/api/payments/submit', upload.single('screenshot'), async (req, res) => {
    try {
      const { userId, userMobile, userName, videoId } = req.body;

      if (!userId || !userMobile || !videoId) {
        res.status(400).json({ error: 'Missing required fields: userId, userMobile, videoId' });
        return;
      }

      const video = await db.getVideoById(videoId);
      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }

      // Register or update user
      await db.getOrCreateUser(userMobile, userName || 'User ' + userMobile.slice(-4));

      let screenshotUrl = '';
      if (req.file) {
        // Upload screenshot image to Cloudinary (or fallback)
        screenshotUrl = await uploadImageToCloudinary(req.file.path);
        // Clean up temporary local file
        try {
          fs.unlinkSync(req.file.path);
        } catch (_) {}
      } else if (req.body.screenshotBase64) {
        screenshotUrl = await uploadImageToCloudinary(req.body.screenshotBase64);
      } else {
        res.status(400).json({ error: 'Payment screenshot file or data is required' });
        return;
      }

      const payment = await db.createPayment({
        userId,
        userName: userName || 'Viewer ' + userMobile.slice(-4),
        userMobile,
        videoId,
        videoTitle: video.title,
        amount: 49,
        paymentScreenshot: screenshotUrl,
      });

      res.json({
        success: true,
        message: 'Your payment is being verified. You will get access after approval.',
        payment,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to submit payment screenshot' });
    }
  });

  // GET /api/payments/status/:videoId - Check payment status
  app.get('/api/payments/status/:videoId', async (req, res) => {
    try {
      const videoId = req.params.videoId;
      const userId = (req.query.userId as string) || '';

      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      const access = await db.checkUserVideoAccess(userId, videoId);
      let payment = null;
      if (access.paymentId) {
        payment = await db.getPaymentById(access.paymentId);
      }

      res.json({
        accessStatus: access.accessStatus,
        payment,
        isUnlocked: access.accessStatus === 'unlocked',
        rejectReason: access.rejectReason,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to check status' });
    }
  });

  // GET /api/user/unlocked - Get all unlocked videos for a user
  app.get('/api/user/unlocked', async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }
      const videos = await db.getUserUnlockedVideos(userId);
      res.json({ videos });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch unlocked videos' });
    }
  });

  // GET /api/user/payments - Get all payment submissions for a user
  app.get('/api/user/payments', async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }
      const payments = await db.getUserPayments(userId);
      res.json({ payments });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch user payments' });
    }
  });

  // ----------------------
  // Admin Authentication & Endpoints
  // ----------------------

  // POST /api/admin/login
  app.post('/api/admin/login', (req, res) => {
    const { password, email } = req.body;
    if (!password) {
      res.status(400).json({ error: 'Admin password is required' });
      return;
    }

    if (verifyAdminCredentials(password)) {
      const adminEmail = email || 'admin@shortvideo.com';
      const token = generateAdminToken(adminEmail);
      res.json({
        success: true,
        token,
        admin: { email: adminEmail, role: 'admin' },
      });
    } else {
      res.status(401).json({ error: 'Invalid password. Access Denied.' });
    }
  });

  // GET /api/admin/me
  app.get('/api/admin/me', adminAuthMiddleware, (req, res) => {
    res.json({ authenticated: true, admin: (req as any).admin });
  });

  // GET /api/admin/stats
  app.get('/api/admin/stats', adminAuthMiddleware, (req, res) => {
    const stats = db.getStats();
    res.json({ stats });
  });

  // GET /api/admin/videos
  app.get('/api/admin/videos', adminAuthMiddleware, async (req, res) => {
    const videos = await db.getVideos();
    res.json({ videos });
  });

  // POST /api/admin/videos/upload - Upload video to Cloudinary & Save to DB
  app.post('/api/admin/videos/upload', adminAuthMiddleware, upload.single('video'), async (req, res) => {
    try {
      const { title, description, customThumbnailUrl } = req.body;

      if (!title || !title.trim()) {
        res.status(400).json({ error: 'Video title is required' });
        return;
      }

      let cloudinaryPublicId = '';
      let cloudinaryUrl = '';
      let thumbnailUrl = customThumbnailUrl || '';
      let duration = 0;

      if (req.file) {
        // Upload video file directly to Cloudinary
        const { isConfigured, error } = getCloudinaryClient();
        if (!isConfigured) {
          // If Cloudinary keys are not yet provided in .env, save local reference or guide admin
          cloudinaryPublicId = 'local_' + Date.now();
          cloudinaryUrl = `/uploads/${path.basename(req.file.path)}`;
          thumbnailUrl = customThumbnailUrl || 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&q=80';
          duration = 60;
        } else {
          const uploadRes = await uploadVideoToCloudinary(req.file.path);
          cloudinaryPublicId = uploadRes.publicId;
          cloudinaryUrl = uploadRes.secureUrl;
          thumbnailUrl = customThumbnailUrl || uploadRes.thumbnailUrl;
          duration = uploadRes.duration || 60;

          // Clean up temp file
          try {
            fs.unlinkSync(req.file.path);
          } catch (_) {}
        }
      } else if (req.body.cloudinaryUrl || req.body.secure_url) {
        // Direct Cloudinary URL provided (e.g. via Cloudinary Upload Widget)
        cloudinaryUrl = (req.body.cloudinaryUrl || req.body.secure_url).trim();
        cloudinaryPublicId = (req.body.cloudinaryPublicId || req.body.public_id || 'cloud_' + Date.now()).trim();
        
        // If no explicit thumbnail provided, generate using Cloudinary transformation
        if (customThumbnailUrl) {
          thumbnailUrl = customThumbnailUrl.trim();
        } else if (req.body.thumbnailUrl || req.body.thumbnail_url) {
          thumbnailUrl = (req.body.thumbnailUrl || req.body.thumbnail_url).trim();
        } else if (cloudinaryUrl.includes('/upload/')) {
          thumbnailUrl = cloudinaryUrl.replace('/upload/', '/upload/so_2,f_jpg,w_400,h_250,c_fill/');
        } else {
          thumbnailUrl = 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&q=80';
        }
        duration = Number(req.body.duration) || 60;
      } else {
        res.status(400).json({ error: 'Video file or Cloudinary video details required' });
        return;
      }

      const newVideo = await db.createVideo({
        title: title.trim(),
        description: description ? description.trim() : '',
        cloudinaryPublicId,
        cloudinaryUrl,
        thumbnailUrl,
        duration,
      });

      res.json({ success: true, video: newVideo });
    } catch (err: any) {
      console.error('Video upload error:', err);
      res.status(500).json({ error: err.message || 'Failed to upload video' });
    }
  });

  // PUT /api/admin/videos/:id - Update video info
  app.put('/api/admin/videos/:id', adminAuthMiddleware, async (req, res) => {
    try {
      const { title, description, thumbnailUrl } = req.body;
      const updated = await db.updateVideo(req.params.id, { title, description, thumbnailUrl });
      if (!updated) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }
      res.json({ success: true, video: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update video' });
    }
  });

  // DELETE /api/admin/videos/:id - Delete video from Cloudinary and DB
  app.delete('/api/admin/videos/:id', adminAuthMiddleware, async (req, res) => {
    try {
      const video = await db.getVideoById(req.params.id);
      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }

      // Try deleting from Cloudinary if publicId exists
      if (video.cloudinaryPublicId && !video.cloudinaryPublicId.startsWith('local_')) {
        await deleteVideoFromCloudinary(video.cloudinaryPublicId);
      }

      const deleted = await db.deleteVideo(req.params.id);
      res.json({ success: deleted, message: 'Video removed successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete video' });
    }
  });

  // GET /api/admin/payments - Payment verification requests
  app.get('/api/admin/payments', adminAuthMiddleware, async (req, res) => {
    const payments = await db.getPayments();
    res.json({ payments });
  });

  // POST /api/admin/payments/:id/approve - Approve payment & grant access
  app.post('/api/admin/payments/:id/approve', adminAuthMiddleware, async (req, res) => {
    try {
      const paymentId = req.params.id;
      const payment = await db.verifyPayment(paymentId, 'approved', 'Admin');
      if (!payment) {
        res.status(404).json({ error: 'Payment request not found' });
        return;
      }
      res.json({ success: true, payment, message: 'Payment approved. Video unlocked for user.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to approve payment' });
    }
  });

  // POST /api/admin/payments/:id/reject - Reject payment
  app.post('/api/admin/payments/:id/reject', adminAuthMiddleware, async (req, res) => {
    try {
      const paymentId = req.params.id;
      const { reason } = req.body;
      const payment = await db.verifyPayment(paymentId, 'rejected', 'Admin', reason);
      if (!payment) {
        res.status(404).json({ error: 'Payment request not found' });
        return;
      }
      res.json({ success: true, payment, message: 'Payment rejected. Video remains locked.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to reject payment' });
    }
  });

  // GET /api/admin/users - User management
  app.get('/api/admin/users', adminAuthMiddleware, async (req, res) => {
    const users = await db.getUsers();
    const payments = await db.getPayments();
    const videos = await db.getVideos();

    const enrichedUsers = users.map((u) => {
      const userPayments = payments.filter((p) => p.userId === u._id || p.userMobile === u.mobile);
      const approvedCount = userPayments.filter((p) => p.status === 'approved').length;
      return {
        ...u,
        totalPayments: userPayments.length,
        approvedPurchases: approvedCount,
        recentActivity: userPayments[0]?.submittedAt || u.createdAt,
      };
    });

    res.json({ users: enrichedUsers });
  });

  // GET /api/admin/config - Cloudinary and UPI settings
  app.get('/api/admin/config', adminAuthMiddleware, (req, res) => {
    const config = db.getConfig();
    const cloudStatus = getCloudinaryClient();
    res.json({
      config,
      cloudinary: {
        isConfigured: cloudStatus.isConfigured,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || '(Not set in .env)',
        hasApiKey: !!process.env.CLOUDINARY_API_KEY,
        hasApiSecret: !!process.env.CLOUDINARY_API_SECRET,
      },
    });
  });

  // POST /api/admin/config - Update UPI configuration
  app.post('/api/admin/config', adminAuthMiddleware, (req, res) => {
    const { upiId, upiName, phonePeMerchantId } = req.body;
    const updated = db.updateConfig({
      upiId: upiId || undefined,
      upiName: upiName || undefined,
      phonePeMerchantId: phonePeMerchantId || undefined,
    });
    res.json({ success: true, config: updated });
  });

  // --------------------------------------------------------------------------
  // Vite Integration for SPA Development & Production Serving
  // --------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`short video server running on http://localhost:${PORT}`);
  });
}

startServer();
