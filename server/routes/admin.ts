import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db/connection';
import { requireAuth, requireAdmin } from '../middleware/auth';
import PDFDocument from 'pdfkit';

const router = Router();

// All admin routes require auth + admin
router.use(requireAuth, requireAdmin);

// ─── GET /api/admin/stats ─────────────────────────────────────
router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [[totalUsers]] = await Promise.all([
      query<any[]>('SELECT COUNT(*) as count FROM users'),
    ]);
    const [[eliteMembers]] = await Promise.all([
      query<any[]>('SELECT COUNT(*) as count FROM users WHERE membership_tier = "Elite"'),
    ]);
    const [[pendingTrips]] = await Promise.all([
      query<any[]>('SELECT COUNT(*) as count FROM trip_requests WHERE status = "pending"'),
    ]);
    const [[pendingStays]] = await Promise.all([
      query<any[]>('SELECT COUNT(*) as count FROM stay_requests WHERE status = "pending"'),
    ]);
    const [[pendingConcierge]] = await Promise.all([
      query<any[]>('SELECT COUNT(*) as count FROM concierge_requests WHERE status = "open"'),
    ]);
    const [[totalRevenue]] = await Promise.all([
      query<any[]>('SELECT COALESCE(SUM(amount), 0) as total FROM purchases WHERE status = "completed"'),
    ]);
    const [[monthlyRevenue]] = await Promise.all([
      query<any[]>('SELECT COALESCE(SUM(amount), 0) as total FROM purchases WHERE status = "completed" AND MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())'),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers: totalUsers.count,
        eliteMembers: eliteMembers.count,
        pendingTripRequests: pendingTrips.count,
        pendingStayRequests: pendingStays.count,
        pendingConciergeRequests: pendingConcierge.count,
        totalRevenue: parseFloat(totalRevenue.total),
        monthlyRevenue: parseFloat(monthlyRevenue.total),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// ─── GET /api/admin/users ─────────────────────────────────────
router.get('/users', async (req: Request, res: Response): Promise<void> => {
  const { search } = req.query;
  try {
    let sql = `SELECT id, email, first_name, last_name, membership_tier, is_admin,
               has_selected_membership, nude_friendly, dietary_restrictions,
               travel_interests, profile_photo_url, created_at FROM users`;
    const params: string[] = [];
    if (search) {
      sql += ' WHERE email LIKE ? OR first_name LIKE ? OR last_name LIKE ?';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    sql += ' ORDER BY created_at DESC';
    const users = await query<any[]>(sql, params);
    const parsed = users.map(u => ({
      ...u,
      isAdmin: Boolean(u.is_admin),
      hasSelectedMembership: Boolean(u.has_selected_membership),
      nudeFriendly: Boolean(u.nude_friendly),
      dietaryRestrictions: JSON.parse(u.dietary_restrictions || '[]'),
      travelInterests: JSON.parse(u.travel_interests || '[]'),
    }));
    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// ─── GET /api/admin/trip-requests ────────────────────────────
router.get('/trip-requests', async (req: Request, res: Response): Promise<void> => {
  const { status } = req.query;
  try {
    let sql = `SELECT tr.*, u.first_name, u.last_name, u.email
               FROM trip_requests tr JOIN users u ON tr.user_id = u.id`;
    const params: string[] = [];
    if (status) { sql += ' WHERE tr.status = ?'; params.push(status as string); }
    sql += ' ORDER BY tr.created_at DESC';
    const requests = await query<any[]>(sql, params);
    const parsed = requests.map(r => ({ ...r, interests: JSON.parse(r.interests || '[]') }));
    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch trip requests' });
  }
});

// ─── PATCH /api/admin/trip-requests/:id ──────────────────────
router.patch('/trip-requests/:id', async (req: Request, res: Response): Promise<void> => {
  const { status, adminNotes } = req.body;
  try {
    await query(
      'UPDATE trip_requests SET status = COALESCE(?, status), admin_notes = COALESCE(?, admin_notes), updated_at = NOW() WHERE id = ?',
      [status ?? null, adminNotes ?? null, req.params.id]
    );
    res.json({ success: true, message: 'Trip request updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to update trip request' });
  }
});

// ─── GET /api/admin/concierge-requests ───────────────────────
router.get('/concierge-requests', async (_req: Request, res: Response): Promise<void> => {
  try {
    const requests = await query<any[]>(
      `SELECT cr.*, u.first_name, u.last_name, u.email
       FROM concierge_requests cr JOIN users u ON cr.user_id = u.id
       ORDER BY FIELD(cr.urgency, 'emergency', 'high', 'medium', 'low'), cr.created_at DESC`
    );
    res.json({ success: true, data: requests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch concierge requests' });
  }
});

// ─── PATCH /api/admin/concierge-requests/:id ─────────────────
router.patch('/concierge-requests/:id', async (req: Request, res: Response): Promise<void> => {
  const { status, adminNotes } = req.body;
  try {
    await query(
      'UPDATE concierge_requests SET status = COALESCE(?, status), admin_notes = COALESCE(?, admin_notes), updated_at = NOW() WHERE id = ?',
      [status ?? null, adminNotes ?? null, req.params.id]
    );
    res.json({ success: true, message: 'Concierge request updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to update concierge request' });
  }
});

// ─── GET /api/admin/bookings ──────────────────────────────────
router.get('/bookings', async (_req: Request, res: Response): Promise<void> => {
  try {
    const bookings = await query<any[]>(
      `SELECT b.*, u.first_name, u.last_name, u.email,
              ct.title as trip_title, ct.destination, ct.start_date, ct.end_date
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN curated_trips ct ON b.curated_trip_id = ct.id
       ORDER BY b.created_at DESC`
    );
    res.json({ success: true, data: bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch bookings' });
  }
});

// ─── PATCH /api/admin/bookings/:id ───────────────────────────
router.patch('/bookings/:id', async (req: Request, res: Response): Promise<void> => {
  const { status, adminNotes } = req.body;
  try {
    await query(
      'UPDATE bookings SET status = COALESCE(?, status), admin_notes = COALESCE(?, admin_notes), updated_at = NOW() WHERE id = ?',
      [status ?? null, adminNotes ?? null, req.params.id]
    );
    res.json({ success: true, message: 'Booking updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to update booking' });
  }
});

// ─── GET /api/admin/stay-requests ────────────────────────────
router.get('/stay-requests', async (_req: Request, res: Response): Promise<void> => {
  try {
    const requests = await query<any[]>(
      `SELECT sr.*, u.first_name, u.last_name, u.email,
              ph.name as home_name, ph.location, ph.nightly_rate
       FROM stay_requests sr
       JOIN users u ON sr.user_id = u.id
       JOIN partner_homes ph ON sr.partner_home_id = ph.id
       ORDER BY sr.created_at DESC`
    );
    res.json({ success: true, data: requests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch stay requests' });
  }
});

// ─── PATCH /api/admin/stay-requests/:id ──────────────────────
router.patch('/stay-requests/:id', async (req: Request, res: Response): Promise<void> => {
  const { status, adminNotes } = req.body;
  try {
    await query(
      'UPDATE stay_requests SET status = COALESCE(?, status), admin_notes = COALESCE(?, admin_notes), updated_at = NOW() WHERE id = ?',
      [status ?? null, adminNotes ?? null, req.params.id]
    );
    res.json({ success: true, message: 'Stay request updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to update stay request' });
  }
});

// ─── GET /api/admin/purchases ─────────────────────────────────
router.get('/purchases', async (req: Request, res: Response): Promise<void> => {
  const { type } = req.query;
  try {
    let sql = `SELECT p.*, u.first_name, u.last_name, u.email
               FROM purchases p JOIN users u ON p.user_id = u.id`;
    const params: string[] = [];
    if (type) { sql += ' WHERE p.type = ?'; params.push(type as string); }
    sql += ' ORDER BY p.created_at DESC';
    const purchases = await query<any[]>(sql, params);
    res.json({ success: true, data: purchases });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch purchases' });
  }
});

// ─── GET /api/admin/export-pdf ────────────────────────────────
router.get('/export-pdf', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [trips, homes, perks, products, beaches] = await Promise.all([
      query<any[]>('SELECT * FROM curated_trips WHERE is_active = 1 ORDER BY is_past, start_date'),
      query<any[]>('SELECT * FROM partner_homes WHERE is_active = 1'),
      query<any[]>('SELECT * FROM partner_perks WHERE is_active = 1'),
      query<any[]>('SELECT * FROM shop_products WHERE is_active = 1'),
      query<any[]>('SELECT * FROM beach_locations ORDER BY name'),
    ]);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=BASK-Data-Export.pdf');
    doc.pipe(res);

    // Title
    doc.fontSize(28).fillColor('#b45309').text('BASK', { align: 'center' });
    doc.fontSize(12).fillColor('#666').text('High-Touch Travel & Concierge — Data Export', { align: 'center' });
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    // Curated Trips
    doc.fontSize(18).fillColor('#b45309').text('Curated Trips');
    doc.moveDown(0.5);
    const upcoming = trips.filter(t => !t.is_past);
    const past = trips.filter(t => t.is_past);

    doc.fontSize(13).fillColor('#333').text('Upcoming Experiences');
    upcoming.forEach(t => {
      doc.fontSize(11).fillColor('#111').text(`${t.title} — ${t.destination}, ${t.country}`);
      doc.fontSize(9).fillColor('#555').text(`${t.start_date} to ${t.end_date} · $${t.price_per_person}/person · ${t.description}`);
      doc.moveDown(0.3);
    });

    doc.moveDown(0.5).fontSize(13).fillColor('#333').text('Past Experiences');
    past.forEach(t => {
      doc.fontSize(11).fillColor('#111').text(`${t.title} — ${t.destination}`);
      doc.fontSize(9).fillColor('#555').text(`${t.start_date} to ${t.end_date} · Itinerary: $50`);
      doc.moveDown(0.3);
    });

    doc.addPage();

    // Partner Homes
    doc.fontSize(18).fillColor('#b45309').text('Partner Homes');
    doc.moveDown(0.5);
    homes.forEach(h => {
      doc.fontSize(11).fillColor('#111').text(`${h.name} — ${h.location}, ${h.country}`);
      doc.fontSize(9).fillColor('#555').text(`$${h.nightly_rate}/night · ${h.bedrooms}BR/${h.bathrooms}BA · Max: ${h.max_guests} guests${h.is_elite_only ? ' · ELITE ONLY' : ''}`);
      doc.moveDown(0.3);
    });

    doc.addPage();

    // Partner Perks
    doc.fontSize(18).fillColor('#b45309').text('Partner Perks (Elite Only)');
    doc.moveDown(0.5);
    perks.forEach(p => {
      doc.fontSize(11).fillColor('#111').text(`${p.partner_name} — ${p.category}`);
      doc.fontSize(9).fillColor('#555').text(p.discount_details);
      doc.moveDown(0.3);
    });

    doc.moveDown();

    // Shop Products
    doc.fontSize(18).fillColor('#b45309').text('Gift Shop Products');
    doc.moveDown(0.5);
    ['merchandise', 'pearls'].forEach(cat => {
      const catProducts = products.filter(p => p.category === cat);
      doc.fontSize(13).fillColor('#333').text(cat.charAt(0).toUpperCase() + cat.slice(1));
      catProducts.forEach(p => {
        doc.fontSize(10).fillColor('#111').text(`${p.name} — $${p.price}${p.is_elite_only ? ' (Elite Only)' : ''}`);
      });
      doc.moveDown(0.5);
    });

    doc.addPage();

    // Beach Locations
    doc.fontSize(18).fillColor('#b45309').text('Beach & Destination Map — 24 Locations');
    doc.moveDown(0.5);
    const statusLabels: Record<string, string> = {
      official_nude: 'Official Nude Beach',
      clothing_optional: 'Clothing Optional',
      gay_beach: 'Gay Beach',
      gay_resort: 'Gay Resort',
      clothed_gay_beach: 'Clothed Gay Beach',
    };
    beaches.forEach(b => {
      doc.fontSize(11).fillColor('#111').text(`${b.name} — ${b.location}, ${b.country}`);
      doc.fontSize(9).fillColor('#555').text(`${statusLabels[b.status] || b.status} · ${b.description}`);
      doc.moveDown(0.3);
    });

    doc.end();
  } catch (err) {
    console.error('PDF export error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate PDF' });
  }
});

export default router;
