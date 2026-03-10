const { Router } = require('express');
const { supabase } = require('../services/supabaseClient.js');
const { requireAuth } = require('./auth.js');

const router = Router();

// Credit packages
const PACKAGES = {
  starter:  { name: 'Starter',  price: 500,   credits: 5000,  label: '$5' },
  popular:  { name: 'Popular',  price: 1000,  credits: 11000, label: '$10' },
  pro:      { name: 'Pro',      price: 2500,  credits: 30000, label: '$25' },
  whale:    { name: 'Whale',    price: 5000,  credits: 65000, label: '$50' },
};

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return require('stripe')(key);
}

// GET /api/stripe/packages — list available packages
router.get('/packages', (req, res) => {
  const packages = Object.entries(PACKAGES).map(([id, pkg]) => ({
    id,
    ...pkg,
    priceDisplay: `$${(pkg.price / 100).toFixed(0)} USD`,
    bonus: pkg.credits > (pkg.price / 100) * 1000
      ? Math.round(((pkg.credits / ((pkg.price / 100) * 1000)) - 1) * 100)
      : 0,
  }));
  res.json(packages);
});

// POST /api/stripe/checkout — create embedded checkout session
router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const stripe = getStripe();
    const { packageId } = req.body;

    const pkg = PACKAGES[packageId];
    if (!pkg) return res.status(400).json({ error: 'Paquete inválido' });

    const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `BetAll — ${pkg.name} Pack`,
            description: `${pkg.credits.toLocaleString()} créditos para BetAll`,
          },
          unit_amount: pkg.price,
        },
        quantity: 1,
      }],
      metadata: {
        user_id: req.user.id,
        package_id: packageId,
        credits_amount: String(pkg.credits),
      },
      return_url: `${FRONTEND_URL}/wallet?session_id={CHECKOUT_SESSION_ID}`,
    });

    res.json({ clientSecret: session.client_secret, sessionId: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ error: 'Error al crear sesión de pago' });
  }
});

// GET /api/stripe/session-status — check session after redirect
router.get('/session-status', requireAuth, async (req, res) => {
  try {
    const stripe = getStripe();
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: 'session_id required' });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    res.json({
      status: session.status,
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email,
    });
  } catch (error) {
    console.error('Session status error:', error);
    res.status(500).json({ error: 'Error al verificar sesión' });
  }
});

module.exports = router;
module.exports.PACKAGES = PACKAGES;
