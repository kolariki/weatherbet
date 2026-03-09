const { Router } = require('express');
const { supabase } = require('../services/supabaseClient.js');
const { requireAuth, optionalAuth } = require('./auth.js');
const { calculateBuy, calculateSell, getPrices, INITIAL_LIQUIDITY } = require('../services/ammService.js');

const router = Router();

// GET /api/markets/:id/price — Get current price
router.get('/:id/price', async (req, res) => {
  try {
    const { data: market } = await supabase
      .from('markets')
      .select('yes_liquidity, no_liquidity')
      .eq('id', req.params.id)
      .single();

    if (!market) return res.status(404).json({ error: 'Mercado no encontrado' });

    const prices = getPrices(
      market.yes_liquidity || INITIAL_LIQUIDITY,
      market.no_liquidity || INITIAL_LIQUIDITY
    );
    res.json(prices);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener precio' });
  }
});

// GET /api/markets/:id/quote — Preview a trade without executing
router.get('/:id/quote', async (req, res) => {
  try {
    const { side, amount } = req.query;
    if (!side || !amount) return res.status(400).json({ error: 'side y amount requeridos' });

    const { data: market } = await supabase
      .from('markets')
      .select('yes_liquidity, no_liquidity, status')
      .eq('id', req.params.id)
      .single();

    if (!market) return res.status(404).json({ error: 'Mercado no encontrado' });

    const yesLiq = market.yes_liquidity || INITIAL_LIQUIDITY;
    const noLiq = market.no_liquidity || INITIAL_LIQUIDITY;

    const quote = calculateBuy(yesLiq, noLiq, side.toUpperCase(), parseFloat(amount));
    res.json(quote);
  } catch (error) {
    res.status(500).json({ error: 'Error al calcular cotización' });
  }
});

// GET /api/markets/:id/sell-quote — Preview selling shares
router.get('/:id/sell-quote', requireAuth, async (req, res) => {
  try {
    const { side, shares } = req.query;
    if (!side || !shares) return res.status(400).json({ error: 'side y shares requeridos' });

    const { data: market } = await supabase
      .from('markets')
      .select('yes_liquidity, no_liquidity, status')
      .eq('id', req.params.id)
      .single();

    if (!market) return res.status(404).json({ error: 'Mercado no encontrado' });

    const quote = calculateSell(
      market.yes_liquidity || INITIAL_LIQUIDITY,
      market.no_liquidity || INITIAL_LIQUIDITY,
      side.toUpperCase(),
      parseFloat(shares)
    );
    res.json(quote);
  } catch (error) {
    res.status(500).json({ error: 'Error al calcular venta' });
  }
});

// POST /api/markets/:id/bet — Buy shares using AMM
router.post('/:id/bet', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { side, amount } = req.body;

    // Validate
    if (!side || !['YES', 'NO'].includes(side)) {
      return res.status(400).json({ error: 'Lado inválido. Debe ser YES o NO' });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Monto inválido' });
    }

    // Get market
    const { data: market, error: mErr } = await supabase
      .from('markets')
      .select('*')
      .eq('id', id)
      .single();

    if (mErr || !market) return res.status(404).json({ error: 'Mercado no encontrado' });
    if (market.status !== 'open') return res.status(400).json({ error: 'Mercado cerrado' });
    if (new Date(market.closes_at) <= new Date()) return res.status(400).json({ error: 'Mercado cerrado para apuestas' });

    // Check balance
    const profile = req.profile;
    if (profile.balance_credits < amount) {
      return res.status(400).json({ error: `Créditos insuficientes. Tienes ${profile.balance_credits}` });
    }

    // Calculate AMM trade
    const yesLiq = market.yes_liquidity || INITIAL_LIQUIDITY;
    const noLiq = market.no_liquidity || INITIAL_LIQUIDITY;
    const trade = calculateBuy(yesLiq, noLiq, side, amount);

    // Deduct balance
    const { error: balErr } = await supabase
      .from('profiles')
      .update({
        balance_credits: profile.balance_credits - amount,
        total_bets: profile.total_bets + 1,
      })
      .eq('id', req.user.id);
    if (balErr) throw balErr;

    // Create position with shares
    const { data: position, error: posErr } = await supabase
      .from('positions')
      .insert({
        user_id: req.user.id,
        market_id: parseInt(id),
        side,
        amount,
        shares: trade.shares,
        odds_at_entry: trade.avg_price,
        status: 'active',
      })
      .select()
      .single();
    if (posErr) throw posErr;

    // Update market liquidity
    await supabase
      .from('markets')
      .update({
        yes_liquidity: trade.new_yes_liquidity,
        no_liquidity: trade.new_no_liquidity,
        yes_pool: (market.yes_pool || 0) + (side === 'YES' ? amount : 0),
        no_pool: (market.no_pool || 0) + (side === 'NO' ? amount : 0),
        total_positions: (market.total_positions || 0) + 1,
      })
      .eq('id', id);

    // Record price history
    await supabase.from('price_history').insert({
      market_id: parseInt(id),
      yes_price: trade.prices_after.yes_price,
      no_price: trade.prices_after.no_price,
      yes_liquidity: trade.new_yes_liquidity,
      no_liquidity: trade.new_no_liquidity,
      trade_type: `buy_${side.toLowerCase()}`,
      trade_amount: amount,
      trader_id: req.user.id,
    });

    // Transaction record
    await supabase.from('transactions').insert({
      user_id: req.user.id,
      type: 'bet',
      amount: -amount,
      market_id: parseInt(id),
      description: `Compra ${trade.shares.toFixed(1)} shares ${side} por ${amount} créditos (${market.question})`,
    });

    res.status(201).json({
      position,
      trade,
      new_balance: profile.balance_credits - amount,
    });
  } catch (error) {
    console.error('Bet error:', error);
    res.status(500).json({ error: 'Error al realizar apuesta' });
  }
});

