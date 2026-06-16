import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db/connection';
import { requireAuth, requireElite } from '../middleware/auth';

const router = Router();

// ============================================================
// CURATED TRIPS
// ============================================================

// GET /api/trips — public list
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const trips = await query<any[]>(
      'SELECT * FROM curated_trips WHERE is_active = 1 ORDER BY is_past ASC, start_date ASC'
    );
    const parsed = trips.map(t => ({
      ...t,
      tags: JSON.parse(t.tags || '[]'),
      isPast: Boolean(t.is_past),
      isActive: Boolean(t.is_active),
      pricePerPerson: parseFloat(t.price_per_person),
      maxGuests: t.max_guests,
      startDate: t.start_date,
      endDate: t.end_date,
      imageUrl: t.image_url,
      fullItinerary: t.full_itinerary,
    }));
    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch trips' });
  }
});

// GET /api/trips/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const trip = await queryOne<any>('SELECT * FROM curated_trips WHERE id = ? AND is_active = 1', [req.params.id]);
    if (!trip) { res.status(404).json({ success: false, error: 'Trip not found' }); return; }
    res.json({
      success: true,
      data: {
        ...trip,
        tags: JSON.parse(trip.tags || '[]'),
        isPast: Boolean(trip.is_past),
        isActive: Boolean(trip.is_active),
        pricePerPerson: parseFloat(trip.price_per_person),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch trip' });
  }
});

// ============================================================
// BOOKINGS (Request to Join curated trip)
// ============================================================

// POST /api/trips/:id/book
router.post('/:id/book', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { guestCount = 1, specialRequests } = req.body;
  const tripId = parseInt(req.params.id);
  const userId = req.user!.userId;

  try {
    const trip = await queryOne<any>('SELECT * FROM curated_trips WHERE id = ? AND is_active = 1 AND is_past = 0', [tripId]);
    if (!trip) { res.status(404).json({ success: false, error: 'Trip not found or no longer available' }); return; }

    // Check for existing booking
    const existing = await queryOne<any>('SELECT id FROM bookings WHERE user_id = ? AND curated_trip_id = ?', [userId, tripId]);
    if (existing) { res.status(409).json({ success: false, error: 'You have already requested to join this trip' }); return; }

    const result = await query<any>(
      'INSERT INTO bookings (user_id, curated_trip_id, guest_count, special_requests) VALUES (?, ?, ?, ?)',
      [userId, tripId, guestCount, specialRequests || null]
    );
    res.status(201).json({ success: true, data: { bookingId: (result as any).insertId, status: 'pending' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to create booking' });
  }
});

// GET /api/bookings/mine
router.get('/bookings/mine', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const bookings = await query<any[]>(
      `SELECT b.*, ct.title as trip_title, ct.destination, ct.start_date, ct.end_date, ct.price_per_person, ct.image_url
       FROM bookings b JOIN curated_trips ct ON b.curated_trip_id = ct.id
       WHERE b.user_id = ? ORDER BY b.created_at DESC`,
      [req.user!.userId]
    );
    res.json({ success: true, data: bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch bookings' });
  }
});

export { router as tripsRouter };

// ============================================================
// TRIP REQUESTS (Custom planning)
// ============================================================

const tripRequestsRouter = Router();

// POST /api/trip-requests
tripRequestsRouter.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const {
    destination, departureDatePreferred, returnDatePreferred,
    budgetRange, groupType, occasion, travelStyle, interests, additionalNotes,
  } = req.body;

  if (!destination || !budgetRange || !groupType || !occasion || !travelStyle) {
    res.status(400).json({ success: false, error: 'Missing required fields' });
    return;
  }

  try {
    const result = await query<any>(
      `INSERT INTO trip_requests (user_id, destination, departure_date_preferred, return_date_preferred,
       budget_range, group_type, occasion, travel_style, interests, additional_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user!.userId, destination,
        departureDatePreferred || null, returnDatePreferred || null,
        budgetRange, groupType, occasion, travelStyle,
        JSON.stringify(interests || []), additionalNotes || null,
      ]
    );
    res.status(201).json({ success: true, data: { id: (result as any).insertId, status: 'pending' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to create trip request' });
  }
});

// GET /api/trip-requests/mine
tripRequestsRouter.get('/mine', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const requests = await query<any[]>(
      'SELECT * FROM trip_requests WHERE user_id = ? ORDER BY created_at DESC',
      [req.user!.userId]
    );
    const parsed = requests.map(r => ({
      ...r,
      interests: JSON.parse(r.interests || '[]'),
      status: r.status,
    }));
    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch trip requests' });
  }
});

// PATCH /api/trip-requests/:id
tripRequestsRouter.patch('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { status, destination, budgetRange, groupType, occasion, travelStyle, interests, additionalNotes } = req.body;

  try {
    const existing = await queryOne<any>(
      'SELECT * FROM trip_requests WHERE id = ? AND user_id = ?',
      [req.params.id, req.user!.userId]
    );
    if (!existing) { res.status(404).json({ success: false, error: 'Trip request not found' }); return; }
    if (existing.status === 'booked') { res.status(400).json({ success: false, error: 'Cannot modify a booked trip request' }); return; }

    // Only allow cancel by member; other status changes are admin-only
    const allowedStatus = req.user!.isAdmin ? status : (status === 'cancelled' ? 'cancelled' : existing.status);

    await query(
      `UPDATE trip_requests SET
        status = COALESCE(?, status),
        destination = COALESCE(?, destination),
        budget_range = COALESCE(?, budget_range),
        group_type = COALESCE(?, group_type),
        occasion = COALESCE(?, occasion),
        travel_style = COALESCE(?, travel_style),
        interests = COALESCE(?, interests),
        additional_notes = COALESCE(?, additional_notes),
        updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [
        allowedStatus ?? null,
        destination ?? null, budgetRange ?? null, groupType ?? null,
        occasion ?? null, travelStyle ?? null,
        interests ? JSON.stringify(interests) : null,
        additionalNotes ?? null,
        req.params.id, req.user!.userId,
      ]
    );
    res.json({ success: true, message: 'Trip request updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to update trip request' });
  }
});

