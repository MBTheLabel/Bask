import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { query, queryOne } from '../db/connection';
import { requireAuth } from '../middleware/auth';

const router = Router();

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe secret key not configured');
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
}

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ─── POST /api/stripe/create-elite-session ────────────────────
// Creates a Stripe Checkout Session for Elite annual subscription
router.post('/create-elite-session', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const stripe = getStripe();
    const user = await queryOne<{ email: string; stripe_customer_id: string | null }>(
      'SELECT email, stripe_customer_id FROM users WHERE id = ?',
      [req.user!.userId]
    );
    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }

    // Get or create Stripe customer
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
      await query('UPDATE users SET stripe_customer_id = ? WHERE id = ?', [customerId, req.user!.userId]);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.STRIPE_ELITE_PRICE_ID || 'price_1T2nJRIizMvHewJuz4kwtFfx',
        quantity: 1,
      }],
      success_url: `${CLIENT_URL}/membership?success=true`,
      cancel_url: `${CLIENT_URL}/membership?cancelled=true`,
      metadata: { userId: req.user!.userId.toString() },
    });

    res.json({ success: true, data: { url: session.url, sessionId: session.id } });
  } catch (err) {
    console.error('Stripe elite session error:', err);
    res.status(500).json({ success: false, error: 'Failed to create checkout session' });
  }
});

// ─── POST /api/stripe/create-shop-session ─────────────────────
router.post('/create-shop-session', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { productId } = req.body;
  if (!productId) { res.status(400).json({ success: false, error: 'Product ID required' }); return; }

  try {
    const stripe = getStripe();
    const product = await queryOne<any>('SELECT * FROM shop_products WHERE id = ? AND is_active = 1', [productId]);
    if (!product) { res.status(404).json({ success: false, error: 'Product not found' }); return; }

    // Elite-only check
    if (product.is_elite_only && req.user!.membershipTier !== 'Elite' && !req.user!.isAdmin) {
      res.status(403).json({ success: false, error: 'Elite membership required', upgradeRequired: true });
      return;
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: product.name, description: product.description },
          unit_amount: Math.round(parseFloat(product.price) * 100),
        },
        quantity: 1,
      }],
      success_url: `${CLIENT_URL}/gift-shop?success=true&item=${encodeURIComponent(product.name)}`,
      cancel_url: `${CLIENT_URL}/gift-shop`,
      metadata: { userId: req.user!.userId.toString(), productId: productId.toString(), type: 'shop' },
    });

    res.json({ success: true, data: { url: session.url } });
  } catch (err) {
    console.error('Shop session error:', err);
    res.status(500).json({ success: false, error: 'Failed to create checkout session' });
  }
});

// ─── POST /api/stripe/create-itinerary-session ────────────────
router.post('/create-itinerary-session', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { tripId } = req.body;
  if (!tripId) { res.status(400).json({ success: false, error: 'Trip ID required' }); return; }

  try {
    const stripe = getStripe();
    const trip = await queryOne<any>('SELECT * FROM curated_trips WHERE id = ? AND is_past = 1', [tripId]);
    if (!trip) { res.status(404).json({ success: false, error: 'Trip itinerary not found' }); return; }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `${trip.title} — Full Itinerary`, description: `Complete itinerary for ${trip.destination}` },
          unit_amount: 5000, // $50.00
        },
        quantity: 1,
      }],
      success_url: `${CLIENT_URL}/curated-trips/${tripId}?itinerary=unlocked`,
      cancel_url: `${CLIENT_URL}/curated-trips/${tripId}`,
      metadata: { userId: req.user!.userId.toString(), tripId: tripId.toString(), type: 'itinerary' },
    });

    res.json({ success: true, data: { url: session.url } });
  } catch (err) {
    console.error('Itinerary session error:', err);
    res.status(500).json({ success: false, error: 'Failed to create itinerary session' });
  }
});

// ─── POST /api/stripe/webhook ─────────────────────────────────
// Raw body required — configure in Express before JSON middleware
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    res.status(500).send('Webhook secret not configured');
    return;
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    res.status(400).send(`Webhook Error: ${err}`);
    return;
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const type = session.metadata?.type;

      if (!userId) { res.json({ received: true }); return; }

      if (session.mode === 'subscription') {
        // Elite upgrade
        await query(
          'UPDATE users SET membership_tier = ?, has_selected_membership = 1 WHERE id = ?',
          ['Elite', userId]
        );
        await query(
          'INSERT INTO purchases (user_id, type, item_name, amount, stripe_session_id, status) VALUES (?, ?, ?, ?, ?, ?)',
          [userId, 'subscription', 'BASK Elite Access — Annual', 120.00, session.id, 'completed']
        );
        console.log(`✅ User ${userId} upgraded to Elite`);
      } else if (type === 'shop') {
        const productId = session.metadata?.productId;
        const product = await queryOne<any>('SELECT * FROM shop_products WHERE id = ?', [productId]);
        if (product) {
          await query(
            'INSERT INTO purchases (user_id, type, item_id, item_name, amount, stripe_session_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, 'shop', productId, product.name, parseFloat(product.price), session.id, 'completed']
          );
        }
      } else if (type === 'itinerary') {
        const tripId = session.metadata?.tripId;
        const trip = await queryOne<any>('SELECT * FROM curated_trips WHERE id = ?', [tripId]);
        if (trip) {
          await query(
            'INSERT INTO purchases (user_id, type, item_id, item_name, amount, stripe_session_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, 'itinerary', tripId, `${trip.title} — Itinerary`, 50.00, session.id, 'completed']
          );
        }
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
  }

  res.json({ received: true });
});

// ─── GET /api/stripe/portal ───────────────────────────────────
router.get('/portal', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const stripe = getStripe();
    const user = await queryOne<{ stripe_customer_id: string | null }>(
      'SELECT stripe_customer_id FROM users WHERE id = ?', [req.user!.userId]
    );
    if (!user?.stripe_customer_id) {
      res.status(400).json({ success: false, error: 'No Stripe customer found' }); return;
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${CLIENT_URL}/membership`,
    });
    res.json({ success: true, data: { url: session.url } });
  } catch (err) {
    console.error('Portal error:', err);
    res.status(500).json({ success: false, error: 'Failed to create billing portal session' });
  }
});

export default router;
