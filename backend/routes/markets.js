const { Router } = require('express');
const { supabase } = require('../services/supabaseClient.js');
const { getWeatherData } = require('../services/weatherService.js');
const { optionalAuth, requireAuth, requireAdmin } = require('./auth.js');
const { getPrices, INITIAL_LIQUIDITY } = require('../services/ammService.js');

const router = Router();

// GET /api/markets
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { status, category, sort } = req.query;

    let query = supabase
      .from('markets')
      .select('*');

    if (status) {
      query = query.eq('status', status);
    }

    if (category && category !== 'all') {
      if (category === 'weather') {
        // Weather super-category includes all weather subtypes
        query = query.in('category', ['weather', 'temperature', 'rain', 'wind', 'humidity', 'visibility']);
      } else {
        query = query.eq('category', category);
      }
    }

    // Default sort: closing soon first for open markets
    if (sort === 'popular') {
      query = query.order('total_positions', { ascending: false });
    } else if (sort === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('closes_at', { ascending: true });
    }

    const { data: markets, error } = await query;
    if (error) throw error;

    // Calculate AMM prices for each market
    const marketsWithPools = (markets || []).map((market) => {
      const yesLiq = parseFloat(market.yes_liquidity) || 0;
      const noLiq = parseFloat(market.no_liquidity) || 0;
      const prices = getPrices(yesLiq, noLiq);
      const totalPool = (market.yes_pool || 0) + (market.no_pool || 0);

      return {
        ...market,
        total_pool: totalPool,
        ...prices,
      };
    });

    res.json(marketsWithPools);
  } catch (error) {
    console.error('Markets list error:', error);
    res.status(500).json({ error: 'Error al obtener mercados' });
  }
});

// GET /api/markets/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: market, error } = await supabase
      .from('markets')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !market) {
      return res.status(404).json({ error: 'Mercado no encontrado' });
    }

    // Get positions
    const { data: positions } = await supabase
      .from('positions')
      .select('side, amount, created_at, user_id')
      .eq('market_id', id)
      .order('created_at', { ascending: false });

    const yesLiq = parseFloat(market.yes_liquidity) || 0;
    const noLiq = parseFloat(market.no_liquidity) || 0;
    const prices = getPrices(yesLiq, noLiq);
    const totalPool = (market.yes_pool || 0) + (market.no_pool || 0);

    // User's positions if authenticated
    let userPosition = null;
    if (req.user) {
      const { data: userPositions } = await supabase
        .from('positions')
        .select('*')
        .eq('market_id', id)
        .eq('user_id', req.user.id)
        .eq('status', 'active');

      if (userPositions && userPositions.length > 0) {
        const totalShares = { YES: 0, NO: 0 };
        const totalSpent = { YES: 0, NO: 0 };
        userPositions.forEach(p => {
          totalShares[p.side] += p.shares || p.amount;
          totalSpent[p.side] += p.amount;
        });

        // Current value based on AMM price
        const currentValue =
          totalShares.YES * prices.yes_price +
          totalShares.NO * prices.no_price;

        userPosition = {
          positions: userPositions,
          total_shares_yes: totalShares.YES,
          total_shares_no: totalShares.NO,
          total_spent: totalSpent.YES + totalSpent.NO,
          current_value: parseFloat(currentValue.toFixed(2)),
          profit_loss: parseFloat((currentValue - totalSpent.YES - totalSpent.NO).toFixed(2)),
        };
      }
    }

    // Get current weather if market is open
    let currentWeather = null;
    if (market.status === 'open') {
      try {
        currentWeather = await getWeatherData(market.city, market.country_code);
      } catch (e) {
        // Weather fetch failed, continue without it
      }
    }

    // Get recent trades from price_history for richer detail
    const { data: recentTrades } = await supabase
      .from('price_history')
      .select('*')
      .eq('market_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    const recentPositions = (recentTrades || []).map((t) => ({
      id: t.id,
      side: t.trade_type?.includes('yes') ? 'YES' : 'NO',
      type: t.trade_type?.startsWith('sell') ? 'sell' : 'buy',
      amount: parseFloat(t.trade_amount) || 0,
      yes_price_after: parseFloat(t.yes_price),
      no_price_after: parseFloat(t.no_price),
      created_at: t.created_at,
      is_mine: req.user ? t.trader_id === req.user.id : false,
    }));

    res.json({
      ...market,
      total_pool: totalPool,
      ...prices,
      user_position: userPosition,
      recent_positions: recentPositions,
      current_weather: currentWeather,
    });
  } catch (error) {
    console.error('Market detail error:', error);
    res.status(500).json({ error: 'Error al obtener mercado' });
  }
});

