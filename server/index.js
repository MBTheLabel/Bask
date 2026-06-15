const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const PDFDocument = require('pdfkit');
const stripe = require('stripe');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// ─── Database ─────────────────────────────────────────────────
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: '+00:00',
});

async function query(sql, params) {
  const [rows] = await pool.execute(sql, params || []);
  return rows;
}

async function queryOne(sql, params) {
  const rows = await query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// ─── Auth helpers ─────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'bask-secret-key-2026';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  try {
    req.user = jwt.verify(auth.substring(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

function requireElite(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
  if (req.user.membershipTier !== 'Elite' && !req.user.isAdmin) {
    return res.status(403).json({ success: false, error: 'Elite membership required', upgradeRequired: true });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
  if (!req.user.isAdmin) return res.status(403).json({ success: false, error: 'Admin access required' });
  next();
}

// ─── Middleware ────────────────────────────────────────────────
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

// ─── Health ────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'BASK API' }));

// ─── AUTH ROUTES ──────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ success: false, error: 'All fields required' });
    }
    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ success: false, error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      'INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)',
      [email, passwordHash, firstName, lastName]
    );
    const userId = result.insertId;
    const token = generateToken({ userId, email, isAdmin: false, membershipTier: 'Standard' });
    res.status(201).json({ success: true, data: { token, user: { id: userId, email, firstName, lastName, membershipTier: 'Standard', isAdmin: false, hasSelectedMembership: false } } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ success: false, error: 'Invalid email or password' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ success: false, error: 'Invalid email or password' });
    const token = generateToken({ userId: user.id, email: user.email, isAdmin: Boolean(user.is_admin), membershipTier: user.membership_tier });
    res.json({ success: true, data: { token, user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, membershipTier: user.membership_tier, isAdmin: Boolean(user.is_admin), hasSelectedMembership: Boolean(user.has_selected_membership) } } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.user.userId]);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, membershipTier: user.membership_tier, isAdmin: Boolean(user.is_admin), hasSelectedMembership: Boolean(user.has_selected_membership), nudeFriendly: Boolean(user.nude_friendly), dietaryRestrictions: JSON.parse(user.dietary_restrictions || '[]'), travelInterests: JSON.parse(user.travel_interests || '[]'), profilePhotoUrl: user.profile_photo_url, createdAt: user.created_at } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

