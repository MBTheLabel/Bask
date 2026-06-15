import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { query, queryOne } from '../db/connection';
import { generateToken, requireAuth } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// ─── Multer config for profile photos ────────────────────────
const uploadDir = process.env.UPLOAD_DIR || './uploads/profiles';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `profile-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') },
  fileFilter: (_, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// ─── POST /api/auth/register ──────────────────────────────────
router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    body('firstName').trim().isLength({ min: 1, max: 100 }),
    body('lastName').trim().isLength({ min: 1, max: 100 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
      return;
    }

    const { email, password, firstName, lastName } = req.body;

    try {
      // Check existing user
      const existing = await queryOne<{ id: number }>('SELECT id FROM users WHERE email = ?', [email]);
      if (existing) {
        res.status(409).json({ success: false, error: 'Email already registered' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const result = await query<{ insertId: number }>(
        'INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)',
        [email, passwordHash, firstName, lastName]
      ) as unknown as { insertId: number };

      const userId = result.insertId;
      const token = generateToken({
        userId,
        email,
        isAdmin: false,
        membershipTier: 'Standard',
      });

      res.status(201).json({
        success: true,
        data: {
          token,
          user: {
            id: userId,
            email,
            firstName,
            lastName,
            membershipTier: 'Standard',
            isAdmin: false,
            hasSelectedMembership: false,
          },
        },
      });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ success: false, error: 'Registration failed' });
    }
  }
);

// ─── POST /api/auth/login ─────────────────────────────────────
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    const { email, password } = req.body;

    try {
      const user = await queryOne<{
        id: number; email: string; password_hash: string;
        first_name: string; last_name: string;
        membership_tier: string; is_admin: number;
        has_selected_membership: number;
      }>('SELECT * FROM users WHERE email = ?', [email]);

      if (!user) {
        res.status(401).json({ success: false, error: 'Invalid email or password' });
        return;
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        res.status(401).json({ success: false, error: 'Invalid email or password' });
        return;
      }

      const token = generateToken({
        userId: user.id,
        email: user.email,
        isAdmin: Boolean(user.is_admin),
        membershipTier: user.membership_tier,
      });

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            membershipTier: user.membership_tier,
            isAdmin: Boolean(user.is_admin),
            hasSelectedMembership: Boolean(user.has_selected_membership),
          },
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, error: 'Login failed' });
    }
  }
);

// ─── GET /api/auth/me ─────────────────────────────────────────
router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await queryOne<{
      id: number; email: string; first_name: string; last_name: string;
      membership_tier: string; is_admin: number; has_selected_membership: number;
      nude_friendly: number; dietary_restrictions: string; travel_interests: string;
      profile_photo_url: string | null; stripe_customer_id: string | null; created_at: string;
    }>('SELECT * FROM users WHERE id = ?', [req.user!.userId]);

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        membershipTier: user.membership_tier,
        isAdmin: Boolean(user.is_admin),
        hasSelectedMembership: Boolean(user.has_selected_membership),
        nudeFriendly: Boolean(user.nude_friendly),
        dietaryRestrictions: JSON.parse(user.dietary_restrictions || '[]'),
        travelInterests: JSON.parse(user.travel_interests || '[]'),
        profilePhotoUrl: user.profile_photo_url,
        stripeCustomerId: user.stripe_customer_id,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// ─── PATCH /api/auth/profile ──────────────────────────────────
router.patch('/profile', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const {
    firstName, lastName, nudeFriendly, dietaryRestrictions,
    travelInterests, hasSelectedMembership,
  } = req.body;

  try {
    await query(
      `UPDATE users SET
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        nude_friendly = COALESCE(?, nude_friendly),
        dietary_restrictions = COALESCE(?, dietary_restrictions),
        travel_interests = COALESCE(?, travel_interests),
        has_selected_membership = COALESCE(?, has_selected_membership)
       WHERE id = ?`,
      [
        firstName ?? null,
        lastName ?? null,
        nudeFriendly !== undefined ? (nudeFriendly ? 1 : 0) : null,
        dietaryRestrictions ? JSON.stringify(dietaryRestrictions) : null,
        travelInterests ? JSON.stringify(travelInterests) : null,
        hasSelectedMembership !== undefined ? (hasSelectedMembership ? 1 : 0) : null,
        req.user!.userId,
      ]
    );
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// ─── POST /api/auth/upload-photo ──────────────────────────────
router.post('/upload-photo', requireAuth, upload.single('photo'),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }
    const photoUrl = `/uploads/profiles/${req.file.filename}`;
    try {
      await query('UPDATE users SET profile_photo_url = ? WHERE id = ?', [photoUrl, req.user!.userId]);
      res.json({ success: true, data: { photoUrl } });
    } catch (err) {
      console.error('Photo upload error:', err);
      res.status(500).json({ success: false, error: 'Failed to save photo' });
    }
  }
);

// ─── POST /api/auth/select-membership ────────────────────────
router.post('/select-membership', requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const { tier } = req.body;
    if (!['Standard', 'Elite'].includes(tier)) {
      res.status(400).json({ success: false, error: 'Invalid tier' });
      return;
    }
    try {
      await query(
        'UPDATE users SET membership_tier = ?, has_selected_membership = 1 WHERE id = ?',
        [tier, req.user!.userId]
      );
      res.json({ success: true, message: `Membership set to ${tier}` });
    } catch (err) {
      console.error('Select membership error:', err);
      res.status(500).json({ success: false, error: 'Failed to update membership' });
    }
  }
);

export default router;