// POST /api/markets (admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      question, description, city, country_code, metric,
      operator, threshold, closes_at, resolves_at, category,
    } = req.body;

    if (!question || !closes_at || !resolves_at) {
      return res.status(400).json({ error: 'Faltan campos requeridos: question, closes_at, resolves_at' });
    }

    const insertData = {
      question,
      description: description || null,
      closes_at,
      resolves_at,
      category: category || 'other',
      created_by: req.user.id,
    };

    // Weather-specific fields (optional for generic markets)
    if (city) insertData.city = city;
    if (country_code) insertData.country_code = country_code;
    if (metric) insertData.metric = metric;
    if (operator) insertData.operator = operator;
    if (threshold !== undefined) insertData.threshold = threshold;

    // resolution_type: 'auto' (weather) or 'manual' (admin resolves)
    insertData.resolution_type = (city && metric && operator && threshold !== undefined) ? 'auto' : 'manual';

    const { data: market, error } = await supabase
      .from('markets')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(market);
  } catch (error) {
    console.error('Create market error:', error);
    res.status(500).json({ error: 'Error al crear mercado' });
  }
});

// POST /api/markets/propose — user submits a market idea
router.post('/propose', requireAuth, async (req, res) => {
  try {
    const { question, description, category, closes_in_days } = req.body;

    if (!question || question.length < 10) {
      return res.status(400).json({ error: 'La pregunta debe tener al menos 10 caracteres' });
    }

    const closesInDays = parseInt(closes_in_days) || 30;
    if (closesInDays < 1 || closesInDays > 365) {
      return res.status(400).json({ error: 'El mercado debe cerrar entre 1 y 365 días' });
    }

    const { data, error } = await supabase
      .from('market_proposals')
      .insert({
        question,
        description: description || null,
        category: category || 'other',
        closes_in_days: closesInDays,
        proposed_by: req.user.id,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: '¡Propuesta enviada! La revisaremos pronto.', proposal: data });
  } catch (error) {
    console.error('Propose market error:', error);
    res.status(500).json({ error: 'Error al enviar propuesta' });
  }
});

// GET /api/markets/proposals — admin: list all proposals
router.get('/proposals', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from('market_proposals')
      .select('*, profiles(username)')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('List proposals error:', error);
    res.status(500).json({ error: 'Error al obtener propuestas' });
  }
});

// POST /api/markets/proposals/:id/approve — admin approves and creates market
router.post('/proposals/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: proposal, error: fetchErr } = await supabase
      .from('market_proposals')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !proposal) return res.status(404).json({ error: 'Propuesta no encontrada' });
    if (proposal.status !== 'pending') return res.status(400).json({ error: 'Propuesta ya procesada' });

    const now = new Date();
    const closesAt = new Date(now.getTime() + proposal.closes_in_days * 86400000).toISOString();
    const resolvesAt = new Date(now.getTime() + (proposal.closes_in_days + 5) * 86400000).toISOString();

    // Create the market
    const { data: market, error: createErr } = await supabase
      .from('markets')
      .insert({
        question: proposal.question,
        description: proposal.description,
        category: proposal.category,
        resolution_type: 'manual',
        closes_at: closesAt,
        resolves_at: resolvesAt,
        created_by: proposal.proposed_by,
      })
      .select()
      .single();

    if (createErr) throw createErr;

    // Update proposal status
    await supabase
      .from('market_proposals')
      .update({ status: 'approved', market_id: market.id })
      .eq('id', id);

    res.json({ message: 'Propuesta aprobada y mercado creado', market });
  } catch (error) {
    console.error('Approve proposal error:', error);
    res.status(500).json({ error: 'Error al aprobar propuesta' });
  }
});

// POST /api/markets/proposals/:id/reject — admin rejects
router.post('/proposals/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const { error } = await supabase
      .from('market_proposals')
      .update({ status: 'rejected', reject_reason: reason || null })
      .eq('id', id)
      .eq('status', 'pending');

    if (error) throw error;
    res.json({ message: 'Propuesta rechazada' });
  } catch (error) {
    console.error('Reject proposal error:', error);
    res.status(500).json({ error: 'Error al rechazar propuesta' });
  }
});

// POST /api/markets/:id/resolve (admin only — manual resolution)
router.post('/:id/resolve', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { result } = req.body; // true = YES wins, false = NO wins

    if (result === undefined || result === null) {
      return res.status(400).json({ error: 'Se requiere "result" (true/false)' });
    }

    const { data: market, error } = await supabase
      .from('markets')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !market) return res.status(404).json({ error: 'Mercado no encontrado' });
    if (market.status === 'resolved') return res.status(400).json({ error: 'Mercado ya resuelto' });

    // Import resolveMarketManual
    const { resolveMarketManual } = require('../services/resolverService.js');
    await resolveMarketManual(market, !!result);

    res.json({ message: `Mercado resuelto: ${result ? 'SÍ' : 'NO'} gana` });
  } catch (error) {
    console.error('Manual resolve error:', error);
    res.status(500).json({ error: 'Error al resolver mercado' });
  }
});

module.exports = router;