// POST /api/markets/:id/sell — Sell shares back to AMM
router.post('/:id/sell', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { position_id } = req.body;

    if (!position_id) return res.status(400).json({ error: 'position_id requerido' });

    // Get position
    const { data: position, error: pErr } = await supabase
      .from('positions')
      .select('*')
      .eq('id', position_id)
      .eq('user_id', req.user.id)
      .single();

    if (pErr || !position) return res.status(404).json({ error: 'Posición no encontrada' });
    if (position.status !== 'active') return res.status(400).json({ error: 'Posición ya vendida' });

    // Get market
    const { data: market } = await supabase
      .from('markets')
      .select('*')
      .eq('id', id)
      .single();

    if (!market || market.status !== 'open') return res.status(400).json({ error: 'Mercado cerrado' });
    if (new Date(market.closes_at) <= new Date()) return res.status(400).json({ error: 'Mercado cerrado' });

    // Calculate sell
    const yesLiq = market.yes_liquidity || INITIAL_LIQUIDITY;
    const noLiq = market.no_liquidity || INITIAL_LIQUIDITY;
    const sale = calculateSell(yesLiq, noLiq, position.side, position.shares);

    // Mark position as sold
    await supabase
      .from('positions')
      .update({ status: 'sold', payout: Math.floor(sale.credits_out) })
      .eq('id', position_id);

    // Credit user
    const profile = req.profile;
    await supabase
      .from('profiles')
      .update({ balance_credits: profile.balance_credits + Math.floor(sale.credits_out) })
      .eq('id', req.user.id);

    // Update market liquidity
    await supabase
      .from('markets')
      .update({
        yes_liquidity: sale.new_yes_liquidity,
        no_liquidity: sale.new_no_liquidity,
      })
      .eq('id', id);

    // Record price history
    await supabase.from('price_history').insert({
      market_id: parseInt(id),
      yes_price: sale.prices_after.yes_price,
      no_price: sale.prices_after.no_price,
      yes_liquidity: sale.new_yes_liquidity,
      no_liquidity: sale.new_no_liquidity,
      trade_type: `sell_${position.side.toLowerCase()}`,
      trade_amount: position.shares,
      trader_id: req.user.id,
    });

    // Transaction
    await supabase.from('transactions').insert({
      user_id: req.user.id,
      type: 'sell',
      amount: Math.floor(sale.credits_out),
      market_id: parseInt(id),
      description: `Venta ${position.shares.toFixed(1)} shares ${position.side} por ${Math.floor(sale.credits_out)} créditos`,
    });

    res.json({
      credits_received: Math.floor(sale.credits_out),
      fee: sale.fee,
      new_balance: profile.balance_credits + Math.floor(sale.credits_out),
      prices_after: sale.prices_after,
    });
  } catch (error) {
    console.error('Sell error:', error);
    res.status(500).json({ error: 'Error al vender posición' });
  }
});

// GET /api/markets/:id/price-history — Price chart data
router.get('/:id/price-history', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('market_id', req.params.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial de precios' });
  }
});

module.exports = router;