export { tripRequestsRouter };

// ============================================================
// CONCIERGE REQUESTS
// ============================================================

const conciergeRouter = Router();

const VALID_CATEGORIES = [
  'Flight & Transportation', 'Hotel & Accommodation', 'Restaurant & Dining',
  'Events & Entertainment', 'Health & Wellness', 'Shopping & Gifts',
  'General Travel Advice', 'Other',
];

// POST /api/concierge
conciergeRouter.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { category, urgency, description } = req.body;
  if (!VALID_CATEGORIES.includes(category) || !['low','medium','high','emergency'].includes(urgency) || !description) {
    res.status(400).json({ success: false, error: 'Invalid request fields' });
    return;
  }
  try {
    const result = await query<any>(
      'INSERT INTO concierge_requests (user_id, category, urgency, description) VALUES (?, ?, ?, ?)',
      [req.user!.userId, category, urgency, description]
    );
    res.status(201).json({ success: true, data: { id: (result as any).insertId, status: 'open' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to submit concierge request' });
  }
});

// GET /api/concierge/mine
conciergeRouter.get('/mine', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const requests = await query<any[]>(
      'SELECT * FROM concierge_requests WHERE user_id = ? ORDER BY created_at DESC',
      [req.user!.userId]
    );
    res.json({ success: true, data: requests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch concierge requests' });
  }
});

export { conciergeRouter };

// ============================================================
// PARTNER HOMES
// ============================================================

const partnerHomesRouter = Router();

// GET /api/partner-homes
partnerHomesRouter.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const homes = await query<any[]>('SELECT * FROM partner_homes WHERE is_active = 1 ORDER BY name ASC');
    const isElite = req.user?.membershipTier === 'Elite' || req.user?.isAdmin;
    const parsed = homes.map(h => ({
      ...h,
      amenities: JSON.parse(h.amenities || '[]'),
      vibeTags: JSON.parse(h.vibe_tags || '[]'),
      images: JSON.parse(h.images || '[]'),
      clothingOptional: Boolean(h.clothing_optional),
      lgbtqFriendly: Boolean(h.lgbtq_friendly),
      isEliteOnly: Boolean(h.is_elite_only),
      nightlyRate: parseFloat(h.nightly_rate),
      locked: Boolean(h.is_elite_only) && !isElite,
    }));
    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch partner homes' });
  }
});