app.patch('/api/auth/profile', requireAuth, async (req, res) => {
  try {
    const { firstName, lastName, nudeFriendly, dietaryRestrictions, travelInterests, hasSelectedMembership } = req.body;
    await query(`UPDATE users SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name), nude_friendly = COALESCE(?, nude_friendly), dietary_restrictions = COALESCE(?, dietary_restrictions), travel_interests = COALESCE(?, travel_interests), has_selected_membership = COALESCE(?, has_selected_membership) WHERE id = ?`,
      [firstName || null, lastName || null, nudeFriendly !== undefined ? (nudeFriendly ? 1 : 0) : null, dietaryRestrictions ? JSON.stringify(dietaryRestrictions) : null, travelInterests ? JSON.stringify(travelInterests) : null, hasSelectedMembership !== undefined ? (hasSelectedMembership ? 1 : 0) : null, req.user.userId]);
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

app.post('/api/auth/select-membership', requireAuth, async (req, res) => {
  try {
    const { tier } = req.body;
    if (!['Standard', 'Elite'].includes(tier)) return res.status(400).json({ success: false, error: 'Invalid tier' });
    await query('UPDATE users SET membership_tier = ?, has_selected_membership = 1 WHERE id = ?', [tier, req.user.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update membership' });
  }
});

// ─── TRIPS ────────────────────────────────────────────────────
app.get('/api/trips', async (req, res) => {
  try {
    const trips = await query('SELECT * FROM curated_trips WHERE is_active = 1 ORDER BY is_past ASC, start_date ASC');
    res.json({ success: true, data: trips.map(t => ({ ...t, tags: JSON.parse(t.tags || '[]'), isPast: Boolean(t.is_past), isActive: Boolean(t.is_active), pricePerPerson: parseFloat(t.price_per_person), maxGuests: t.max_guests, startDate: t.start_date, endDate: t.end_date })) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch trips' });
  }
});

app.get('/api/trips/:id', async (req, res) => {
  try {
    const trip = await queryOne('SELECT * FROM curated_trips WHERE id = ? AND is_active = 1', [req.params.id]);
    if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });
    res.json({ success: true, data: { ...trip, tags: JSON.parse(trip.tags || '[]'), isPast: Boolean(trip.is_past), pricePerPerson: parseFloat(trip.price_per_person) } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch trip' });
  }
});

app.post('/api/trips/:id/book', requireAuth, async (req, res) => {
  try {
    const { guestCount = 1, specialRequests } = req.body;
    const trip = await queryOne('SELECT * FROM curated_trips WHERE id = ? AND is_active = 1 AND is_past = 0', [req.params.id]);
    if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });
    const existing = await queryOne('SELECT id FROM bookings WHERE user_id = ? AND curated_trip_id = ?', [req.user.userId, req.params.id]);
    if (existing) return res.status(409).json({ success: false, error: 'Already requested to join this trip' });
    const result = await query('INSERT INTO bookings (user_id, curated_trip_id, guest_count, special_requests) VALUES (?, ?, ?, ?)', [req.user.userId, req.params.id, guestCount, specialRequests || null]);
    res.status(201).json({ success: true, data: { bookingId: result.insertId, status: 'pending' } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create booking' });
  }
});

app.get('/api/trips/bookings/mine', requireAuth, async (req, res) => {
  try {
    const bookings = await query(`SELECT b.*, ct.title as trip_title, ct.destination, ct.start_date, ct.end_date, ct.price_per_person FROM bookings b JOIN curated_trips ct ON b.curated_trip_id = ct.id WHERE b.user_id = ? ORDER BY b.created_at DESC`, [req.user.userId]);
    res.json({ success: true, data: bookings });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch bookings' });
  }
});

// ─── TRIP REQUESTS ────────────────────────────────────────────
app.post('/api/trip-requests', requireAuth, async (req, res) => {
  try {
    const { destination, departureDatePreferred, returnDatePreferred, budgetRange, groupType, occasion, travelStyle, interests, additionalNotes } = req.body;
    if (!destination || !budgetRange || !groupType || !occasion || !travelStyle) return res.status(400).json({ success: false, error: 'Missing required fields' });
    const result = await query(`INSERT INTO trip_requests (user_id, destination, departure_date_preferred, return_date_preferred, budget_range, group_type, occasion, travel_style, interests, additional_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.userId, destination, departureDatePreferred || null, returnDatePreferred || null, budgetRange, groupType, occasion, travelStyle, JSON.stringify(interests || []), additionalNotes || null]);
    res.status(201).json({ success: true, data: { id: result.insertId, status: 'pending' } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create trip request' });
  }
});

app.get('/api/trip-requests/mine', requireAuth, async (req, res) => {
  try {
    const requests = await query('SELECT * FROM trip_requests WHERE user_id = ? ORDER BY created_at DESC', [req.user.userId]);
    res.json({ success: true, data: requests.map(r => ({ ...r, interests: JSON.parse(r.interests || '[]') })) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch trip requests' });
  }
});

app.patch('/api/trip-requests/:id', requireAuth, async (req, res) => {
  try {
    const { status, additionalNotes } = req.body;
    const existing = await queryOne('SELECT * FROM trip_requests WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    if (!existing) return res.status(404).json({ success: false, error: 'Trip request not found' });
    const allowedStatus = req.user.isAdmin ? status : (status === 'cancelled' ? 'cancelled' : existing.status);
    await query('UPDATE trip_requests SET status = COALESCE(?, status), additional_notes = COALESCE(?, additional_notes), updated_at = NOW() WHERE id = ? AND user_id = ?',
      [allowedStatus || null, additionalNotes || null, req.params.id, req.user.userId]);
    res.json({ success: true, message: 'Updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update' });
  }
});

// ─── CONCIERGE ────────────────────────────────────────────────
app.post('/api/concierge', requireAuth, async (req, res) => {
  try {
    const { category, urgency, description } = req.body;
    if (!category || !urgency || !description) return res.status(400).json({ success: false, error: 'All fields required' });
    const result = await query('INSERT INTO concierge_requests (user_id, category, urgency, description) VALUES (?, ?, ?, ?)', [req.user.userId, category, urgency, description]);
    res.status(201).json({ success: true, data: { id: result.insertId, status: 'open' } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to submit request' });
  }
});

app.get('/api/concierge/mine', requireAuth, async (req, res) => {
  try {
    const requests = await query('SELECT * FROM concierge_requests WHERE user_id = ? ORDER BY created_at DESC', [req.user.userId]);
    res.json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch requests' });
  }
});

// ─── PARTNER HOMES ────────────────────────────────────────────
app.get('/api/partner-homes', requireAuth, async (req, res) => {
  try {
    const homes = await query('SELECT * FROM partner_homes WHERE is_active = 1 ORDER BY name ASC');
    const isElite = req.user.membershipTier === 'Elite' || req.user.isAdmin;
    res.json({ success: true, data: homes.map(h => ({ ...h, amenities: JSON.parse(h.amenities || '[]'), vibeTags: JSON.parse(h.vibe_tags || '[]'), images: JSON.parse(h.images || '[]'), clothingOptional: Boolean(h.clothing_optional), lgbtqFriendly: Boolean(h.lgbtq_friendly), isEliteOnly: Boolean(h.is_elite_only), nightlyRate: parseFloat(h.nightly_rate), locked: Boolean(h.is_elite_only) && !isElite })) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch homes' });
  }
});

app.get('/api/partner-homes/stay-requests/mine', requireAuth, async (req, res) => {
  try {
    const requests = await query(`SELECT sr.*, ph.name as home_name, ph.location, ph.nightly_rate FROM stay_requests sr JOIN partner_homes ph ON sr.partner_home_id = ph.id WHERE sr.user_id = ? ORDER BY sr.created_at DESC`, [req.user.userId]);
    res.json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch stay requests' });
  }
});

app.get('/api/partner-homes/:id', requireAuth, async (req, res) => {
  try {
    const home = await queryOne('SELECT * FROM partner_homes WHERE id = ? AND is_active = 1', [req.params.id]);
    if (!home) return res.status(404).json({ success: false, error: 'Property not found' });
    const isElite = req.user.membershipTier === 'Elite' || req.user.isAdmin;
    if (home.is_elite_only && !isElite) return res.status(403).json({ success: false, error: 'Elite membership required', upgradeRequired: true });
    res.json({ success: true, data: { ...home, amenities: JSON.parse(home.amenities || '[]'), vibeTags: JSON.parse(home.vibe_tags || '[]'), images: JSON.parse(home.images || '[]'), clothingOptional: Boolean(home.clothing_optional), lgbtqFriendly: Boolean(home.lgbtq_friendly), isEliteOnly: Boolean(home.is_elite_only), nightlyRate: parseFloat(home.nightly_rate) } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch property' });
  }
});

app.post('/api/partner-homes/:id/stay-request', requireAuth, async (req, res) => {
  try {
    const { checkInDate, checkOutDate, guestCount, message } = req.body;
    if (!checkInDate || !checkOutDate || !guestCount) return res.status(400).json({ success: false, error: 'Missing required fields' });
    const home = await queryOne('SELECT * FROM partner_homes WHERE id = ? AND is_active = 1', [req.params.id]);
    if (!home) return res.status(404).json({ success: false, error: 'Property not found' });
    const isElite = req.user.membershipTier === 'Elite' || req.user.isAdmin;
    if (home.is_elite_only && !isElite) return res.status(403).json({ success: false, error: 'Elite membership required', upgradeRequired: true });
    const result = await query('INSERT INTO stay_requests (user_id, partner_home_id, check_in_date, check_out_date, guest_count, message) VALUES (?, ?, ?, ?, ?, ?)', [req.user.userId, req.params.id, checkInDate, checkOutDate, guestCount, message || null]);
    res.status(201).json({ success: true, data: { id: result.insertId, status: 'pending' } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to submit stay request' });
  }
});

// ─── PARTNER PERKS ────────────────────────────────────────────
app.get('/api/partner-perks', requireAuth, requireElite, async (req, res) => {
  try {
    const perks = await query('SELECT * FROM partner_perks WHERE is_active = 1 ORDER BY category, partner_name');
    res.json({ success: true, data: perks });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch perks' });
  }
});

// ─── BEACH MAP ────────────────────────────────────────────────
app.get('/api/beach-map', requireAuth, requireElite, async (req, res) => {
  try {
    const beaches = await query('SELECT * FROM beach_locations ORDER BY name ASC');
    res.json({ success: true, data: beaches.map(b => ({ ...b, tags: JSON.parse(b.tags || '[]'), latitude: parseFloat(b.latitude), longitude: parseFloat(b.longitude) })) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch beaches' });
  }
});

// ─── SHOP ─────────────────────────────────────────────────────
app.get('/api/shop/products', requireAuth, async (req, res) => {
  try {
    const isElite = req.user.membershipTier === 'Elite' || req.user.isAdmin;
    const products = await query('SELECT * FROM shop_products WHERE is_active = 1 ORDER BY category, name');
    res.json({ success: true, data: products.map(p => ({ ...p, price: parseFloat(p.price), isEliteOnly: Boolean(p.is_elite_only), locked: Boolean(p.is_elite_only) && !isElite })) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

app.get('/api/shop/purchases/mine', requireAuth, async (req, res) => {
  try {
    const purchases = await query('SELECT * FROM purchases WHERE user_id = ? ORDER BY created_at DESC', [req.user.userId]);
    res.json({ success: true, data: purchases });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch purchases' });
  }
});

// ─── STRIPE ───────────────────────────────────────────────────
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe not configured');
  return stripe(process.env.STRIPE_SECRET_KEY);
}

const CLIENT_URL = process.env.CLIENT_URL || 'https://bask-production.up.railway.app';

app.post('/api/stripe/create-elite-session', requireAuth, async (req, res) => {
  try {
    const s = getStripe();
    const user = await queryOne('SELECT email, stripe_customer_id FROM users WHERE id = ?', [req.user.userId]);
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await s.customers.create({ email: user.email });
      customerId = customer.id;
      await query('UPDATE users SET stripe_customer_id = ? WHERE id = ?', [customerId, req.user.userId]);
    }
    const session = await s.checkout.sessions.create({ customer: customerId, mode: 'subscription', payment_method_types: ['card'], line_items: [{ price: process.env.STRIPE_ELITE_PRICE_ID || 'price_1T2nJRIizMvHewJuz4kwtFfx', quantity: 1 }], success_url: `${CLIENT_URL}/membership?success=true`, cancel_url: `${CLIENT_URL}/membership`, metadata: { userId: String(req.user.userId) } });
    res.json({ success: true, data: { url: session.url } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to create checkout session' });
  }
});

app.post('/api/stripe/create-shop-session', requireAuth, async (req, res) => {
  try {
    const s = getStripe();
    const product = await queryOne('SELECT * FROM shop_products WHERE id = ? AND is_active = 1', [req.body.productId]);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    if (product.is_elite_only && req.user.membershipTier !== 'Elite' && !req.user.isAdmin) return res.status(403).json({ success: false, error: 'Elite membership required', upgradeRequired: true });
    const session = await s.checkout.sessions.create({ mode: 'payment', payment_method_types: ['card'], line_items: [{ price_data: { currency: 'usd', product_data: { name: product.name }, unit_amount: Math.round(parseFloat(product.price) * 100) }, quantity: 1 }], success_url: `${CLIENT_URL}/gift-shop?success=true`, cancel_url: `${CLIENT_URL}/gift-shop`, metadata: { userId: String(req.user.userId), productId: String(req.body.productId), type: 'shop' } });
    res.json({ success: true, data: { url: session.url } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create session' });
  }
});

app.post('/api/stripe/create-itinerary-session', requireAuth, async (req, res) => {
  try {
    const s = getStripe();
    const trip = await queryOne('SELECT * FROM curated_trips WHERE id = ? AND is_past = 1', [req.body.tripId]);
    if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });
    const session = await s.checkout.sessions.create({ mode: 'payment', payment_method_types: ['card'], line_items: [{ price_data: { currency: 'usd', product_data: { name: `${trip.title} — Itinerary` }, unit_amount: 5000 }, quantity: 1 }], success_url: `${CLIENT_URL}/curated-trips/${req.body.tripId}?itinerary=unlocked`, cancel_url: `${CLIENT_URL}/curated-trips/${req.body.tripId}`, metadata: { userId: String(req.user.userId), tripId: String(req.body.tripId), type: 'itinerary' } });
    res.json({ success: true, data: { url: session.url } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create session' });
  }
});

app.get('/api/stripe/portal', requireAuth, async (req, res) => {
  try {
    const s = getStripe();
    const user = await queryOne('SELECT stripe_customer_id FROM users WHERE id = ?', [req.user.userId]);
    if (!user?.stripe_customer_id) return res.status(400).json({ success: false, error: 'No Stripe customer found' });
    const session = await s.billingPortal.sessions.create({ customer: user.stripe_customer_id, return_url: `${CLIENT_URL}/membership` });
    res.json({ success: true, data: { url: session.url } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create portal session' });
  }
});

app.post('/api/stripe/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    const s = getStripe();
    event = s.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch {
    return res.status(400).send('Webhook Error');
  }
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      if (session.mode === 'subscription' && userId) {
        await query('UPDATE users SET membership_tier = ?, has_selected_membership = 1 WHERE id = ?', ['Elite', userId]);
        await query('INSERT INTO purchases (user_id, type, item_name, amount, stripe_session_id, status) VALUES (?, ?, ?, ?, ?, ?)', [userId, 'subscription', 'BASK Elite Access', 120.00, session.id, 'completed']);
      }
    }
  } catch (err) {
    console.error('Webhook error:', err);
  }
  res.json({ received: true });
});

// ─── ADMIN ────────────────────────────────────────────────────
app.get('/api/admin/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [[total]] = [await query('SELECT COUNT(*) as count FROM users')];
    const [[elite]] = [await query('SELECT COUNT(*) as count FROM users WHERE membership_tier = "Elite"')];
    const [[pendingTrips]] = [await query('SELECT COUNT(*) as count FROM trip_requests WHERE status = "pending"')];
    const [[pendingStays]] = [await query('SELECT COUNT(*) as count FROM stay_requests WHERE status = "pending"')];
    const [[pendingConcierge]] = [await query('SELECT COUNT(*) as count FROM concierge_requests WHERE status = "open"')];
    const [[revenue]] = [await query('SELECT COALESCE(SUM(amount), 0) as total FROM purchases WHERE status = "completed"')];
    res.json({ success: true, data: { totalUsers: total.count, eliteMembers: elite.count, pendingTripRequests: pendingTrips.count, pendingStayRequests: pendingStays.count, pendingConciergeRequests: pendingConcierge.count, totalRevenue: parseFloat(revenue.total), monthlyRevenue: 0 } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT id, email, first_name, last_name, membership_tier, is_admin, has_selected_membership, created_at FROM users';
    const params = [];
    if (search) { sql += ' WHERE email LIKE ? OR first_name LIKE ? OR last_name LIKE ?'; const s = `%${search}%`; params.push(s, s, s); }
    sql += ' ORDER BY created_at DESC';
    const users = await query(sql, params);
    res.json({ success: true, data: users.map(u => ({ ...u, isAdmin: Boolean(u.is_admin), hasSelectedMembership: Boolean(u.has_selected_membership) })) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

app.get('/api/admin/trip-requests', requireAuth, requireAdmin, async (req, res) => {
  try {
    const requests = await query(`SELECT tr.*, u.first_name, u.last_name, u.email FROM trip_requests tr JOIN users u ON tr.user_id = u.id ORDER BY tr.created_at DESC`);
    res.json({ success: true, data: requests.map(r => ({ ...r, interests: JSON.parse(r.interests || '[]') })) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch trip requests' });
  }
});

app.patch('/api/admin/trip-requests/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    await query('UPDATE trip_requests SET status = COALESCE(?, status), admin_notes = COALESCE(?, admin_notes), updated_at = NOW() WHERE id = ?', [status || null, adminNotes || null, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update' });
  }
});

app.get('/api/admin/concierge-requests', requireAuth, requireAdmin, async (req, res) => {
  try {
    const requests = await query(`SELECT cr.*, u.first_name, u.last_name, u.email FROM concierge_requests cr JOIN users u ON cr.user_id = u.id ORDER BY FIELD(cr.urgency, 'emergency', 'high', 'medium', 'low'), cr.created_at DESC`);
    res.json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch concierge requests' });
  }
});

app.patch('/api/admin/concierge-requests/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    await query('UPDATE concierge_requests SET status = COALESCE(?, status), admin_notes = COALESCE(?, admin_notes), updated_at = NOW() WHERE id = ?', [status || null, adminNotes || null, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update' });
  }
});

app.get('/api/admin/bookings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const bookings = await query(`SELECT b.*, u.first_name, u.last_name, u.email, ct.title as trip_title, ct.destination FROM bookings b JOIN users u ON b.user_id = u.id JOIN curated_trips ct ON b.curated_trip_id = ct.id ORDER BY b.created_at DESC`);
    res.json({ success: true, data: bookings });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch bookings' });
  }
});

app.patch('/api/admin/bookings/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    await query('UPDATE bookings SET status = COALESCE(?, status), admin_notes = COALESCE(?, admin_notes), updated_at = NOW() WHERE id = ?', [status || null, adminNotes || null, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update' });
  }
});

app.get('/api/admin/stay-requests', requireAuth, requireAdmin, async (req, res) => {
  try {
    const requests = await query(`SELECT sr.*, u.first_name, u.last_name, u.email, ph.name as home_name, ph.location FROM stay_requests sr JOIN users u ON sr.user_id = u.id JOIN partner_homes ph ON sr.partner_home_id = ph.id ORDER BY sr.created_at DESC`);
    res.json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch stay requests' });
  }
});

app.patch('/api/admin/stay-requests/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    await query('UPDATE stay_requests SET status = COALESCE(?, status), admin_notes = COALESCE(?, admin_notes), updated_at = NOW() WHERE id = ?', [status || null, adminNotes || null, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update' });
  }
});

app.get('/api/admin/purchases', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { type } = req.query;
    let sql = `SELECT p.*, u.first_name, u.last_name, u.email FROM purchases p JOIN users u ON p.user_id = u.id`;
    const params = [];
    if (type) { sql += ' WHERE p.type = ?'; params.push(type); }
    sql += ' ORDER BY p.created_at DESC';
    res.json({ success: true, data: await query(sql, params) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch purchases' });
  }
});

app.get('/api/admin/export-pdf', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [trips, beaches] = await Promise.all([
      query('SELECT * FROM curated_trips WHERE is_active = 1 ORDER BY is_past, start_date'),
      query('SELECT * FROM beach_locations ORDER BY name'),
    ]);
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=BASK-Export.pdf');
    doc.pipe(res);
    doc.fontSize(28).fillColor('#b45309').text('BASK', { align: 'center' });
    doc.fontSize(12).fillColor('#666').text('Data Export — ' + new Date().toLocaleDateString(), { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(18).fillColor('#b45309').text('Curated Trips');
    doc.moveDown();
    trips.forEach(t => {
      doc.fontSize(11).fillColor('#111').text(`${t.title} — ${t.destination}`);
      doc.fontSize(9).fillColor('#555').text(t.description);
      doc.moveDown(0.3);
    });
    doc.addPage();
    doc.fontSize(18).fillColor('#b45309').text('Beach Locations');
    doc.moveDown();
    beaches.forEach(b => {
      doc.fontSize(11).fillColor('#111').text(`${b.name} — ${b.location}, ${b.country}`);
      doc.fontSize(9).fillColor('#555').text(b.status);
      doc.moveDown(0.3);
    });
    doc.end();
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to generate PDF' });
  }
});

// ─── Serve React frontend ──────────────────────────────────────
const clientBuild = path.join(__dirname, 'client/dist');
app.use(express.static(clientBuild));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuild, 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────
async function start() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL connected');
    conn.release();
    app.listen(PORT, () => console.log(`🌴 BASK running on port ${PORT}`));
  } catch (err) {
    console.error('❌ Failed to start:', err);
    process.exit(1);
  }
}

start();
