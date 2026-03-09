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
      query = query.eq('category', category);
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

    // Anonymize positions for display
    const recentPositions = (positions || []).slice(0, 20).map((p) => ({
      side: p.side,
      amount: p.amount,
      created_at: p.created_at,
      is_mine: req.user ? p.user_id === req.user.id : false,
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

    if (!question || !city || !metric || !operator || threshold === undefined || !closes_at || !resolves_at) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const { data: market, error } = await supabase
      .from('markets')
      .insert({
        question,
        description: description || null,
        city,
        country_code: country_code || 'MX',
        metric,
        operator,
        threshold,
        closes_at,
        resolves_at,
        category: category || 'temperature',
        created_by: req.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(market);
  } catch (error) {
    console.error('Create market error:', error);
    res.status(500).json({ error: 'Error al crear mercado' });
  }
});

module.exports = router;
