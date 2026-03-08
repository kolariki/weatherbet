import { Router } from 'express';
import { supabase } from '../services/supabaseClient.js';
import { requireAuth } from './auth.js';

const router = Router();

// GET /api/wallet
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*, markets(question)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({
      balance: req.profile.balance_credits,
      last_daily_claim: req.profile.last_daily_claim,
      transactions: transactions || [],
    });
  } catch (error) {
    console.error('Wallet error:', error);
    res.status(500).json({ error: 'Error al obtener billetera' });
  }
});

// POST /api/wallet/claim-daily
router.post('/claim-daily', requireAuth, async (req, res) => {
  try {
    const profile = req.profile;
    const now = new Date();
    const DAILY_AMOUNT = 500;
    const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

    if (profile.last_daily_claim) {
      const lastClaim = new Date(profile.last_daily_claim);
      const elapsed = now.getTime() - lastClaim.getTime();

      if (elapsed < COOLDOWN_MS) {
        const remainingMs = COOLDOWN_MS - elapsed;
        const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
        return res.status(400).json({
          error: `Ya reclamaste tus créditos diarios. Vuelve en ${remainingHours} horas`,
          next_claim_at: new Date(lastClaim.getTime() + COOLDOWN_MS).toISOString(),
        });
      }
    }

    // Update balance and claim time
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        balance_credits: profile.balance_credits + DAILY_AMOUNT,
        last_daily_claim: now.toISOString(),
      })
      .eq('id', req.user.id);

    if (updateError) throw updateError;

    // Create transaction
    await supabase.from('transactions').insert({
      user_id: req.user.id,
      type: 'daily_claim',
      amount: DAILY_AMOUNT,
      description: 'Créditos diarios reclamados',
    });

    res.json({
      message: `¡Reclamaste ${DAILY_AMOUNT} créditos!`,
      new_balance: profile.balance_credits + DAILY_AMOUNT,
      next_claim_at: new Date(now.getTime() + COOLDOWN_MS).toISOString(),
    });
  } catch (error) {
    console.error('Daily claim error:', error);
    res.status(500).json({ error: 'Error al reclamar créditos diarios' });
  }
});

export default router;