// GET /api/partner-homes/:id
partnerHomesRouter.get('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const home = await queryOne<any>('SELECT * FROM partner_homes WHERE id = ? AND is_active = 1', [req.params.id]);
    if (!home) { res.status(404).json({ success: false, error: 'Property not found' }); return; }

    const isElite = req.user?.membershipTier === 'Elite' || req.user?.isAdmin;
    if (home.is_elite_only && !isElite) {
      res.status(403).json({ success: false, error: 'Elite membership required', upgradeRequired: true });
      return;
    }
    res.json({
      success: true,
      data: {
        ...home,
        amenities: JSON.parse(home.amenities || '[]'),
        vibeTags: JSON.parse(home.vibe_tags || '[]'),
        images: JSON.parse(home.images || '[]'),
        clothingOptional: Boolean(home.clothing_optional),
        lgbtqFriendly: Boolean(home.lgbtq_friendly),
        isEliteOnly: Boolean(home.is_elite_only),
        nightlyRate: parseFloat(home.nightly_rate),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch property' });
  }
});

// POST /api/partner-homes/:id/stay-request
partnerHomesRouter.post('/:id/stay-request', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { checkInDate, checkOutDate, guestCount, message } = req.body;
  if (!checkInDate || !checkOutDate || !guestCount) {
    res.status(400).json({ success: false, error: 'Missing required fields' });
    return;
  }
  try {
    const home = await queryOne<any>('SELECT * FROM partner_homes WHERE id = ? AND is_active = 1', [req.params.id]);
    if (!home) { res.status(404).json({ success: false, error: 'Property not found' }); return; }

    const isElite = req.user?.membershipTier === 'Elite' || req.user?.isAdmin;
    if (home.is_elite_only && !isElite) {
      res.status(403).json({ success: false, error: 'Elite membership required', upgradeRequired: true });
      return;
    }

    const result = await query<any>(
      'INSERT INTO stay_requests (user_id, partner_home_id, check_in_date, check_out_date, guest_count, message) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user!.userId, req.params.id, checkInDate, checkOutDate, guestCount, message || null]
    );
    res.status(201).json({ success: true, data: { id: (result as any).insertId, status: 'pending' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to submit stay request' });
  }
});

// GET /api/partner-homes/stay-requests/mine
partnerHomesRouter.get('/stay-requests/mine', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const requests = await query<any[]>(
      `SELECT sr.*, ph.name as home_name, ph.location, ph.nightly_rate, ph.images
       FROM stay_requests sr JOIN partner_homes ph ON sr.partner_home_id = ph.id
       WHERE sr.user_id = ? ORDER BY sr.created_at DESC`,
      [req.user!.userId]
    );
    res.json({ success: true, data: requests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch stay requests' });
  }
});

export { partnerHomesRouter };

// ============================================================
// PARTNER PERKS (Elite only)
// ============================================================

const partnerPerksRouter = Router();

partnerPerksRouter.get('/', requireAuth, requireElite, async (_req: Request, res: Response): Promise<void> => {
  try {
    const perks = await query<any[]>('SELECT * FROM partner_perks WHERE is_active = 1 ORDER BY category, partner_name');
    res.json({ success: true, data: perks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch partner perks' });
  }
});

export { partnerPerksRouter };

// ============================================================
// BEACH MAP (Elite only)
// ============================================================

const beachMapRouter = Router();

beachMapRouter.get('/', requireAuth, requireElite, async (_req: Request, res: Response): Promise<void> => {
  try {
    const beaches = await query<any[]>('SELECT * FROM beach_locations ORDER BY name ASC');
    const parsed = beaches.map(b => ({
      ...b,
      tags: JSON.parse(b.tags || '[]'),
      latitude: parseFloat(b.latitude),
      longitude: parseFloat(b.longitude),
    }));
    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch beach locations' });
  }
});

export { beachMapRouter };

// ============================================================
// SHOP
// ============================================================

const shopRouter = Router();

shopRouter.get('/products', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const isElite = req.user?.membershipTier === 'Elite' || req.user?.isAdmin;
    const products = await query<any[]>('SELECT * FROM shop_products WHERE is_active = 1 ORDER BY category, name');
    const parsed = products.map(p => ({
      ...p,
      price: parseFloat(p.price),
      isEliteOnly: Boolean(p.is_elite_only),
      locked: Boolean(p.is_elite_only) && !isElite,
    }));
    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

shopRouter.get('/purchases/mine', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const purchases = await query<any[]>(
      'SELECT * FROM purchases WHERE user_id = ? ORDER BY created_at DESC',
      [req.user!.userId]
    );
    res.json({ success: true, data: purchases });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch purchases' });
  }
});

export { shopRouter };

// Events
router.get('/events', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.query('SELECT * FROM events WHERE is_active = 1 ORDER BY created_at ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});
