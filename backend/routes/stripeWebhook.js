const { Router } = require('express');
const { supabase } = require('../services/supabaseClient.js');

const router = Router();

// POST /api/stripe/webhook — Stripe webhook handler
// MUST be mounted with express.raw() middleware, NOT express.json()
router.post('/', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not set');
    return res.status(500).send('Webhook secret not configured');
  }

  let event;
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`[Stripe Webhook] Event: ${event.type}`);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    if (session.payment_status !== 'paid') {
      console.log('[Stripe Webhook] Payment not completed, skipping');
      return res.json({ received: true });
    }

    const { user_id, package_id, credits_amount } = session.metadata || {};
    if (!user_id || !credits_amount) {
      console.error('[Stripe Webhook] Missing metadata:', session.metadata);
      return res.json({ received: true });
    }

    const creditsToAdd = parseInt(credits_amount);

    // Idempotency check — don't double-credit
    const { data: existingTx } = await supabase
      .from('transactions')
      .select('id')
      .eq('description', `stripe:${session.id}`)
      .single();

    if (existingTx) {
      console.log(`[Stripe Webhook] Already processed session ${session.id}, skipping`);
      return res.json({ received: true });
    }

    // Get current balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('balance_credits')
      .eq('id', user_id)
      .single();

    if (!profile) {
      console.error(`[Stripe Webhook] Profile not found for user ${user_id}`);
      return res.json({ received: true });
    }

    // Credit the user
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ balance_credits: profile.balance_credits + creditsToAdd })
      .eq('id', user_id);

    if (updateError) {
      console.error('[Stripe Webhook] Update error:', updateError);
      return res.status(500).json({ error: 'Failed to credit user' });
    }

    // Log transaction (description used for idempotency)
    await supabase.from('transactions').insert({
      user_id,
      type: 'purchase',
      amount: creditsToAdd,
      market_id: null,
      description: `stripe:${session.id}`,
    });

    console.log(`[Stripe Webhook] Credited ${creditsToAdd} credits to user ${user_id} (${package_id})`);
  }

  res.json({ received: true });
});

module.exports = router;
