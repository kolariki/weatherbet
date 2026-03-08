const { Router } = require('express');
const { supabase } = require('../services/supabaseClient.js');
const { requireAuth } = require('./auth.js');

const router = Router();

// POST /api/markets/:id/bet
router.post('/:id/bet', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { side, amount } = req.body;

    // Validate input
    if (!side || !['YES', 'NO'].includes(side)) {
      return res.status(400).json({ error: 'Lado inválido. Debe ser YES o NO' });
    }

    if (!amount || amount <= 0 || !Number.isInteger(amount)) {
      return res.status(400).json({ error: 'Monto inválido. Debe ser un número entero positivo' });
    }

    // Check market exists and is open
    const { data: market, error: marketError } = await supabase
      .from('markets')
      .select('*')
      .eq('id', id)
      .single();

    if (marketError || !market) {
      return res.status(404).json({ error: 'Mercado no encontrado' });
    }

    if (market.status !== 'open') {
      return res.status(400).json({ error: 'Este mercado ya no acepta apuestas' });
    }

    const now = new Date();
    if (new Date(market.closes_at) <= now) {
      return res.status(400).json({ error: 'Este mercado ya cerró para apuestas' });
    }

    // Check user balance
    const profile = req.profile;
    if (profile.balance_credits < amount) {
      return res.status(400).json({
        error: `Créditos insuficientes. Tienes ${profile.balance_credits} créditos`,
      });
    }

    // Calculate odds at entry
    const { data: positions } = await supabase
      .from('positions')
      .select('side, amount')
      .eq('market_id', id);

    const yesPool = (positions || []).filter((p) => p.side === 'YES').reduce((s, p) => s + p.amount, 0);
    const noPool = (positions || []).filter((p) => p.side === 'NO').reduce((s, p) => s + p.amount, 0);
    const totalPool = yesPool + noPool + amount;
    const sidePool = (side === 'YES' ? yesPool : noPool) + amount;
    const oddsAtEntry = sidePool > 0 ? parseFloat((totalPool / sidePool).toFixed(2)) : 1.9;

    // Deduct from balance
    const { error: balanceError } = await supabase
      .from('profiles')
      .update({
        balance_credits: profile.balance_credits - amount,
        total_bets: profile.total_bets + 1,
      })
      .eq('id', req.user.id);

    if (balanceError) throw balanceError;

    // Create position
    const { data: position, error: posError } = await supabase
      .from('positions')
      .insert({
        user_id: req.user.id,
        market_id: parseInt(id),
        side,
        amount,
        odds_at_entry: oddsAtEntry,
      })
      .select()
      .single();

    if (posError) throw posError;

    // Update market pool counters
    const updateField = side === 'YES' ? 'yes_pool' : 'no_pool';
    await supabase
      .from('markets')
      .update({
        [updateField]: (side === 'YES' ? yesPool : noPool) + amount,
        total_positions: (positions?.length || 0) + 1,
      })
      .eq('id', id);

    // Create transaction record
    await supabase.from('transactions').insert({
      user_id: req.user.id,
      type: 'bet',
      amount: -amount,
      market_id: parseInt(id),
      description: `Apuesta ${side} de ${amount} créditos en: ${market.question}`,
    });

    res.status(201).json({
      position,
      new_balance: profile.balance_credits - amount,
      odds: oddsAtEntry,
    });
  } catch (error) {
    console.error('Bet error:', error);
    res.status(500).json({ error: 'Error al realizar apuesta' });
  }
});

module.exports = router;
